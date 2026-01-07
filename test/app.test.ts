import request from 'supertest';
import * as config from '../src/config';
import { fetchConfig, fetchDocument, fetchDocumentsGoupedByScrum, getState, fetchDocuments } from '../src/mongo/mongo';
import * as dbModule from "../src/mongo/db";
import  app  from '../src/app';

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
        (fetchDocuments as jest.Mock).mockResolvedValue([]);
        (fetchConfig as jest.Mock).mockResolvedValue({lastScan: Date.now()});

        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/details`);

        expect(response.status).toBe(200);
        expect(fetchDocuments).toHaveBeenCalled();
    });

    it('should handle GET request for Runtimes tab', async () => {
        (fetchConfig as jest.Mock).mockResolvedValue({ endol: {}, lastScan: Date.now() });

        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/runtimes`);

        expect(response.status).toBe(200);
        expect(fetchConfig).toHaveBeenCalled();
    });

    it('should return 404 for unknown tab', async () => {
        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/unknown`);

        expect(response.status).toBe(404);
        expect(response.text).toContain("Page Not Found");
    });

    it('should handle GET request for main page with linkId', async () => {
        const linkId = 'linkId';
        const compressedState = 'compressedState';
        (getState as jest.Mock).mockResolvedValue(compressedState);

        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/?linkid=${linkId}`);

        expect(response.status).toBe(200);
        expect(getState).toHaveBeenCalledWith(linkId);
    });

    it('should handle GET request for main page without linkId', async () => {
        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD!}/`);

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
});