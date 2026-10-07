import { ApiError } from '../../middleware/errors.js';
import { parseBody, loginDeviceSchema, loginUserSchema } from '../../shared/validation/schemas.js';
import { config } from '../../config/config.js';
import { authService } from './auth.service.js';
import { serializeUser } from './auth.serializer.js';

export async function loginUser(req, res) {
  const { email, password } = parseBody(loginUserSchema, req.body);
  const user = await authService.loginUser(email, password);
  if (!user) throw new ApiError(401, 'invalid_credentials', 'Email or password is invalid');
  return res.status(200).json({ token_type: 'Bearer', access_token: authService.issueUserToken(user), expires_in: config.jwtExpiresIn, user: serializeUser(user) });
}

export async function loginInstallation(req, res) {
  const { deviceUsername, deviceSecret } = parseBody(loginDeviceSchema, req.body);
  const installation = await authService.loginDevice(deviceUsername, deviceSecret);
  if (!installation) throw new ApiError(401, 'invalid_credentials', 'Device credentials are invalid');
  return res.status(200).json({ token_type: 'Bearer', access_token: authService.issueDeviceToken(installation), expires_in: config.jwtExpiresIn, installation_id: installation.id });
}
