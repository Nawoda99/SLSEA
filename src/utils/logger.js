import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.deviceSecret',
      'req.body.secret',
      'password',
      'deviceSecret',
      'secret'
    ],
    censor: '[REDACTED]'
  }
});
