import { asyncHandler, methodNotAllowed, notFound } from '../../middleware/errors.js';
import { parseBody, parseId, parseQuery, installationSchema } from '../../shared/validation/schemas.js';
import { assertIfMatch, latestDate, locationOf, paged, sendRepresentation } from '../../shared/http/route-tools.js';
import { serializeInstallation } from './installation.serializer.js';
import { serializeReading } from '../readings/reading.serializer.js';
import { installationService } from './installation.service.js';

export const installationController = {
  list: asyncHandler(async (req, res) => {
    const query = parseQuery(req.query);
    const result = await installationService.list(req.auth, query);
    return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeInstallation), result.count), { lastModified: latestDate(...result.rows.map((row) => row.updatedAt)) });
  }),
  get: asyncHandler(async (req, res) => {
    const item = await installationService.getAccessible(req.auth, parseId(req.params.installationId, 'installationId'));
    if (!item) throw notFound();
    return sendRepresentation(req, res, serializeInstallation(item), { lastModified: item.updatedAt });
  }),
  overview: asyncHandler(async (req, res) => {
    const item = await installationService.getAccessible(req.auth, parseId(req.params.installationId, 'installationId'));
    if (!item) throw notFound();
    const latest = await installationService.latestReading(item.id);
    const value = { installation: serializeInstallation(item), location: { substation_id: item.gridSubstationId, district_id: item.gridSubstation?.district?.id, province_id: item.gridSubstation?.district?.province?.id }, last_known_reading: latest ? serializeReading(latest) : null };
    return sendRepresentation(req, res, value, { lastModified: latestDate(item.updatedAt, latest?.receivedAt) });
  }),
  lastKnownReading: asyncHandler(async (req, res) => {
    const item = await installationService.getAccessible(req.auth, parseId(req.params.installationId, 'installationId'));
    if (!item) throw notFound();
    const latest = await installationService.latestReading(item.id);
    if (!latest) throw notFound('No reading is available for this installation');
    return sendRepresentation(req, res, serializeReading(latest), { lastModified: latest.receivedAt });
  }),
  create: asyncHandler(async (req, res) => {
    const item = await installationService.create(parseBody(installationSchema, req.body));
    res.location(locationOf(req, item.id));
    return res.status(201).json(serializeInstallation(item));
  }),
  replace: asyncHandler(async (req, res) => {
    const id = parseId(req.params.installationId, 'installationId');
    const current = await installationService.findActiveById(id);
    if (!current) throw notFound();
    assertIfMatch(req, serializeInstallation(current));
    const item = await installationService.update(current, parseBody(installationSchema, req.body));
    return sendRepresentation(req, res, serializeInstallation(item), { lastModified: item.updatedAt });
  }),
  patch: asyncHandler(async (req, res) => {
    const id = parseId(req.params.installationId, 'installationId');
    const current = await installationService.findActiveById(id);
    if (!current) throw notFound();
    assertIfMatch(req, serializeInstallation(current));
    const item = await installationService.update(current, parseBody(installationSchema.partial(), req.body));
    return sendRepresentation(req, res, serializeInstallation(item), { lastModified: item.updatedAt });
  }),
  remove: asyncHandler(async (req, res) => {
    const id = parseId(req.params.installationId, 'installationId');
    const current = await installationService.findActiveById(id);
    if (!current) throw notFound();
    assertIfMatch(req, serializeInstallation(current));
    await installationService.softDelete(current);
    return res.status(204).end();
  }),
  methods: (req, res, next) => next(methodNotAllowed(['GET', 'PUT', 'PATCH', 'DELETE']))
};
