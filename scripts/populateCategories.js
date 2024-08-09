const { faker } = require('@faker-js/faker');
const sequelize = require('../config/sequelize'); // Adjust the path as necessary
const Category = require('../models/Category/Category'); // Adjust the path as necessary
const SubCategory = require('../models/Category/SubCategory'); // Adjust the path as necessary

async function createCategoriesAndSubCategories() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // Define categories
    const categoriesData = [
      { name: 'Sport' },
      { name: 'Art' },
      { name: 'Pro Services' }
    ];

    // Create categories
    const categories = await Category.bulkCreate(categoriesData);

    // Define subcategories for each category
    const subCategoriesData = [
      { name: 'Tennis Coach', categoryId: categories.find(cat => cat.name === 'Sport').id },
      { name: 'Football', categoryId: categories.find(cat => cat.name === 'Sport').id },
      { name: 'Basketball', categoryId: categories.find(cat => cat.name === 'Sport').id },
      { name: 'Volleyball', categoryId: categories.find(cat => cat.name === 'Sport').id },
      { name: 'Painting', categoryId: categories.find(cat => cat.name === 'Art').id },
      { name: 'Contemporary', categoryId: categories.find(cat => cat.name === 'Art').id },
      { name: 'Sculpture', categoryId: categories.find(cat => cat.name === 'Art').id },
      { name: 'Abstract', categoryId: categories.find(cat => cat.name === 'Art').id },
      { name: 'Shopper', categoryId: categories.find(cat => cat.name === 'Pro Services').id },
      { name: 'Handyman', categoryId: categories.find(cat => cat.name === 'Pro Services').id },
      { name: 'Cleaning', categoryId: categories.find(cat => cat.name === 'Pro Services').id },
      { name: 'Pet care', categoryId: categories.find(cat => cat.name === 'Pro Services').id }
    ];

    // Create subcategories
    await SubCategory.bulkCreate(subCategoriesData);

    console.log('Categories and subcategories have been populated successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

createCategoriesAndSubCategories();
