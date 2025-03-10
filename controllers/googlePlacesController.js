const axios = require("axios");
require("dotenv").config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

/**
 * Get place suggestions from Google Places API (New)
 */
exports.getPlaces = async (req, res) => {
    try {
        const { input } = req.query;

        if (!input) {
            return res.status(400).json({ error: "Input query is required" });
        }

        const response = await axios.post(
            GOOGLE_PLACES_ENDPOINT,
            { textQuery: input },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": GOOGLE_API_KEY,
                    "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
                },
            }
        );

        if (!response.data.places || response.data.places.length === 0) {
            return res.status(404).json({ error: "No places found" });
        }

        res.json({
            predictions: response.data.places.map((place) => ({
                description: place.displayName?.text || "No Name",
                address: place.formattedAddress || "No Address",
                lat: place.location?.latitude || null,
                lon: place.location?.longitude || null,
            })),
        });
    } catch (error) {
        console.error("Google Places API error:", error.response?.data || error.message);

        res.status(error.response?.status || 500).json({
            error: "Failed to fetch places",
            details: error.response?.data || error.message,
        });
    }
};

/**
 * Get latitude & longitude using Google Geocoding API
 */
exports.getPlaceDetails = async (req, res) => {
    try {
        const { place_id } = req.query;

        if (!place_id) {
            return res.status(400).json({ error: "Place ID is required" });
        }

        // Google Geocode API request
        const response = await axios.get(GOOGLE_GEOCODE_ENDPOINT, {
            params: {
                place_id,
                key: GOOGLE_API_KEY,
            },
        });

        if (response.data.status !== "OK" || response.data.results.length === 0) {
            return res.status(404).json({ error: "Invalid Place ID" });
        }

        const location = response.data.results[0].geometry.location;

        res.json({
            label: response.data.results[0].formatted_address,
            lat: location.lat,
            lon: location.lng,
        });
    } catch (error) {
        console.error("Google Geocode API error:", error.response?.data || error.message);

        res.status(error.response?.status || 500).json({
            error: "Failed to fetch place details",
            details: error.response?.data || error.message,
        });
    }
};
