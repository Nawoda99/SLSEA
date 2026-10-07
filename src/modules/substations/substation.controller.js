import { asyncHandler, methodNotAllowed, notFound } from '../../middleware/errors.js';
import { parseBody, parseId, parseQuery, substationSchema } from '../../shared/validation/schemas.js';
import { assertIfMatch, latestDate, locationOf, paged, sendRepresentation } from '../../shared/http/route-tools.js';
import { serializeInstallation } from '../installations/installation.serializer.js';
import { serializeSubstation } from './substation.serializer.js';
import { substationService } from './substation.service.js';

export const substationController = {
  list: asyncHandler(async (req, res) => {
    const query = parseQuery(req.query);
    const result = await substationService.list(req.auth, query);
    return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeSubstation), result.count), { lastModified: latestDate(...result.rows.map((row) => row.updatedAt)) });
  }),
  get: asyncHandler(async (req, res) => {
    const item = await substationService.getAccessible(req.auth, parseId(req.params.substationId, 'substationId'));
    if (!item) throw notFound();
    return sendRepresentation(req, res, serializeSubstation(item), { lastModified: item.updatedAt });
  }),
  listInstallations: asyncHandler(async (req, res) => {
    const id = parseId(req.params.substationId, 'substationId');
    const substation = await substationService.getAccessible(req.auth, id);
    if (!substation) throw notFound();
    const query = parseQuery(req.query);
    const result = await substationService.listInstallations(id, query);
    return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeInstallation), result.count), { lastModified: latestDate(substation.updatedAt, ...result.rows.map((row) => row.updatedAt)) });
  }),
  create: asyncHandler(async (req, res) => {
    const item = await substationService.create(parseBody(substationSchema, req.body));
    res.location(locationOf(req, item.id));
    return res.status(201).json(serializeSubstation(item));
  }),
  replace: asyncHandler(async (req, res) => {
    const id = parseId(req.params.substationId, 'substationId');
    const current = await substationService.findActiveById(id);
    if (!current) throw notFound();
    assertIfMatch(req, serializeSubstation(current));
    const item = await substationService.update(current, parseBody(substationSchema, req.body));
    return sendRepresentation(req, res, serializeSubstation(item), { lastModified: item.updatedAt });
  }),
  patch: asyncHandler(async (req, res) => {
    const id = parseId(req.params.substationId, 'substationId');
    const current = await substationService.findActiveById(id);
    if (!current) throw notFound();
    assertIfMatch(req, serializeSubstation(current));
    const item = await substationService.update(current, parseBody(substationSchema.partial(), req.body));
    return sendRepresentation(req, res, serializeSubstation(item), { lastModified: item.updatedAt });
  }),
  remove: asyncHandler(async (req, res) => {
    const id = parseId(req.params.substationId, 'substationId');
    const current = await substationService.findActiveById(id);
    if (!current) throw notFound();
    assertIfMatch(req, serializeSubstation(current));
    await substationService.softDelete(current);
    return res.status(204).end();
  }),
  methods: (req, res, next) => next(methodNotAllowed(['GET', 'PUT', 'PATCH', 'DELETE']))
};
