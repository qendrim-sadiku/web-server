/*****************************************************
 * SEED SCRIPT WITH ROUND-ROBIN SERVICE IMAGES 
 * + SERVICE TYPE IMAGES + IMAGE VALIDATION
 *****************************************************/

const axios = require('axios');
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const Category = require('../models/Category/Category');
const SubCategory = require('../models/Category/SubCategory');
const { Service, ServiceTrainer } = require('../models/Services/Service');
const ServiceDetails = require('../models/Services/ServiceDetails');
const Trainer = require('../models/Trainer/Trainer');
const Booking = require('../models/Bookings/Booking');
const Review = require('../models/Trainer/Review');
const User = require('../models/User');
const ServiceType = require('../models/Services/ServiceType');

/*****************************************************
 * ARRAYS OF IMAGE URLs
 * (Replace with your own images if desired)
 *****************************************************/

// Example trainer images (already OK)
const trainerImages = [
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&w=800&q=80',
  'https://images.unsplash.com/photo-1594737625785-c9e6f1f9b6ef?ixlib=rb-4.0.3&auto=format&w=800&q=80',
  'https://images.unsplash.com/photo-1522078721372-7da3dbf4e1ae?ixlib=rb-4.0.3&auto=format&w=800&q=80',
  'https://images.unsplash.com/photo-1519455953755-af066f54c5c4?ixlib=rb-4.0.3&auto=format&w=800&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&w=800&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?ixlib=rb-4.0.3&auto=format&w=800&q=80',
  'https://images.unsplash.com/photo-1637849231261-0852d45f1000?ixlib=rb-4.0.3&auto=format&w=800&q=80',
  'https://images.unsplash.com/photo-1563285705-e0f5c23da76b?ixlib=rb-4.0.3&auto=format&w=800&q=80',
  'https://images.unsplash.com/photo-1606813904612-40c61c56fe90?ixlib=rb-4.0.3&auto=format&w=800&q=80',
  'https://images.unsplash.com/photo-1626637074912-7b69f77edc55?ixlib=rb-4.0.3&auto=format&w=800&q=80',
];

// Service images: for Service model & ServiceDetails
// Service images: for the Service model & ServiceDetails
// Verified 2023-10-05
const serviceImagesList = [
    'https://images.pexels.com/photos/1142950/pexels-photo-1142950.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/4687625/pexels-photo-4687625.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/238787/pexels-photo-238787.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2797005/pexels-photo-2797005.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/5825582/pexels-photo-5825582.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/459225/pexels-photo-459225.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/669496/pexels-photo-669496.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1592400/pexels-photo-1592400.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/163185/sunset-sun-ocean-sea-163185.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/227675/pexels-photo-227675.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1738986/pexels-photo-1738986.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3416650/pexels-photo-3416650.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3590/nature-sky-sunset-man.jpg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1048039/pexels-photo-1048039.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/206359/pexels-photo-206359.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/22346/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/4694664/pexels-photo-4694664.jpeg?auto=compress&cs=tinysrgb&w=800'
  ];
  

/*****************************************************
 * SERVICE NAMES & AGE GROUPS
 *****************************************************/
const serviceNames = {
  'Tennis': ['Serve Techniques', 'Footwork Drills', 'Doubles Strategy Training'],
  'Football': ['Youth Football Training', 'Advanced Goalkeeping', 'Tactical Play Sessions', 'Football Conditioning'],
  'Basketball': ['Throwing Techniques', 'Dribbling Skills', 'Defense Strategies', 'Shooting Accuracy Drills'],
  'Volleyball': ['Volleyball Drills', 'Spiking Techniques', 'Team Coordination Training', 'Defense Skills'],
  'Painting': ['Intro to Watercolors', 'Oil Painting', 'Abstract Art Techniques', 'Portrait Painting'],
  'Contemporary': ['Modern Art Styles', 'Contemporary Sculpture', 'Mixed Media Art', 'Conceptual Art Techniques'],
  'Sculpture': ['Clay Modeling', 'Stone Carving', 'Metal Sculpture Techniques', 'Sculptural Installation'],
  'Abstract': ['Abstract Expressionism', 'Geometric Abstraction', 'Non-representational Art', 'Color Theory in Abstract Art'],
  'Shopper': ['Personal Shopping Assistant', 'Wardrobe Makeover', 'Gift Shopping Services', 'Home Décor Shopping'],
  'Handyman': ['Home Repairs', 'Electrical Fixes', 'Plumbing Services', 'Furniture Assembly'],
  'Cleaning': ['Residential Cleaning', 'Office Cleaning', 'Deep Cleaning Services', 'Move-In/Move-Out Cleaning'],
  'Pet care': ['Dog Walking', 'Pet Sitting', 'Pet Grooming', 'Behavioral Training']
};

