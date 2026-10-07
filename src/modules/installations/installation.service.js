import crypto from 'node:crypto';
import { badRequest } from '../../middleware/errors.js';
import { authService } from '../auth/auth.service.js';
import { installationRepository } from './installation.repository.js';

export const installationService = {
  list(auth, query) { return installationRepository.list(auth, query); },
  getAccessible(auth, id, filters) { return installationRepository.findAccessible(auth, id, filters); },
  latestReading(id) { return installationRepository.findLatestReading(id); },
  findActiveById(id) { return installationRepository.findActiveById(id); },
  async create(data) {
    if (!(await installationRepository.parentSubstationIsActive(data.gridSubstationId))) throw badRequest('gridSubstationId does not reference an active substation');
    const id = crypto.randomUUID();
    return installationRepository.create({ id, ...data, deviceUsername: `device-${id.slice(0, 8)}`, deviceSecretHash: await authService.hashSecret(crypto.randomBytes(32).toString('hex')) });
  },
  update(item, data) { return installationRepository.update(item, data); },
  softDelete(item) { return installationRepository.softDelete(item); }
};
