import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../connection.js';

export class Province extends Model {}
Province.init({
  id: { type: DataTypes.STRING(36), primaryKey: true },
  code: { type: DataTypes.STRING(16), allowNull: false },
  name: { type: DataTypes.STRING(128), allowNull: false },
  deletedAt: DataTypes.DATE
}, { sequelize, modelName: 'Province', tableName: 'provinces', paranoid: false });

export class District extends Model {}
District.init({
  id: { type: DataTypes.STRING(36), primaryKey: true },
  provinceId: { type: DataTypes.STRING(36), allowNull: false },
  code: { type: DataTypes.STRING(16), allowNull: false },
  name: { type: DataTypes.STRING(128), allowNull: false },
  deletedAt: DataTypes.DATE
}, { sequelize, modelName: 'District', tableName: 'districts', paranoid: false });

export class GridSubstation extends Model {}
GridSubstation.init({
  id: { type: DataTypes.STRING(36), primaryKey: true },
  districtId: { type: DataTypes.STRING(36), allowNull: false },
  code: { type: DataTypes.STRING(32), allowNull: false },
  name: { type: DataTypes.STRING(160), allowNull: false },
  latitude: DataTypes.DECIMAL(9, 6),
  longitude: DataTypes.DECIMAL(9, 6),
  isSynthetic: { type: DataTypes.BOOLEAN, allowNull: false },
  deletedAt: DataTypes.DATE
}, { sequelize, modelName: 'GridSubstation', tableName: 'grid_substations', paranoid: false });

export class SolarInstallation extends Model {}
SolarInstallation.init({
  id: { type: DataTypes.STRING(36), primaryKey: true },
  gridSubstationId: { type: DataTypes.STRING(36), allowNull: false },
  meterId: { type: DataTypes.STRING(64), allowNull: false },
  inverterId: DataTypes.STRING(64),
  deviceUsername: { type: DataTypes.STRING(96), allowNull: false },
  deviceSecretHash: { type: DataTypes.STRING(255), allowNull: false },
  name: { type: DataTypes.STRING(160), allowNull: false },
  capacityKw: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
  latitude: DataTypes.DECIMAL(9, 6),
  longitude: DataTypes.DECIMAL(9, 6),
  isSynthetic: { type: DataTypes.BOOLEAN, allowNull: false },
  version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  deletedAt: DataTypes.DATE
}, { sequelize, modelName: 'SolarInstallation', tableName: 'solar_installations', paranoid: false });

export class GenerationReading extends Model {}
GenerationReading.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  installationId: { type: DataTypes.STRING(36), allowNull: false },
  measuredAt: { type: DataTypes.DATE(3), allowNull: false },
  receivedAt: { type: DataTypes.DATE(3), allowNull: false },
  powerKw: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
  cumulativeEnergyKwh: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  voltageV: { type: DataTypes.DECIMAL(8, 3), allowNull: false }
}, { sequelize, modelName: 'GenerationReading', tableName: 'generation_readings', timestamps: true, createdAt: 'createdAt', updatedAt: false });

export class User extends Model {}
User.init({
  id: { type: DataTypes.STRING(36), primaryKey: true },
  email: { type: DataTypes.STRING(191), allowNull: false },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.STRING(32), allowNull: false },
  provinceId: DataTypes.STRING(36),
  districtId: DataTypes.STRING(36),
  isActive: { type: DataTypes.BOOLEAN, allowNull: false },
  deletedAt: DataTypes.DATE
}, { sequelize, modelName: 'User', tableName: 'users', paranoid: false });

Province.hasMany(District, { foreignKey: 'provinceId', as: 'districts' });
District.belongsTo(Province, { foreignKey: 'provinceId', as: 'province' });
District.hasMany(GridSubstation, { foreignKey: 'districtId', as: 'gridSubstations' });
GridSubstation.belongsTo(District, { foreignKey: 'districtId', as: 'district' });
GridSubstation.hasMany(SolarInstallation, { foreignKey: 'gridSubstationId', as: 'installations' });
SolarInstallation.belongsTo(GridSubstation, { foreignKey: 'gridSubstationId', as: 'gridSubstation' });
SolarInstallation.hasMany(GenerationReading, { foreignKey: 'installationId', as: 'readings' });
GenerationReading.belongsTo(SolarInstallation, { foreignKey: 'installationId', as: 'installation' });
User.belongsTo(Province, { foreignKey: 'provinceId', as: 'province' });
User.belongsTo(District, { foreignKey: 'districtId', as: 'district' });

export const models = { Province, District, GridSubstation, SolarInstallation, GenerationReading, User };