const ageGroups = ['Adults', 'Teenagers', 'Children'];

/*****************************************************
 * HEAD REQUEST TO CHECK IF IMAGE EXISTS
 *****************************************************/
async function isImageAvailable(url) {
  try {
    const response = await axios.head(url);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/*****************************************************
 * SHUFFLE ARRAYS, THEN ROUND ROBIN
 *****************************************************/

// Simple Fisher-Yates shuffle
function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

/**
 * validateAndShuffleImages - Validate each URL in the array with HEAD requests.
 * Return a new array containing only the valid URLs. Then shuffle them.
 */
async function validateAndShuffleImages(imageList) {
  const validImages = [];
  for (const url of imageList) {
    if (await isImageAvailable(url)) {
      validImages.push(url);
    }
  }
  shuffleArray(validImages);
  return validImages;
}

/*****************************************************
 * HELPER: ROUND ROBIN GETTER
 *****************************************************/
function createRoundRobinGetter(images) {
  let index = 0;
  const total = images.length;

  // Returns the next image in round-robin fashion
  return function getNextImage() {
    if (!images.length) {
      // If no valid images, fallback
      return 'https://via.placeholder.com/800x600?text=No+Valid+Image';
    }
    const image = images[index];
    index = (index + 1) % total; // move to the next, wrap around
    return image;
  };
}

/*****************************************************
 * EMPTYING TABLES
 *****************************************************/
const emptyDatabase = async () => {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });
  await ServiceTrainer.destroy({ where: {}, truncate: true });
  await ServiceDetails.destroy({ where: {}, truncate: true });
  await Trainer.destroy({ where: {}, truncate: true });
  await Service.destroy({ where: {}, truncate: true });
  await SubCategory.destroy({ where: {}, truncate: true });
  await Category.destroy({ where: {}, truncate: true });
  await Booking.destroy({ where: {}, truncate: true });
  await Review.destroy({ where: {}, truncate: true });
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
  console.log('Relevant tables emptied successfully (users table untouched).');
};

/*****************************************************
 * CREATE CATEGORIES & SUBCATEGORIES
 *****************************************************/
const createCategoriesAndSubCategories = async () => {
  try {
    const categoriesData = [
      { name: 'Sport' },
      { name: 'Art' },
      { name: 'Pro Services' }
    ];

    const categories = await Category.bulkCreate(categoriesData, { ignoreDuplicates: true });

    const subCategoriesData = [
      { name: 'Tennis', categoryId: categories.find(cat => cat.name === 'Sport').id },
      { name: 'Football', categoryId: categories.find(cat => cat.name === 'Sport').id },
      { name: 'Basketball', categoryId: categories.find(cat => cat.name === 'Sport').id },
      { name: 'Volleyball', categoryId: categories.find(cat => cat.name === 'Sport').id },
      { name: 'Painting', categoryId: categories.find(cat => cat.name === 'Art').id },
      { name: 'Contemporary', categoryId: categories.find(cat => cat.name === 'Art').id },
      { name: 'Sculpture', categoryId: categories.find(cat => cat.name === 'Art').id },
      { name: 'Abstract', categoryId: categories.find(cat => cat.name === 'Art').id },
      { name: 'Shopper', categoryId: categories.find(cat => cat.name === 'Pro Services').id },
      { name: 'Handyman', categoryId: categories.find(cat => cat.name === 'Pro Services').id },
      { name: 'Cleaning', categoryId: categories.find(cat => cat.name === 'Pro Services').id },
      { name: 'Pet care', categoryId: categories.find(cat => cat.name === 'Pro Services').id }
    ];

    await SubCategory.bulkCreate(subCategoriesData, { ignoreDuplicates: true });
    console.log('Categories and subcategories have been populated successfully.');
  } catch (error) {
    console.error('Unable to create categories and subcategories:', error);
    throw error;
  }
};

/*****************************************************
 * CREATE SAMPLE USERS
 *****************************************************/
