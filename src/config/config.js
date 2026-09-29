import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET ?? '';

if (isProduction && (jwtSecret.length < 32 || jwtSecret.includes('replace-with'))) {
  throw new Error('JWT_SECRET must be a strong secret of at least 32 characters in production');
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (isProduction && origins.includes('*')) {
  throw new Error('Wildcard CORS is not allowed in production');
}

const positiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction,
  port: positiveInteger(process.env.PORT, 8080),
  databaseUrl: process.env.DATABASE_URL,
  testDatabaseUrl: process.env.TEST_DATABASE_URL ?? '',
  jwtSecret: jwtSecret || 'development-only-secret-change-me-please-123456',
  jwtIssuer: process.env.JWT_ISSUER ?? 'slsea-solar-api',
  jwtAudience: process.env.JWT_AUDIENCE ?? 'slsea-clients',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  corsOrigins: origins,
  enableMaintenance: process.env.ENABLE_MAINTENANCE === 'true',
  freshnessThresholdMinutes: positiveInteger(process.env.FRESHNESS_THRESHOLD_MINUTES, 60),
  seedReferenceTime: process.env.SEED_REFERENCE_TIME ?? '',
  seedUserPassword: process.env.SEED_USER_PASSWORD ?? '',
  seedDeviceSecret: process.env.SEED_DEVICE_SECRET ?? '',
  dbPoolMax: positiveInteger(process.env.DB_POOL_MAX, 10),
  logLevel: process.env.LOG_LEVEL ?? 'info'
});

export function validateSeedConfiguration() {
  if (config.isProduction && (!config.seedUserPassword || !config.seedDeviceSecret)) {
    throw new Error('SEED_USER_PASSWORD and SEED_DEVICE_SECRET must be explicit in production');
  }
}
