import 'dotenv/config';
import request from 'supertest';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { sequelize } from '../src/database/connection.js';
import { Province, District, GridSubstation, SolarInstallation, GenerationReading } from '../src/database/models/index.js';

const integration = process.env.RUN_MYSQL_INTEGRATION === 'true';
const suite = integration ? describe : describe.skip;

suite('MySQL integration and authorisation', () => {
  beforeAll(async () => { await sequelize.authenticate(); });
  afterAll(async () => { await sequelize.close(); });

  it('contains the required deterministic seed shape', async () => {
    expect(await Province.count()).toBe(9);
    expect(await District.count()).toBe(25);
    expect(await GridSubstation.count()).toBeGreaterThanOrEqual(20);
    expect(await SolarInstallation.count()).toBeGreaterThanOrEqual(200);
    expect(await GenerationReading.count()).toBeGreaterThanOrEqual(134400);
  });

  it('returns a conditional response only after authentication', async () => {
    const login = await request(app).post('/api/v1/auth/users/login').send({ email: 'national@slsea.local', password: process.env.SEED_USER_PASSWORD });
    expect(login.status).toBe(200);
    const first = await request(app).get('/api/v1/provinces').set('Authorization', `Bearer ${login.body.access_token}`);
    expect(first.status).toBe(200);
    const second = await request(app).get('/api/v1/provinces').set('Authorization', `Bearer ${login.body.access_token}`).set('If-None-Match', first.headers.etag);
    expect(second.status).toBe(304);
    expect(second.text).toBe('');
  });

  it('does not allow an unauthenticated conditional request to reveal a 304', async () => {
    const response = await request(app).get('/api/v1/provinces').set('If-None-Match', '"anything"');
    expect(response.status).toBe(401);
  });

  it('keeps device ingestion bound to its own installation and rejects user ingestion', async () => {
    const user = await request(app).post('/api/v1/auth/users/login').send({ email: 'national@slsea.local', password: process.env.SEED_USER_PASSWORD });
    const device = await request(app).post('/api/v1/auth/installations/token').send({ deviceUsername: 'device-co-01', deviceSecret: process.env.SEED_DEVICE_SECRET });
    expect(user.status).toBe(200);
    expect(device.status).toBe(200);
    const installationId = device.body.installation_id;
    const own = await request(app).post(`/api/v1/installations/${installationId}/readings`).set('Authorization', `Bearer ${device.body.access_token}`).send({ measuredAt: new Date(Date.now() - 60_000).toISOString(), powerKw: 1, cumulativeEnergyKwh: 1, voltageV: 230 });
    expect([201, 409]).toContain(own.status);
    const userPost = await request(app).post(`/api/v1/installations/${installationId}/readings`).set('Authorization', `Bearer ${user.body.access_token}`).send({ measuredAt: new Date(Date.now() - 120_000).toISOString(), powerKw: 1, cumulativeEnergyKwh: 1, voltageV: 230 });
    expect(userPost.status).toBe(403);
  });
});
