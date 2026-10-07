import jwt from 'jsonwebtoken';
import { config } from '../../config/config.js';
import { unauthorized } from '../../middleware/errors.js';
import { assertAuthSubject } from '../../shared/security/authorization.js';
import { authRepository } from './auth.repository.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.get('Authorization') ?? '';
    if (!header.startsWith('Bearer ')) return next(unauthorized());
    const token = header.slice(7).trim();
    if (!token) return next(unauthorized());
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: config.jwtIssuer, audience: config.jwtAudience });
    if (!payload || typeof payload !== 'object' || !payload.sub || !payload.kind) return next(unauthorized('The access token is invalid'));

    if (payload.kind === 'user') {
      const user = assertAuthSubject(await authRepository.findActiveUserById(payload.sub));
      req.auth = { kind: 'user', id: user.id, role: user.role, provinceId: user.provinceId, districtId: user.districtId };
    } else if (payload.kind === 'device') {
      const installation = assertAuthSubject(await authRepository.findActiveInstallationById(payload.sub));
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
