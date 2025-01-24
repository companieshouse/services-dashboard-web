import request from 'supertest';
import express, { Request, Response } from 'express';
import { promisify } from 'util';
import { unzip } from 'zlib';
import nunjucks from 'nunjucks';
import * as config from '../src/config';
import * as type from '../src/common/types';
import { logger, logErr } from '../src/utils/logger';
import * as mongo from '../src/mongo/mongo';
import * as filters from '../src/utils/date-filter';
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

        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/tab/services`);

        expect(response.status).toBe(200);
        expect(mongo.init).toHaveBeenCalled();
        expect(mongo.fetchDocuments).toHaveBeenCalled();
        expect(mongo.close).toHaveBeenCalled();
    });

    it('should handle GET request for End of Life tab', async () => {
        (mongo.init as jest.Mock).mockResolvedValue(undefined);
        (mongo.fetchConfig as jest.Mock).mockResolvedValue({ endol: {} });
        (mongo.close as jest.Mock).mockResolvedValue(undefined);

        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/tab/endol`);

        expect(response.status).toBe(200);
        expect(mongo.init).toHaveBeenCalled();
        expect(mongo.fetchConfig).toHaveBeenCalled();
        expect(mongo.close).toHaveBeenCalled();
    });

    it('should return 404 for unknown tab', async () => {
        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/tab/unknown`);

        expect(response.status).toBe(404);
        expect(response.text).toBe('Tab not found');
    });

    it('should handle GET request for main page with linkId', async () => {
        const linkId = 'linkId';
        const compressedState = 'compressedState';
        (mongo.init as jest.Mock).mockResolvedValue(undefined);
        (mongo.getState as jest.Mock).mockResolvedValue(compressedState);
        (mongo.close as jest.Mock).mockResolvedValue(undefined);

        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD}/?linkid=${linkId}`);

        expect(response.status).toBe(200);
        expect(mongo.init).toHaveBeenCalled();
        expect(mongo.getState).toHaveBeenCalledWith(linkId);
        expect(mongo.close).toHaveBeenCalled();
    });

    it('should handle GET request for main page without linkId', async () => {
        const response = await request(app).get(`${config.ENDPOINT_DASHBOARD!}/`);

        expect(response.status).toBe(200);
        expect(response.text).toContain(config.APP_TITLE);
    });
});