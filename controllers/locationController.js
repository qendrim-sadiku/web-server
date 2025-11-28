// controllers/locationController.js
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const COUNTRIES_API_URL = 'https://restcountries.com/v3.1/all'; // REST Countries API URL
const GEO_NAMES_USERNAME = 'qsdadiku'; // Replace with your GeoNames username

// Fetch all countries
// exports.getCountries = async (req, res) => {
//   try {
//     const response = await axios.get(COUNTRIES_API_URL);
//     const countries = response.data.map(country => ({
//       name: country.name.common,
//       flagUrl:country.flags.png,
//       code: country.cca2 // or any other property you prefer
//     }));
//     res.json(countries);
//   } catch (error) {
//     res.status(500).send('Error fetching countries');
//   }
// };

// Fetch all countries from the static file
exports.getCountries = async (req, res) => {
  try {
    // Path to the countries.json file
    const filePath = path.join(__dirname, '../core/countries.json');

    // Read the countries.json file
    const countriesData = fs.readFileSync(filePath, 'utf-8');

    // Parse the data into JSON
    const countries = JSON.parse(countriesData);

    // Return the countries data as a JSON response
    res.status(200).json(countries);
  } catch (error) {
    console.error('Error reading countries.json:', error.message);
    res.status(500).json({ message: 'Error fetching countries', error: error.message });
  }
};


exports.getCities = async (req, res) => {
  const countryCode = req.params.countryCode;

  if (!countryCode) {
    return res.status(400).send('Country code is required');
  }

  try {
    const url = `http://api.geonames.org/searchJSON?country=${countryCode}&featureClass=P&maxRows=100&username=${GEO_NAMES_USERNAME}`;
    const response = await axios.get(url);

    if (response.data.geonames && Array.isArray(response.data.geonames)) {
      const cities = response.data.geonames.map(city => ({
        name: city.name,
        adminName1: city.adminName1,
        code: city.postalCode || 'N/A'
      }));
      res.json(cities);
    } else {
      res.status(500).send('Unexpected response structure from GeoNames API');
    }
  } catch (error) {
    console.error('Error fetching cities:', error.message);
    res.status(500).send('Error fetching cities');
  }
};



exports.getEntries = async (req, res) => {
  try {
    // Read the local countries.json file
    const filePath = path.join(__dirname, '../core/entries.json'); // Adjust the path as needed
    const countries = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Log the first country for debugging
    console.log('First country data:', countries[0]);

    // Process the data to extract country names, phone codes, and flag URLs
    const countriesWithPhoneCodes = countries.map((country) => {
      return {
        name: country.name || 'Unknown',
        phoneCode: country.phoneCode || 'N/A',
        flagUrl: country.flagUrl || '',
      };
    });

  

    // Send the response and log it
    res.status(200).json(countriesWithPhoneCodes);
    console.log('Response data:', countriesWithPhoneCodes);
  } catch (error) {
    console.error('Error reading countries.json:', error.message);
    res.status(500).json({ message: 'Error reading countries.json', error: error.message });
  }
};

exports.getAllCountries = async (req, res) => {
  try {
    const response = await axios.get(COUNTRIES_API_URL);
    const countries = response.data.map(country => ({
      name: country.name.common,
      code: country.cca2 // ISO 3166-1 alpha-2 country code
    }));
    res.json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error.message);
    res.status(500).send('Error fetching countries');
  }
};


exports.getStatesByCountry = async (req, res) => {
  const countryCode = req.params.countryCode;

  if (!countryCode) {
    return res.status(400).send('Country code is required');
  }

  // List of countries that are known to have states
  const countriesWithStates = ['US', 'CA', 'IN', 'AU', 'BR', 'MX']; // Add more as needed

  try {
    // Check if the country is in the list of known countries with states
    if (!countriesWithStates.includes(countryCode)) {
      return res.json({ hasStates: false });
    }

    // If the country is known to have states, fetch them
    const url = `http://api.geonames.org/searchJSON?country=${countryCode}&featureClass=A&maxRows=100&username=${GEO_NAMES_USERNAME}`;
    const response = await axios.get(url);

    if (response.data.geonames && Array.isArray(response.data.geonames)) {
      // Filter and map valid states
      const states = response.data.geonames
        .filter((state) => {
          return (
            state.adminCode1 &&
            state.adminCode1 !== '00' && // Exclude invalid entries
            !state.name.toLowerCase().includes('province') &&
            !state.name.toLowerCase().includes('járás') // Exclude regions or irrelevant divisions
          );
        })
        .map((state) => ({
          name: state.name,
          adminCode: state.adminCode1,
        }));

      if (states.length > 0) {
        return res.json({ hasStates: true, states });
      }
    }

    // No valid states found
    res.json({ hasStates: false });
  } catch (error) {
    console.error('Error fetching states:', error.message);
    res.status(500).send('Error fetching states');
  }
};


exports.getCustomCities = async (req, res) => {
  const countryCode = req.params.countryCode;
  const stateCode = req.params.stateCode || null; // Optional state code

  if (!countryCode) {
    return res.status(400).send('Country code is required');
  }

  try {
    let url;

    if (stateCode) {
      // Fetch cities for a specific state
      url = `http://api.geonames.org/searchJSON?country=${countryCode}&adminCode1=${stateCode}&featureClass=P&maxRows=100&username=${GEO_NAMES_USERNAME}`;
    } else {
      // Fetch cities for the entire country
      url = `http://api.geonames.org/searchJSON?country=${countryCode}&featureClass=P&maxRows=100&username=${GEO_NAMES_USERNAME}`;
    }

    const response = await axios.get(url);

    if (response.data.geonames && Array.isArray(response.data.geonames)) {
      const cities = response.data.geonames.map(city => ({
        name: city.name
      }));
      res.json(cities);
    } else {
      res.status(500).send('Unexpected response structure from GeoNames API');
    }
  } catch (error) {
    console.error('Error fetching cities:', error.message);
    res.status(500).send('Error fetching cities');
  }
};

// Reverse geocode: Get address and zip code from coordinates
exports.getAddressFromCoordinates = async (req, res) => {
  try {
    const { lat, lng, latitude, longitude } = req.query;
    
    // Support both 'lat/lng' and 'latitude/longitude' parameter names
    const latitudeValue = lat || latitude;
    const longitudeValue = lng || longitude;
    
    if (!latitudeValue || !longitudeValue) {
      return res.status(400).json({ 
        error: 'Coordinates are required',
        message: 'Please provide both latitude (lat) and longitude (lng) or latitude and longitude'
      });
    }

    const latNum = parseFloat(latitudeValue);
    const lngNum = parseFloat(longitudeValue);
    
    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ 
        error: 'Invalid coordinates',
        message: 'Latitude and longitude must be valid numbers'
      });
    }

    if (latNum < -90 || latNum > 90) {
      return res.status(400).json({ 
        error: 'Invalid latitude',
        message: 'Latitude must be between -90 and 90'
      });
    }

    if (lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ 
        error: 'Invalid longitude',
        message: 'Longitude must be between -180 and 180'
      });
    }

    const { reverseGeocode } = require('../services/locationService');
    const addressInfo = await reverseGeocode(latNum, lngNum);
    
    if (!addressInfo) {
      return res.status(404).json({ 
        error: 'Address not found',
        message: 'Could not find an address for the provided coordinates'
      });
    }

    res.status(200).json({
      success: true,
      address: addressInfo,
      zipCode: addressInfo.zipCode
    });
  } catch (error) {
    console.error('Error getting address from coordinates:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};
