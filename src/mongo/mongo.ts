import { Db, MongoClient, ObjectId } from "mongodb";

import * as config from "../config";
import * as type from '../common/types';
import {logger, logErr} from "../utils/logger";

const MilliSecRetentionStateLinks = Number(config.DAYS_RETENTION_STATE_LINKS) * 24 * 60 * 60 * 1000;

// logger.info(`======Reading - Mongo URL: [${config.MONGO_URI}]`);

const mongoClient = new MongoClient(config.MONGO_URI, {
   minPoolSize: 1,
   waitQueueTimeoutMS: 5000
 });

 let database: Db;


async function init() {
   try {
      console.log(`connecting to Mongo: ${config.MONGO_URI}`)

      await mongoClient.connect();
      database = mongoClient.db(config.MONGO_DB_NAME);
   }
   catch(error) {
      console.error("Error connecting to Mongo:", error);
   }
}

function close() {
   mongoClient.close();
}

 async function fetchDocuments(queryParams?: type.QueryParameters) {
   try {
      const collection = database.collection(config.MONGO_COLLECTION_PROJECTS!);

      let documents;
      // Return all documents if no queryParams are provided or if name is "*"
      if (!queryParams || queryParams.hasOwnProperty("*")) {
         documents = await collection.find({}).sort({ name: 1 }).toArray();
      } else {
         // Build the regex queries for each name
         const namePatterns = Object.keys(queryParams).map(name => new RegExp(name, "i"));

         // Find the documents by names using regex
         documents = await collection.find({ name: { $in: namePatterns } }).toArray();

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

 async function fetchConfig() {
   try {
      const collection = database.collection(config.MONGO_COLLECTION_CONFIG!);
      const configData = await collection.findOne({});
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
         const collection = database.collection(config.MONGO_COLLECTION_LINKS!);
         const objectId   = new ObjectId(linkId);
         const now = new Date()

         // 1.3 find the link and update its "lastUsed" timestamp to now
         const document = await collection.findOneAndUpdate(
            { _id: objectId },
            { $set: { lastUsed: now } },
            { returnDocument: 'after' }
         );

         // 2.3 get ready to return its state
         if (document) {
            logger.info(`Reading - state: ${document.state}`);
            state = document.state;
         }
         // 3.3 tidy up the collection (removing old entries)
         const cutoffDate = new Date(now.getTime() - MilliSecRetentionStateLinks);
         await collection.deleteMany({ lastUsed: { $lt: cutoffDate } });

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
         const collection = database.collection(config.MONGO_COLLECTION_LINKS!);

         // Find the document with the matching state
         const document = await collection.findOneAndUpdate(
            { state: state },
            { $set: { lastUsed: new Date() } },
            { returnDocument: 'after', upsert: true } // upsert creates a new document if none exists
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

export { init, close, fetchDocuments, fetchConfig, getState, addState };