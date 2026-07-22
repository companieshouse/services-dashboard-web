import nunjucksDate from "nunjucks-date-filter";
import { formatDistanceToNow } from "date-fns";

export const date = nunjucksDate;

export const daysAgo = (date: string | Date): string => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (error) {
      console.error(`Error in daysAgo filter: ${error} for date: ${date}`);
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
