const express = require('express');
const router = express.Router();
const userInterestController = require('../controllers/userinterestController');

// Route to show services by subcategory
router.get('/subcategory/:subCategoryId/services', userInterestController.showServicesBySubCategory);

// Route to add a service to user interests
router.post('/add-interest', userInterestController.addServiceToInterest);

// Route to remove a service from user interests
router.delete('/remove-interest', userInterestController.removeServiceFromInterest);

// Route to show all interests for a user
router.get('/user/:userId/interests', userInterestController.showUserInterests);

module.exports = router;
