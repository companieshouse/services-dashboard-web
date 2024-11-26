import express, { Request, Response } from "express";
import { unzip } from 'zlib';
import { promisify } from 'util';
import nunjucks from "nunjucks";

import * as config from "./config";
import * as type from './common/types';
import {logger, logErr} from "./utils/logger";
import * as mongo from "./mongo/mongo";
import * as filters from "./utils/date-filter";


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

 // Add the date filter
nunjucksEnv.addFilter("date", filters.date);
nunjucksEnv.addFilter("daysAgo", filters.daysAgo);

// map tab-functions
const tabsMap: Record<string, TabFunction> = {
  endol: { 
    title: "End of Life", 
    fun: tabEndol 
  },
  services: { 
   title: "Services", 
   fun: tabServices 
 },
 productowner: { 
    title: "Product Owner", 
    fun: tabProductOwner 
  }
};

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
      await mongo.init();
      const linkId = await mongo.addState( compressedState);
      (linkId !== undefined) ?
         res.send(linkId) :
         res.status(400).send('Error saving link');
   } catch (error) {
      logErr(error);
   } finally {
      mongo.close();
   }
});

// handler of main page
app.get(config.ENDPOINT_DASHBOARD!, async (req: Request, res: Response) => {
   const linkId = req.query.linkid as string;
   let   compressedState = "";
   if (linkId) {
      try {
         await mongo.init();
         logger.info(`reading state from: ${linkId}`);
         compressedState = await mongo.getState(linkId);
      } catch (error) {
         logErr(error);
      } finally {
         mongo.close();
      }
   }

   const tabs = Object.entries(tabsMap).map(([key, value]) => {
      return { key, title: value.title };
      });

   res.render("main.njk", {
      title: config.APP_TITLE,
      basePath: config.ENDPOINT_DASHBOARD,
      tabs,
      compressedState
   });
});

// handler of "Services"-tab
async function tabServices (req: Request, res: Response) {
   try {
      await mongo.init();
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
      const configData = await mongo.fetchConfig();
      res.render("tabs/tab-services.njk", {
         basePath: config.ENDPOINT_DASHBOARD,
         config: configData,
         documents: documents,
         state: compressedState,
         depTrackUri: config.DEP_TRACK_URI,
         sonarUri: config.SONAR_URI
      });
   } catch (error) {
      logErr(error);
   } finally {
      mongo.close();
   }
 }

 // handler of "End of Life"-tab
async function tabEndol (req: Request, res: Response) {
   try {
      await mongo.init();
      const configData = await mongo.fetchConfig();
      const endols = configData?.endol ?? {};
      res.render("tabs/tab-endol.njk", {
         basePath: config.ENDPOINT_DASHBOARD, 
         endols
      });
   } catch (error) {
      logErr(error);
   } finally {
      mongo.close();
   }
}

// handler of "Product Owner"-tab
async function tabProductOwner (req: Request, res: Response) {
}

 // Tab Routes
app.get(`${config.ENDPOINT_DASHBOARD}/tab/:tabName`, (req: Request, res: Response) => {
   const tabName = req.params.tabName;
   if (tabsMap[tabName]) {
       tabsMap[tabName].fun(req, res); 
   } else {
      res.status(404).send('Tab not found');
   }
});

export default app;