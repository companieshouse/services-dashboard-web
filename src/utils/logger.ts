import { createLogger } from "@companieshouse/structured-logging-node";
import { APPLICATION_NAME } from "../config";

const logger = createLogger(APPLICATION_NAME);

function logErr(error: any, msg: string = "" ) {
  let errorMessage: string;
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    errorMessage = "";
  }

  logger.error(`${msg}(${errorMessage})`);
}

export { logger, logErr};