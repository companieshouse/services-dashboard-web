import { ObjectId } from "mongodb";
import semver from "semver";
import * as config from "../config";
import { logErr } from "../utils/logger";
import { checkRuntimesVsEol, EndOfLifeData, Thresholds } from "../utils/check-eol";
import { getDb, getSession } from "./db";

export interface ScrumTeamDocument {
  _id: string;
  services: any[];
}

export interface ServiceDocument {
   _id: ObjectId;
   name: string;
   versions: any[];
   gitInfo: any;
   ecs: any;
   sonarMetrics: any;
}

export interface Notice {
   _id: ObjectId;
   message: string;
}

/*
   Handles converting flat sonar metrics:
   { coverage: 77, new_coverage: 81, bugs: 4, ... }
   Into:
   {
      newCode: {
         coverage: 81,
         ...
      },
      overall: {
         coverage: 77,
         ...
      }
   }
*/
export function normaliseSonarMetrics(sonarMetrics: any) {
   if (Object.keys(sonarMetrics).length == 0) {
      return null;
   }

   const newCode: Record<string, any> = {};
   const overall: Record<string, any> = {};

   Object.keys(sonarMetrics).forEach(key => {
      if (key.includes('new_')) {
         newCode[key.replace('new_', '')] = sonarMetrics[key];
      } else {
         overall[key] = sonarMetrics[key];
      }
   });

   return {newCode, overall};
}

export function sortVersions(versions: any[]) {
   return versions.sort((a:any, b:any) => 
      semver.valid(a.version) && semver.valid(b.version) ? // if version is valid semver... 
      semver.compare(a.version, b.version) : // try and sort using semver...
      a.version.localeCompare(b.version) // else, use string comparison
   );
}

export function processVersions(gitLang: string, serviceVersions: any[], endol: EndOfLifeData, thresholds: Thresholds) {
   const langArray = [gitLang];

   return serviceVersions.map(version => {
      langArray.push(version.lang);
      if (version.runtime) {
         version.runtimeData = checkRuntimesVsEol(langArray, version.runtime.split(' '), endol, thresholds);
      }
      return version;
   });
}

export function processDeployments(document: ServiceDocument) {
   for (const version of document.versions) {
      const deployments = [];
      if (version.version == document.ecs?.cidev?.version) {
         deployments.push('CI-Dev');
         document.ecs.cidev = {
            ...document.ecs.cidev,
            ...version
         };
      }
      if (version.version == document.ecs?.rebel1?.version) {
         deployments.push('Rebel1');
         document.ecs.rebel1 = {
            ...document.ecs.rebel1,
            ...version
         };
      }
      if (version.version == document.ecs?.phoenix?.version) {
         deployments.push('Phoenix');
         document.ecs.phoenix = {
            ...document.ecs.phoenix,
            ...version
         };
      }
      if (version.version == document.ecs?.staging?.version) {
         deployments.push('Staging');
         document.ecs.staging = {
            ...document.ecs.staging,
            ...version
         };
      }
      if (version.version == document.ecs?.live?.version) {
         deployments.push('Live');
         document.ecs.live = {
            ...document.ecs.live,
            ...version
         }; 
      }
      version.deployments = deployments;
   }
}

export function processMetricsAndDeployments(document: ServiceDocument, endol: EndOfLifeData, thresholds: Thresholds) {
   if (document.sonarMetrics) {
      document.sonarMetrics = normaliseSonarMetrics(document.sonarMetrics);
   }

   document.versions = processVersions(document.gitInfo.lang, document.versions, endol, thresholds);

   processDeployments(document);

   // most recent versions first
   document.versions = sortVersions(document.versions).reverse();
}

export async function fetchDocument(name: string, endol: EndOfLifeData, thresholds: Thresholds): Promise<ServiceDocument | null> {
   try {
      const db = getDb();
      const collection = db.collection<ServiceDocument>(config.MONGO_COLLECTION_PROJECTS!);

      const document = await collection.findOne({ name });

      if (!document) return null;
      
      processMetricsAndDeployments(document, endol, thresholds);

      return document;
   } catch (error) {
      logErr(error, "Error fetching document:");
      return null;
   }
}

