import crypto from 'node:crypto';
import { Op, UniqueConstraintError } from 'sequelize';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config/config.js';
import { authenticate, issueDeviceToken, issueUserToken, loginDevice, loginUser, hashSecret } from '../middleware/auth.js';
import { asyncHandler, badRequest, conflict, forbidden, methodNotAllowed, notFound, preconditionFailed } from '../middleware/errors.js';
import { requireDevice, requireMaintenance, requireUser, locationIncludes } from '../services/authorization.js';
import { District, GenerationReading, GridSubstation, Province, SolarInstallation, User, publicInstallation, publicUser } from '../models/models.js';
import { sendRepresentation, requireIfMatch } from '../utils/representation.js';
import { asIso, asNumber, localDayBounds, parseUtc } from '../utils/time.js';
import { districtSchema, installationSchema, loginDeviceSchema, loginUserSchema, parseBody, parseId, parseQuery, provinceSchema, readingSchema, substationSchema } from './validation.js';

export const router = Router();

const authLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
const ingestionLimiter = rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false });

const active = { deletedAt: null };

function serializeProvince(item) {
  return { id: item.id, code: item.code, name: item.name, created_at: asIso(item.createdAt), updated_at: asIso(item.updatedAt) };
}

function serializeDistrict(item) {
  return { id: item.id, province_id: item.provinceId, code: item.code, name: item.name, created_at: asIso(item.createdAt), updated_at: asIso(item.updatedAt) };
}

function serializeSubstation(item) {
  return { id: item.id, district_id: item.districtId, code: item.code, name: item.name, latitude: asNumber(item.latitude), longitude: asNumber(item.longitude), is_synthetic: Boolean(item.isSynthetic), created_at: asIso(item.createdAt), updated_at: asIso(item.updatedAt) };
}

function serializeInstallation(item) {
  const value = publicInstallation(item);
  return {
    id: value.id,
    grid_substation_id: value.gridSubstationId,
    meter_id: value.meterId,
    inverter_id: value.inverterId,
    name: value.name,
    capacity_kw: asNumber(value.capacityKw),
    latitude: asNumber(value.latitude),
    longitude: asNumber(value.longitude),
    is_synthetic: Boolean(value.isSynthetic),
    version: value.version,
    created_at: asIso(value.createdAt),
    updated_at: asIso(value.updatedAt)
  };
}

function serializeReading(item) {
  const value = item.toJSON ? item.toJSON() : item;
  return {
    id: String(value.id),
    installation_id: value.installationId,
    measured_at: asIso(value.measuredAt),
    received_at: asIso(value.receivedAt),
    power_kw: asNumber(value.powerKw),
    cumulative_energy_kwh: asNumber(value.cumulativeEnergyKwh),
    voltage_v: asNumber(value.voltageV)
  };
}

function latestDate(...values) {
  const dates = values.filter(Boolean).map((value) => new Date(value)).filter((value) => !Number.isNaN(value.getTime()));
  return dates.length ? new Date(Math.max(...dates.map((value) => value.getTime()))) : new Date();
}

function paginationLinks(req, page, limit, total) {
  const links = { self: req.originalUrl };
  const pages = Math.max(1, Math.ceil(total / limit));
  const link = (targetPage) => {
    const url = new URL(req.originalUrl, 'http://localhost');
    url.searchParams.set('page', String(targetPage));
    url.searchParams.set('limit', String(limit));
    return `${url.pathname}${url.search}`;
  };
  if (page > 1) links.previous = link(page - 1);
  if (page < pages) links.next = link(page + 1);
  return links;
}

function paged(value, req, rows, total) {
  return { data: rows, pagination: { page: value.page, limit: value.limit, total, pages: Math.max(1, Math.ceil(total / value.limit)), links: paginationLinks(req, value.page, value.limit, total) } };
}

function locationOf(req, id) {
  return `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}/${id}`;
}

