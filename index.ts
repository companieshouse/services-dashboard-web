import express, { Request, Response } from 'express';
import { MongoClient } from 'mongodb';

interface QueryParameters {
   [name: string]: string[];
 }

const app = express();
const port = 8083; // You can change this to any port you prefer

const uri = "mongodb://localhost:27017";
// const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const client = new MongoClient(uri);

async function fetchDocuments(queryParams?: QueryParameters) {
   try {
     await client.connect();
     const database = client.db("services_dashboard");
     const collection = database.collection("projects");

     let documents;
     if (!queryParams || queryParams.hasOwnProperty('*')) {
       // Return all documents if no queryParams are provided or if name is "*"
       documents = await collection.find({}).toArray();
     } else {
       // Build the regex queries for each name
       const namePatterns = Object.keys(queryParams).map(name => new RegExp(name, 'i'));

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
                  queryParams[matchingKey].includes('*'))) {
            filteredVersions = doc.versions.filter((v: any) => queryParams[matchingKey].includes(v.version));
         }
         // for versions: handle keyword "last" (meaning most recent "lastBomImport")
         if (queryParams[matchingKey].includes('last')) {
            const latestVersion = doc.versions.reduce((prev: any, current: any) =>
                (new Date(current.lastBomImport) > new Date(prev.lastBomImport)) ? current : prev
            );
            const versionExists = filteredVersions.some((item: any) => item.version === latestVersion.version);
            if (!versionExists) {
               filteredVersions.push(latestVersion);
            }
         }
         return {
           name: doc.name,
           versions: filteredVersions
         };
       }).filter(doc => doc !== null);
     }

     return documents;
   } catch (error) {
     console.error("Error fetching documents:", error);
     return [];
   } finally {
     await client.close();
   }
 }

 app.get('/dashboard', async (req: Request, res: Response) => {
   const query = req.query.query as string;

   let queryParams: QueryParameters | undefined;
   if (query) {
     try {
       queryParams = JSON.parse(query);
     } catch (error) {
       res.status(400).json({ error: "Invalid JSON format for 'query' parameter." });
       return;
     }
   }

   const documents = await fetchDocuments(queryParams);
   res.json(documents);
 });


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