// Aggregate the documents by gitinfo.owner
async function fetchDocumentsGoupedByScrum(endol: EndOfLifeData, thresholds: Thresholds): Promise<ScrumTeamDocument[]> {
   try {
      const collection = getDb().collection(config.MONGO_COLLECTION_PROJECTS!);

      const documents = await collection.aggregate([
         {
            $sort: { "versions.lastBomImport": -1 }
         },
         {
            $group: {
               _id: "$_id",
               name: { $first: "$name" },
               versions: { $first: "$versions" },
               sonarKey: { $first: "$sonarKey" },
               sonarMetrics: { $first: "$sonarMetrics" },
               gitInfo: { $first: "$gitInfo" },
               ecs: { $first: "$ecs" }
            }
         },
         {
            $group: {
               _id: { $ifNull: ["$gitInfo.owner", "unassigned"] },
               services: {
                  $push: {
                     _id: "$_id",
                     name: "$name",
                     versions: "$versions",
                     sonarKey: "$sonarKey",
                     sonarMetrics: "$sonarMetrics",
                     gitInfo: "$gitInfo",
                     ecs: "$ecs"
                  }
               }
            }
         },
         {
            // Add a count field with the length of the services array
            $addFields: {
               servicesCount: { $size: "$services" }
            }
         },
         {
            $project: {
               _id: 1,
               servicesCount: 1,
               services: {
                  $sortArray: {
                     input: "$services",
                     sortBy: { name: 1 } // Sort by name in ascending order
                  }
               }
            }
          },
          {
            $sort: { "_id": 1 } // Sort groups alphabetically
          }
      ], { session: getSession() }).toArray(); // cursor --> array

      const transformedDocuments = documents.map((team) => ({
         _id: team.name,
         ...team,
         services: team.services.map((service: any) => {
            processMetricsAndDeployments(service, endol, thresholds);
            
            service.latestVersion = service.versions[0];

            if (!service.latestVersion.runtime) {
               return {
                  ...service,
                  latestVersion: {
                     ...service.latestVersion,
                     runtime: { total: 'grey', runtime: [{ value: 'Unknown', color: 'grey' }] }
                  }
               }
            }

            const runtimeStr = service.latestVersion.runtime;
            const versionLangs = service.versions.map((v: any) => v.lang);
            versionLangs.push(service.gitInfo.lang);

            const runtimeColorResult = checkRuntimesVsEol(versionLangs, runtimeStr.split(' '), endol, thresholds);

            return {
               ...service,
               latestVersion: {
                  ...service.latestVersion,
                  runtime: runtimeColorResult,
               },
            };
         }),
      }));

      return transformedDocuments;
   } catch (error) {
      logErr(error, "Error fetching documents:");
      return [];
   }
}

async function fetchConfig() {
   try {
      const collection = getDb().collection(config.MONGO_COLLECTION_CONFIG!);
      const configData = await collection.findOne(
         { _id: config.MONGO_CONFIG_SINGLETON as any },
         {session: getSession() }
      );
      // return "endol" sorted by key (ex. "amazon-corretto" before "go")
      if (configData && configData.endol) {
         configData.endol = Object.keys(configData.endol)
            .sort((a, b) => a.localeCompare(b))
            .reduce((sortedObj, key) => {
               sortedObj[key] = configData.endol[key];
               return sortedObj;
            }, {} as Record<string, any>);
     }
      return configData;
   } catch (error) {
      logErr(error, "Error fetching Config:");
      return null;
   }
}

export async function getNotice(): Promise<Notice | null> {
   try {
      const collection = getDb().collection<Notice>(config.MONGO_COLLECTION_NOTICES);
      const document = await collection.findOne();

      if (!document) return null;
      
      return document;
   } catch (error) {
      logErr(error, "Error fetching Notice:");
      return null;
   }
}

