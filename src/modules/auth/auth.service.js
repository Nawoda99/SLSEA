import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/config.js';
import { authRepository } from './auth.repository.js';

export const authService = {
  issueUserToken(user) {
    return jwt.sign({ kind: 'user', role: user.role, provinceId: user.provinceId ?? null, districtId: user.districtId ?? null }, config.jwtSecret, { subject: user.id, expiresIn: config.jwtExpiresIn, issuer: config.jwtIssuer, audience: config.jwtAudience, algorithm: 'HS256' });
  },

  issueDeviceToken(installation) {
    return jwt.sign({ kind: 'device', installationId: installation.id }, config.jwtSecret, { subject: installation.id, expiresIn: config.jwtExpiresIn, issuer: config.jwtIssuer, audience: config.jwtAudience, algorithm: 'HS256' });
  },

  verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  },

  hashSecret(secret) {
    return bcrypt.hash(secret, 12);
  },

  async loginUser(email, password) {
    const user = await authRepository.findActiveUserByEmail(email);
    if (!user || !(await this.verifyPassword(password, user.passwordHash))) return null;
    return user;
  },

  async loginDevice(username, secret) {
    const installation = await authRepository.findActiveInstallationByUsername(username);
    if (!installation || !(await this.verifyPassword(secret, installation.deviceSecretHash))) return null;
    return installation;
  }
};

export const { issueUserToken, issueDeviceToken, hashSecret } = authService;
