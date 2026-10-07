import { provinceRepository } from './province.repository.js';

export const provinceService = {
  list(auth, query) {
    return provinceRepository.list(auth, query);
  },

  getAccessible(auth, id) {
    return provinceRepository.findAccessible(auth, id);
  },

  listDistricts(auth, provinceId, query) {
    return provinceRepository.listDistricts(auth, provinceId, query);
  },

  findActiveById(id) {
    return provinceRepository.findActiveById(id);
  },

  create(data) {
    return provinceRepository.create(data);
  },

  update(item, data) {
    return provinceRepository.update(item, data);
  },

  softDelete(item) {
    return provinceRepository.softDelete(item);
  }
};
