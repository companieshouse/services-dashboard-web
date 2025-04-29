import { getEnvironmentValue } from "../utils/env.value";

export const APPLICATION_NAME= "services-dashboard-web";
export const APP_TITLE = getEnvironmentValue("APP_TITLE", "Services Dashboard");
export const CDN_URL = getEnvironmentValue("CDN_URL");

export const DEP_TRACK_URI =  getEnvironmentValue("DEP_TRACK_SERVER");
export const SONAR_URI     =  getEnvironmentValue("SONAR_SERVER");
export const EOL_URI       =  getEnvironmentValue("EOL_SERVER", "https://endoflife.date");

export const PORT = getEnvironmentValue("PORT","3000");
export const ENDPOINT_DASHBOARD = getEnvironmentValue("ENDPOINT_DASHBOARD", "/dashboard" );
export const DAYS_RETENTION_STATE_LINKS = getEnvironmentValue("DAYS_RETENTION_STATE_LINKS", "15");

// MongoDB configuration
export const MONGO_PROTOCOL = getEnvironmentValue("MONGO_PROTOCOL", "mongodb+srv");
export const MONGO_USER     = getEnvironmentValue("MONGO_USER");
export const MONGO_PASSWORD = getEnvironmentValue("MONGO_PASSWORD");
export const MONGO_AUTH = MONGO_USER ? `${MONGO_USER}:${MONGO_PASSWORD}@` : "";
export const MONGO_HOST_AND_PORT = getEnvironmentValue("MONGO_HOSTANDPORT");
export const MONGO_URI = `${MONGO_PROTOCOL}://${MONGO_AUTH}${MONGO_HOST_AND_PORT}`;
export const MONGO_DB_NAME = getEnvironmentValue("MONGO_DBNAME","services_dashboard");
export const MONGO_COLLECTION_PROJECTS = getEnvironmentValue("MONGO_COLLECTION_PROJECTS","projects");
export const MONGO_COLLECTION_CONFIG = getEnvironmentValue("MONGO_COLLECTION_CONFIG","config");
export const MONGO_COLLECTION_LINKS = getEnvironmentValue("MONGO_COLLECTION_LINKS","projects_links");
