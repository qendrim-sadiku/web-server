const { sequelize } = require('./config/sequelize');  // Adjust the path as needed
const models = require('./models');  // Adjust the path as needed

const dropAllTables = async () => {
  try {
    // Extract all model names
    const modelNames = Object.keys(models).filter(modelName => modelName !== 'sequelize' && modelName !== 'Sequelize');

    // Get the QueryInterface
    const queryInterface = sequelize.getQueryInterface();

    // Manually delete all records from all tables to avoid foreign key constraints
    for (const modelName of modelNames) {
      await models[modelName].destroy({ where: {}, truncate: true, force: true });
    }

    // Drop all tables
    for (const modelName of modelNames) {
      await queryInterface.dropTable(models[modelName].getTableName());
    }

    console.log('All tables dropped successfully.');
  } catch (error) {
    console.error('Error dropping tables:', error);
  }
};

// Run the dropAllTables function
dropAllTables();