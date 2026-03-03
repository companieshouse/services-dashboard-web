// Tests for nunjucks-custom-filters.ts
import {
  date,
  daysAgo,
  daysPassed,
  urlEncode,
  isEmpty,
  setGlobal,
  getGlobal
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
    it('returns "today" for current date', () => {
      const today = new Date();
      expect(daysAgo(today)).toBe('today');
    });
    it('returns "yesterday" for one day ago', () => {
      const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24);
      expect(daysAgo(yesterday)).toBe('yesterday');
    });
    it('returns "N days ago" for past dates', () => {
      const days = 5;
      const past = new Date(Date.now() - days * 1000 * 60 * 60 * 24);
      expect(daysAgo(past)).toBe(`${days} days ago`);
    });
    it('returns "N days from now" for future dates', () => {
      const days = 3;
      const future = new Date(Date.now() + days * 1000 * 60 * 60 * 24);
      expect(daysAgo(future)).toBe(`${days} days from now`);
    });
    it('returns empty string for invalid date', () => {
      expect(daysAgo('not-a-date')).toBe('');
    });
  });

  describe('daysPassed', () => {
    it('returns correct number of days for past date', () => {
      const days = 7;
      const past = new Date(Date.now() - days * 1000 * 60 * 60 * 24);
      expect(daysPassed(past)).toBe(days);
    });
    it('returns NaN for invalid date', () => {
      expect(daysPassed('invalid')).toBeNaN();
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
