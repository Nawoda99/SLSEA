import { GridSubstation, GenerationReading, SolarInstallation } from '../../database/models/index.js';
import { active } from '../../shared/http/route-tools.js';
import { locationIncludes } from '../../shared/security/authorization.js';

export const installationRepository = {
  list(auth, query) {
    const include = locationIncludes(auth, query);
    const orderField = query.sort === 'created_at' ? 'createdAt' : 'name';
    return SolarInstallation.findAndCountAll({ where: active, include, order: [[orderField, query.order], ['id', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit, distinct: true });
  },

  findAccessible(auth, id, filters = {}) {
    return SolarInstallation.findOne({ where: { id, ...active }, include: locationIncludes(auth, filters) });
  },

  findLatestReading(installationId) {
    return GenerationReading.findOne({ where: { installationId }, order: [['measuredAt', 'DESC'], ['id', 'DESC']] });
  },

  findActiveById(id) { return SolarInstallation.findOne({ where: { id, ...active } }); },
  parentSubstationIsActive(id) { return GridSubstation.findOne({ where: { id, ...active }, attributes: ['id'] }); },
  create(data) { return SolarInstallation.create(data); },
  update(item, data) { return item.update({ ...data, version: item.version + 1 }); },
  softDelete(item) { return item.update({ deletedAt: new Date(), version: item.version + 1 }); }
};