// Fetches statistics showing the number of services per scrum team, with the number of Dependency Track vulnerabilities per severity level for each service.
export async function fetchStats() {
   try {
      const collection = getDb().collection(config.MONGO_COLLECTION_PROJECTS);

      const documents = await collection.aggregate([
         {
            // Isolate the latest version per service using sortArray,
            // then project only the fields needed for stats
            $project: {
               name: 1,
               gitInfo: 1,
               latestVersion: {
                  $arrayElemAt: [
                     {
                        $sortArray: {
                           input: "$versions",
                           sortBy: { lastBomImport: -1 }
                        }
                     },
                     0
                  ]
               },
               // true if any deployed environment's version has no matching SBOM metrics in Dependency Track
               // uses $gt with "" rather than null so that empty-string versions (e.g. libraries) are not counted
               missingDeployedSbom: {
                  $or: [
                     { $and: [{ $gt: ["$ecs.cidev.version",   ""] }, { $eq: [{ $size: { $filter: { input: { $ifNull: ["$versions", []] }, as: "v", cond: { $and: [{ $eq: ["$$v.version", "$ecs.cidev.version"]   }, { $gt: ["$$v.metrics", null] }] } } } }, 0] }] },
                     { $and: [{ $gt: ["$ecs.staging.version", ""] }, { $eq: [{ $size: { $filter: { input: { $ifNull: ["$versions", []] }, as: "v", cond: { $and: [{ $eq: ["$$v.version", "$ecs.staging.version"] }, { $gt: ["$$v.metrics", null] }] } } } }, 0] }] },
                     { $and: [{ $gt: ["$ecs.live.version",    ""] }, { $eq: [{ $size: { $filter: { input: { $ifNull: ["$versions", []] }, as: "v", cond: { $and: [{ $eq: ["$$v.version", "$ecs.live.version"]    }, { $gt: ["$$v.metrics", null] }] } } } }, 0] }] },
                  ]
               }
            }
         },
         {
            // Group services by scrum team, accumulating per-service breakdowns
            // and team-level totals in a single pass
            $group: {
               _id: { $ifNull: ["$gitInfo.owner", "unassigned"] },
               servicesCount: { $sum: 1 },
               services: {
                  $push: {
                     name: "$name",
                     serviceArea:           "$gitInfo.serviceArea",
                     critical:              "$latestVersion.metrics.critical",
                     high:                  "$latestVersion.metrics.high",
                     medium:                "$latestVersion.metrics.medium",
                     low:                   "$latestVersion.metrics.low",
                     vulnerabilities:       "$latestVersion.metrics.vulnerabilities",
                     components:            "$latestVersion.metrics.components",
                     policyViolationsTotal: "$latestVersion.metrics.policyViolationsTotal",
                     policyViolationsFail:  "$latestVersion.metrics.policyViolationsFail",
                     policyViolationsWarn:  "$latestVersion.metrics.policyViolationsWarn",
                     missingDeployedSbom:   "$missingDeployedSbom",
                     lang:                   "$latestVersion.lang",
                     runtime:                "$latestVersion.runtime"
                  }
               },
               // Team-level rollups, useful for high-level charts
               totalCritical:              { $sum: "$latestVersion.metrics.critical" },
               totalHigh:                  { $sum: "$latestVersion.metrics.high" },
               totalMedium:                { $sum: "$latestVersion.metrics.medium" },
               totalLow:                   { $sum: "$latestVersion.metrics.low" },
               totalVulnerabilities:       { $sum: "$latestVersion.metrics.vulnerabilities" },
               totalPolicyViolationsTotal: { $sum: "$latestVersion.metrics.policyViolationsTotal" },
               totalPolicyViolationsFail:  { $sum: "$latestVersion.metrics.policyViolationsFail" },
               totalPolicyViolationsWarn:  { $sum: "$latestVersion.metrics.policyViolationsWarn" },
               totalMissingDeployedSbom:   { $sum: { $cond: ["$missingDeployedSbom", 1, 0] } },
            }
         },
         {
            $sort: { _id: 1 } // alphabetical by team name
         }
      ], { session: getSession() }).toArray();

      return documents;
   } catch (error) {
      logErr(error, "Error fetching Stats:");
      return null;
   }
}
export { fetchDocumentsGoupedByScrum, fetchConfig };