function assertFutureAllowed(date) {
  if (date.getTime() > Date.now() + 5 * 60 * 1000) throw badRequest('measuredAt cannot be more than five minutes in the future');
}

function toMetadataUpdate(data) {
  const value = { ...data };
  if (Object.hasOwn(value, 'capacityKw')) value.capacityKw = value.capacityKw;
  return value;
}

function assertIfMatch(req, current) {
  if (!requireIfMatch(req, current)) throw preconditionFailed('If-Match is required and must match the current representation');
}

async function getLatestReading(installationId) {
  return GenerationReading.findOne({ where: { installationId }, order: [['measuredAt', 'DESC'], ['id', 'DESC']] });
}

async function getInstallationForUser(req, installationId, filters = {}) {
  return SolarInstallation.findOne({
    where: { id: installationId, ...active },
    include: locationIncludes(req.auth, filters)
  });
}

function districtScopeInclude(req, requestedId = null) {
  const where = { ...active };
  if (req.auth.role === 'provincial') where.provinceId = req.auth.provinceId;
  if (req.auth.role === 'district') where.id = req.auth.districtId;
  if (requestedId) where.id = req.auth.role === 'district' && req.auth.districtId !== requestedId ? '__no_access__' : requestedId;
  return [{ model: Province, as: 'province', required: true, where: req.auth.role === 'provincial' ? { ...active, id: req.auth.provinceId } : active }];
}

function districtWithScope(req, districtId) {
  const districtWhere = { ...active };
  if (req.auth.role === 'district') districtWhere.id = req.auth.districtId === districtId ? districtId : '__no_access__';
  else districtWhere.id = districtId;
  const provinceWhere = { ...active };
  if (req.auth.role === 'provincial') provinceWhere.id = req.auth.provinceId;
  return { where: districtWhere, include: [{ model: Province, as: 'province', required: true, where: provinceWhere }] };
}

async function accessibleDistrict(req, districtId) {
  const options = districtWithScope(req, districtId);
  return District.findOne({ ...options });
}

async function accessibleProvince(req, provinceId) {
  const where = { ...active, id: provinceId };
  if (req.auth.role === 'provincial' && req.auth.provinceId !== provinceId) where.id = '__no_access__';
  return Province.findOne({ where });
}

async function accessibleSubstation(req, substationId) {
  const districtWhere = { ...active };
  if (req.auth.role === 'district') districtWhere.id = req.auth.districtId;
  const provinceWhere = { ...active };
  if (req.auth.role === 'provincial') provinceWhere.id = req.auth.provinceId;
  return GridSubstation.findOne({
    where: { ...active, id: substationId },
    include: [{ model: District, as: 'district', required: true, where: districtWhere, include: [{ model: Province, as: 'province', required: true, where: provinceWhere }] }]
  });
}

async function accessibleReading(req, readingId) {
  return GenerationReading.findOne({
    where: { id: readingId },
    include: [{ model: SolarInstallation, as: 'installation', required: true, where: active, include: locationIncludes(req.auth) }]
  });
}

function metadataRepresentation(item, serializer) {
  return serializer(item);
}

async function updateMetadata(req, Model, id, schema, serializer, values, extra = {}) {
  const item = await Model.findOne({ where: { id, ...active }, ...extra.findOptions });
  if (!item) throw notFound();
  assertIfMatch(req, serializer(item));
  const parsed = parseBody(schema, values);
  await item.update({ ...toMetadataUpdate(parsed), version: item.version ? item.version + 1 : undefined });
  const fresh = await Model.findOne({ where: { id, ...active }, ...extra.findOptions });
  return fresh;
}

async function softDeleteMetadata(req, Model, id, serializer, extra = {}) {
  const item = await Model.findOne({ where: { id, ...active }, ...extra.findOptions });
  if (!item) throw notFound();
  assertIfMatch(req, serializer(item));
  await item.update({ deletedAt: new Date(), ...(item.version ? { version: item.version + 1 } : {}) });
}

