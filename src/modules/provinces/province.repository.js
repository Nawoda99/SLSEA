import crypto from 'node:crypto';
import { District, Province } from '../../database/models/index.js';
import { active } from '../../shared/http/route-tools.js';

export const provinceRepository = {
  async list(auth, query) {
    const where = { ...active };
    if (auth.role === 'provincial') where.id = auth.provinceId;
    if (auth.role === 'district') {
      const district = await District.findOne({ where: { ...active, id: auth.districtId }, attributes: ['provinceId'] });
      where.id = district?.provinceId ?? '__no_access__';
    }
    if (query.provinceId) where.id = where.id && query.provinceId !== where.id ? '__no_access__' : query.provinceId;
    return Province.findAndCountAll({ where, order: [['name', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit });
  },

  findAccessible(auth, id) {
    const where = { ...active, id };
    if (auth.role === 'provincial' && auth.provinceId !== id) where.id = '__no_access__';
    const include = auth.role === 'district' ? [{ model: District, as: 'districts', required: true, where: { ...active, id: auth.districtId }, attributes: [] }] : [];
    return Province.findOne({ where, include });
  },

  listDistricts(auth, provinceId, query) {
    const where = { ...active, provinceId };
    if (auth.role === 'district') where.id = auth.districtId;
    return District.findAndCountAll({ where, order: [['name', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit });
  },

  findActiveById(id) {
    return Province.findOne({ where: { id, ...active } });
  },

  create(data) {
    return Province.create({ id: crypto.randomUUID(), ...data });
  },

  update(item, data) {
    return item.update(data);
  },

  softDelete(item) {
    return item.update({ deletedAt: new Date() });
  }
};
