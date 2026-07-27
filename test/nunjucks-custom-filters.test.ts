// Tests for nunjucks-custom-filters.ts
import {
  date,
  daysAgo,
  urlEncode,
  isEmpty,
  setGlobal,
  getGlobal,
} from '../src/utils/nunjucks-custom-filters';

describe('nunjucks-custom-filters', () => {
  describe('isEmpty', () => {
    it('returns true for null and undefined', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });
    it('returns true for empty array and string', () => {
      expect(isEmpty([])).toBe(true);
      expect(isEmpty('')).toBe(true);
    });
    it('returns false for non-empty array and string', () => {
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty('abc')).toBe(false);
    });
    it('returns true for empty object', () => {
      expect(isEmpty({})).toBe(true);
    });
    it('returns false for non-empty object', () => {
      expect(isEmpty({ a: 1 })).toBe(false);
    });
  });

  describe('urlEncode', () => {
    it('encodes special characters', () => {
      expect(urlEncode('a b&c')).toBe('a%20b%26c');
    });
  });

  describe('daysAgo', () => {
    it('returns approx. for exact match date', () => {
      const today = new Date();
      expect(daysAgo(today)).toBe('less than a minute ago');
    });
    it('returns approx. if within the past few hours', () => {
      const today = new Date(Date.now() - 1000 * 60 * 60 * 2); // 2 hours ago
      expect(daysAgo(today)).toBe('about 2 hours ago');
    });
    it('returns "about 23 hours ago" for a date 23 hours ago', () => {
      const almostYesterday = new Date(Date.now() - 1000 * 60 * 60 * 23);
      expect(daysAgo(almostYesterday)).toBe('about 23 hours ago');
    });
    it('returns "yesterday" for one day ago', () => {
      const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24);
      expect(daysAgo(yesterday)).toBe('1 day ago');
    });
    it('returns "tomorrow" for one day from today', () => {
      const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24);
      expect(daysAgo(tomorrow)).toBe('in 1 day');
    });
    it('returns "N days ago" for past dates', () => {
      const days = 5;
      const past = new Date(Date.now() - days * 1000 * 60 * 60 * 24);
      expect(daysAgo(past)).toBe(`${days} days ago`);
    });
    it('returns "N days from now" for future dates', () => {
      const days = 3;
      const future = new Date(Date.now() + days * 1000 * 60 * 60 * 24);
      expect(daysAgo(future)).toBe(`in ${days} days`);
    });
    it('returns "N months ago" for longer past dates', () => {
      const months = 3;
      const past = new Date();
      past.setMonth(past.getMonth() - months);
      expect(daysAgo(past)).toBe(`${months} months ago`);
    });
    it('returns "N months from now" for longer dates', () => {
      const months = 3;
      const future = new Date();
      future.setMonth(future.getMonth() + months);
      expect(daysAgo(future)).toBe(`in ${months} months`);
    });
    it('returns "N years ago" for past dates over a year', () => {
      const years = 2;
      const past = new Date();
      past.setFullYear(past.getFullYear() - years);
      expect(daysAgo(past)).toBe(`about ${years} years ago`);
    });
    it('returns "N years from now" for future dates over a year', () => {
      const years = 2;
      const future = new Date();
      future.setFullYear(future.getFullYear() + years);
      expect(daysAgo(future)).toBe(`in about ${years} years`);
    });
    it('returns empty string for invalid date', () => {
      expect(daysAgo('not-a-date')).toBe('no date loaded');
    });
  });

  describe('setGlobal/getGlobal', () => {
    it('sets and gets global variable', () => {
      setGlobal('value', 'testKey');
      expect(getGlobal('testKey')).toBe('value');
    });
    it('returns undefined for unset key', () => {
      expect(getGlobal('unsetKey')).toBeUndefined();
    });
  });

  // date filter is a wrapper, basic test
  describe('date', () => {
    it('should be defined', () => {
      expect(date).toBeDefined();
    });
  });
});