router.post('/auth/users/login', authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = parseBody(loginUserSchema, req.body);
  const user = await loginUser(email, password);
  if (!user) throw new (await import('../middleware/errors.js')).ApiError(401, 'invalid_credentials', 'Email or password is invalid');
  res.status(200).json({ token_type: 'Bearer', access_token: issueUserToken(user), expires_in: config.jwtExpiresIn, user: publicUser(user) });
}));

router.post('/auth/installations/token', authLimiter, asyncHandler(async (req, res) => {
  const { deviceUsername, deviceSecret } = parseBody(loginDeviceSchema, req.body);
  const installation = await loginDevice(deviceUsername, deviceSecret);
  if (!installation) throw new (await import('../middleware/errors.js')).ApiError(401, 'invalid_credentials', 'Device credentials are invalid');
  res.status(200).json({ token_type: 'Bearer', access_token: issueDeviceToken(installation), expires_in: config.jwtExpiresIn, installation_id: installation.id });
}));

router.get('/provinces', authenticate, requireUser, asyncHandler(async (req, res) => {
  const query = parseQuery(req.query);
  const where = { ...active };
  if (req.auth.role === 'provincial') where.id = req.auth.provinceId;
  if (query.provinceId) where.id = req.auth.role === 'provincial' && query.provinceId !== req.auth.provinceId ? '__no_access__' : query.provinceId;
  const result = await Province.findAndCountAll({ where, order: [['name', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit });
  return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeProvince), result.count), { lastModified: latestDate(...result.rows.map((row) => row.updatedAt)) });
}));

router.get('/provinces/:provinceId', authenticate, requireUser, asyncHandler(async (req, res) => {
  const item = await accessibleProvince(req, parseId(req.params.provinceId, 'provinceId'));
  if (!item) throw notFound();
  return sendRepresentation(req, res, serializeProvince(item), { lastModified: item.updatedAt });
}));

router.get('/provinces/:provinceId/districts', authenticate, requireUser, asyncHandler(async (req, res) => {
  const provinceId = parseId(req.params.provinceId, 'provinceId');
  const province = await accessibleProvince(req, provinceId);
  if (!province) throw notFound();
  const query = parseQuery(req.query);
  const result = await District.findAndCountAll({ where: { ...active, provinceId }, order: [['name', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit });
  return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeDistrict), result.count), { lastModified: latestDate(province.updatedAt, ...result.rows.map((row) => row.updatedAt)) });
}));

router.get('/districts', authenticate, requireUser, asyncHandler(async (req, res) => {
  const query = parseQuery(req.query);
  const where = { ...active };
  if (req.auth.role === 'district') where.id = req.auth.districtId;
  if (req.auth.role === 'provincial') where.provinceId = req.auth.provinceId;
  if (query.provinceId) where.provinceId = req.auth.role === 'provincial' && query.provinceId !== req.auth.provinceId ? '__no_access__' : query.provinceId;
  if (query.districtId) where.id = req.auth.role === 'district' && query.districtId !== req.auth.districtId ? '__no_access__' : query.districtId;
  const result = await District.findAndCountAll({ where, order: [['name', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit });
  return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeDistrict), result.count), { lastModified: latestDate(...result.rows.map((row) => row.updatedAt)) });
}));

router.get('/districts/:districtId', authenticate, requireUser, asyncHandler(async (req, res) => {
  const item = await accessibleDistrict(req, parseId(req.params.districtId, 'districtId'));
  if (!item) throw notFound();
  return sendRepresentation(req, res, serializeDistrict(item), { lastModified: item.updatedAt });
}));

router.get('/districts/:districtId/grid-substations', authenticate, requireUser, asyncHandler(async (req, res) => {
  const districtId = parseId(req.params.districtId, 'districtId');
  const district = await accessibleDistrict(req, districtId);
  if (!district) throw notFound();
  const query = parseQuery(req.query);
  const result = await GridSubstation.findAndCountAll({ where: { ...active, districtId }, order: [['name', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit });
  return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeSubstation), result.count), { lastModified: latestDate(district.updatedAt, ...result.rows.map((row) => row.updatedAt)) });
}));

