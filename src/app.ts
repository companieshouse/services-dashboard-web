import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

import express, { Request, Response } from "express";
import { Db, MongoClient } from "mongodb";
import nunjucks from "nunjucks";
import * as filters from "./utils/date-filter";

interface QueryParameters {
   [name: string]: string[];
 }

const runningEnv = dotenv.config();
dotenvExpand.expand(runningEnv)

const mongoProtocol = process.env.MONGO_PROTOCOL;
const mongoUser = process.env.MONGO_USER;
const mongoPassword = process.env.MONGO_PASSWORD;
const mongoAuth = mongoUser ? `${mongoUser}:${mongoPassword}@` : "";
const mongoHostPort = process.env.MONGO_HOST_AND_PORT;
const mongoUri = `${mongoProtocol}://${mongoAuth}${mongoHostPort}`;

console.log(`MONGO URI: ${mongoUri}` );
const port = process.env.PORT;
const endpointDashboard = process.env.ENDPOINT_DASHBOARD;

const maxDaysRetentionStateLinks = Number(process.env.DAYS_RETENTION_STATE_LINKS);

const app = express();
app.use(express.static("public"));

// const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
const client = new MongoClient(mongoUri);

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

function  setSelfUrl (req: Request) : string {
       // Protocol (e.g.,)
      const protocol = req.protocol; //  "https"
      const fullHost = req.get("host");  // Full host "some_host:some_port"
      const originalUrl = req.originalUrl;  // The original URL path (e.g., "/endpoint1")

      // Full URL (e.g., "https://some_host:some_port/endpoint1")
      return `${protocol}://${fullHost}${originalUrl}`;
}


async function fetchDocuments(database: Db, queryParams?: QueryParameters, linkName?: string) {
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

 async function  getState (db: Db, linkName: string|undefined) :  Promise<string>  {
   let state = '';
   if (linkName !== undefined ) {
      const now = new Date()
      const collection = db.collection(process.env.MONGO_COLLECTION_CONFIG!);
      // 1. Search for the entry with "name" = "linkName" & also update its "lastUsed" to "now"
      const entry = await collection.findOneAndUpdate(
         { "state_links.name": linkName },
         { $set: { "state_links.$.lastUsed": now }}
      );

      if (entry) {
         // 2. Get its state link
         const stateLink = entry.state_links.find((link: any) => link.name === linkName);
         if (stateLink) {
             state = stateLink.state;
         }
      }
      // 3. Remove all entries whose "lastUsed" value is older than the defined time
      const maxAgeDate = new Date(now.getTime() - maxDaysRetentionStateLinks * 24 * 60 * 60 * 1000);

      await collection.updateMany(
            {},
            { $pull: { state_links: { lastUsed: { $lt: maxAgeDate } } } } as any
      );
   }
   return state;
}

app.get(endpointDashboard!, async (req: Request, res: Response) => {
   const query = req.query.query as string;
   const linkName = req.query.state as string;

   let queryParams: QueryParameters | undefined;
   if (query) {
      try {
         queryParams = JSON.parse(query);
      } catch (error) {
         res.status(400).json({ error: "Invalid JSON format for 'query' parameter." });
         return;
      }
   }
   try {
      await client.connect();
      const database = client.db(process.env.MONGO_DBNAME);
      const documents = await fetchDocuments(database, queryParams, linkName);
      const state     = await getState(database, linkName);
         res.render("dashboard.njk", {
            documents: documents,
            selfUrl: setSelfUrl(req),
         });
   } catch (error) {
      console.error(error);
   } finally {
      client.close();
   }
 });


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}/dashboard`);
});
