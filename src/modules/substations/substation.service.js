import { badRequest } from '../../middleware/errors.js';
import { substationRepository } from './substation.repository.js';

export const substationService = {
  list(auth, query) { return substationRepository.list(auth, query); },
  getAccessible(auth, id) { return substationRepository.findAccessible(auth, id); },
  listInstallations(id, query) { return substationRepository.listInstallations(id, query); },
  findActiveById(id) { return substationRepository.findActiveById(id); },
  async create(data) {
    if (!(await substationRepository.parentDistrictIsActive(data.districtId))) throw badRequest('districtId does not reference an active district');
    return substationRepository.create(data);
  },
  update(item, data) { return substationRepository.update(item, data); },
  softDelete(item) { return substationRepository.softDelete(item); }
};
