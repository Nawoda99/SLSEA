import { asIso } from '../../shared/utils/time.js';

export function serializeProvince(item) {
  return { id: item.id, code: item.code, name: item.name, created_at: asIso(item.createdAt), updated_at: asIso(item.updatedAt) };
}
