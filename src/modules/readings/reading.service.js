import { UniqueConstraintError } from 'sequelize';
import { badRequest, conflict, forbidden, notFound } from '../../middleware/errors.js';
import { parseUtc } from '../../shared/utils/time.js';
import { assertFutureAllowed } from '../../shared/http/route-tools.js';
import { readingRepository } from './reading.repository.js';

export const readingService = {
  async listForInstallation(auth, installationId, query) {
    const installation = await readingRepository.findInstallation(auth, installationId, query);
    if (!installation) throw notFound();
    const result = await readingRepository.listForInstallation(installationId, query);
    return { installation, result };
  },

  async getForInstallation(auth, installationId, readingId) {
    const installation = await readingRepository.findInstallation(auth, installationId);
    if (!installation) throw notFound();
    const reading = await readingRepository.findById(installationId, readingId);
    if (!reading) throw notFound();
    return { installation, reading };
  },

  async ingest(auth, installationId, data) {
    if (auth.installationId !== installationId) throw forbidden('A device may only submit readings for its own installation');
    const installation = await readingRepository.findInstallation({ role: 'national' }, installationId);
    if (!installation) throw notFound();
    const measuredAt = parseUtc(data.measuredAt);
    assertFutureAllowed(measuredAt);
    if (data.powerKw > Number(installation.capacityKw) * 1.2) throw badRequest('powerKw exceeds the installation capacity tolerance');
    const prior = await readingRepository.findPrior(installationId, measuredAt);
    if (prior && data.cumulativeEnergyKwh < Number(prior.cumulativeEnergyKwh) && !data.meterReset) throw conflict('Cumulative energy decreased; resubmit with meterReset=true to record a declared meter reset');
    try {
      return await readingRepository.create({ installationId, measuredAt, receivedAt: new Date(), powerKw: data.powerKw, cumulativeEnergyKwh: data.cumulativeEnergyKwh, voltageV: data.voltageV });
    } catch (error) {
      if (error instanceof UniqueConstraintError) throw conflict('A reading already exists for this installation and measuredAt timestamp');
      throw error;
    }
  },

  list(auth, query) {
    return readingRepository.listCollection(auth, query);
  },

  latest(installationId) {
    return readingRepository.findLatest(installationId);
  }
};
