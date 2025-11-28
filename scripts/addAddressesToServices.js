/*****************************************************
 * SCRIPT TO ADD ADDRESSES TO EXISTING SERVICES
 * This script adds ServiceAddress records to existing services
 * with zip codes for testing zip code-based search
 *****************************************************/

const sequelize = require('../config/sequelize');
const { Service } = require('../models/Services/Service');
const ServiceAddress = require('../models/Services/ServiceAddress');
const { faker } = require('@faker-js/faker');

// Common US zip codes and cities for realistic data
const zipCodeCityMap = [
  { zipCode: '10001', city: 'New York', state: 'NY', street: '123 Broadway' },
  { zipCode: '10002', city: 'New York', state: 'NY', street: '456 Canal St' },
  { zipCode: '10003', city: 'New York', state: 'NY', street: '789 3rd Ave' },
  { zipCode: '90210', city: 'Beverly Hills', state: 'CA', street: '123 Rodeo Dr' },
  { zipCode: '90211', city: 'Beverly Hills', state: 'CA', street: '456 Sunset Blvd' },
  { zipCode: '90001', city: 'Los Angeles', state: 'CA', street: '789 Main St' },
  { zipCode: '90028', city: 'Hollywood', state: 'CA', street: '321 Hollywood Blvd' },
  { zipCode: '60601', city: 'Chicago', state: 'IL', street: '123 Michigan Ave' },
  { zipCode: '60602', city: 'Chicago', state: 'IL', street: '456 State St' },
  { zipCode: '60611', city: 'Chicago', state: 'IL', street: '789 N Rush St' },
  { zipCode: '77001', city: 'Houston', state: 'TX', street: '123 Main St' },
  { zipCode: '77002', city: 'Houston', state: 'TX', street: '456 Commerce St' },
  { zipCode: '33101', city: 'Miami', state: 'FL', street: '123 Biscayne Blvd' },
  { zipCode: '33139', city: 'Miami Beach', state: 'FL', street: '456 Ocean Dr' },
  { zipCode: '85001', city: 'Phoenix', state: 'AZ', street: '123 Central Ave' },
  { zipCode: '85003', city: 'Phoenix', state: 'AZ', street: '789 Washington St' },
  { zipCode: '98101', city: 'Seattle', state: 'WA', street: '123 Pike St' },
  { zipCode: '98102', city: 'Seattle', state: 'WA', street: '456 Broadway' },
  { zipCode: '02101', city: 'Boston', state: 'MA', street: '123 Newbury St' },
  { zipCode: '02108', city: 'Boston', state: 'MA', street: '456 Beacon St' },
  { zipCode: '30301', city: 'Atlanta', state: 'GA', street: '123 Peachtree St' },
  { zipCode: '30303', city: 'Atlanta', state: 'GA', street: '789 Marietta St' },
  { zipCode: '78701', city: 'Austin', state: 'TX', street: '123 Congress Ave' },
  { zipCode: '78702', city: 'Austin', state: 'TX', street: '456 E 6th St' },
  { zipCode: '80201', city: 'Denver', state: 'CO', street: '123 Colfax Ave' },
  { zipCode: '80202', city: 'Denver', state: 'CO', street: '789 16th St' },
  { zipCode: '94101', city: 'San Francisco', state: 'CA', street: '123 Market St' },
  { zipCode: '94102', city: 'San Francisco', state: 'CA', street: '456 Mission St' },
  { zipCode: '20001', city: 'Washington', state: 'DC', street: '123 Constitution Ave' },
  { zipCode: '20002', city: 'Washington', state: 'DC', street: '789 H St' },
];

/**
 * Get random location from zip code map
 */
function getRandomLocation() {
  return faker.helpers.arrayElement(zipCodeCityMap);
}

/**
 * Generate random coordinates based on city
 */
