import request from 'supertest';
import * as config from '../src/config';
import * as mongo from '../src/mongo/mongo';
import  app  from '../src/app';

jest.mock('../src/mongo/mongo');
jest.mock('../src/utils/logger');

describe('App Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
        (mongo.init as jest.Mock).mockResolvedValue(undefined);
        (mongo.fetchDocuments as jest.Mock).mockResolvedValue([]);
        (mongo.fetchConfig as jest.Mock).mockResolvedValue({});
        (mongo.close as jest.Mock).mockResolvedValue(undefined);

        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/details`);

        expect(response.status).toBe(200);
        expect(mongo.fetchDocuments).toHaveBeenCalled();
    });

    it('should handle GET request for Runtimes tab', async () => {
        (mongo.init as jest.Mock).mockResolvedValue(undefined);
        (mongo.fetchConfig as jest.Mock).mockResolvedValue({ endol: {} });
        (mongo.close as jest.Mock).mockResolvedValue(undefined);

        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/runtimes`);

        expect(response.status).toBe(200);
        expect(mongo.fetchConfig).toHaveBeenCalled();
    });

    it('should return 404 for unknown tab', async () => {
        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/unknown`);

        expect(response.status).toBe(404);
        expect(response.text).toContain("Page Not Found");
    });

    it('should handle GET request for main page with linkId', async () => {
        const linkId = 'linkId';
        const compressedState = 'compressedState';
        (mongo.getState as jest.Mock).mockResolvedValue(compressedState);

        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/?linkid=${linkId}`);

        expect(response.status).toBe(200);
        expect(mongo.getState).toHaveBeenCalledWith(linkId);
    });

    it('should handle GET request for main page without linkId', async () => {
        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD!}/`);

        expect(response.status).toBe(200);
        expect(response.text).toContain(config.APP_TITLE);
    });
});