import { asIso, asNumber } from '../../shared/utils/time.js';

export function serializeSubstation(item) {
  return { id: item.id, district_id: item.districtId, code: item.code, name: item.name, latitude: asNumber(item.latitude), longitude: asNumber(item.longitude), is_synthetic: Boolean(item.isSynthetic), created_at: asIso(item.createdAt), updated_at: asIso(item.updatedAt) };
}