router.get('/grid-substations', authenticate, requireUser, asyncHandler(async (req, res) => {
  const query = parseQuery(req.query);
  const districtWhere = { ...active };
  const provinceWhere = { ...active };
  if (req.auth.role === 'district') districtWhere.id = req.auth.districtId;
  if (req.auth.role === 'provincial') provinceWhere.id = req.auth.provinceId;
  if (query.districtId) districtWhere.id = req.auth.role === 'district' && query.districtId !== req.auth.districtId ? '__no_access__' : query.districtId;
  if (query.provinceId) provinceWhere.id = req.auth.role === 'provincial' && query.provinceId !== req.auth.provinceId ? '__no_access__' : query.provinceId;
  const result = await GridSubstation.findAndCountAll({ where: active, include: [{ model: District, as: 'district', required: true, where: districtWhere, include: [{ model: Province, as: 'province', required: true, where: provinceWhere }] }], order: [['name', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit, distinct: true });
  return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeSubstation), result.count), { lastModified: latestDate(...result.rows.map((row) => row.updatedAt)) });
}));

router.get('/grid-substations/:substationId', authenticate, requireUser, asyncHandler(async (req, res) => {
  const item = await accessibleSubstation(req, parseId(req.params.substationId, 'substationId'));
  if (!item) throw notFound();
  return sendRepresentation(req, res, serializeSubstation(item), { lastModified: item.updatedAt });
}));

router.get('/grid-substations/:substationId/installations', authenticate, requireUser, asyncHandler(async (req, res) => {
  const substationId = parseId(req.params.substationId, 'substationId');
  const substation = await accessibleSubstation(req, substationId);
  if (!substation) throw notFound();
  const query = parseQuery(req.query);
  const result = await SolarInstallation.findAndCountAll({ where: { ...active, gridSubstationId: substationId }, order: [['name', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit });
  return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeInstallation), result.count), { lastModified: latestDate(substation.updatedAt, ...result.rows.map((row) => row.updatedAt)) });
}));

router.get('/installations', authenticate, requireUser, asyncHandler(async (req, res) => {
  const query = parseQuery(req.query);
  const include = locationIncludes(req.auth, query);
  const orderField = query.sort === 'created_at' ? 'createdAt' : 'name';
  const result = await SolarInstallation.findAndCountAll({ where: active, include, order: [[orderField, query.order], ['id', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit, distinct: true });
  return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeInstallation), result.count), { lastModified: latestDate(...result.rows.map((row) => row.updatedAt)) });
}));

router.get('/installations/:installationId', authenticate, requireUser, asyncHandler(async (req, res) => {
  const item = await getInstallationForUser(req, parseId(req.params.installationId, 'installationId'));
  if (!item) throw notFound();
  return sendRepresentation(req, res, serializeInstallation(item), { lastModified: item.updatedAt });
}));

router.get('/installations/:installationId/overview', authenticate, requireUser, asyncHandler(async (req, res) => {
  const item = await getInstallationForUser(req, parseId(req.params.installationId, 'installationId'));
  if (!item) throw notFound();
  const latest = await getLatestReading(item.id);
  const value = { installation: serializeInstallation(item), location: { substation_id: item.gridSubstationId, district_id: item.gridSubstation?.district?.id, province_id: item.gridSubstation?.district?.province?.id }, last_known_reading: latest ? serializeReading(latest) : null };
  return sendRepresentation(req, res, value, { lastModified: latestDate(item.updatedAt, latest?.receivedAt) });
}));

router.get('/installations/:installationId/last-known-reading', authenticate, requireUser, asyncHandler(async (req, res) => {
  const item = await getInstallationForUser(req, parseId(req.params.installationId, 'installationId'));
  if (!item) throw notFound();
  const latest = await getLatestReading(item.id);
  if (!latest) throw notFound('No reading is available for this installation');
  return sendRepresentation(req, res, serializeReading(latest), { lastModified: latest.receivedAt });
}));

