const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Route to get all categories
router.get('/categories', categoryController.getAllCategories);

// Route to get all subcategories for a specific category
router.get('/categories/:categoryId/subcategories', categoryController.getSubCategoriesByCategory);

module.exports = router;
