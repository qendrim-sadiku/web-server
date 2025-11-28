/*****************************************************
 * SCRIPT TO ADD TEST SERVICES WITH SPECIFIC ZIP CODES
 * This script adds services with addresses in specific zip codes
 * for testing the zip code search functionality
 *****************************************************/

const sequelize = require('../config/sequelize');
const { Service } = require('../models/Services/Service');
const ServiceAddress = require('../models/Services/ServiceAddress');
const ServiceDetails = require('../models/Services/ServiceDetails');
const ServiceType = require('../models/Services/ServiceType');
const SubCategory = require('../models/Category/SubCategory');
const Trainer = require('../models/Trainer/Trainer');
const { faker } = require('@faker-js/faker');

// Test zip codes and their corresponding cities
const testZipCodes = [
  { zipCode: '10001', city: 'New York', state: 'NY', street: '123 Broadway' },
  { zipCode: '10002', city: 'New York', state: 'NY', street: '456 Canal St' },
  { zipCode: '90210', city: 'Beverly Hills', state: 'CA', street: '123 Rodeo Dr' },
  { zipCode: '30301', city: 'Atlanta', state: 'GA', street: '789 Peachtree St' },
  { zipCode: '60601', city: 'Chicago', state: 'IL', street: '321 Michigan Ave' },
  { zipCode: '78701', city: 'Austin', state: 'TX', street: '456 Congress Ave' },
  { zipCode: '94101', city: 'San Francisco', state: 'CA', street: '789 Market St' },
  { zipCode: '02101', city: 'Boston', state: 'MA', street: '123 Newbury St' },
];

// Service names for different categories
const serviceNames = [
  'Personal Training Session',
  'Tennis Coaching',
  'Basketball Training',
  'Art Workshop',
  'Music Lessons',
  'Cooking Class',
  'Photography Workshop',
  'Dance Lessons',
  'Yoga Session',
  'Swimming Coaching'
];

/**
 * Generate coordinates for a city
 */
function generateCoordinates(city) {
  const baseCoords = {
    'New York': { lat: 40.7128, lng: -74.0060 },
    'Beverly Hills': { lat: 34.0736, lng: -118.4004 },
    'Atlanta': { lat: 33.7490, lng: -84.3880 },
    'Chicago': { lat: 41.8781, lng: -87.6298 },
    'Austin': { lat: 30.2672, lng: -97.7431 },
    'San Francisco': { lat: 37.7749, lng: -122.4194 },
    'Boston': { lat: 42.3601, lng: -71.0589 },
  };

  const coords = baseCoords[city] || { lat: 39.8283, lng: -98.5795 };
  return {
    lat: parseFloat((coords.lat + (Math.random() - 0.5) * 0.1).toFixed(8)),
    lng: parseFloat((coords.lng + (Math.random() - 0.5) * 0.1).toFixed(8)),
  };
}

/**
 * Add test services with addresses
 */
async function addTestServices() {
  try {
    console.log('='.repeat(60));
    console.log('Adding Test Services with Specific Zip Codes');
    console.log('='.repeat(60));

    // Get required data
    const subCategories = await SubCategory.findAll();
    const serviceTypes = await ServiceType.findAll();
    const trainers = await Trainer.findAll();

    if (subCategories.length === 0 || serviceTypes.length === 0 || trainers.length === 0) {
      throw new Error('Required data not found. Please run the seed script first.');
    }

    let added = 0;
    let errors = 0;

    // Add 3 services for each test zip code
    for (const location of testZipCodes) {
      console.log(`\n📍 Adding services for ${location.city}, ${location.state} ${location.zipCode}`);
      
      for (let i = 0; i < 3; i++) {
        try {
          // Create service
          const service = await Service.create({
            name: faker.helpers.arrayElement(serviceNames),
            description: faker.lorem.sentences(2),
            duration: faker.helpers.arrayElement([60, 90, 120]),
            level: faker.helpers.arrayElement(['Beginner', 'Advanced', 'Pro']),
            subCategoryId: faker.helpers.arrayElement(subCategories).id,
            hourlyRate: faker.number.int({ min: 50, max: 150 }),
            image: 'https://images.pexels.com/photos/1142950/pexels-photo-1142950.jpeg?auto=compress&cs=tinysrgb&w=800',
            defaultTrainerId: faker.helpers.arrayElement(trainers).id,
            serviceTypeId: faker.helpers.arrayElement(serviceTypes).id,
            type: 'Meeting-Point',
            liveSession: false,
            tags: JSON.stringify(['test', 'meeting-point', location.city.toLowerCase()])
          });

          // Create service details
          await ServiceDetails.create({
            serviceId: service.id,
            fullDescription: faker.lorem.paragraphs(2),
            highlights: [faker.lorem.sentence(), faker.lorem.sentence()],
            whatsIncluded: [faker.lorem.word(), faker.lorem.word()],
            whatsNotIncluded: [faker.lorem.word()],
            recommendations: [faker.lorem.sentence()],
            whatsToBring: [faker.lorem.sentence()],
            coachInfo: faker.lorem.sentence(),
            serviceImage: [
              'https://images.pexels.com/photos/1142950/pexels-photo-1142950.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/4687625/pexels-photo-4687625.jpeg?auto=compress&cs=tinysrgb&w=800'
            ]
          });

          // Create service address
          const coordinates = generateCoordinates(location.city);
          await ServiceAddress.create({
            serviceId: service.id,
            street: location.street,
            city: location.city,
            state: location.state,
            zipCode: location.zipCode,
            country: 'US',
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            addressType: 'meeting_point',
            isActive: true,
            instructions: faker.lorem.sentence()
          });

          added++;
          console.log(`  ✅ Added service "${service.name}" (ID: ${service.id})`);

        } catch (error) {
          errors++;
          console.error(`  ❌ Error adding service:`, error.message);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log(`✅ Added: ${added} services`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    console.log('\n🧪 Test these zip codes:');
    testZipCodes.forEach(location => {
      console.log(`GET /api/services/by-zipcode?zipCode=${location.zipCode} - ${location.city}, ${location.state}`);
    });

  } catch (error) {
    console.error('Error in addTestServices:', error);
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

    await addTestServices();

    console.log('\n✅ Test services added successfully!');
    console.log('\nYou can now test the zip code search with these endpoints:');
    testZipCodes.forEach(location => {
      console.log(`curl "http://localhost:3000/api/services/by-zipcode?zipCode=${location.zipCode}"`);
    });

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

module.exports = { addTestServices };
