import 'dotenv/config';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('security and error-contract checks', () => {
  it('returns an authentication challenge with unauthorised responses', async () => {
    const response = await request(app).get('/api/v1/provinces').expect(401);
    expect(response.headers['www-authenticate']).toBe('Bearer realm="slsea-api"');
  });

  it('normalises malformed JSON without exposing parser details', async () => {
    const response = await request(app)
      .post('/api/v1/auth/users/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(response.body.error).toMatchObject({ code: 'invalid_request', message: 'Malformed JSON request body' });
  });

  it('serves an OpenAPI 3.1 document', async () => {
    const response = await request(app).get('/openapi.json').expect(200);
    expect(response.body.openapi).toBe('3.1.0');
  });
});
