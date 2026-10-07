import { asIso } from '../../shared/utils/time.js';

export function serializeUser(user) {
  const value = user.toJSON ? user.toJSON() : { ...user };
  delete value.passwordHash;
  return {
    id: value.id,
    email: value.email,
    role: value.role,
    provinceId: value.provinceId,
    districtId: value.districtId,
    isActive: value.isActive,
    deletedAt: value.deletedAt,
    createdAt: asIso(value.createdAt),
    updatedAt: asIso(value.updatedAt)
  };
}
