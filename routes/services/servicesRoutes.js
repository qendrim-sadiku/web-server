const express = require('express');
const router = express.Router();
const serviceController = require('../../controllers/service/serviceController');

router.get('/all', serviceController.getAllServices);
router.post('/', serviceController.createService);
router.get('/filter', serviceController.filterServices); // Move this up
router.get('/category/:subCategoryId', serviceController.getServicesByCategory);
router.get('/:id/trainers', serviceController.getTrainersForService);
router.get('/categories/:categoryId/services-all', serviceController.getAllServicesByCategory);
router.get('/categories/:categoryId/subcategories/:subCategoryId', serviceController.getSubcategoryByCategory);
router.get('/:id', serviceController.getServiceById); // Place this last
router.get('/:serviceId/similar', serviceController.getSimilarServices);

// New route: Get all services provided by a specific trainer
router.get('/trainer/:trainerId', serviceController.getServicesByTrainer);


module.exports = router;
