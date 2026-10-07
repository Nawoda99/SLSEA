import crypto from 'node:crypto';
import { DateTime } from 'luxon';
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from '../connection.js';
import { config, validateSeedConfiguration } from '../../config/config.js';
import { hashSecret } from '../../modules/auth/auth.service.js';
import { District, GenerationReading, GridSubstation, Province, SolarInstallation, User } from '../models/index.js';
import { logger } from '../../shared/utils/logger.js';

const provinces = [
  ['WP', 'Western'], ['CP', 'Central'], ['SP', 'Southern'], ['NP', 'Northern'], ['EP', 'Eastern'],
  ['NWP', 'North Western'], ['NCP', 'North Central'], ['UP', 'Uva'], ['SG', 'Sabaragamuwa']
];
const districtMap = [
  ['CO', 'Colombo', 'WP'], ['GM', 'Gampaha', 'WP'], ['KT', 'Kalutara', 'WP'], ['KY', 'Kandy', 'CP'], ['MT', 'Matale', 'CP'], ['NE', 'Nuwara Eliya', 'CP'],
  ['GL', 'Galle', 'SP'], ['MR', 'Matara', 'SP'], ['HB', 'Hambantota', 'SP'], ['JA', 'Jaffna', 'NP'], ['KI', 'Kilinochchi', 'NP'], ['MN', 'Mannar', 'NP'], ['MU', 'Mullaitivu', 'NP'], ['VA', 'Vavuniya', 'NP'],
  ['BT', 'Batticaloa', 'EP'], ['AM', 'Ampara', 'EP'], ['TC', 'Trincomalee', 'EP'], ['KU', 'Kurunegala', 'NWP'], ['PT', 'Puttalam', 'NWP'], ['AN', 'Anuradhapura', 'NCP'], ['PO', 'Polonnaruwa', 'NCP'], ['BD', 'Badulla', 'UP'], ['MO', 'Monaragala', 'UP'], ['RT', 'Ratnapura', 'SG'], ['KE', 'Kegalle', 'SG']
];

