import request from 'supertest';
import * as config from '../src/config';
import { fetchConfig, fetchDocument, fetchDocumentsGoupedByScrum, fetchStats } from '../src/mongo/mongo';
import * as dbModule from "../src/mongo/db";
import  app, { resetStatsCache }  from '../src/app';

jest.mock('../src/mongo/db');
jest.mock('../src/mongo/mongo');
jest.mock('../src/utils/logger');

describe('App Tests', () => {
    const mockCollection = {
        findOne: jest.fn()
    };

    const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        jest.spyOn(dbModule, "getDb").mockReturnValue(mockDb as any);
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    it('should handle GET request for healthcheck', async () => {
        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/healthcheck`);

        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
    });

    it('should handle GET request for Services tab', async () => {
        (fetchDocumentsGoupedByScrum as jest.Mock).mockResolvedValue([]);
        (fetchConfig as jest.Mock).mockResolvedValue({lastScan: Date.now()});

        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/`);

        expect(response.status).toBe(200);
        expect(fetchDocumentsGoupedByScrum).toHaveBeenCalled();
    });

    it('should handle GET request for Help tab', async () => {
        (fetchConfig as jest.Mock).mockResolvedValue({lastScan: Date.now()});

        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/help`);

        expect(response.status).toBe(200);
    });

    it('should handle GET request for Runtimes tab', async () => {
        const endol = {
            go: [{ cycle: "1.26", releaseDate: "2026-02-11", lts: "false", eol: "false", latest: "1.26.0", }],
            nodejs: [{ cycle: "24", releaseDate: "2026-01-01", lts: "2025-10-28", eol: "2028-12-31", latest: "24.14.0", }],
            amazon_corretto: [{ cycle: "25", releaseDate: "2025-09-16", lts: "true", eol: "2032-02-01", latest: "25.0.2.10.1", }],
        };
        
        (fetchConfig as jest.Mock).mockResolvedValue({ endol, lastScan: Date.now() });

        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/runtimes`);

        expect(response.status).toBe(200);
        expect(fetchConfig).toHaveBeenCalled();
    });

    it('should return 404 for unknown tab', async () => {
        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/unknown`);

        expect(response.status).toBe(404);
        expect(response.text).toContain("Page Not Found");
    });

    it('should handle GET request for help page with linkId', async () => {
        const linkId = 'linkId';

        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/help?linkid=${linkId}`);

        expect(response.status).toBe(200);
    });

    it('should handle GET request for help page without linkId', async () => {
        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD!}/help`);

        expect(response.status).toBe(200);
        expect(response.text).toContain(config.APP_TITLE);
    });

    it('should handle GET request for a service', async () => {
        const serviceName = 'some-service-name';
        (fetchDocument as jest.Mock).mockResolvedValue({name: serviceName});
        (fetchConfig as jest.Mock).mockResolvedValue({lastScan: Date.now()});
        
        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD!}/service/${serviceName}`);

        expect(response.status).toBe(200);
        expect(fetchDocument).toHaveBeenCalled();
        expect(response.text).toContain(serviceName);
    });

    it('should display error message for a missing service', async () => {
        (fetchConfig as jest.Mock).mockResolvedValue({lastScan: Date.now()});
        (fetchDocument as jest.Mock).mockResolvedValue(null); //missing
        
        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD!}/service/missing`);

        expect(response.status).toBe(200);
        expect(fetchDocument).toHaveBeenCalled();
        expect(response.text).toContain(`We couldn't find that service.`);
    });

    it('should handle GET request for Statistics tab', async () => {
        (fetchConfig as jest.Mock).mockResolvedValue({lastScan: Date.now()});

        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/stats`);

        expect(response.status).toBe(200);
    });

    describe('Stats cache', () => {
        const mockStats = [{ _id: 'teamA', services: [] }];
        // Use a fixed base time far in the future so any real cachedAt from outside this block is always stale
        const BASE_TIME = 1e15;
        let dateNowSpy: jest.SpyInstance;

        beforeEach(() => {
            resetStatsCache();
            dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(BASE_TIME);
            (fetchConfig as jest.Mock).mockResolvedValue({ lastScan: BASE_TIME });
            (fetchStats as jest.Mock).mockResolvedValue(mockStats);
        });

        afterEach(() => {
            dateNowSpy.mockRestore();
        });

        it('fetches from the database on a cold cache', async () => {
            const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/stats`);

            expect(response.status).toBe(200);
            expect(fetchStats).toHaveBeenCalledTimes(1);
            expect(response.text).toContain('Stats data last fetched from the database');
        });

        it('serves from cache on subsequent requests within TTL', async () => {
            await request(app).get(`${config.ENDPOINT_DASHBOARD}/stats`);
            jest.clearAllMocks();
            (fetchConfig as jest.Mock).mockResolvedValue({ lastScan: BASE_TIME });

            await request(app).get(`${config.ENDPOINT_DASHBOARD}/stats`);

            expect(fetchStats).not.toHaveBeenCalled();
        });

        it('re-fetches after TTL expires', async () => {
            await request(app).get(`${config.ENDPOINT_DASHBOARD}/stats`);
            dateNowSpy.mockReturnValue(BASE_TIME + 31 * 60 * 1000);
            (fetchStats as jest.Mock).mockResolvedValue(mockStats);

            await request(app).get(`${config.ENDPOINT_DASHBOARD}/stats`);

            expect(fetchStats).toHaveBeenCalledTimes(2);
        });
    });
});