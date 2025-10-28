import express, { Request, Response } from "express";
import { unzip } from 'zlib';
import { promisify } from 'util';
import nunjucks from "nunjucks";

import * as config from "./config";
import * as type from './common/types';
import {logger, logErr} from "./utils/logger";
import * as mongo from "./mongo/mongo";
import * as filters from "./utils/nunjucks-custom-filters";


// Convert the zlib.unzip function to return a promise using promisify
const unzipAsync = promisify(unzip);

export interface TabFunction {
   title: string;
   fun: (req: Request, res: Response) => void;
}

const app = express();
app.use(config.ENDPOINT_DASHBOARD, express.static("public"));
app.use(express.text());   // to parse text/plain requests



const nunjucksEnv = nunjucks.configure([
   "views",
   "node_modules/govuk-frontend",
   "node_modules/govuk-frontend/components"
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

// map tab-functions
const tabs = [
   { key: "overview", name: "Overview" },
   { key: "teams", name: "Teams" },
   { key: "runtimes", name: "Runtimes" },
];

// ex.
// https://......./dashboard/?query={"overs":["last"],"api":["last"]}
//                           ?query={"api":"*"}
//                           ?query={"*":"*"}
//                           ?query={"overs":"[1.1.340,1.1.348,1.1.364]"}
function sourceQueryParams(query: string): type.QueryParameters | undefined {
   let   queryParams: type.QueryParameters | undefined;
   if (query) {
      logger.info(`sourcing query: ${query}`);
      try {
         queryParams = JSON.parse(query);
      } catch (error) {
         throw new Error (`Invalid JSON format for 'query' parameter: ${error}`);
      }
      return queryParams;
   }
}

app.get(`${config.ENDPOINT_DASHBOARD}/healthcheck`, (req, res) => {
   res.status(200).send('OK');
 });

app.post(config.ENDPOINT_DASHBOARD!, async (req: Request, res: Response) => {
   try {
      const compressedState = req.body;
      const linkId = await mongo.addState( compressedState);
      (linkId !== undefined) ?
         res.send(linkId) :
         res.status(400).send('Error saving link');
   } catch (error) {
      logErr(error);
   }
});

// handler of main page
app.get(config.ENDPOINT_DASHBOARD!, async (req: Request, res: Response) => {
   try {
      const linkId = req.query.linkid as string;
      let   compressedState = "";
      if (linkId) {
            logger.info(`reading state from: ${linkId}`);
            compressedState = await mongo.getState(linkId);
      }

      const configData = await mongo.fetchConfig();
      res.render("index.njk", {
      title: config.APP_TITLE,
      basePath: config.ENDPOINT_DASHBOARD,
      lastScan: configData?.lastScan ?? "N/A",
      tabs,
      compressedState
   });
   } catch (error) {
      logErr(error);
   }
});

app.get(`${config.ENDPOINT_DASHBOARD!}/overview`, async (req: Request, res: Response) => {
   try {
      const linkId = req.query.linkid as string;
      let   query  = req.query.query  as string;
      let   compressedState = "";
      let   queryParams: type.QueryParameters | undefined;
      try {
         queryParams = sourceQueryParams(query);
      } catch (error) {
         res.status(400).json({ "error": `${error}` });
         return;
      }

      const configData = await mongo.fetchConfig();

      const documents = await mongo.fetchDocuments(queryParams);
      res.render("overview.njk", {
         basePath: config.ENDPOINT_DASHBOARD,
         lastScan: configData?.lastScan ?? "N/A",
         documents: documents,
         state: compressedState,
         depTrackUri: config.DEP_TRACK_URI,
         sonarUri: config.SONAR_URI
      });
   } catch (error) {
      logErr(error);
   }
});

app.get(`${config.ENDPOINT_DASHBOARD!}/teams`, async (req: Request, res: Response) => {
   try {
      const configData = await mongo.fetchConfig();
      const endols = configData?.endol ?? {};
      const thresholds = configData?.thresholds ?? {};

      const documents = await mongo.fetchDocumentsGoupedByScrum(endols, thresholds);
      res.render("teams.njk", {
         basePath: config.ENDPOINT_DASHBOARD,
         documents,
         endols,
         lastScan: configData?.lastScan ?? "N/A",
         thresholdsGitRelease: thresholds.gitRelease || thresholds.default,
         thresholdsCidev:     thresholds.cidev       || thresholds.default,
         thresholdsStaging:   thresholds.staging     || thresholds.default,
         thresholdsLive:      thresholds.live        || thresholds.default,
         depTrackUri: config.DEP_TRACK_URI,
         sonarUri: config.SONAR_URI
      });
   } catch (error) {
      logErr(error);
   }
});

// handler of "Services"-tab
async function tabServices (req: Request, res: Response) {
   try {
      const linkId = req.query.linkid as string;
      let   query  = req.query.query  as string;
      let   compressedState = "";
      let   queryParams: type.QueryParameters | undefined;
      try {
         queryParams = sourceQueryParams(query);
      } catch (error) {
         res.status(400).json({ "error": `${error}` });
         return;
      }

      const documents = await mongo.fetchDocuments(queryParams);
      res.render("tabs/tab-services.njk", {
         basePath: config.ENDPOINT_DASHBOARD,
         documents: documents,
         state: compressedState,
         depTrackUri: config.DEP_TRACK_URI,
         sonarUri: config.SONAR_URI
      });
   } catch (error) {
      logErr(error);
   }
 }

 // handler of "End of Life"-tab
async function tabEndol (req: Request, res: Response) {
   try {
      const configData = await mongo.fetchConfig();
      const endols = configData?.endol ?? {};
      res.render("tabs/tab-endol.njk", {
         basePath: config.ENDPOINT_DASHBOARD,
         eolUri: config.EOL_URI,
         endols
      });
   } catch (error) {
      logErr(error);
   }
}

// handler of "Product Owner"-tab
async function tabProdOwner (req: Request, res: Response) {
   try {
      const configData = await mongo.fetchConfig();
      const endols = configData?.endol ?? {};
      const thresholds = configData?.thresholds ?? {};

      const documents = await mongo.fetchDocumentsGoupedByScrum(endols, thresholds);
      res.render("tabs/tab-prodowner.njk", {
         basePath: config.ENDPOINT_DASHBOARD,
         documents,
         endols,
         thresholdsGitRelease: thresholds.gitRelease || thresholds.default,
         thresholdsCidev:     thresholds.cidev       || thresholds.default,
         thresholdsStaging:   thresholds.staging     || thresholds.default,
         thresholdsLive:      thresholds.live        || thresholds.default,
         depTrackUri: config.DEP_TRACK_URI,
         sonarUri: config.SONAR_URI
      });
   } catch (error) {
      logErr(error);
   }
}

 // Tab Routes
// app.get(`${config.ENDPOINT_DASHBOARD}/tab/:tabName`, (req: Request, res: Response) => {
//    const tabName = req.params.tabName;

//    if (tabsMap[tabName]) {
//        tabsMap[tabName].fun(req, res);
//    } else {
//       res.status(404).send('Tab not found');
//    }
// });

export default app;
