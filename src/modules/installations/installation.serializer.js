import { asIso, asNumber } from '../../shared/utils/time.js';

export function serializeInstallation(item) {
  const value = item.toJSON ? { ...item.toJSON() } : { ...item };
  delete value.deviceSecretHash;
  delete value.deviceUsername;
  return { id: value.id, grid_substation_id: value.gridSubstationId, meter_id: value.meterId, inverter_id: value.inverterId, name: value.name, capacity_kw: asNumber(value.capacityKw), latitude: asNumber(value.latitude), longitude: asNumber(value.longitude), is_synthetic: Boolean(value.isSynthetic), version: value.version, created_at: asIso(value.createdAt), updated_at: asIso(value.updatedAt) };
}
