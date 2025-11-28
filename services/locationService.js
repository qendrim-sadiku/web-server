const axios = require('axios');
require('dotenv').config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

// Cache for zip code to city conversions (in-memory cache)
const zipCodeCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Helper function to get country name from country code (for better geocoding)
const getCountryName = (countryCode) => {
  const countryNames = {
    'US': 'United States',
    'CA': 'Canada',
    'GB': 'United Kingdom',
    'AU': 'Australia',
    'MA': 'Morocco',
    'FR': 'France',
    'DE': 'Germany',
    'ES': 'Spain',
    'IT': 'Italy',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'CH': 'Switzerland',
    'AT': 'Austria',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'PL': 'Poland',
    'PT': 'Portugal',
    'IE': 'Ireland',
    'NZ': 'New Zealand',
    'BR': 'Brazil',
    'MX': 'Mexico',
    'AR': 'Argentina',
    'CL': 'Chile',
    'CO': 'Colombia',
    'PE': 'Peru',
    'ZA': 'South Africa',
    'EG': 'Egypt',
    'SA': 'Saudi Arabia',
    'AE': 'United Arab Emirates',
    'IN': 'India',
    'CN': 'China',
    'JP': 'Japan',
    'KR': 'South Korea',
    'SG': 'Singapore',
    'MY': 'Malaysia',
    'TH': 'Thailand',
    'PH': 'Philippines',
    'ID': 'Indonesia',
    'VN': 'Vietnam',
    'XK': 'Kosovo' // Kosovo uses XK as alpha-2 code (not XKX which is alpha-3)
  };
  
  const codeUpper = countryCode.toUpperCase();
  
  // Handle common mistakes: XKX (alpha-3) should be XK (alpha-2)
  if (codeUpper === 'XKX') {
    console.warn(`⚠️ Country code 'XKX' is alpha-3. Use 'XK' instead for Kosovo.`);
  }
  
  return countryNames[codeUpper] || countryCode;
};

/**
 * Convert zip code to city information using Google Geocoding API
 * @param {string} zipCode - The zip code to convert
 * @param {string} countryCode - Optional country code (ISO 3166-1 alpha-2) to filter results
 * @returns {Object|null} - City information or null if not found
 */
