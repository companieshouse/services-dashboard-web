import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

import express, { Request, Response } from "express";
import { Db, MongoClient, ObjectId } from "mongodb";
import nunjucks from "nunjucks";
import * as filters from "./utils/date-filter";

interface QueryParameters {
   [name: string]: string[];
 }

const runningEnv = dotenv.config();
dotenvExpand.expand(runningEnv)

const MONGO_PROTOCOL = process.env.MONGO_PROTOCOL;
const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASSWORD = process.env.MONGO_PASSWORD;
const MONGO_AUTH = MONGO_USER ? `${MONGO_USER}:${MONGO_PASSWORD}@` : "";
const MONGO_HOST_AND_PORT = process.env.MONGO_HOST_AND_PORT;
const MONGO_URI = `${MONGO_PROTOCOL}://${MONGO_AUTH}${MONGO_HOST_AND_PORT}`;

const DEP_TRACK_URI =  process.env.DEP_TRACK_SERVER;
const SONAR_URI     =  process.env.SONAR_SERVER;

const PORT = process.env.PORT;
const endpointDashboard = process.env.ENDPOINT_DASHBOARD;

const MilliSecRetentionStateLinks = Number(process.env.DAYS_RETENTION_STATE_LINKS) * 24 * 60 * 60 * 1000;

const app = express();
app.use(express.static("public"));

const mongoClient = new MongoClient(MONGO_URI);

const nunjucksEnv = nunjucks.configure([
   "views",
   "node_modules/govuk-frontend",
   "node_modules/govuk-frontend/components"
 ], {
   autoescape: true,
   express: app,
 });

 nunjucksEnv.addGlobal("CDN_HOST", process.env.CDN_URL);

 // Add the date filter
nunjucksEnv.addFilter("date", filters.date);
nunjucksEnv.addFilter("daysAgo", filters.daysAgo);

async function fetchDocuments(database: Db, queryParams?: QueryParameters) {
   try {
      const collection = database.collection(process.env.MONGO_COLLECTION_PROJECTS!);

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
      console.error("Error fetching documents:", error);
      return [];
   }
 }


async function getState(db: Db, linkId: string|undefined): Promise<string> {
   let state = '';
   if (linkId !== undefined ) {
      try {
         const collection = db.collection(process.env.MONGO_COLLECTION_LINKS!);
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
            console.log(`Reading - state: ${document.state}`);
            state = document.state;
         }
         // 3.3 tidy up the collection (removing old entries)
         const cutoffDate = new Date(now.getTime() - MilliSecRetentionStateLinks);
         await collection.deleteMany({ lastUsed: { $lt: cutoffDate } });

      } catch (error) {
         console.log(`Error getting link state: ${error}`);
      }
   }
   return state;
}

async function addState(db: Db, state: string): Promise<string | undefined> {
   let linkId = undefined;
   if (state) {
      try {
         const collection = db.collection(process.env.MONGO_COLLECTION_LINKS!);

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
         console.log(`Error creating link state: ${error}`);
      }
   }
   console.log(`Returning id: ${linkId}`);
   return linkId;
}

app.get(endpointDashboard!, async (req: Request, res: Response) => {
   const saveState = req.query.savestate as string;

   try {
      await mongoClient.connect();
      const database = mongoClient.db(process.env.MONGO_DB_NAME);
      if (saveState) {
            console.log('Received string: ',saveState);
            const linkId = await addState(database, saveState);
            (linkId !== undefined) ?
               res.send(linkId) :
               res.status(400).send('Error saving link');
      }
      else {
         const query     = req.query.query as string;
         const linkId    = req.query.linkid as string;
         let   state     = '';
         let queryParams: QueryParameters | undefined;
         if (query) {
            try {
               queryParams = JSON.parse(query);
            } catch (error) {
               res.status(400).json({ "error": `Invalid JSON format for 'query' parameter: ${error}` });
               return;
            }
         }
         if (linkId) {
            console.log('reading state from: ',linkId);
            state = await getState(database, linkId);
            console.log('ready with state: ',state);
         }
         const documents = await fetchDocuments(database, queryParams);
         res.render("dashboard.njk", {
            documents: documents,
            state: state,
            depTrackUri: DEP_TRACK_URI,
            sonarUri: SONAR_URI,
         });
      }
   } catch (error) {
      console.error(error);
   } finally {
      mongoClient.close();
   }
 });

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/dashboard`);
});
