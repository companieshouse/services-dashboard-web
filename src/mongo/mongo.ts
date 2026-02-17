import { ObjectId } from "mongodb";
import semver from "semver";
import * as config from "../config";
import * as type from '../common/types';
import {logger, logErr} from "../utils/logger";
import {checkRuntimesVsEol, EndOfLifeData, Thresholds} from "../utils/check-eol";
import { getDb, getSession } from "./db";
import { servicesVersion } from "typescript";

const MilliSecRetentionStateLinks = Number(config.DAYS_RETENTION_STATE_LINKS) * 24 * 60 * 60 * 1000;

// ex.
// https://......./dashboard/?query={"overs":["last"],"api":["last"]}
//                           ?query={"api":"*"}
//                           ?query={"*":"*"}
//                           ?query={"overs":"[1.1.340,1.1.348,1.1.364]"}
async function fetchDocuments(queryParams?: type.QueryParameters) {
   try {
      const collection = getDb().collection(config.MONGO_COLLECTION_PROJECTS!);

      let documents;
      // Return all documents if no queryParams are provided or if name is "*"
      if (!queryParams || queryParams.hasOwnProperty("*")) {
         documents = await collection.find({}, { session: getSession() }).sort({ name: 1 }).toArray();
      } else {
         // Build the regex queries for each name
         const namePatterns = Object.keys(queryParams).map(name => new RegExp(name, "i"));

         // Find the documents by names using regex
         documents = await collection.find({ name: { $in: namePatterns }}, { session: getSession() }).toArray();
         // Filter the versions for each document
         documents = documents.map(doc => {
            const matchingKey = Object.keys(queryParams).find(key => doc.name.toLowerCase().includes(key.toLowerCase()));
            if (!matchingKey) {
               return null;
            }
            let filteredVersions;
            filteredVersions = doc.versions;

            // for versions: handle empty array "[]" and keyword "*" (both meaning ALL versions)
            if ( ! ( queryParams[matchingKey].length === 0 ||
                     queryParams[matchingKey].includes("*"))) {
               filteredVersions = doc.versions.filter((v: any) => queryParams[matchingKey].includes(v.version));
            }
            // for versions: handle keyword "last" (meaning most recent "lastBomImport")
            if (queryParams[matchingKey].includes("last")) {
               const latestVersion = doc.versions.reduce((prev: any, current: any) =>
                  (new Date(current.lastBomImport) > new Date(prev.lastBomImport)) ? current : prev
               );
               const versionExists = filteredVersions.some((item: any) => item.version === latestVersion.version);
               if (!versionExists) {
                  filteredVersions.push(latestVersion);
               }
            }
            return {
               ...doc,
               versions: filteredVersions
            };
         }).filter(doc => doc !== null);
      }
      // sort "versions" array by "version"
      documents.forEach(doc => {
         doc.versions.sort((a:any, b:any) => a.version.localeCompare(b.version));
         // Modify each version's runtime into an array
         doc.versions.forEach((version:any) => {
            if (version.runtime) {
               version.runtime = version.runtime.split(' ');
            }
         });
      });
     return documents;
   } catch (error) {
      logErr(error, "Error fetching documents:");
      return [];
   }
 }

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

export async function fetchDocument(name: String, endol: EndOfLifeData, thresholds: Thresholds): Promise<ServiceDocument | null> {
   try {
      const db = getDb();
      const collection = db.collection<ServiceDocument>(config.MONGO_COLLECTION_PROJECTS!);

      const document = await collection.findOne({ name });
      
      if (document) {
         const langArray = [document.gitInfo.lang];

         for (const version of document.versions) {
            langArray.push(version.lang);
            if (version.runtime) {
               version.runtimeData = checkRuntimesVsEol(langArray, version.runtime.split(' '), endol, thresholds);
            }

            const deployments = [];
            if (version.version == document.ecs?.cidev?.version) {
               deployments.push('CI-Dev');
            }
            if (version.version == document.ecs?.staging?.version) {
               deployments.push('Staging');
            }
            if (version.version == document.ecs?.live?.version) {
               deployments.push('Live');
            }
            version.deployments = deployments;
         }

         // most recent versions first
         document.versions = document.versions.sort((a:any, b:any) => 
            semver.valid(a.version) && semver.valid(b.version) ? // if version is valid semver... 
            semver.compare(a.version, b.version) : // try and sort using semver...
            a.version.localeCompare(b.version) // else, use string comparison
         ).reverse();
         
         if (document.sonarMetrics) {
            if (Object.keys(document.sonarMetrics).length == 0) {
               document.sonarMetrics = null; // normalise to make things easier on the FE
            }
         }
      }

      return document;
   } catch (error) {
      logErr(error, "Error fetching documents:");
      return null;
   }
}

