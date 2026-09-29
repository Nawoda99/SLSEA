import 'dotenv/config';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { representationTag } from '../src/utils/representation.js';
import { parseBody, readingSchema } from '../src/routes/validation.js';

describe('HTTP contract checks', () => {
  it('exposes a liveness response without database access', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body).toMatchObject({ status: 'ok' });
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('requires JSON representations for API responses', async () => {
    const response = await request(app).get('/api/v1/provinces').set('Accept', 'text/html').expect(406);
    expect(response.body.error.code).toBe('not_acceptable');
    expect(response.body.requestId).toBeTruthy();
  });

  it('returns a consistent authentication error', async () => {
    const response = await request(app).get('/api/v1/provinces').expect(401);
    expect(response.body).toHaveProperty('error.code', 'authentication_required');
    expect(response.body).toHaveProperty('requestId');
  });

  it('rejects non-JSON authentication bodies', async () => {
    const response = await request(app).post('/api/v1/auth/users/login').type('form').send({ email: 'x' }).expect(415);
    expect(response.body.error.code).toBe('unsupported_media_type');
  });

  it('uses a deterministic representation validator', () => {
    expect(representationTag({ b: 2, a: 1 })).toBe(representationTag({ b: 2, a: 1 }));
    expect(representationTag({ b: 2, a: 1 })).not.toBe(representationTag({ b: 2, a: 2 }));
  });

  it('validates reading fields and timestamp offsets', () => {
    expect(() => parseBody(readingSchema, { measuredAt: '2026-01-01T00:00:00Z', powerKw: 2, cumulativeEnergyKwh: 3, voltageV: 230 })).not.toThrow();
    expect(() => parseBody(readingSchema, { measuredAt: '2026-01-01', powerKw: 2, cumulativeEnergyKwh: 3, voltageV: 230 })).toThrow();
  });
});