const convertZipCodeToCity = async (zipCode, countryCode = null) => {
  try {
    // Normalize country code: handle common mistakes
    if (countryCode) {
      const codeUpper = countryCode.toUpperCase();
      // XKX is alpha-3, should be XK (alpha-2) for Kosovo
      if (codeUpper === 'XKX') {
        console.warn(`⚠️ Converting country code 'XKX' to 'XK' (Kosovo alpha-2 code)`);
        countryCode = 'XK';
      } else {
        countryCode = codeUpper;
      }
      
      // If country code is provided, clear ALL cache entries for this zip code to force fresh lookup
      const keysToDelete = [];
      for (const key of zipCodeCache.keys()) {
        if (key.startsWith(`zip_${zipCode}_`)) {
          keysToDelete.push(key);
        }
      }
      if (keysToDelete.length > 0) {
        console.log(`🗑️  Clearing ${keysToDelete.length} cache entries for zip ${zipCode} since country ${countryCode} is specified`);
        keysToDelete.forEach(key => zipCodeCache.delete(key));
      }
    }
    
    // Check cache first (include country in cache key for proper disambiguation)
    const cacheKey = `zip_${zipCode}_${countryCode || 'any'}`;
    const cached = zipCodeCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      // If country code was provided, double-check the cached result matches
      if (countryCode && cached.data && cached.data.country) {
        if (cached.data.country.toUpperCase() !== countryCode.toUpperCase()) {
          console.log(`Cached result for ${zipCode} has wrong country (${cached.data.country} vs ${countryCode}), clearing cache`);
          zipCodeCache.delete(cacheKey);
        } else {
          console.log(`Cache hit for zip code: ${zipCode} (country: ${countryCode})`);
          return cached.data;
        }
      } else {
        console.log(`Cache hit for zip code: ${zipCode}${countryCode ? ` (country: ${countryCode})` : ''}`);
        return cached.data;
      }
    }

    console.log(`Fetching city for zip code: ${zipCode}${countryCode ? ` (country: ${countryCode})` : ''}`);
    
    // Build address formats based on whether country code is provided
    const addressFormats = [];
    if (countryCode) {
      const countryName = getCountryName(countryCode);
      
      // Special handling for Kosovo - Google Maps may not recognize XK code
      if (countryCode === 'XK') {
        // Try multiple formats for Kosovo
        addressFormats.push(
          `${zipCode}, Kosovo`, // Explicit Kosovo name
          `${zipCode}, Pristina, Kosovo`, // Include capital city for better results
          `${zipCode} Kosovo`,
          `Postal code ${zipCode}, Kosovo`
        );
      } else {
        // If country code is provided, prioritize it - use explicit country in query
        addressFormats.push(
          `${zipCode}, ${countryName}`, // "40000, France" - most specific
          `${zipCode} ${countryCode}`, // "40000 FR" 
          `${zipCode}, ${countryCode}` // "40000, FR"
        );
      }
      // DON'T fallback to just zipCode without country when countryCode is specified
    } else {
      // Default behavior: try USA first (for backward compatibility)
      addressFormats.push(
        `${zipCode} USA`, // Zip code with USA
        zipCode, // Just the zip code
        `ZIP ${zipCode}` // ZIP prefix
      );
    }

    let response = null;
    let lastError;
    let allResults = [];

    // Collect all results from all formats
    for (const address of addressFormats) {
      try {
        const params = {
          address: address,
          key: GOOGLE_API_KEY
        };
        
        // Use region biasing if country code is provided (helps Google prioritize results)
        if (countryCode) {
          params.region = countryCode.toLowerCase();
        }
        
        console.log(`  Trying geocode with: "${address}"${countryCode ? ` (region=${countryCode.toLowerCase()})` : ''}`);
        const apiResponse = await axios.get(GOOGLE_GEOCODE_ENDPOINT, { params });

        if (apiResponse.data.status === 'OK' && apiResponse.data.results.length > 0) {
          console.log(`  Got ${apiResponse.data.results.length} result(s) from Google`);
          
          // Log countries found in this batch
          const countriesInBatch = apiResponse.data.results.map(r => {
            const countryComponent = r.address_components.find(c => c.types.includes('country'));
            return countryComponent ? countryComponent.short_name : 'unknown';
          });
          console.log(`  Countries found in this batch: ${[...new Set(countriesInBatch)].join(', ')}`);
          
          allResults.push(...apiResponse.data.results);
          
          // If country code is provided, ONLY accept results from that country
          if (countryCode) {
            const countryMatch = apiResponse.data.results.find(r => {
              const countryComponent = r.address_components.find(c => 
                c.types.includes('country')
              );
              const resultCountry = countryComponent ? countryComponent.short_name.toUpperCase() : null;
              const resultCountryLong = countryComponent ? countryComponent.long_name : null;
              
              // Special handling for Kosovo
              if (countryCode.toUpperCase() === 'XK') {
                return resultCountry === 'XK' || 
                       resultCountryLong?.toLowerCase().includes('kosovo') ||
                       r.formatted_address.toLowerCase().includes('kosovo') ||
                       r.formatted_address.toLowerCase().includes('pristina');
              }
              
              return resultCountry === countryCode.toUpperCase();
            });
            
            if (countryMatch) {
              console.log(`  ✅ Found match in requested country ${countryCode}!`);
              response = { data: { status: 'OK', results: [countryMatch] } };
              break; // Found match in target country, exit early
            } else {
              console.log(`  ❌ No match in country ${countryCode}, continuing...`);
            }
            // If no match in this batch, continue to next format - DON'T use wrong country result
          } else {
            // No country filter: use first result found
            response = apiResponse.data;
            break;
          }
        } else {
          console.log(`  No results for "${address}"`);
        }
      } catch (error) {
        console.log(`  Error with "${address}": ${error.message}`);
        lastError = error;
        continue; // Try next format
      }
    }

    // If country code was provided, STRICTLY filter all collected results to only that country
    if (countryCode) {
      if (allResults.length > 0) {
        const countryFiltered = allResults.find(r => {
          const countryComponent = r.address_components.find(c => 
            c.types.includes('country')
          );
          const resultCountry = countryComponent ? countryComponent.short_name.toUpperCase() : null;
          const resultCountryLong = countryComponent ? countryComponent.long_name : null;
          
          // Special handling for Kosovo
          if (countryCode.toUpperCase() === 'XK') {
            return resultCountry === 'XK' || 
                   resultCountryLong?.toLowerCase().includes('kosovo') ||
                   r.formatted_address.toLowerCase().includes('kosovo') ||
                   r.formatted_address.toLowerCase().includes('pristina');
          }
          
          return resultCountry === countryCode.toUpperCase();
        });
        
        if (countryFiltered) {
          console.log(`  ✅ Found match in all collected results for country ${countryCode}`);
          response = { data: { status: 'OK', results: [countryFiltered] } };
        } else {
          // Country code was specified but no results match that country - reject all results
          const foundCountries = [...new Set(allResults.map(r => {
            const countryComponent = r.address_components.find(c => c.types.includes('country'));
            const longName = countryComponent ? countryComponent.long_name : null;
            return countryComponent ? (countryComponent.short_name || longName) : 'unknown';
          }))];
          console.log(`  ❌ REJECTING: Zip code ${zipCode} found but NOT in country ${countryCode}. Found countries: ${foundCountries.join(', ')}`);
          response = null;
        }
      } else {
        // No results at all
        console.log(`  ❌ No results found at all for zip code ${zipCode}`);
        response = null;
      }
    }

    // Final check: if country code was provided, verify the result country matches
    if (countryCode && response && response.data && response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      const countryComponent = result.address_components.find(c => c.types.includes('country'));
      const resultCountry = countryComponent ? countryComponent.short_name.toUpperCase() : null;
      const resultCountryLong = countryComponent ? countryComponent.long_name : null;
      
      // Special handling for Kosovo - Google might return it with different identifiers
      let countryMatches = false;
      if (countryCode.toUpperCase() === 'XK') {
        // Kosovo might be returned as various identifiers or even as part of Serbia
        // Check if it's actually Kosovo by looking at the address components
        const isKosovo = resultCountry === 'XK' || 
                        resultCountryLong?.toLowerCase().includes('kosovo') ||
                        result.formatted_address.toLowerCase().includes('kosovo') ||
                        result.formatted_address.toLowerCase().includes('pristina');
        
        if (isKosovo) {
          countryMatches = true;
          console.log(`✅ VERIFIED: Zip code ${zipCode} is in Kosovo (detected via ${resultCountry || resultCountryLong || 'address'})`);
        } else {
          console.log(`REJECTED: Zip code ${zipCode} returned country ${resultCountry || resultCountryLong || 'unknown'} but requested Kosovo (XK)`);
        }
      } else {
        countryMatches = resultCountry === countryCode.toUpperCase();
        if (!countryMatches) {
          console.log(`REJECTED: Zip code ${zipCode} returned country ${resultCountry || 'unknown'} but requested ${countryCode.toUpperCase()}`);
        } else {
          console.log(`✅ VERIFIED: Zip code ${zipCode} matches requested country ${countryCode}`);
        }
      }
      
      if (!countryMatches) {
        return null; // Strictly reject wrong country
      }
    }

    if (!response || !response.data || response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
      console.log(`No results found for zip code: ${zipCode}${countryCode ? ` in country ${countryCode}` : ''} with any format`);
      return null;
    }

    const result = response.data.results[0];
    const addressComponents = result.address_components;
    
    // Extract city and state from address components
    let city = '';
    let state = '';
    let country = 'US';
    
    addressComponents.forEach(component => {
      if (component.types.includes('locality')) {
        city = component.long_name;
      } else if (component.types.includes('administrative_area_level_2')) {
        // Sometimes city is in admin_area_level_2
        if (!city) city = component.long_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        state = component.short_name;
      } else if (component.types.includes('country')) {
        country = component.short_name;
      }
    });

    const cityInfo = {
      city,
      state,
      country,
      fullAddress: result.formatted_address,
      coordinates: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      }
    };

    // Final safety check: if countryCode was provided, verify before caching
    if (countryCode && cityInfo.country.toUpperCase() !== countryCode.toUpperCase()) {
      console.error(`⚠️ CRITICAL: Attempted to cache wrong country! Zip ${zipCode}, requested ${countryCode}, got ${cityInfo.country}. NOT CACHING.`);
      return null; // Don't cache or return wrong country
    }

    // Cache the result
    zipCodeCache.set(cacheKey, {
      data: cityInfo,
      timestamp: Date.now()
    });

    console.log(`✅ Found city: ${city}, ${state}, ${country} for zip code: ${zipCode}`);
    return cityInfo;
  } catch (error) {
    console.error('Error converting zip code to city:', error.response?.data || error.message);
    return null;
  }
};