function stableId(namespace, value) {
  const hex = crypto.createHash('sha256').update(`${namespace}:${value}`).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`;
}

async function migrate() {
  const migrator = new Umzug({ migrations: { glob: 'src/database/migrations/*.js' }, context: sequelize.getQueryInterface(), storage: new SequelizeStorage({ sequelize }), logger });
  await migrator.up();
}

async function reset() {
  if (config.isProduction) throw new Error('Refusing destructive seed reset in production');
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of ['generation_readings', 'users', 'solar_installations', 'grid_substations', 'districts', 'provinces']) await sequelize.query(`TRUNCATE TABLE ${table}`);
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
}

function referenceDate() {
  const configured = config.seedReferenceTime ? new Date(config.seedReferenceTime) : new Date();
  if (Number.isNaN(configured.getTime())) throw new Error('SEED_REFERENCE_TIME must be a valid timestamp');
  configured.setUTCMinutes(Math.floor(configured.getUTCMinutes() / 15) * 15, 0, 0);
  return configured;
}

async function insertBatches(Model, rows, transaction, batchSize = 1000) {
  for (let index = 0; index < rows.length; index += batchSize) await Model.bulkCreate(rows.slice(index, index + batchSize), { transaction });
}

async function main() {
  validateSeedConfiguration();
  await sequelize.authenticate();
  await migrate();
  if (process.argv.includes('--reset')) await reset();
  if (await Province.count() > 0) {
    logger.info('seed skipped because provinces already exist; use npm run db:seed:reset only for a non-production database');
    return;
  }

  const userPassword = config.seedUserPassword || 'local-only-change-me';
  const deviceSecret = config.seedDeviceSecret || 'local-only-change-me';
  const passwordHash = await hashSecret(userPassword);
  const deviceSecretHash = await hashSecret(deviceSecret);
  const reference = referenceDate();

  await sequelize.transaction(async (transaction) => {
    const provinceRows = provinces.map(([code, name]) => ({ id: stableId('province', code), code, name }));
    await Province.bulkCreate(provinceRows, { transaction });
    const provinceByCode = new Map(provinceRows.map((row) => [row.code, row]));
    const districtRows = districtMap.map(([code, name, provinceCode]) => ({ id: stableId('district', code), provinceId: provinceByCode.get(provinceCode).id, code, name }));
    await District.bulkCreate(districtRows, { transaction });
    const substationRows = districtRows.map((district) => ({ id: stableId('substation', district.code), districtId: district.id, code: `SYN-${district.code}-01`, name: `Synthetic ${district.name} Grid Substation`, latitude: 6.0, longitude: 80.7, isSynthetic: true }));
    await GridSubstation.bulkCreate(substationRows, { transaction });
    const installationRows = [];
    for (const district of districtRows) {
      const substation = substationRows.find((row) => row.districtId === district.id);
      for (let index = 1; index <= 8; index += 1) {
        const id = stableId('installation', `${district.code}-${index}`);
        installationRows.push({ id, gridSubstationId: substation.id, meterId: `SYN-METER-${district.code}-${String(index).padStart(2, '0')}`, inverterId: `SYN-INV-${district.code}-${String(index).padStart(2, '0')}`, deviceUsername: `device-${district.code.toLowerCase()}-${String(index).padStart(2, '0')}`, deviceSecretHash, name: `Synthetic ${district.name} Solar Installation ${index}`, capacityKw: 25 + index * 2, latitude: 6.0, longitude: 80.7, isSynthetic: true, version: 1 });
      }
    }
    await SolarInstallation.bulkCreate(installationRows, { transaction, validate: true });

    const readings = [];
    for (const installation of installationRows) {
      let cumulative = 0;
      const capacity = Number(installation.capacityKw);
      for (let slot = 0; slot < 7 * 96; slot += 1) {
        const measuredAt = new Date(reference.getTime() - (7 * 96 - slot) * 15 * 60_000);
        const local = DateTime.fromJSDate(measuredAt, { zone: 'Asia/Colombo' });
        const daylight = local.hour >= 6 && local.hour < 18 ? Math.max(0, Math.sin(((local.hour + local.minute / 60) - 6) / 12 * Math.PI)) : 0;
        const power = Number((capacity * 0.78 * daylight).toFixed(3));
        cumulative = Number((cumulative + power * 0.25).toFixed(3));
        readings.push({ installationId: installation.id, measuredAt, receivedAt: new Date(measuredAt.getTime() + 30_000), powerKw: power, cumulativeEnergyKwh: cumulative, voltageV: Number((230 + daylight * 4).toFixed(3)) });
      }
    }
    await insertBatches(GenerationReading, readings, transaction, 2000);

    const western = provinceByCode.get('WP');
    const colombo = districtRows.find((row) => row.code === 'CO');
    await User.bulkCreate([
      { id: stableId('user', 'national'), email: 'national@slsea.local', passwordHash, role: 'national', isActive: true },
      { id: stableId('user', 'western'), email: 'western@slsea.local', passwordHash, role: 'provincial', provinceId: western.id, isActive: true },
      { id: stableId('user', 'colombo'), email: 'colombo@slsea.local', passwordHash, role: 'district', districtId: colombo.id, isActive: true },
      { id: stableId('user', 'maintenance'), email: 'maintenance@slsea.local', passwordHash, role: 'maintenance', isActive: true }
    ], { transaction });
  });

  logger.info({ provinces: await Province.count(), districts: await District.count(), substations: await GridSubstation.count(), installations: await SolarInstallation.count(), readings: await GenerationReading.count(), reference: reference.toISOString() }, 'deterministic seed completed');
  logger.info({ seedUserPassword: '[provided through SEED_USER_PASSWORD]', seedDeviceSecret: '[provided through SEED_DEVICE_SECRET]' }, 'demo credentials are environment-controlled and never stored in source');
}

try { await main(); }
catch (error) { logger.error({ err: error }, 'seed failed'); process.exitCode = 1; }
finally { await sequelize.close(); }