const createSampleUsers = async () => {
  try {
    const defaultPassword = 'Pa$w0rd!';
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);

    for (let i = 0; i < 10; i++) {
      let username = faker.internet.userName();
      if (username.length > 20) {
        username = username.substring(0, 20);
      } else if (username.length < 3) {
        username = username.padEnd(3, '0');
      }

      await User.create({
        name: faker.person.firstName(),
        surname: faker.person.lastName(),
        username: username,
        email: faker.internet.email(),
        password: hashedPassword,
        role: 'user'
      });
    }

    console.log('Sample users created successfully with default password!');
  } catch (error) {
    console.error('Error creating sample users:', error);
    throw error;
  }
};

/*****************************************************
 * ENSURE DEFAULT TRAINER
 *****************************************************/
const ensureDefaultTrainer = async (getTrainerImage) => {
  let defaultTrainer = await Trainer.findOne({ where: { name: 'John Doe' } });
  if (!defaultTrainer) {
    console.log('Default trainer not found. Creating a new default trainer...');

    defaultTrainer = await Trainer.create({
      name: 'John',
      surname: 'Doe',
      gender: 'Male',
      ageGroup: 'Adults',
      description: faker.lorem.paragraph(),
      avatar: getTrainerImage(), // use round-robin getter
      userRating: 5,
      specialization: 'General',
      level: 'Pro',
      hourlyRate: 100,
      categoryId: 1,
      subcategoryId: 1,
      yearsOfExperience: 10,
      certification: 'Certified Professional Trainer',
      skills: ['Basic Skills'],
    });

    console.log('Default trainer created successfully.');
  }
  return defaultTrainer;
};

/*****************************************************
 * CREATE SERVICE DETAILS (multiple images)
 *****************************************************/
const createServiceDetails = async (service, getServiceImage) => {
  const numberOfImages = faker.number.int({ min: 2, max: 5 });
  const imagesForDetails = [];
  for (let i = 0; i < numberOfImages; i++) {
    imagesForDetails.push(getServiceImage());
  }

  await ServiceDetails.create({
    serviceId: service.id,
    fullDescription: faker.lorem.paragraphs(2),
    highlights: [faker.lorem.sentence(), faker.lorem.sentence()].join(', '),
    whatsIncluded: [faker.lorem.word(), faker.lorem.word()].join(', '),
    whatsNotIncluded: [faker.lorem.word()].join(', '),
    recommendations: [faker.lorem.sentence()].join(', '),
    whatsToBring: [faker.lorem.sentence()].join(', '),
    coachInfo: faker.lorem.sentence(),
    serviceImage: imagesForDetails
  });

  console.log(`Service details with images created for service ID: ${service.id}`);
};

/*****************************************************
 * CREATE SAMPLE TRAINERS
 *****************************************************/
const createSampleTrainers = async (getTrainerImage) => {
  try {
    const categories = await Category.findAll();
    const subCategories = await SubCategory.findAll();
    if (categories.length === 0 || subCategories.length === 0) {
      throw new Error('No categories or subcategories found in the database.');
    }

    const experienceRanges = [
      { min: 0, max: 2 },
      { min: 3, max: 5 },
      { min: 6, max: 10 },
      { min: 11, max: 15 },
      { min: 16, max: 25 }
    ];

    const totalTrainers = 200;
    for (let i = 0; i < totalTrainers; i++) {
      const subCategory = faker.helpers.arrayElement(subCategories);
      let specialization;
      switch (subCategory.name) {
        case 'Tennis':
          specialization = faker.helpers.arrayElement(['Serve Techniques', 'Footwork Drills', 'Match Strategy']);
          break;
        case 'Football':
          specialization = faker.helpers.arrayElement(['Goalkeeping', 'Tactical Play', 'Conditioning']);
          break;
        case 'Basketball':
          specialization = faker.helpers.arrayElement(['Dribbling Skills', 'Defense Strategies', 'Shooting Accuracy']);
          break;
        case 'Volleyball':
          specialization = faker.helpers.arrayElement(['Spiking Techniques', 'Team Coordination', 'Defense Skills']);
          break;
        case 'Painting':
        case 'Contemporary':
        case 'Sculpture':
        case 'Abstract':
          specialization = faker.helpers.arrayElement(['Watercolors', 'Oil Painting', 'Abstract Art', 'Mixed Media']);
          break;
        case 'Shopper':
          specialization = 'Personal Shopping';
          break;
        case 'Handyman':
          specialization = faker.helpers.arrayElement(['Electrical Repairs', 'Plumbing', 'Furniture Assembly']);
          break;
        case 'Cleaning':
          specialization = faker.helpers.arrayElement(['Residential Cleaning', 'Office Cleaning']);
          break;
        case 'Pet care':
          specialization = faker.helpers.arrayElement(['Dog Walking', 'Pet Grooming']);
          break;
        default:
          specialization = 'General Service';
          break;
      }
      const experienceGroup = faker.helpers.arrayElement(experienceRanges);
      const yearsOfExperience = faker.number.int({ min: experienceGroup.min, max: experienceGroup.max });

      await Trainer.create({
        name: faker.person.firstName(),
        surname: faker.person.lastName(),
        gender: faker.helpers.arrayElement(['Male', 'Female']),
        ageGroup: faker.helpers.arrayElement(ageGroups),
        description: faker.lorem.paragraph(),
        avatar: getTrainerImage(),
        userRating: faker.number.int({ min: 1, max: 5 }),
        specialization,
        level: faker.helpers.arrayElement(['Beginner', 'Advanced', 'Pro']),
        hourlyRate: parseFloat(faker.commerce.price({ min: 30, max: 150, dec: 2 })),
        categoryId: subCategory.categoryId,
        subcategoryId: subCategory.id,
        yearsOfExperience,
        certification: faker.helpers.arrayElement([
          'Certified Professional Trainer',
          'First Aid Certified',
          'Advanced Coaching Techniques Certificate'
        ]),
        skills: ['Mastering groundstrokes', 'Controlling the court', 'Mastering the serve'],
      });
    }

    console.log('200+ trainers created successfully with different experience levels!');
  } catch (error) {
    console.error('Error creating sample trainers:', error);
    throw error;
  }
};

