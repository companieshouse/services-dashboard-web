import { getEnvironmentValue } from "../utils/env.value";

export const APPLICATION_NAME= "services-dashboard-web";
export const APP_TITLE = getEnvironmentValue("APP_TITLE", "Services Dashboard");
export const CDN_URL = getEnvironmentValue("CDN_URL","d3miau0r8stw5u.cloudfront.net");

export const DEP_TRACK_URI =  getEnvironmentValue("DEP_TRACK_SERVER","https://dependency-track.companieshouse.gov.uk");
export const SONAR_URI     =  getEnvironmentValue("SONAR_SERVER","https://code-analysis.platform.aws.chdev.org");

export const PORT = getEnvironmentValue("PORT");
export const endpointDashboard = getEnvironmentValue("ENDPOINT_DASHBOARD", "/dashboard" );
export const DAYS_RETENTION_STATE_LINKS = getEnvironmentValue("DAYS_RETENTION_STATE_LINKS", "15");

// MongoDB configuration
export const MONGO_PROTOCOL = getEnvironmentValue("MONGO_PROTOCOL", "mongodb+srv");
export const MONGO_USER     = getEnvironmentValue("MONGO_USER", "rand_dev");
export const MONGO_PASSWORD = getEnvironmentValue("MONGO_PASSWORD");
export const MONGO_AUTH = MONGO_USER ? `${MONGO_USER}:${MONGO_PASSWORD}@` : "";
export const MONGO_HOST_AND_PORT = getEnvironmentValue("MONGO_HOST_AND_PORT","ci-dev-pl-0.ueium.mongodb.net");
export const MONGO_URI = `${MONGO_PROTOCOL}://${MONGO_AUTH}${MONGO_HOST_AND_PORT}`;
export const MONGO_DB_NAME = getEnvironmentValue("MONGO_DB_NAME","services_dashboard");
export const MONGO_COLLECTION_PROJECTS = getEnvironmentValue("MONGO_COLLECTION_PROJECTS","projects");
export const MONGO_COLLECTION_CONFIG = getEnvironmentValue("MONGO_COLLECTION_CONFIG","config");
export const MONGO_COLLECTION_LINKS = getEnvironmentValue("MONGO_COLLECTION_LINKS","projects_links");
