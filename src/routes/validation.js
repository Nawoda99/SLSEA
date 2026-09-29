import { z } from 'zod';
import { badRequest } from '../middleware/errors.js';
import { parseUtc } from '../utils/time.js';

const uuid = z.string().uuid();
const numeric = (min, max) => z.coerce.number().finite().min(min).max(max);

export const loginUserSchema = z.object({ email: z.string().email().max(191), password: z.string().min(1).max(200) }).strict();
export const loginDeviceSchema = z.object({ deviceUsername: z.string().min(1).max(96), deviceSecret: z.string().min(1).max(200) }).strict();

export const readingSchema = z.object({
  measuredAt: z.string().min(1).refine((value) => parseUtc(value) !== null, 'measuredAt must be an ISO-8601 timestamp with an offset or Z'),
  powerKw: numeric(0, 100000),
  cumulativeEnergyKwh: numeric(0, 100000000),
  voltageV: numeric(0, 1000),
  meterReset: z.boolean().optional().default(false)
}).strict();

export const installationSchema = z.object({
  gridSubstationId: uuid,
  meterId: z.string().min(1).max(64),
  inverterId: z.string().max(64).nullable().optional(),
  name: z.string().min(1).max(160),
  capacityKw: numeric(0.001, 100000),
  latitude: numeric(-90, 90).nullable().optional(),
  longitude: numeric(-180, 180).nullable().optional(),
  isSynthetic: z.boolean().optional().default(false)
}).strict();

export const provinceSchema = z.object({ code: z.string().min(1).max(16), name: z.string().min(1).max(128) }).strict();
export const districtSchema = z.object({ provinceId: uuid, code: z.string().min(1).max(16), name: z.string().min(1).max(128) }).strict();
export const substationSchema = z.object({ districtId: uuid, code: z.string().min(1).max(32), name: z.string().min(1).max(160), latitude: numeric(-90, 90).nullable().optional(), longitude: numeric(-180, 180).nullable().optional(), isSynthetic: z.boolean().optional().default(false) }).strict();

export function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) throw badRequest('The request body failed validation', result.error.issues.map((issue) => ({ path: issue.path, message: issue.message })));
  return result.data;
}

export function parseId(value, name = 'id') {
  const result = uuid.safeParse(value);
  if (!result.success) throw badRequest(`${name} must be a UUID`);
  return result.data;
}

export function parseQuery(query, { allowFilters = true } = {}) {
  const schema = z.object({
    page: z.coerce.number().int().min(1).max(100000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    sort: z.enum(['measured_at', 'received_at', 'name', 'created_at']).optional().default('measured_at'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    from: z.string().optional(),
    to: z.string().optional(),
    provinceId: uuid.optional(),
    districtId: uuid.optional(),
    substationId: uuid.optional()
  }).strict();
  const result = schema.safeParse(query);
  if (!result.success) throw badRequest('The query parameters are invalid', result.error.issues.map((issue) => ({ path: issue.path, message: issue.message })));
  const value = result.data;
  for (const field of ['from', 'to']) {
    if (value[field] && !parseUtc(value[field])) throw badRequest(`${field} must be an ISO-8601 timestamp with an offset or Z`);
  }
  if (value.from && value.to && new Date(value.from) > new Date(value.to)) throw badRequest('from must be earlier than or equal to to');
  if (!allowFilters && (value.provinceId || value.districtId || value.substationId)) throw badRequest('Filters are not supported on this collection');
  return value;
}
