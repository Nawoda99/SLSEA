import { asyncHandler, methodNotAllowed, notFound } from '../../middleware/errors.js';
import { parseBody, parseId, parseQuery, districtSchema } from '../../shared/validation/schemas.js';
import { assertIfMatch, latestDate, locationOf, paged, sendRepresentation } from '../../shared/http/route-tools.js';
import { serializeDistrict } from './district.serializer.js';
import { serializeSubstation } from '../substations/substation.serializer.js';
import { districtService } from './district.service.js';

export const districtController = {
  list: asyncHandler(async (req, res) => {
    const query = parseQuery(req.query);
    const result = await districtService.list(req.auth, query);
    return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeDistrict), result.count), { lastModified: latestDate(...result.rows.map((row) => row.updatedAt)) });
  }),
  get: asyncHandler(async (req, res) => {
    const item = await districtService.getAccessible(req.auth, parseId(req.params.districtId, 'districtId'));
    if (!item) throw notFound();
    return sendRepresentation(req, res, serializeDistrict(item), { lastModified: item.updatedAt });
  }),
  listSubstations: asyncHandler(async (req, res) => {
    const districtId = parseId(req.params.districtId, 'districtId');
    const district = await districtService.getAccessible(req.auth, districtId);
    if (!district) throw notFound();
    const query = parseQuery(req.query);
    const result = await districtService.listSubstations(districtId, query);
    return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeSubstation), result.count), { lastModified: latestDate(district.updatedAt, ...result.rows.map((row) => row.updatedAt)) });
  }),
  create: asyncHandler(async (req, res) => {
    const item = await districtService.create(parseBody(districtSchema, req.body));
    res.location(locationOf(req, item.id));
    return res.status(201).json(serializeDistrict(item));
  }),
  replace: asyncHandler(async (req, res) => {
    const id = parseId(req.params.districtId, 'districtId');
    const current = await districtService.findActiveById(id);
    if (!current) throw notFound();
    assertIfMatch(req, serializeDistrict(current));
    const item = await districtService.replace(current, parseBody(districtSchema, req.body));
    return sendRepresentation(req, res, serializeDistrict(item), { lastModified: item.updatedAt });
  }),
  patch: asyncHandler(async (req, res) => {
    const id = parseId(req.params.districtId, 'districtId');
    const current = await districtService.findActiveById(id);
    if (!current) throw notFound();
    assertIfMatch(req, serializeDistrict(current));
    const item = await districtService.update(current, parseBody(districtSchema.partial(), req.body));
    return sendRepresentation(req, res, serializeDistrict(item), { lastModified: item.updatedAt });
  }),
  remove: asyncHandler(async (req, res) => {
    const id = parseId(req.params.districtId, 'districtId');
    const current = await districtService.findActiveById(id);
    if (!current) throw notFound();
    assertIfMatch(req, serializeDistrict(current));
    await districtService.softDelete(current);
    return res.status(204).end();
  }),
  methods: (req, res, next) => next(methodNotAllowed(['GET', 'PUT', 'PATCH', 'DELETE']))
};
