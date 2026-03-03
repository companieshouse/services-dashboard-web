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

export { fetchDocumentsGoupedByScrum, fetchConfig };