/*****************************************************
 * CREATE SERVICE TYPES (WITH IMAGES)
 *****************************************************/
const createServiceTypes = async (getServiceTypeImage) => {
  try {
    const serviceTypesData = [
      {
        name: 'Basic',
        pricePerHour: 50,
        picture: getServiceTypeImage()
      },
      {
        name: 'Pro',
        pricePerHour: 70,
        picture: getServiceTypeImage()
      },
      {
        name: 'Expert',
        pricePerHour: 100,
        picture: getServiceTypeImage()
      },
      {
        name: 'Enterprise',
        pricePerHour: 130,
        picture: getServiceTypeImage()
      }
    ];

    await ServiceType.bulkCreate(serviceTypesData, { ignoreDuplicates: true });
    console.log('Service types with pictures created successfully!');
  } catch (error) {
    console.error('Error creating service types:', error);
    throw error;
  }
};

/*****************************************************
 * CREATE SAMPLE SERVICES
 *****************************************************/
const createSampleServices = async (getTrainerImage, getServiceImage) => {
  try {
    const subCategories = await SubCategory.findAll();
    const trainers = await Trainer.findAll();
    const serviceTypes = await ServiceType.findAll();

    if (subCategories.length === 0) {
      throw new Error('No subcategories found in the database.');
    }
    if (trainers.length === 0) {
      throw new Error('No trainers found in the database.');
    }
    if (serviceTypes.length === 0) {
      throw new Error('No service types found in the database.');
    }

    // Ensure we have a default trainer
    const defaultTrainer = await ensureDefaultTrainer(getTrainerImage);

    for (const subCategory of subCategories) {
      const subCategoryName = subCategory.name;
      const names = serviceNames[subCategoryName] || ['General Service'];

      for (let i = 0; i < 30; i++) {
        const serviceName = faker.helpers.arrayElement(names);
        const serviceType = faker.helpers.arrayElement(serviceTypes);
        const serviceTypeValue = faker.helpers.arrayElement(['Online', 'Meeting-Point', 'In-Person']);

        // Round-robin for each Service's main image
        const serviceMainImage = getServiceImage();

        const service = await Service.create({
          name: serviceName,
          description: faker.lorem.sentences(3),
          duration: 60,
          level: faker.helpers.arrayElement(['Beginner', 'Advanced', 'Pro']),
          subCategoryId: subCategory.id,
          hourlyRate: serviceType.pricePerHour,
          image: serviceMainImage,
          defaultTrainerId: defaultTrainer.id,
          serviceTypeId: serviceType.id,
          type: serviceTypeValue,
        });

        // Add multiple images to ServiceDetails
        await createServiceDetails(service, getServiceImage);

        // Filter matching trainers
        let matchingTrainers = trainers.filter(trainer =>
          trainer.subcategoryId === subCategory.id &&
          trainer.level === service.level &&
          trainer.yearsOfExperience >= 3
        );

        // Limit trainers to a maximum of 2
        matchingTrainers = matchingTrainers.slice(0, 2);

        // Ensure we have at least 1 trainer if not enough matching trainers exist
        while (matchingTrainers.length < 2) {
          const newTrainer = await Trainer.create({
            name: faker.person.firstName(),
            surname: faker.person.lastName(),
            gender: faker.helpers.arrayElement(['Male', 'Female']),
            ageGroup: faker.helpers.arrayElement(ageGroups),
            description: faker.lorem.paragraph(),
            avatar: getTrainerImage(),
            userRating: faker.number.int({ min: 1, max: 5 }),
            specialization: faker.helpers.arrayElement(['Serve Techniques', 'Footwork Drills', 'Match Strategy']),
            level: service.level,
            hourlyRate: parseFloat(faker.commerce.price({ min: 30, max: 150, dec: 2 })),
            categoryId: subCategory.categoryId,
            subcategoryId: subCategory.id,
            yearsOfExperience: faker.number.int({ min: 3, max: 25 }),
            certification: faker.helpers.arrayElement([
              'Certified Professional Trainer',
              'First Aid Certified',
              'Advanced Coaching Techniques Certificate',
            ]),
            skills: ['Mastering groundstrokes', 'Controlling the court', 'Mastering the serve'],
          });
          matchingTrainers.push(newTrainer);
        }

        // Assign up to 2 trainers
        for (const trainer of matchingTrainers) {
          await ServiceTrainer.create({
            serviceId: service.id,
            trainerId: trainer.id,
          });
        }
      }
    }

    console.log('Sample services with up to 2 trainers per service created successfully!');
  } catch (error) {
    console.error('Error creating sample services and service details:', error);
    throw error;
  }
};

