import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/config.js';
import { forbidden, unauthorized } from './errors.js';
import { assertAuthSubject, loadInstallationFromToken, loadUserFromToken } from '../services/authorization.js';
import { User, SolarInstallation } from '../models/models.js';

export function issueUserToken(user) {
  return jwt.sign({
    kind: 'user', role: user.role, provinceId: user.provinceId ?? null, districtId: user.districtId ?? null
  }, config.jwtSecret, {
    subject: user.id, expiresIn: config.jwtExpiresIn, issuer: config.jwtIssuer, audience: config.jwtAudience, algorithm: 'HS256'
  });
}

export function issueDeviceToken(installation) {
  return jwt.sign({ kind: 'device', installationId: installation.id }, config.jwtSecret, {
    subject: installation.id, expiresIn: config.jwtExpiresIn, issuer: config.jwtIssuer, audience: config.jwtAudience, algorithm: 'HS256'
  });
}

export async function authenticate(req, res, next) {
  try {
    const header = req.get('Authorization') ?? '';
    if (!header.startsWith('Bearer ')) return next(unauthorized());
    const token = header.slice(7).trim();
    if (!token) return next(unauthorized());
    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'], issuer: config.jwtIssuer, audience: config.jwtAudience
    });
    if (!payload || typeof payload !== 'object' || !payload.sub || !payload.kind) return next(unauthorized('The access token is invalid'));

    if (payload.kind === 'user') {
      const user = assertAuthSubject(await loadUserFromToken(payload.sub));
      req.auth = { kind: 'user', id: user.id, role: user.role, provinceId: user.provinceId, districtId: user.districtId };
    } else if (payload.kind === 'device') {
      const installation = assertAuthSubject(await loadInstallationFromToken(payload.sub));
      req.auth = { kind: 'device', id: installation.id, installationId: installation.id };
    } else {
      return next(unauthorized('The access token type is invalid'));
    }
    return next();
  } catch (error) {
    if (error.status === 401) return next(error);
    return next(unauthorized('The access token is invalid or expired'));
  }
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function hashSecret(secret) {
  return bcrypt.hash(secret, 12);
}

export async function loginUser(email, password) {
  const user = await User.findOne({ where: { email: email.toLowerCase(), isActive: true, deletedAt: null } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null;
  return user;
}

export async function loginDevice(username, secret) {
  const installation = await SolarInstallation.findOne({ where: { deviceUsername: username, deletedAt: null } });
  if (!installation || !(await verifyPassword(secret, installation.deviceSecretHash))) return null;
  return installation;
}

export function rejectIfDevice(req, res, next) {
  if (req.auth?.kind === 'device') return next(forbidden('Installation devices cannot access this resource'));
  return next();
}
