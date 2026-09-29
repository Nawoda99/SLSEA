import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from './connection.js';
import { logger } from '../utils/logger.js';

const migrator = new Umzug({
  migrations: { glob: 'src/db/migrations/*.js' },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger
});

try {
  await sequelize.authenticate();
  await migrator.up();
  logger.info('database migrations completed');
} catch (error) {
  logger.error({ err: error }, 'database migrations failed');
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
