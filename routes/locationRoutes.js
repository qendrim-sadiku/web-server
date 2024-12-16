const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// Route to get all countries
router.get('/countries', locationController.getCountries);

// Route to get cities by country code
router.get('/cities/:countryCode', locationController.getCities);

// Route to get cities by country code
router.get('/entries', locationController.getEntries);

// Fetch all countries
router.get('/all-countries', locationController.getAllCountries);

// Fetch states by country code
router.get('/:countryCode/states', locationController.getStatesByCountry);

// Fetch cities by country code and optionally state code
router.get('/:countryCode/states/:stateCode/cities', locationController.getCustomCities);
router.get('/:countryCode/cities', locationController.getCities); // Without state

module.exports = router;