import nunjucksDate from "nunjucks-date-filter";

export const date = nunjucksDate;

export const daysAgo = (date: string | Date): string => {
    const currentDate = new Date();
    const targetDate = new Date(date);

    // Check if targetDate is valid.
      // This is useful when "date" is passed as a string
      // which may not be converted to a valid date
      // e.g. a != YYYY-MM-DD (ISO 8601) string
      // or a generic string: "aaaaa" / "false" / ....
      // - Formats != ISO 8601 (e.g. dd/mm/yyyy) may still be handled but are not guaranteed
    if (isNaN(targetDate.getTime())) {
      return "";   // ignore any unhandled strings
    }
    // Calculate time diff (milliseconds)
    const diffInTime = currentDate.getTime() - targetDate.getTime();

    // Convert to days
    const diffInDays = Math.floor(diffInTime / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return "today";
    } else if (diffInDays === 1) {
      return "yesterday";
    } else if (diffInDays < 0) {
      return `${Math.abs(diffInDays)} days from now`;
    } else {
      return `${diffInDays} days ago`;
    }
};

export const urlEncode = (arg: string): string => {
  return encodeURIComponent(arg);
};

// to store/set/get global variable(s) in nunjucks
const globalVars: { [key: string]: any } = {};
export const setGlobal = (value: any, name: string): void => {globalVars[name] = value;};
export const getGlobal = (name: string): any => {return globalVars[name];};
