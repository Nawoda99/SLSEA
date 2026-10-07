import crypto from 'node:crypto';
import { District, GridSubstation, Province } from '../../database/models/index.js';
import { active } from '../../shared/http/route-tools.js';

export const districtRepository = {
  list(auth, query) {
    const where = { ...active };
    if (auth.role === 'district') where.id = auth.districtId;
    if (auth.role === 'provincial') where.provinceId = auth.provinceId;
    if (query.provinceId) where.provinceId = auth.role === 'provincial' && query.provinceId !== auth.provinceId ? '__no_access__' : query.provinceId;
    if (query.districtId) where.id = auth.role === 'district' && query.districtId !== auth.districtId ? '__no_access__' : query.districtId;
    return District.findAndCountAll({ where, order: [['name', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit });
  },

  findAccessible(auth, id) {
    const districtWhere = { ...active, id: auth.role === 'district' && auth.districtId !== id ? '__no_access__' : id };
    const provinceWhere = { ...active };
    if (auth.role === 'provincial') provinceWhere.id = auth.provinceId;
    return District.findOne({ where: districtWhere, include: [{ model: Province, as: 'province', required: true, where: provinceWhere }] });
  },

  listSubstations(districtId, query) {
    return GridSubstation.findAndCountAll({ where: { ...active, districtId }, order: [['name', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit });
  },

  findActiveById(id) {
    return District.findOne({ where: { id, ...active } });
  },

  parentProvinceIsActive(provinceId) {
    return Province.findOne({ where: { id: provinceId, ...active }, attributes: ['id'] });
  },

  create(data) {
    return District.create({ id: crypto.randomUUID(), ...data });
  },

  update(item, data) {
    return item.update(data);
  },

  softDelete(item) {
    return item.update({ deletedAt: new Date() });
  }
};
