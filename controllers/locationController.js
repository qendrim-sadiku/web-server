// controllers/locationController.js
const axios = require('axios');

const COUNTRIES_API_URL = 'https://restcountries.com/v3.1/all'; // REST Countries API URL
const GEO_NAMES_USERNAME = 'qsdadiku'; // Replace with your GeoNames username

// Fetch all countries
exports.getCountries = async (req, res) => {
  try {
    const response = await axios.get(COUNTRIES_API_URL);
    const countries = response.data.map(country => ({
      name: country.name.common,
      code: country.cca2 // or any other property you prefer
    }));
    res.json(countries);
  } catch (error) {
    res.status(500).send('Error fetching countries');
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
    // Fetch country data from the RestCountries API
    const response = await axios.get('https://restcountries.com/v3.1/all');
    const countries = response.data;

    // Process the data to extract country names and phone codes
    const countriesWithPhoneCodes = countries.map(country => {
      // Check if the country has an 'idd' object and suffixes
      const phoneCode = country.idd && country.idd.suffixes && country.idd.suffixes.length > 0
        ? `${country.idd.root}${country.idd.suffixes[0]}`
        : 'N/A'; // Default to 'N/A' if phone code information is missing

      return {
        name: country.name.common,
        phoneCode: phoneCode,
        flagUrl: country.flags.png // or country.flags.svg
      };
    });

    res.json(countriesWithPhoneCodes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching country data' });
  }
};