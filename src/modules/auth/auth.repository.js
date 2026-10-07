import { SolarInstallation, User } from '../../database/models/index.js';

export const authRepository = {
  findActiveUserByEmail(email) {
    return User.findOne({ where: { email: email.toLowerCase(), isActive: true, deletedAt: null } });
  },

  findActiveUserById(id) {
    return User.findOne({ where: { id, isActive: true, deletedAt: null } });
  },

  findActiveInstallationByUsername(deviceUsername) {
    return SolarInstallation.findOne({ where: { deviceUsername, deletedAt: null } });
  },

  findActiveInstallationById(id) {
    return SolarInstallation.findOne({ where: { id, deletedAt: null } });
  }
};
