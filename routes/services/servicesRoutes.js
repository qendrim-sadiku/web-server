const express = require('express');
const router = express.Router();
const serviceController = require('../../controllers/service/serviceController');

router.post('/', serviceController.createService);
router.get('/category/:subCategoryId', serviceController.getServicesByCategory);
router.get('/:id', serviceController.getServiceById);
router.get('/:id/trainers', serviceController.getTrainersForService);

router.get('/categories/:categoryId/services-all', serviceController.getAllServicesByCategory);

router.get('/categories/:categoryId/subcategories-all', serviceController.getAllSubcategoriesByCategory);


module.exports = router;
