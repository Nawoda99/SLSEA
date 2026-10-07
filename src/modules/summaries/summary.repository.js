import { Op } from 'sequelize';
import { District, GenerationReading, GridSubstation, Province, SolarInstallation } from '../../database/models/index.js';
import { active } from '../../shared/http/route-tools.js';

export const summaryRepository = {
  findAccessibleDistrict(auth, id) {
    const districtWhere = { ...active, id: auth.role === 'district' && auth.districtId !== id ? '__no_access__' : id };
    const provinceWhere = { ...active };
    if (auth.role === 'provincial') provinceWhere.id = auth.provinceId;
    return District.findOne({ where: districtWhere, include: [{ model: Province, as: 'province', required: true, where: provinceWhere }] });
  },

  findInstallations(districtId) {
    return SolarInstallation.findAll({ where: active, include: [{ model: GridSubstation, as: 'gridSubstation', required: true, where: active, include: [{ model: District, as: 'district', required: true, where: { ...active, id: districtId } }] }] });
  },

  findLatest(installationId) {
    return GenerationReading.findOne({ where: { installationId }, order: [['measuredAt', 'DESC'], ['id', 'DESC']] });
  },

  findReadingsForDay(installationId, start, end, asOf) {
    return GenerationReading.findAll({ where: { installationId, measuredAt: { [Op.gte]: start, [Op.lt]: end, [Op.lte]: asOf } }, order: [['measuredAt', 'ASC'], ['id', 'ASC']] });
  },

  findBaseline(installationId, start) {
    return GenerationReading.findOne({ where: { installationId, measuredAt: { [Op.lt]: start } }, order: [['measuredAt', 'DESC'], ['id', 'DESC']] });
  }
};
