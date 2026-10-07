import crypto from 'node:crypto';
import { District, GridSubstation, Province, SolarInstallation } from '../../database/models/index.js';
import { active } from '../../shared/http/route-tools.js';

export const substationRepository = {
  list(auth, query) {
    const districtWhere = { ...active };
    const provinceWhere = { ...active };
    if (auth.role === 'district') districtWhere.id = auth.districtId;
    if (auth.role === 'provincial') provinceWhere.id = auth.provinceId;
    if (query.districtId) districtWhere.id = auth.role === 'district' && query.districtId !== auth.districtId ? '__no_access__' : query.districtId;
    if (query.provinceId) provinceWhere.id = auth.role === 'provincial' && query.provinceId !== auth.provinceId ? '__no_access__' : query.provinceId;
    return GridSubstation.findAndCountAll({ where: active, include: [{ model: District, as: 'district', required: true, where: districtWhere, include: [{ model: Province, as: 'province', required: true, where: provinceWhere }] }], order: [['name', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit, distinct: true });
  },

  findAccessible(auth, id) {
    const districtWhere = { ...active };
    const provinceWhere = { ...active };
    if (auth.role === 'district') districtWhere.id = auth.districtId;
    if (auth.role === 'provincial') provinceWhere.id = auth.provinceId;
    return GridSubstation.findOne({ where: { ...active, id }, include: [{ model: District, as: 'district', required: true, where: districtWhere, include: [{ model: Province, as: 'province', required: true, where: provinceWhere }] }] });
  },

  listInstallations(id, query) {
    return SolarInstallation.findAndCountAll({ where: { ...active, gridSubstationId: id }, order: [['name', query.order]], limit: query.limit, offset: (query.page - 1) * query.limit });
  },

  findActiveById(id) { return GridSubstation.findOne({ where: { id, ...active } }); },
  parentDistrictIsActive(id) { return District.findOne({ where: { id, ...active }, attributes: ['id'] }); },
  create(data) { return GridSubstation.create({ id: crypto.randomUUID(), ...data }); },
  update(item, data) { return item.update(data); },
  softDelete(item) { return item.update({ deletedAt: new Date() }); }
};