/**
 * Get city suggestions for partial zip code input
 * @param {string} partialZip - Partial zip code input
 * @returns {Array} - Array of zip code suggestions
 */
const getZipCodeSuggestions = async (partialZip) => {
  try {
    if (!partialZip || partialZip.length < 3) {
      return [];
    }

    const response = await axios.get(GOOGLE_GEOCODE_ENDPOINT, {
      params: {
        address: partialZip,
        key: GOOGLE_API_KEY
      }
    });

    if (response.data.status === 'OK') {
      return response.data.results.map(result => ({
        zipCode: result.address_components.find(comp => 
          comp.types.includes('postal_code')
        )?.long_name || '',
        city: result.address_components.find(comp => 
          comp.types.includes('locality')
        )?.long_name || '',
        state: result.address_components.find(comp => 
          comp.types.includes('administrative_area_level_1')
        )?.short_name || '',
        fullAddress: result.formatted_address
      })).filter(item => item.zipCode);
    }

    return [];
  } catch (error) {
    console.error('Error getting zip code suggestions:', error.response?.data || error.message);
    return [];
  }
};

/**
 * Validate if a zip code exists
 * @param {string} zipCode - The zip code to validate
 * @param {string} countryCode - Optional country code to validate within specific country
 * @returns {boolean} - True if valid, false otherwise
 */
