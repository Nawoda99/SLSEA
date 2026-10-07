import { District, GridSubstation, Province } from '../../database/models/index.js';
import { forbidden, unauthorized } from '../../middleware/errors.js';

export const USER_ROLES = new Set(['national', 'provincial', 'district', 'maintenance']);

export function requireUser(req, res, next) {
  if (req.auth?.kind !== 'user') return next(forbidden('Installation devices cannot access SLSEA user resources'));
  return next();
}

export function requireDevice(req, res, next) {
  if (req.auth?.kind !== 'device') return next(forbidden('Only an installation device can submit readings'));
  return next();
}

export function requireMaintenance(req, res, next) {
  if (req.auth?.kind !== 'user' || req.auth.role !== 'maintenance') return next(forbidden('Maintenance capability is required'));
  if (!req.app.locals.config.enableMaintenance) return next(forbidden('Maintenance capability is disabled by configuration'));
  return next();
}

function scopedId(requested, authorised) {
  if (authorised && requested && requested !== authorised) return '__no_access__';
  return requested ?? authorised;
}

export function locationIncludes(auth, filters = {}) {
  const provinceWhere = { deletedAt: null };
  const districtWhere = { deletedAt: null };
  const substationWhere = { deletedAt: null };

  const authorisedProvince = auth.role === 'provincial' ? auth.provinceId : null;
  const authorisedDistrict = auth.role === 'district' ? auth.districtId : null;
  const provinceId = scopedId(filters.provinceId, authorisedProvince);
  const districtId = scopedId(filters.districtId, authorisedDistrict);
  if (provinceId) provinceWhere.id = provinceId;
  if (districtId) districtWhere.id = districtId;
  if (filters.substationId) substationWhere.id = filters.substationId;

  return [{
    model: GridSubstation,
    as: 'gridSubstation',
    required: true,
    where: substationWhere,
    include: [{
      model: District,
      as: 'district',
      required: true,
      where: districtWhere,
      include: [{ model: Province, as: 'province', required: true, where: provinceWhere }]
    }]
  }];
}

export function districtWhere(auth, requestedProvinceId) {
  if (auth.role === 'district') return { id: auth.districtId };
  if (auth.role === 'provincial') return { provinceId: auth.provinceId, ...(requestedProvinceId ? { provinceId: requestedProvinceId } : {}) };
  return requestedProvinceId ? { provinceId: requestedProvinceId } : {};
}

export function provinceWhere(auth) {
  return auth.role === 'provincial' ? { id: auth.provinceId } : {};
}

export function canAccessProvince(auth, provinceId) {
  return auth.role === 'national' || auth.role === 'maintenance' || (auth.role === 'provincial' && auth.provinceId === provinceId);
}

export function assertAuthSubject(subject) {
  if (!subject) throw unauthorized('The token subject is no longer active');
  return subject;
}
