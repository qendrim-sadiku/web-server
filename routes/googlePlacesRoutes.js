const express = require("express");
const router = express.Router();
const googlePlacesController = require("../controllers/googlePlacesController");

// Get places (autocomplete suggestions)
router.get("/places", googlePlacesController.getPlaces);

// Get place details (latitude & longitude)
router.get("/place-details", googlePlacesController.getPlaceDetails);

module.exports = router;
