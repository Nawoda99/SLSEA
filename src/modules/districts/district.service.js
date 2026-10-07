import { badRequest } from '../../middleware/errors.js';
import { districtRepository } from './district.repository.js';

export const districtService = {
  list(auth, query) { return districtRepository.list(auth, query); },
  getAccessible(auth, id) { return districtRepository.findAccessible(auth, id); },
  listSubstations(id, query) { return districtRepository.listSubstations(id, query); },
  findActiveById(id) { return districtRepository.findActiveById(id); },
  async create(data) {
    if (!(await districtRepository.parentProvinceIsActive(data.provinceId))) throw badRequest('provinceId does not reference an active province');
    return districtRepository.create(data);
  },
  async replace(item, data) {
    if (!(await districtRepository.parentProvinceIsActive(data.provinceId))) throw badRequest('provinceId does not reference an active province');
    return districtRepository.update(item, data);
  },
  update(item, data) { return districtRepository.update(item, data); },
  softDelete(item) { return districtRepository.softDelete(item); }
};
