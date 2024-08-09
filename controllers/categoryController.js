const Category = require('../models/Category/Category');
const SubCategory = require('../models/Category/SubCategory');

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Get all subcategories for a specific category
exports.getSubCategoriesByCategory = async (req, res) => {
  const { categoryId } = req.params;

  try {
    const subCategories = await SubCategory.findAll({
      where: { categoryId }
    });
    res.status(200).json(subCategories);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ error: 'Failed to fetch subcategories' });
  }
};
