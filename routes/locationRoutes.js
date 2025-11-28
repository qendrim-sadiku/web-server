const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// IMPORTANT: Exact match routes must come BEFORE parameterized routes
// Route to reverse geocode coordinates to address
router.get('/reverse-geocode', locationController.getAddressFromCoordinates);

// Exact match routes
router.get('/entries', locationController.getEntries);
router.get('/all-countries', locationController.getAllCountries);
router.get('/countries', locationController.getCountries);

// Routes with one parameter
router.get('/cities/:countryCode', locationController.getCities);

// Routes with multiple parameters (must come last)
router.get('/:countryCode/states/:stateCode/cities', locationController.getCustomCities);
router.get('/:countryCode/states', locationController.getStatesByCountry);
router.get('/:countryCode/cities', locationController.getCities); // Without state

module.exports = router;