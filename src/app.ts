import express, { Request, Response } from "express";
import nunjucks from "nunjucks";

import * as config from "./config";
import { logErr} from "./utils/logger";
import * as mongo from "./mongo/mongo";
import * as filters from "./utils/nunjucks-custom-filters";

export interface TabFunction {
   title: string;
   fun: (req: Request, res: Response) => void;
}

const path = require('path');
console.log('pathname:', path.join(__dirname, '../node_modules/govuk-frontend/dist/govuk'));

const app = express();
app.use(config.ENDPOINT_DASHBOARD, express.static("public"));
app.use('/assets', express.static(path.join(__dirname, '../node_modules/govuk-frontend/dist/govuk/assets')));
app.use('/css', express.static(path.join(__dirname, '../node_modules/govuk-frontend/dist/govuk')));
app.use('/javascript', express.static(path.join(__dirname, '../node_modules/govuk-frontend/dist/govuk')));
app.use(express.text());   // to parse text/plain requests


const nunjucksEnv = nunjucks.configure([
   "views",
   "node_modules/govuk-frontend/dist"
 ], {
   autoescape: true,
   express: app,
 });

nunjucksEnv.addGlobal("CDN_HOST", config.CDN_URL);

 // Add custom filters
nunjucksEnv.addFilter("date", filters.date);
nunjucksEnv.addFilter("daysAgo", filters.daysAgo);
nunjucksEnv.addFilter("daysPassed", filters.daysPassed);
nunjucksEnv.addFilter("setGlobal", filters.setGlobal);

nunjucksEnv.addGlobal("getGlobal", filters.getGlobal); 

app.get(`${config.ENDPOINT_DASHBOARD}/healthcheck`, (_, res) => {
   res.status(200).send('OK');
});

// Main page
app.get(config.ENDPOINT_DASHBOARD!, async (req, res) => {
   try {
      const name = req.query.search as string;
      const teamFilter = req.query.team as string;
      const team = teamFilter === 'All' ? '' : teamFilter;
   
      const documents = await mongo.fetchDocuments({ team, name });
      const configData = await mongo.fetchConfig();

      const uniqueTeams = documents.map(d => d.gitInfo.owner) // create a list of all owners
         .filter((team, i, self) => self.indexOf(team) === i) // make that list unique
         .filter( i => i ); // remove any undefined values

      uniqueTeams.unshift('All');

      res.render("dashboard.njk", {
         title: config.APP_TITLE,
         basePath: config.ENDPOINT_DASHBOARD,
         lastScan: configData?.lastScan ?? "",
         documents: documents,
         allTeams: uniqueTeams,
         depTrackUri: config.DEP_TRACK_URI,
         sonarUri: config.SONAR_URI
      });
   } catch (error) {
      logErr(error);
   }
});

// End of Life page
app.get(config.ENDPOINT_DASHBOARD! + "/eol", async (_: Request, res: Response) => {
   try {
      const configData = await mongo.fetchConfig();
      const endols = configData?.endol ?? {};
      res.render("eol.njk", {
         title: config.APP_TITLE,
         basePath: config.ENDPOINT_DASHBOARD,
         lastScan: configData?.lastScan ?? "",
         documents: await mongo.fetchDocuments(),
         endols,
      });
   } catch (error) {
      logErr(error);
   }
});

export default app;
