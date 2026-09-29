import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.addColumn('generation_readings', 'is_meter_reset', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeColumn('generation_readings', 'is_meter_reset');
}
