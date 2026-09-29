import { District, GridSubstation, Province, SolarInstallation, User } from '../models/models.js';
import { forbidden, unauthorized } from '../middleware/errors.js';

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

export function locationIncludes(auth, filters = {}) {
  const provinceWhere = {};
  const districtWhere = {};
  const substationWhere = {};

  if (auth.role === 'provincial') provinceWhere.id = auth.provinceId;
  if (auth.role === 'district') districtWhere.id = auth.districtId;
  if (filters.provinceId) provinceWhere.id = filters.provinceId;
  if (filters.districtId) districtWhere.id = filters.districtId;
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

export async function loadUserFromToken(sub) {
  return User.findOne({ where: { id: sub, isActive: true, deletedAt: null } });
}

export async function loadInstallationFromToken(sub) {
  return SolarInstallation.findOne({ where: { id: sub, deletedAt: null } });
}

export function assertAuthSubject(subject) {
  if (!subject) throw unauthorized('The token subject is no longer active');
  return subject;
}
