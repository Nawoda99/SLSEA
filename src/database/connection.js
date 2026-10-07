import { Sequelize } from 'sequelize';
import { config } from '../config/config.js';
import { logger } from '../shared/utils/logger.js';

export const sequelize = new Sequelize(config.databaseUrl, {
  dialect: 'mysql',
  logging: false,
  timezone: '+00:00',
  dialectOptions: { timezone: '+00:00' },
  pool: { max: config.dbPoolMax, min: 0, acquire: 30000, idle: 10000 },
  define: { underscored: true, freezeTableName: true }
});

export async function closeDatabase() {
  await sequelize.close();
  logger.info('database connection closed');
}
