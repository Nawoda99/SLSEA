import { asIso } from '../../shared/utils/time.js';

export function serializeDistrict(item) {
  return { id: item.id, province_id: item.provinceId, code: item.code, name: item.name, created_at: asIso(item.createdAt), updated_at: asIso(item.updatedAt) };
}
