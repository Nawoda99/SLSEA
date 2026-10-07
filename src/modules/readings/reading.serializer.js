import { asIso, asNumber } from '../../shared/utils/time.js';

export function serializeReading(item) {
  const value = item.toJSON ? item.toJSON() : item;
  return { id: String(value.id), installation_id: value.installationId, measured_at: asIso(value.measuredAt), received_at: asIso(value.receivedAt), power_kw: asNumber(value.powerKw), cumulative_energy_kwh: asNumber(value.cumulativeEnergyKwh), voltage_v: asNumber(value.voltageV) };
}
