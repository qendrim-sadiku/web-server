const axios = require("axios");
require("dotenv").config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

exports.getPlaces = async (req, res) => {
    try {
        const { input } = req.query;

        if (!input || input.length < 2) {
            return res.status(400).json({ error: "Input query must be at least 2 characters" });
        }

        const url = `${GOOGLE_PLACES_ENDPOINT}?key=${GOOGLE_API_KEY}`;

        const response = await axios.post(
            url,
            {
                textQuery: input,
                languageCode: "en",
                locationBias: {
                    rectangle: {
                        low: {
                            latitude: 41.8,    // Kosovo - SW
                            longitude: 20.3
                        },
                        high: {
                            latitude: 43.0,    // Kosovo - NE
                            longitude: 21.5
                        }
                    }
                }
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location"
                },
            }
        );

        const places = response.data?.places;

        if (!places || !Array.isArray(places) || places.length === 0) {
            return res.status(404).json({ error: "No places found", raw: response.data });
        }

        res.json({
            predictions: places.map((place) => ({
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
        const { place_id, address } = req.query;

        if (!place_id && !address) {
            return res.status(400).json({ error: "Either place_id or address is required" });
        }

        const params = {
            key: GOOGLE_API_KEY,
        };

        if (place_id) {
            params.place_id = place_id;
        } else {
            params.address = address;
        }

        const response = await axios.get(GOOGLE_GEOCODE_ENDPOINT, { params });

        if (response.data.status !== "OK" || response.data.results.length === 0) {
            return res.status(404).json({ error: "No results found" });
        }

        const result = response.data.results[0];
        const location = result.geometry.location;

        res.json({
            label: result.formatted_address,
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
