import express, { Request, Response } from 'express';
import { MongoClient } from 'mongodb';

const app = express();
const port = 8083; // You can change this to any port you prefer

const uri = "mongodb://localhost:27017";
// const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const client = new MongoClient(uri);

async function fetchDocuments() {
  try {
    await client.connect();
    const database = client.db("services_dashboard");
    const collection = database.collection("projects");
    const documents = await collection.find({}).toArray();
    return documents;
  } catch (error) {
    console.error("Error fetching documents:", error);
    return [];
  } finally {
    await client.close();
  }
}

app.get('/dashboard', async (req: Request, res: Response) => {
  const documents = await fetchDocuments();
  res.json(documents);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

