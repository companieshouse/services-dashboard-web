import { Db, MongoClient, ClientSession } from "mongodb";

import * as config from "../config";
import {logger, logErr} from "../utils/logger";
import {checkRuntimesVsEol, EndOfLifeData, Thresholds} from "../utils/check-eol";
import { Doc } from "common/types";

let mongoClient: MongoClient;
let database: Db;
let mongoSession: ClientSession;

async function init() {
   try {
      logger.info(`connecting to Mongo: ${config.MONGO_HOST_AND_PORT}`);
      mongoClient = new MongoClient(config.MONGO_URI);
      await mongoClient.connect();
      database = mongoClient.db(config.MONGO_DB_NAME);
      mongoSession = mongoClient.startSession();
   } catch (error) {
      logger.error(`Error connecting to Mongo: ${(error as Error).message}`);
   }
}

async function close() {
   try {
      await mongoSession.endSession();
      await mongoClient.close();
      logger.info("Mongo connection closed.");
   } catch (error) {
      logger.error(`Error closing Mongo connection: ${(error as Error).message}`);
   }
}



async function fetchDocuments(queryParams?: { name?: string; team?: string }): Promise<Doc[]> {
   try {
      const collection = database.collection(config.MONGO_COLLECTION_PROJECTS!);
      const mongoQuery: any = {};

      // Apply team filter if provided
      if (queryParams?.team) {
         mongoQuery["gitInfo.owner"] = queryParams.team;
      }

      // Apply name search filter if provided
      if (queryParams?.name) {
         mongoQuery["name"] = { $regex: new RegExp(queryParams.name, "i") };
      }

      const rawDocs = await collection.find(mongoQuery, { session: mongoSession }).sort({ name: 1 }).toArray();

      const documents = rawDocs.map(doc => {
         doc.versions.sort((a: any, b: any) => a.version.localeCompare(b.version));

         doc.versions.forEach((version: any) => {
            if (version.runtime) {
               version.runtime = version.runtime.split(" ");
            }
         });

         return {
            ...doc,
            _id: doc._id,
            versions: doc.versions,
            gitInfo: doc.gitInfo,
         } as Doc;
      });

      return documents;
   } catch (error) {
      logErr(error, "Error fetching documents:");
      return [];
   }
}

// Aggregate the documents by gitinfo.owner & keep the latest version only
async function fetchDocumentsGoupedByScrum(endol: EndOfLifeData, thresholds: Thresholds) {
   try {
      const collection = database.collection(config.MONGO_COLLECTION_PROJECTS!);

      const documents = await collection.aggregate([
         {
            $unwind: "$versions"
         },
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
            $project: {
              _id: 1,
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
      ], { session: mongoSession }).toArray(); // cursor --> array
      // console.log(JSON.stringify(documents, null, 2));

      const transformedDocuments = documents.map((team) => ({
         ...team,
         services: team.services.map((service: any) => {
            if (service.latestVersion?.runtime) {
               const runtimeStr = service.latestVersion.runtime;
               const langArray = [service.latestVersion.lang, service.gitInfo.lang];
               //   console.log(`-------------- runtimeStr: ${runtimeStr}`);

               const runtimeColorResult = checkRuntimesVsEol(langArray, runtimeStr.split(' '), endol, thresholds);

               return {
                     ...service,
                     latestVersion: {
                        ...service.latestVersion,
                        runtime: runtimeColorResult,
                     },
               };
            }
            return service;
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
      const collection = database.collection(config.MONGO_COLLECTION_CONFIG!);
      const configData = await collection.findOne({}, { session: mongoSession });
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

export { init, close, fetchDocuments, fetchDocumentsGoupedByScrum, fetchConfig };