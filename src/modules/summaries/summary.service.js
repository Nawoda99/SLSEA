import { config } from '../../config/config.js';
import { notFound } from '../../middleware/errors.js';
import { localDayBounds } from '../../shared/utils/time.js';
import { summaryRepository } from './summary.repository.js';

export const summaryService = {
  async districtGeneration(auth, districtId) {
    const district = await summaryRepository.findAccessibleDistrict(auth, districtId);
    if (!district) throw notFound();
    const asOf = new Date();
    const freshnessCutoff = new Date(asOf.getTime() - config.freshnessThresholdMinutes * 60_000);
    const { start: dayStart, end: dayEnd } = localDayBounds(asOf);
    const installations = await summaryRepository.findInstallations(districtId);
    const results = await Promise.all(installations.map(async (installation) => {
      const [latest, todayReadings, baseline] = await Promise.all([
        summaryRepository.findLatest(installation.id),
        summaryRepository.findReadingsForDay(installation.id, dayStart, dayEnd, asOf),
        summaryRepository.findBaseline(installation.id, dayStart)
      ]);
      let daily = 0;
      let resetCount = 0;
      let previous = baseline;
      for (const reading of todayReadings) {
        if (previous && Number(reading.cumulativeEnergyKwh) >= Number(previous.cumulativeEnergyKwh)) daily += Number(reading.cumulativeEnergyKwh) - Number(previous.cumulativeEnergyKwh);
        else if (previous) { resetCount += 1; daily = Number(reading.cumulativeEnergyKwh); }
        previous = reading;
      }
      return {
        latest,
        daily,
        missingBaseline: !baseline,
        resetCount,
        fresh: Boolean(latest && new Date(latest.receivedAt) >= freshnessCutoff),
        power: latest ? Number(latest.powerKw) : 0
      };
    }));
    const totals = results.reduce((value, item) => ({
      fresh: value.fresh + (item.fresh ? 1 : 0),
      stale: value.stale + (item.latest && !item.fresh ? 1 : 0),
      missing: value.missing + (!item.latest ? 1 : 0),
      freshPower: value.freshPower + (item.fresh ? item.power : 0),
      missingBaselines: value.missingBaselines + (item.missingBaseline ? 1 : 0),
      meterResets: value.meterResets + item.resetCount,
      energy: value.energy + item.daily
    }), { fresh: 0, stale: 0, missing: 0, freshPower: 0, missingBaselines: 0, meterResets: 0, energy: 0 });
    const total = installations.length;
    const currentPowerComplete = total > 0 && totals.fresh === total;
    const energyComplete = total === 0 || totals.missingBaselines === 0;
    return {
      district,
      value: {
        district_id: districtId,
        as_of: asOf.toISOString(),
        current_total_power_kw: currentPowerComplete ? Number(totals.freshPower.toFixed(3)) : null,
        todays_energy_kwh: energyComplete ? Number(totals.energy.toFixed(3)) : null,
        installation_counts: { total, fresh: totals.fresh, stale: totals.stale, missing: totals.missing },
        coverage: {
          freshness_threshold_minutes: config.freshnessThresholdMinutes,
          current_power_complete: currentPowerComplete,
          fresh_current_power_kw: Number(totals.freshPower.toFixed(3)),
          daily_energy_reliable: energyComplete,
          missing_midnight_baselines: totals.missingBaselines,
          meter_resets: totals.meterResets,
          midnight_baseline_policy: 'The last reading strictly before the Asia/Colombo local midnight is required for each installation; without it that installation is excluded from a reliable daily total.'
        }
      },
      asOf
    };
  }
};
