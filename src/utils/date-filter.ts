import nunjucksDate from "nunjucks-date-filter";
import moment from "moment";

export const date = nunjucksDate;

export const daysAgo = (date: string | Date): string => {
  const currentDate = moment();
  const targetDate = moment(date);
  const diffInDays = currentDate.diff(targetDate, "days");

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