/*****************************************************
 * CREATE SAMPLE REVIEWS
 *****************************************************/
const createSampleReviews = async () => {
  try {
    const trainers = await Trainer.findAll();
    const users = await User.findAll();
    if (trainers.length === 0 || users.length === 0) {
      throw new Error('No trainers or users found in the database.');
    }

    for (const trainer of trainers) {
      const numberOfReviews = faker.number.int({ min: 3, max: 4 });
      for (let i = 0; i < numberOfReviews; i++) {
        const user = faker.helpers.arrayElement(users);
        await Review.create({
          trainerId: trainer.id,
          userId: user.id,
          rating: faker.number.int({ min: 1, max: 5 }),
          comment: faker.lorem.sentence()
        });
      }
    }
    console.log('Sample reviews created successfully!');
  } catch (error) {
    console.error('Error creating sample reviews:', error);
    throw error;
  }
};

/*****************************************************
 * MAIN SEED FUNCTION
 *****************************************************/
async function seedDatabase() {
  try {
    await sequelize.sync();
    console.log('Emptying relevant tables...');
    await emptyDatabase();

    /******************************************************
     * STEP 1: Validate & shuffle trainer + service images
     ******************************************************/
    console.log('Validating trainer images...');
    const validTrainerImages = await validateAndShuffleImages(trainerImages);
    console.log(`Found ${validTrainerImages.length} valid trainer images`);

    console.log('Validating service images...');
    const validServiceImages = await validateAndShuffleImages(serviceImagesList);
    console.log(`Found ${validServiceImages.length} valid service images`);

    // Build round-robin getters
    const getTrainerImage = createRoundRobinGetter(validTrainerImages);
    const getServiceImage = createRoundRobinGetter(validServiceImages);
    // We'll also use the same service images for service types
    const getServiceTypeImage = createRoundRobinGetter(validServiceImages);

    /******************************************************
     * STEP 2: Create Data
     ******************************************************/
    console.log('Creating service types...');
    await createServiceTypes(getServiceTypeImage);

    console.log('Creating categories and subcategories...');
    await createCategoriesAndSubCategories();

    console.log('Creating users...');
    await createSampleUsers();

    console.log('Creating trainers...');
    await createSampleTrainers(getTrainerImage);

    console.log('Creating services and service details...');
    await createSampleServices(getTrainerImage, getServiceImage);

    console.log('Creating reviews...');
    await createSampleReviews();
  } catch (error) {
    console.error('Error syncing database or creating sample data:', error);
  } finally {
    sequelize.close();
  }
}

/*****************************************************
 * RUN IT
 *****************************************************/
seedDatabase();
