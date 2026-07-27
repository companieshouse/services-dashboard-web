import nunjucksDate from "nunjucks-date-filter";
import { formatDistanceToNow, differenceInHours } from "date-fns";

export const date = nunjucksDate;

export const daysAgo = (date: string | Date): string => {
    try {
      const parsed = new Date(date);
      // Fudge the "today" definition to include any date within the last 24 hours, not just the exact current date.
      if (differenceInHours(new Date(), parsed) < 24 && differenceInHours(new Date(), parsed) >= 0) {
        return 'today';
      }
      return formatDistanceToNow(parsed, { addSuffix: true });
    } catch (error) {
      console.debug(`Error in daysAgo filter: ${error} for date: ${date}`);
      return '';
    }
};

export const urlEncode = (arg: string): string => {
  return encodeURIComponent(arg);
};

export const isEmpty = (obj: any): boolean => {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  return Object.keys(obj).length === 0;
}

// to store/set/get global variable(s) in nunjucks
const globalVars: { [key: string]: any } = {};
export const setGlobal = (value: any, name: string): void => {globalVars[name] = value;};
export const getGlobal = (name: string): any => {return globalVars[name];};
