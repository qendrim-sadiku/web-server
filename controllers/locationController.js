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
      flagUrl:country.flags.png,
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