// Aggregate the documents by gitinfo.owner & keep the latest version only
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
               latestVersion: { $first: "$versions" },
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
                  latestVersion: "$latestVersion",
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
            if (service.sonarMetrics && Object.keys(service.sonarMetrics).length === 0) {
               // Some services have an empty object. Convert to null for consistency in the UI.
               service.sonarMetrics = null;
            }

            service.versions = service.latestVersion;

            const langArray = [service.gitInfo.lang];

            for (const version of service.versions) {
               langArray.push(version.lang);
               if (version.runtime) {
                  version.runtimeData = checkRuntimesVsEol(langArray, version.runtime.split(' '), endol, thresholds);
               }

               const deployments = [];
               if (version.version == service.ecs?.cidev?.version) {
                  deployments.push('CI-Dev');
                  service.ecs.cidev = {
                     ...service.ecs.cidev,
                     ...version
                  };
               }
               if (version.version == service.ecs?.staging?.version) {
                  deployments.push('Staging');
                  service.ecs.staging = {
                     ...service.ecs.staging,
                     ...version
                  };
               }
               if (version.version == service.ecs?.live?.version) {
                  deployments.push('Live');
                  service.ecs.live = {
                     ...service.ecs.live,
                     ...version
                  };
               }
               version.deployments = deployments;
            }

            // most recent versions first
            service.versions = service.versions.sort((a:any, b:any) => 
               semver.valid(a.version) && semver.valid(b.version) ? // if version is valid semver... 
               semver.compare(a.version, b.version) : // try and sort using semver...
               a.version.localeCompare(b.version) // else, use string comparison
            ).reverse();
            
            service.latestVersion = service.versions[0];

            if (!service.latestVersion.runtime) {
               return {
                  ...service,
                  latestVersion: {
                     ...service.latestVersion,
                     runtime: { total: 'yellow', runtime: [{ value: 'Unknown', color: 'yellow' }] }
                  }
               }
            }

            const runtimeStr = service.latestVersion.runtime;

            const runtimeColorResult = checkRuntimesVsEol(langArray, runtimeStr.split(' '), endol, thresholds);

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
            .sort()
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

async function getState(linkId: string|undefined): Promise<string> {
   let state = '';
   if (linkId !== undefined ) {
      try {
         const collection = getDb().collection(config.MONGO_COLLECTION_LINKS!);
         const objectId   = new ObjectId(linkId);
         const now = new Date()

         // 1.3 find the link and update its "lastUsed" timestamp to now
         const document = await collection.findOneAndUpdate(
            { _id: objectId },
            { $set: { lastUsed: now } },
            { returnDocument: 'after', session: getSession() }
         );

         // 2.3 get ready to return its state
         if (document) {
            logger.info(`Reading - state: ${document.state}`);
            state = document.state;
         }
         // 3.3 tidy up the collection (removing old entries)
         const cutoffDate = new Date(now.getTime() - MilliSecRetentionStateLinks);
         await collection.deleteMany(
            { lastUsed: { $lt: cutoffDate } },
            { session: getSession() }
          );
      } catch (error) {
         logger.info(`Error getting link state: ${error}`);
      }
   }
   return state;
}

async function addState(state: string): Promise<string | undefined> {
   let linkId = undefined;
   if (state) {
      try {
         const collection = getDb().collection(config.MONGO_COLLECTION_LINKS!);

         // Find the document with the matching state
         const document = await collection.findOneAndUpdate(
            { state: state },
            { $set: { lastUsed: new Date() } },
            {  returnDocument: 'after',
               upsert: true,  // upsert creates a new document if none exists
               session: getSession()
            }
         );
         if (document) {
               linkId = document._id.toString();
         }
      } catch (error) {
         logger.info(`Error creating link state: ${error}`);
      }
   }
   logger.info(`Returning id: ${linkId}`);
   return linkId;
}

export { fetchDocuments, fetchDocumentsGoupedByScrum, fetchConfig, getState, addState };
