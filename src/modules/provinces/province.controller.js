import { asyncHandler, methodNotAllowed, notFound } from '../../middleware/errors.js';
import { parseBody, parseId, parseQuery, provinceSchema } from '../../shared/validation/schemas.js';
import { assertIfMatch, latestDate, locationOf, paged, sendRepresentation } from '../../shared/http/route-tools.js';
import { serializeDistrict } from '../districts/district.serializer.js';
import { serializeProvince } from './province.serializer.js';
import { provinceService } from './province.service.js';

export const provinceController = {
  list: asyncHandler(async (req, res) => {
    const query = parseQuery(req.query);
    const result = await provinceService.list(req.auth, query);
    return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeProvince), result.count), { lastModified: latestDate(...result.rows.map((row) => row.updatedAt)) });
  }),

  get: asyncHandler(async (req, res) => {
    const item = await provinceService.getAccessible(req.auth, parseId(req.params.provinceId, 'provinceId'));
    if (!item) throw notFound();
    return sendRepresentation(req, res, serializeProvince(item), { lastModified: item.updatedAt });
  }),

  listDistricts: asyncHandler(async (req, res) => {
    const provinceId = parseId(req.params.provinceId, 'provinceId');
    const province = await provinceService.getAccessible(req.auth, provinceId);
    if (!province) throw notFound();
    const query = parseQuery(req.query);
    const result = await provinceService.listDistricts(req.auth, provinceId, query);
    return sendRepresentation(req, res, paged(query, req, result.rows.map(serializeDistrict), result.count), { lastModified: latestDate(province.updatedAt, ...result.rows.map((row) => row.updatedAt)) });
  }),

  create: asyncHandler(async (req, res) => {
    const item = await provinceService.create(parseBody(provinceSchema, req.body));
    res.location(locationOf(req, item.id));
    return res.status(201).json(serializeProvince(item));
  }),

  replace: asyncHandler(async (req, res) => {
    const id = parseId(req.params.provinceId, 'provinceId');
    const current = await provinceService.findActiveById(id);
    if (!current) throw notFound();
    assertIfMatch(req, serializeProvince(current));
    const item = await provinceService.update(current, parseBody(provinceSchema, req.body));
    return sendRepresentation(req, res, serializeProvince(item), { lastModified: item.updatedAt });
  }),

  patch: asyncHandler(async (req, res) => {
    const id = parseId(req.params.provinceId, 'provinceId');
    const current = await provinceService.findActiveById(id);
    if (!current) throw notFound();
    assertIfMatch(req, serializeProvince(current));
    const item = await provinceService.update(current, parseBody(provinceSchema.partial(), req.body));
    return sendRepresentation(req, res, serializeProvince(item), { lastModified: item.updatedAt });
  }),

  remove: asyncHandler(async (req, res) => {
    const id = parseId(req.params.provinceId, 'provinceId');
    const current = await provinceService.findActiveById(id);
    if (!current) throw notFound();
    assertIfMatch(req, serializeProvince(current));
    await provinceService.softDelete(current);
    return res.status(204).end();
  }),

  methods: (req, res, next) => next(methodNotAllowed(['GET', 'PUT', 'PATCH', 'DELETE']))
};