function generateCoordinates(city) {
  // Simple coordinate generation - in production, use actual geocoding
  const baseCoords = {
    'New York': { lat: 40.7128, lng: -74.0060 },
    'Los Angeles': { lat: 34.0522, lng: -118.2437 },
    'Chicago': { lat: 41.8781, lng: -87.6298 },
    'Houston': { lat: 29.7604, lng: -95.3698 },
    'Miami': { lat: 25.7617, lng: -80.1918 },
    'Phoenix': { lat: 33.4484, lng: -112.0740 },
    'Seattle': { lat: 47.6062, lng: -122.3321 },
    'Boston': { lat: 42.3601, lng: -71.0589 },
    'Atlanta': { lat: 33.7490, lng: -84.3880 },
    'Austin': { lat: 30.2672, lng: -97.7431 },
    'Denver': { lat: 39.7392, lng: -104.9903 },
    'San Francisco': { lat: 37.7749, lng: -122.4194 },
    'Washington': { lat: 38.9072, lng: -77.0369 },
    'Beverly Hills': { lat: 34.0736, lng: -118.4004 },
    'Miami Beach': { lat: 25.7907, lng: -80.1300 },
    'Hollywood': { lat: 34.0928, lng: -118.3287 },
  };

  const coords = baseCoords[city] || { lat: 39.8283, lng: -98.5795 }; // Default to US center
  // Add small random variation
  return {
    lat: parseFloat((coords.lat + (Math.random() - 0.5) * 0.1).toFixed(8)),
    lng: parseFloat((coords.lng + (Math.random() - 0.5) * 0.1).toFixed(8)),
  };
}

/**
 * Add addresses to services
 * @param {Object} options - Configuration options
 * @param {string|undefined} options.serviceType - Filter by service type ('Meeting-Point', 'In-Person', etc.). undefined = all services
 * @param {string} options.addressType - Type of address ('meeting_point', 'service_location', 'pickup_location')
 * @param {boolean} options.skipExisting - Skip services that already have addresses
 * @param {number|null} options.limit - Limit number of services to process (null = all)
 */
async function addAddressesToServices(options = {}) {
  try {
    const {
      serviceType = 'Meeting-Point', // Only add addresses to Meeting-Point services by default
      addressType = 'meeting_point',
      skipExisting = true, // Skip services that already have addresses
      limit = null, // Limit number of services to process (null = all)
    } = options;

    console.log('='.repeat(60));
    console.log('Adding Addresses to Services');
    console.log('='.repeat(60));
    console.log(`Service Type Filter: ${serviceType}`);
    console.log(`Address Type: ${addressType}`);
    console.log(`Skip Existing: ${skipExisting}`);
    console.log(`Limit: ${limit || 'All services'}`);
    console.log('='.repeat(60));

    // Find services
    const whereClause = {};
    if (serviceType) {
      whereClause.type = serviceType;
    }

    const services = await Service.findAll({
      where: whereClause,
      limit: limit || undefined
    });

    if (services.length === 0) {
      console.log(`No services found${serviceType ? ` with type: ${serviceType}` : ''}`);
      return;
    }

    console.log(`\nFound ${services.length} services`);

    let added = 0;
    let skipped = 0;
    let errors = 0;

    for (const service of services) {
      try {
        // Check if service already has an address
        if (skipExisting) {
          const existingAddress = await ServiceAddress.findOne({
            where: { serviceId: service.id }
          });
          
          if (existingAddress) {
            console.log(`⏭️  Skipping service ID ${service.id} - already has address`);
            skipped++;
            continue;
          }
        }

        // Get random location
        const location = getRandomLocation();
        const coordinates = generateCoordinates(location.city);

        // Create address
        await ServiceAddress.create({
          serviceId: service.id,
          street: location.street,
          city: location.city,
          state: location.state,
          zipCode: location.zipCode,
          country: 'US',
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          addressType: addressType,
          isActive: true,
          instructions: faker.lorem.sentence()
        });

        added++;
        console.log(`✅ Added address to service ID ${service.id} - ${location.city}, ${location.state} ${location.zipCode}`);

      } catch (error) {
        errors++;
        console.error(`❌ Error adding address to service ID ${service.id}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log(`✅ Added: ${added}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error in addAddressesToServices:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Option 1: Add addresses to Meeting-Point services only (default)
    await addAddressesToServices({
      serviceType: 'Meeting-Point',
      addressType: 'meeting_point',
      skipExisting: true
    });

    // Option 2: To add addresses to ALL services, uncomment below:
    // await addAddressesToServices({
    //   serviceType: undefined, // No filter
    //   addressType: 'meeting_point',
    //   skipExisting: true
    // });

    // Option 3: To add addresses to In-Person services:
    // await addAddressesToServices({
    //   serviceType: 'In-Person',
    //   addressType: 'service_location',
    //   skipExisting: true
    // });

    console.log('\n✅ Script completed successfully!');
    console.log('\nYou can now test the zip code search:');
    console.log('GET /api/services/by-zipcode?zipCode=10001');
    console.log('GET /api/services/by-zipcode?zipCode=90210');

  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await sequelize.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { addAddressesToServices };
