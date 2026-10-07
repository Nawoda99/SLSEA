import { Op } from 'sequelize';
import { GenerationReading, SolarInstallation } from '../../database/models/index.js';
import { active } from '../../shared/http/route-tools.js';
import { locationIncludes } from '../../shared/security/authorization.js';

export const readingRepository = {
  findInstallation(auth, installationId, filters = {}) {
    return SolarInstallation.findOne({ where: { id: installationId, ...active }, include: locationIncludes(auth, filters) });
  },

  listForInstallation(installationId, query) {
    const where = { installationId };
    if (query.from || query.to) where.measuredAt = { ...(query.from ? { [Op.gte]: new Date(query.from) } : {}), ...(query.to ? { [Op.lte]: new Date(query.to) } : {}) };
    return GenerationReading.findAndCountAll({ where, order: [['measuredAt', query.order], ['id', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit });
  },

  findById(installationId, readingId) {
    return GenerationReading.findOne({ where: { id: readingId, installationId } });
  },

  findLatest(installationId) {
    return GenerationReading.findOne({ where: { installationId }, order: [['measuredAt', 'DESC'], ['id', 'DESC']] });
  },

  findPrior(installationId, measuredAt) {
    return GenerationReading.findOne({ where: { installationId, measuredAt: { [Op.lte]: measuredAt } }, order: [['measuredAt', 'DESC'], ['id', 'DESC']] });
  },

  create(data) {
    return GenerationReading.create(data);
  },

  async listCollection(auth, query) {
    const where = {};
    if (query.from || query.to) where.measuredAt = { ...(query.from ? { [Op.gte]: new Date(query.from) } : {}), ...(query.to ? { [Op.lte]: new Date(query.to) } : {}) };
    const include = locationIncludes(auth, query);
    return GenerationReading.findAndCountAll({ where, include: [{ model: SolarInstallation, as: 'installation', required: true, where: active, include }], order: [[query.sort === 'received_at' ? 'receivedAt' : 'measuredAt', query.order], ['id', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit, distinct: true });
  }
};