router.get('/installations/:installationId/readings', authenticate, requireUser, asyncHandler(async (req, res) => {
  const installationId = parseId(req.params.installationId, 'installationId');
  const item = await getInstallationForUser(req, installationId, parseQuery(req.query));
  if (!item) throw notFound();
  const query = parseQuery(req.query);
  const where = { installationId };
  if (query.from || query.to) where.measuredAt = { ...(query.from ? { [Op.gte]: new Date(query.from) } : {}), ...(query.to ? { [Op.lte]: new Date(query.to) } : {}) };
  const result = await GenerationReading.findAndCountAll({ where, order: [['measuredAt', query.order], ['id', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit });
  const value = paged(query, req, result.rows.map(serializeReading), result.count);
  return sendRepresentation(req, res, value, { lastModified: latestDate(item.updatedAt, ...result.rows.map((row) => row.receivedAt)) });
}));

router.get('/installations/:installationId/readings/:readingId', authenticate, requireUser, asyncHandler(async (req, res) => {
  const installationId = parseId(req.params.installationId, 'installationId');
  const readingId = Number.parseInt(req.params.readingId, 10);
  if (!Number.isSafeInteger(readingId) || readingId < 1) throw badRequest('readingId must be a positive integer');
  const item = await getInstallationForUser(req, installationId);
  if (!item) throw notFound();
  const reading = await GenerationReading.findOne({ where: { id: readingId, installationId } });
  if (!reading) throw notFound();
  return sendRepresentation(req, res, serializeReading(reading), { lastModified: reading.receivedAt });
}));

router.post('/installations/:installationId/readings', authenticate, requireDevice, ingestionLimiter, asyncHandler(async (req, res) => {
  const installationId = parseId(req.params.installationId, 'installationId');
  if (req.auth.installationId !== installationId) throw forbidden('A device may only submit readings for its own installation');
  const installation = await SolarInstallation.findOne({ where: { id: installationId, ...active } });
  if (!installation) throw notFound();
  const data = parseBody(readingSchema, req.body);
  const measuredAt = parseUtc(data.measuredAt);
  assertFutureAllowed(measuredAt);
  if (data.powerKw > Number(installation.capacityKw) * 1.2) throw badRequest('powerKw exceeds the installation capacity tolerance');
  const prior = await GenerationReading.findOne({ where: { installationId, measuredAt: { [Op.lte]: measuredAt } }, order: [['measuredAt', 'DESC'], ['id', 'DESC']] });
  if (prior && data.cumulativeEnergyKwh < Number(prior.cumulativeEnergyKwh) && !data.meterReset) throw conflict('Cumulative energy decreased; resubmit with meterReset=true to record a declared meter reset');
  try {
    const reading = await GenerationReading.create({ installationId, measuredAt, receivedAt: new Date(), powerKw: data.powerKw, cumulativeEnergyKwh: data.cumulativeEnergyKwh, voltageV: data.voltageV });
    const result = serializeReading(reading);
    res.location(`${req.protocol}://${req.get('host')}/api/v1/installations/${installationId}/readings/${reading.id}`);
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw conflict('A reading already exists for this installation and measuredAt timestamp');
    throw error;
  }
}));

router.put('/installations/:installationId/readings/:readingId', authenticate, (req, res, next) => next(req.auth.kind === 'device' ? forbidden('Devices cannot modify readings') : methodNotAllowed(['GET'])));
router.patch('/installations/:installationId/readings/:readingId', authenticate, (req, res, next) => next(req.auth.kind === 'device' ? forbidden('Devices cannot modify readings') : methodNotAllowed(['GET'])));
router.delete('/installations/:installationId/readings/:readingId', authenticate, (req, res, next) => next(req.auth.kind === 'device' ? forbidden('Devices cannot delete readings') : methodNotAllowed(['GET'])));

router.get('/districts/:districtId/generation-summary', authenticate, requireUser, asyncHandler(async (req, res) => {
  const districtId = parseId(req.params.districtId, 'districtId');
  const district = await accessibleDistrict(req, districtId);
  if (!district) throw notFound();
  const installations = await SolarInstallation.findAll({ where: active, include: [{ model: GridSubstation, as: 'gridSubstation', required: true, where: active, include: [{ model: District, as: 'district', required: true, where: { ...active, id: districtId } }] }] });
  const asOf = new Date();
  const freshnessCutoff = new Date(asOf.getTime() - config.freshnessThresholdMinutes * 60_000);
  const { start: dayStart, end: dayEnd } = localDayBounds(asOf);
  let fresh = 0; let stale = 0; let missing = 0; let freshPower = 0; let missingBaselines = 0; let meterResets = 0; let energy = 0;
  const installationResults = await Promise.all(installations.map(async (installation) => {
    const latest = await getLatestReading(installation.id);
    const todayReadings = await GenerationReading.findAll({ where: { installationId: installation.id, measuredAt: { [Op.gte]: dayStart, [Op.lt]: dayEnd, [Op.lte]: asOf } }, order: [['measuredAt', 'ASC'], ['id', 'ASC']] });
    const baseline = await GenerationReading.findOne({ where: { installationId: installation.id, measuredAt: { [Op.lt]: dayStart } }, order: [['measuredAt', 'DESC'], ['id', 'DESC']] });
    let daily = 0; let resetCount = 0;
    if (!baseline) missingBaselines += 1;
    let previous = baseline;
    for (const reading of todayReadings) {
      if (previous && Number(reading.cumulativeEnergyKwh) >= Number(previous.cumulativeEnergyKwh)) daily += Number(reading.cumulativeEnergyKwh) - Number(previous.cumulativeEnergyKwh);
      else if (previous) { resetCount += 1; daily = Number(reading.cumulativeEnergyKwh); }
      previous = reading;
    }
    meterResets += resetCount;
    energy += daily;
    if (!latest) missing += 1;
    else if (new Date(latest.receivedAt) >= freshnessCutoff) { fresh += 1; freshPower += Number(latest.powerKw); }
    else stale += 1;
    return { latest, daily };
  }));
  void installationResults;
  const total = installations.length;
  const currentPowerComplete = total > 0 && fresh === total;
  const energyComplete = total === 0 || missingBaselines === 0;
  const value = {
    district_id: districtId,
    as_of: asOf.toISOString(),
    current_total_power_kw: currentPowerComplete ? Number(freshPower.toFixed(3)) : null,
    todays_energy_kwh: energyComplete ? Number(energy.toFixed(3)) : null,
    installation_counts: { total, fresh, stale, missing },
    coverage: {
      freshness_threshold_minutes: config.freshnessThresholdMinutes,
      current_power_complete: currentPowerComplete,
      fresh_current_power_kw: Number(freshPower.toFixed(3)),
      daily_energy_reliable: energyComplete,
      missing_midnight_baselines: missingBaselines,
      meter_resets: meterResets,
      midnight_baseline_policy: 'The last reading strictly before the Asia/Colombo local midnight is required for each installation; without it that installation is excluded from a reliable daily total.'
    }
  };
  return sendRepresentation(req, res, value, { lastModified: latestDate(district.updatedAt, asOf) });
}));

async function handleReadingCollectionFilter(req) {
  const query = parseQuery(req.query);
  const include = locationIncludes(req.auth, query);
  const where = {};
  if (query.from || query.to) where.measuredAt = { ...(query.from ? { [Op.gte]: new Date(query.from) } : {}), ...(query.to ? { [Op.lte]: new Date(query.to) } : {}) };
  const result = await GenerationReading.findAndCountAll({ where, include: [{ model: SolarInstallation, as: 'installation', required: true, where: active, include }], order: [[query.sort === 'received_at' ? 'receivedAt' : 'measuredAt', query.order], ['id', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit, distinct: true });
  return { query, result };
}

router.get('/readings', authenticate, requireUser, asyncHandler(async (req, res) => {
  const { query, result } = await handleReadingCollectionFilter(req);
  return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeReading), result.count), { lastModified: latestDate(...result.rows.map((row) => row.receivedAt)) });
}));

// Maintenance metadata endpoints are intentionally separate from reader and device capabilities.
router.post('/provinces', authenticate, requireMaintenance, asyncHandler(async (req, res) => {
  const data = parseBody(provinceSchema, req.body);
  const item = await Province.create({ id: crypto.randomUUID(), ...data });
  res.location(locationOf(req, item.id));
  return res.status(201).json(serializeProvince(item));
}));

router.put('/provinces/:provinceId', authenticate, requireMaintenance, asyncHandler(async (req, res) => {
  const id = parseId(req.params.provinceId, 'provinceId');
  const current = await Province.findOne({ where: { id, ...active } }); if (!current) throw notFound();
  assertIfMatch(req, serializeProvince(current));
  const item = await updateMetadata(req, Province, id, provinceSchema, serializeProvince, req.body);
  return sendRepresentation(req, res, serializeProvince(item), { lastModified: item.updatedAt });
}));
router.patch('/provinces/:provinceId', authenticate, requireMaintenance, asyncHandler(async (req, res) => {
  const id = parseId(req.params.provinceId, 'provinceId'); const current = await Province.findOne({ where: { id, ...active } }); if (!current) throw notFound(); assertIfMatch(req, serializeProvince(current));
  const data = parseBody(provinceSchema.partial(), req.body); await current.update({ ...data }); return sendRepresentation(req, res, serializeProvince(current), { lastModified: current.updatedAt });
}));
router.delete('/provinces/:provinceId', authenticate, requireMaintenance, asyncHandler(async (req, res) => { const id = parseId(req.params.provinceId, 'provinceId'); await softDeleteMetadata(req, Province, id, serializeProvince); return res.status(204).end(); }));

router.post('/districts', authenticate, requireMaintenance, asyncHandler(async (req, res) => { const data = parseBody(districtSchema, req.body); if (!(await Province.findOne({ where: { id: data.provinceId, ...active } }))) throw badRequest('provinceId does not reference an active province'); const item = await District.create({ id: crypto.randomUUID(), ...data }); res.location(locationOf(req, item.id)); return res.status(201).json(serializeDistrict(item)); }));
router.put('/districts/:districtId', authenticate, requireMaintenance, asyncHandler(async (req, res) => { const id = parseId(req.params.districtId, 'districtId'); const current = await District.findOne({ where: { id, ...active } }); if (!current) throw notFound(); assertIfMatch(req, serializeDistrict(current)); const data = parseBody(districtSchema, req.body); if (!(await Province.findOne({ where: { id: data.provinceId, ...active } }))) throw badRequest('provinceId does not reference an active province'); await current.update(data); return sendRepresentation(req, res, serializeDistrict(current), { lastModified: current.updatedAt }); }));
router.patch('/districts/:districtId', authenticate, requireMaintenance, asyncHandler(async (req, res) => { const id = parseId(req.params.districtId, 'districtId'); const current = await District.findOne({ where: { id, ...active } }); if (!current) throw notFound(); assertIfMatch(req, serializeDistrict(current)); const data = parseBody(districtSchema.partial(), req.body); await current.update(data); return sendRepresentation(req, res, serializeDistrict(current), { lastModified: current.updatedAt }); }));
router.delete('/districts/:districtId', authenticate, requireMaintenance, asyncHandler(async (req, res) => { const id = parseId(req.params.districtId, 'districtId'); await softDeleteMetadata(req, District, id, serializeDistrict); return res.status(204).end(); }));

router.post('/grid-substations', authenticate, requireMaintenance, asyncHandler(async (req, res) => { const data = parseBody(substationSchema, req.body); if (!(await District.findOne({ where: { id: data.districtId, ...active } }))) throw badRequest('districtId does not reference an active district'); const item = await GridSubstation.create({ id: crypto.randomUUID(), ...data }); res.location(locationOf(req, item.id)); return res.status(201).json(serializeSubstation(item)); }));
router.put('/grid-substations/:substationId', authenticate, requireMaintenance, asyncHandler(async (req, res) => { const id = parseId(req.params.substationId, 'substationId'); const current = await GridSubstation.findOne({ where: { id, ...active } }); if (!current) throw notFound(); assertIfMatch(req, serializeSubstation(current)); const data = parseBody(substationSchema, req.body); await current.update(data); return sendRepresentation(req, res, serializeSubstation(current), { lastModified: current.updatedAt }); }));
router.patch('/grid-substations/:substationId', authenticate, requireMaintenance, asyncHandler(async (req, res) => { const id = parseId(req.params.substationId, 'substationId'); const current = await GridSubstation.findOne({ where: { id, ...active } }); if (!current) throw notFound(); assertIfMatch(req, serializeSubstation(current)); const data = parseBody(substationSchema.partial(), req.body); await current.update(data); return sendRepresentation(req, res, serializeSubstation(current), { lastModified: current.updatedAt }); }));
router.delete('/grid-substations/:substationId', authenticate, requireMaintenance, asyncHandler(async (req, res) => { const id = parseId(req.params.substationId, 'substationId'); await softDeleteMetadata(req, GridSubstation, id, serializeSubstation); return res.status(204).end(); }));

router.post('/installations', authenticate, requireMaintenance, asyncHandler(async (req, res) => { const data = parseBody(installationSchema, req.body); if (!(await GridSubstation.findOne({ where: { id: data.gridSubstationId, ...active } }))) throw badRequest('gridSubstationId does not reference an active substation'); const id = crypto.randomUUID(); const item = await SolarInstallation.create({ id, ...data, deviceUsername: `device-${id.slice(0, 8)}`, deviceSecretHash: await hashSecret(crypto.randomBytes(32).toString('hex')) }); res.location(locationOf(req, item.id)); return res.status(201).json(serializeInstallation(item)); }));
router.put('/installations/:installationId', authenticate, requireMaintenance, asyncHandler(async (req, res) => { const id = parseId(req.params.installationId, 'installationId'); const current = await SolarInstallation.findOne({ where: { id, ...active } }); if (!current) throw notFound(); assertIfMatch(req, serializeInstallation(current)); const data = parseBody(installationSchema, req.body); await current.update(data); return sendRepresentation(req, res, serializeInstallation(current), { lastModified: current.updatedAt }); }));
router.patch('/installations/:installationId', authenticate, requireMaintenance, asyncHandler(async (req, res) => { const id = parseId(req.params.installationId, 'installationId'); const current = await SolarInstallation.findOne({ where: { id, ...active } }); if (!current) throw notFound(); assertIfMatch(req, serializeInstallation(current)); const data = parseBody(installationSchema.partial(), req.body); await current.update(data); return sendRepresentation(req, res, serializeInstallation(current), { lastModified: current.updatedAt }); }));
router.delete('/installations/:installationId', authenticate, requireMaintenance, asyncHandler(async (req, res) => { const id = parseId(req.params.installationId, 'installationId'); await softDeleteMetadata(req, SolarInstallation, id, serializeInstallation); return res.status(204).end(); }));

router.all('/provinces/:provinceId', (req, res, next) => next(methodNotAllowed(['GET', 'PUT', 'PATCH', 'DELETE'])));
router.all('/districts/:districtId', (req, res, next) => next(methodNotAllowed(['GET', 'PUT', 'PATCH', 'DELETE'])));
router.all('/grid-substations/:substationId', (req, res, next) => next(methodNotAllowed(['GET', 'PUT', 'PATCH', 'DELETE'])));
router.all('/installations/:installationId', (req, res, next) => next(methodNotAllowed(['GET', 'PUT', 'PATCH', 'DELETE'])));

export { authLimiter, ingestionLimiter };
