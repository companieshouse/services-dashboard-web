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

async function fetchDocumentsByNamesAndVersions(queryParams: QueryParameters) {
   try {
     await client.connect();
     const database = client.db("services_dashboard");
     const collection = database.collection("projects");

     // Build the regex queries for each name
     const namePatterns = Object.keys(queryParams).map(name => new RegExp(name, 'i'));

     // Find the documents by names using regex
     const documents = await collection.find({ name: { $in: namePatterns } }).toArray();

     // Filter the versions for each document
     const result = documents.map(doc => {
       const matchingKey = Object.keys(queryParams).find(key => doc.name.toLowerCase().includes(key.toLowerCase()));
       if (!matchingKey) {
         return null;
       }
       const filteredVersions = doc.versions.filter((v: any) => queryParams[matchingKey].includes(v.version));
       return {
         name: doc.name,
         versions: filteredVersions
       };
     }).filter(doc => doc !== null);

     return result;
   } catch (error) {
     console.error("Error fetching documents:", error);
     return [];
   } finally {
     await client.close();
   }
 }

app.get('/dashboard', async (req: Request, res: Response) => {
   const query = req.query.query as string;

   if (!query) {
     res.status(400).json({ error: "'query' parameter is required." });
     return;
   }

   let queryParams: QueryParameters;
   try {
     queryParams = JSON.parse(query);
   } catch (error) {
     res.status(400).json({ error: "Invalid JSON format for 'query' parameter." });
     return;
   }

   const documents = await fetchDocumentsByNamesAndVersions(queryParams);
   res.json(documents);
 });


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
