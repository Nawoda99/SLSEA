import { DataTypes } from 'sequelize';

const timestamps = {
  created_at: { type: DataTypes.DATE(3), allowNull: false },
  updated_at: { type: DataTypes.DATE(3), allowNull: false },
  deleted_at: { type: DataTypes.DATE(3), allowNull: true }
};

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('provinces', {
    id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    code: { type: DataTypes.STRING(16), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    ...timestamps
  });

  await queryInterface.createTable('districts', {
    id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    province_id: {
      type: DataTypes.STRING(36), allowNull: false,
      references: { model: 'provinces', key: 'id' },
      onUpdate: 'CASCADE', onDelete: 'RESTRICT'
    },
    code: { type: DataTypes.STRING(16), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(128), allowNull: false },
    ...timestamps
  });

  await queryInterface.createTable('grid_substations', {
    id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    district_id: {
      type: DataTypes.STRING(36), allowNull: false,
      references: { model: 'districts', key: 'id' },
      onUpdate: 'CASCADE', onDelete: 'RESTRICT'
    },
    code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(160), allowNull: false },
    latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
    is_synthetic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    ...timestamps
  });

  await queryInterface.createTable('solar_installations', {
    id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    grid_substation_id: {
      type: DataTypes.STRING(36), allowNull: false,
      references: { model: 'grid_substations', key: 'id' },
      onUpdate: 'CASCADE', onDelete: 'RESTRICT'
    },
    meter_id: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    inverter_id: { type: DataTypes.STRING(64), allowNull: true, unique: true },
    device_username: { type: DataTypes.STRING(96), allowNull: false, unique: true },
    device_secret_hash: { type: DataTypes.STRING(255), allowNull: false },
    name: { type: DataTypes.STRING(160), allowNull: false },
    capacity_kw: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
    is_synthetic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    ...timestamps
  });

  await queryInterface.createTable('users', {
    id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    email: { type: DataTypes.STRING(191), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(32), allowNull: false },
    province_id: {
      type: DataTypes.STRING(36), allowNull: true,
      references: { model: 'provinces', key: 'id' },
      onUpdate: 'CASCADE', onDelete: 'RESTRICT'
    },
    district_id: {
      type: DataTypes.STRING(36), allowNull: true,
      references: { model: 'districts', key: 'id' },
      onUpdate: 'CASCADE', onDelete: 'RESTRICT'
    },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    ...timestamps
  });

  await queryInterface.createTable('generation_readings', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
    installation_id: {
      type: DataTypes.STRING(36), allowNull: false,
      references: { model: 'solar_installations', key: 'id' },
      onUpdate: 'CASCADE', onDelete: 'RESTRICT'
    },
    measured_at: { type: DataTypes.DATE(3), allowNull: false },
    received_at: { type: DataTypes.DATE(3), allowNull: false },
    power_kw: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    cumulative_energy_kwh: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
    voltage_v: { type: DataTypes.DECIMAL(8, 3), allowNull: false },
    created_at: { type: DataTypes.DATE(3), allowNull: false }
  });

  await queryInterface.addIndex('districts', ['province_id'], { name: 'districts_province_idx' });
  await queryInterface.addIndex('grid_substations', ['district_id'], { name: 'substations_district_idx' });
  await queryInterface.addIndex('solar_installations', ['grid_substation_id'], { name: 'installations_substation_idx' });
  await queryInterface.addIndex('users', ['province_id'], { name: 'users_province_idx' });
  await queryInterface.addIndex('users', ['district_id'], { name: 'users_district_idx' });
  await queryInterface.addIndex('generation_readings', ['installation_id', 'measured_at'], {
    name: 'readings_installation_measured_idx', unique: true
  });
  await queryInterface.addIndex('generation_readings', ['measured_at', 'id'], {
    name: 'readings_measured_id_idx'
  });

  await queryInterface.sequelize.query(`
    CREATE TRIGGER generation_readings_block_update
    BEFORE UPDATE ON generation_readings
    FOR EACH ROW
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Generation readings are append-only'
  `);
  await queryInterface.sequelize.query(`
    CREATE TRIGGER generation_readings_block_delete
    BEFORE DELETE ON generation_readings
    FOR EACH ROW
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Generation readings are append-only'
  `);
}

export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS generation_readings_block_update');
  await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS generation_readings_block_delete');
  await queryInterface.dropTable('generation_readings');
  await queryInterface.dropTable('users');
  await queryInterface.dropTable('solar_installations');
  await queryInterface.dropTable('grid_substations');
  await queryInterface.dropTable('districts');
  await queryInterface.dropTable('provinces');
}