const validateZipCode = async (zipCode, countryCode = null) => {
  const cityInfo = await convertZipCodeToCity(zipCode, countryCode);
  return cityInfo !== null;
};

/**
 * Reverse geocode: Convert coordinates (latitude, longitude) to address and zip code
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object|null} - Address information with zip code or null if not found
 */
const reverseGeocode = async (lat, lng) => {
  try {
    // Check cache first
    const cacheKey = `coord_${lat}_${lng}`;
    const cached = zipCodeCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`Cache hit for coordinates: ${lat}, ${lng}`);
      return cached.data;
    }

    console.log(`Reverse geocoding coordinates: ${lat}, ${lng}`);
    
    const response = await axios.get(GOOGLE_GEOCODE_ENDPOINT, {
      params: {
        latlng: `${lat},${lng}`,
        key: GOOGLE_API_KEY
      }
    });

    if (response.data.status !== 'OK' || response.data.results.length === 0) {
      console.log(`No results found for coordinates: ${lat}, ${lng}`);
      return null;
    }

    const result = response.data.results[0];
    const addressComponents = result.address_components;
    
    // Extract address components
    let street = '';
    let city = '';
    let state = '';
    let country = 'US';
    let zipCode = '';
    
    addressComponents.forEach(component => {
      if (component.types.includes('street_number') || component.types.includes('route')) {
        street = component.long_name + (street ? ' ' + street : '');
      } else if (component.types.includes('locality')) {
        city = component.long_name;
      } else if (component.types.includes('administrative_area_level_2')) {
        // Sometimes city is in admin_area_level_2
        if (!city) city = component.long_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        state = component.short_name;
      } else if (component.types.includes('country')) {
        country = component.short_name;
      } else if (component.types.includes('postal_code')) {
        zipCode = component.long_name;
      }
    });

    // Format street address properly
    if (!street) {
      // Try to get street from formatted address if not found in components
      const formattedParts = result.formatted_address.split(',');
      street = formattedParts[0] || '';
    }

    const addressInfo = {
      street,
      city,
      state,
      country,
      zipCode,
      fullAddress: result.formatted_address,
      coordinates: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      }
    };

    // Cache the result
    zipCodeCache.set(cacheKey, {
      data: addressInfo,
      timestamp: Date.now()
    });

    console.log(`Found address: ${addressInfo.fullAddress}, Zip: ${zipCode}`);
    return addressInfo;
  } catch (error) {
    console.error('Error reverse geocoding:', error.response?.data || error.message);
    return null;
  }
};

/**
 * Clear cache for a specific zip code (and optionally country)
 * @param {string} zipCode - The zip code to clear from cache
 * @param {string} countryCode - Optional country code to clear specific entry
 */
const clearZipCodeCache = (zipCode, countryCode = null) => {
  if (countryCode) {
    const cacheKey = `zip_${zipCode}_${countryCode}`;
    zipCodeCache.delete(cacheKey);
    console.log(`Cleared cache for zip code: ${zipCode}, country: ${countryCode}`);
  } else {
    // Clear all cache entries for this zip code (any country)
    const keysToDelete = [];
    for (const key of zipCodeCache.keys()) {
      if (key.startsWith(`zip_${zipCode}_`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => zipCodeCache.delete(key));
    console.log(`Cleared ${keysToDelete.length} cache entries for zip code: ${zipCode}`);
  }
};

module.exports = {
  convertZipCodeToCity,
  getZipCodeSuggestions,
  validateZipCode,
  reverseGeocode,
  clearZipCodeCache
};
