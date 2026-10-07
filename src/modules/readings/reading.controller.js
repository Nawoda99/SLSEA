import { asyncHandler, badRequest, forbidden, methodNotAllowed } from '../../middleware/errors.js';
import { parseBody, parseId, parseQuery, readingSchema } from '../../shared/validation/schemas.js';
import { latestDate, paged, sendRepresentation } from '../../shared/http/route-tools.js';
import { serializeReading } from './reading.serializer.js';
import { readingService } from './reading.service.js';

export const readingController = {
  listForInstallation: asyncHandler(async (req, res) => {
    const installationId = parseId(req.params.installationId, 'installationId');
    const query = parseQuery(req.query);
    const { installation, result } = await readingService.listForInstallation(req.auth, installationId, query);
    return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeReading), result.count), { lastModified: latestDate(installation.updatedAt, ...result.rows.map((row) => row.receivedAt)) });
  }),

  get: asyncHandler(async (req, res) => {
    const installationId = parseId(req.params.installationId, 'installationId');
    const readingId = Number.parseInt(req.params.readingId, 10);
    if (!Number.isSafeInteger(readingId) || readingId < 1) throw badRequest('readingId must be a positive integer');
    const { reading } = await readingService.getForInstallation(req.auth, installationId, readingId);
    return sendRepresentation(req, res, serializeReading(reading), { lastModified: reading.receivedAt });
  }),

  ingest: asyncHandler(async (req, res) => {
    const installationId = parseId(req.params.installationId, 'installationId');
    const reading = await readingService.ingest(req.auth, installationId, parseBody(readingSchema, req.body));
    res.location(`${req.protocol}://${req.get('host')}/api/v1/installations/${installationId}/readings/${reading.id}`);
    return res.status(201).json(serializeReading(reading));
  }),

  list: asyncHandler(async (req, res) => {
    const query = parseQuery(req.query);
    const result = await readingService.list(req.auth, query);
    return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeReading), result.count), { lastModified: latestDate(...result.rows.map((row) => row.receivedAt)) });
  }),

  mutation: (req, res, next) => next(req.auth.kind === 'device' ? forbidden('Devices cannot modify readings') : methodNotAllowed(['GET']))
};
