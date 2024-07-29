const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// Route to get all countries
router.get('/countries', locationController.getCountries);

// Route to get cities by country code
router.get('/cities/:countryCode', locationController.getCities);

// Route to get cities by country code
router.get('/entries', locationController.getEntries);

module.exports = router;