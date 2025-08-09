const express = require('express');
const router = express.Router();
const serviceController = require('../../controllers/service/serviceController');

router.get('/all', serviceController.getAllServices);
router.post('/', serviceController.createService);
// Route to get multiple services by IDs via GET request
router.get('/service-types', serviceController.getAllServiceTypes);

router.get('/services/:serviceId/trainers', serviceController.getTrainersByServiceId);

router.get('/:id/info', serviceController.getServiceInfo); 

router.get('/multiple', serviceController.getMultipleServicesByIds);
router.get('/filter', serviceController.filterServices); // Move this up
router.get('/category/:subCategoryId', serviceController.getServicesByCategory);
router.get('/:id/trainers', serviceController.getTrainersForService);
router.get('/categories/:categoryId/services-all', serviceController.getAllServicesByCategory);
router.get('/categories/:categoryId/subcategories/:subCategoryId', serviceController.getSubcategoryByCategory);
router.get('/:id', serviceController.getServiceById); // Place this last
router.get('/:serviceId/similar', serviceController.getSimilarServices);

router.get(
    '/category/:subCategoryId/all-no-filter',
    serviceController.getServicesBySubCategoryAll
  );

// New route: Get all services provided by a specific trainer
router.get('/trainer/:trainerId', serviceController.getServicesByTrainer);

router.get('/by-subcategory-name', serviceController.getServicesBySubCategoryName);

router.get('/subcategory/:subCategoryId', serviceController.getServicesBySubCategoryWithFilters);



module.exports = router;
