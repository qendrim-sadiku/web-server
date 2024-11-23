

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

// Define service names for different subcategories
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

// Define age groups for trainers
const ageGroups = ['Adults', 'Teenagers', 'Children'];

// Function to empty only the necessary tables, excluding users and keeping bookings table intact
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

// Function to create sample categories and subcategories
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

// Function to create sample users with default password
const createSampleUsers = async () => {
    try {
        const defaultPassword = 'Pa$w0rd!'; // Default password
        const hashedPassword = bcrypt.hashSync(defaultPassword, 10); // Hash the default password

        for (let i = 0; i < 10; i++) { // Create 10 users
            let username = faker.internet.userName();
            // Ensure the username is between 3 and 20 characters
            if (username.length > 20) {
                username = username.substring(0, 20); // Trim the username if it's too long
            } else if (username.length < 3) {
                username = username.padEnd(3, '0'); // Pad with zeros if it's too short
            }

            await User.create({
                name: faker.person.firstName(),
                surname: faker.person.lastName(),
                username: username, // Use the constrained username
                email: faker.internet.email(),
                password: hashedPassword, // Use the hashed default password
                role: 'user'
            });
        }

        console.log('Sample users created successfully with default password!');
    } catch (error) {
        console.error('Error creating sample users:', error);
        throw error;
    }
};

// Ensure a default trainer is available in the database
const ensureDefaultTrainer = async () => {
    let defaultTrainer = await Trainer.findOne({ where: { name: 'John Doe' } });

    if (!defaultTrainer) {
        console.log('Default trainer not found. Creating a new default trainer...');
        
        defaultTrainer = await Trainer.create({
            name: 'John',
            surname: 'Doe',
            gender: 'Male', // Added gender here
            ageGroup: 'Adults', // Added age group here
            description: faker.lorem.paragraph(),
            avatar: faker.image.avatar(),
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

// Function to create service details with multiple images
const createServiceDetails = async (service) => {
    // Generate an array of at least two image URLs for service images
    const numberOfImages = faker.number.int({ min: 2, max: 5 });
    const serviceImages = [];
    for (let imgIndex = 0; imgIndex < numberOfImages; imgIndex++) {
        serviceImages.push(faker.image.imageUrl(640, 480, 'service', true, true)); // Generate random service images
    }

    // Create service details with multiple images
    await ServiceDetails.create({
        serviceId: service.id,
        fullDescription: faker.lorem.paragraphs(2),
        highlights: [faker.lorem.sentence(), faker.lorem.sentence()].join(', '), // Highlights as comma-separated values
        whatsIncluded: [faker.lorem.word(), faker.lorem.word()].join(', '), // Included items as comma-separated values
        whatsNotIncluded: [faker.lorem.word()].join(', '), // Not included items as comma-separated value
        recommendations: [faker.lorem.sentence()].join(', '), // Recommendations as comma-separated values
        whatsToBring: [faker.lorem.sentence()].join(', '), // What to bring as comma-separated values
        coachInfo: faker.lorem.sentence(), // Information about the coach
        serviceImage: serviceImages // Array of service images
    });

    console.log(`Service details with images created for service ID: ${service.id}`);
};

// Create sample trainers with years of experience distributed from 0-2 years to 16+ years
const createSampleTrainers = async () => {
    try {
        const categories = await Category.findAll();
        const subCategories = await SubCategory.findAll();

        if (categories.length === 0 || subCategories.length === 0) {
            throw new Error('No categories or subcategories found in the database.');
        }

        // Experience ranges (0-2, 3-5, 6-10, 11-15, 16+)
        const experienceRanges = [
            { min: 0, max: 2 },
            { min: 3, max: 5 },
            { min: 6, max: 10 },
            { min: 11, max: 15 },
            { min: 16, max: 25 } // 16+ group
        ];

        // Create at least 200 trainers spread across experience levels
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

            // Randomly assign years of experience based on defined ranges
            const experienceGroup = faker.helpers.arrayElement(experienceRanges);
            const yearsOfExperience = faker.number.int({ min: experienceGroup.min, max: experienceGroup.max });

            // Create a trainer
            await Trainer.create({
                name: faker.person.firstName(),
                surname: faker.person.lastName(),
                gender: faker.helpers.arrayElement(['Male', 'Female']), // Added gender here
                ageGroup: faker.helpers.arrayElement(ageGroups), // Assign random age group
                description: faker.lorem.paragraph(),
                avatar: faker.image.avatar(),
                userRating: faker.number.int({ min: 1, max: 5 }),
                specialization,
                level: faker.helpers.arrayElement(['Beginner', 'Advanced', 'Pro']),
                hourlyRate: parseFloat(faker.commerce.price({ min: 30, max: 150, dec: 2 })),
                categoryId: subCategory.categoryId,
                subcategoryId: subCategory.id,
                yearsOfExperience, // Assign the generated years of experience
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

// Create sample services and assign default trainers
const createSampleServices = async () => {
    try {
        const subCategories = await SubCategory.findAll();
        const trainers = await Trainer.findAll();
        const serviceTypes = await ServiceType.findAll(); // Fetch service types

        if (subCategories.length === 0) {
            throw new Error('No subcategories found in the database.');
        }

        if (trainers.length === 0) {
            throw new Error('No trainers found in the database.');
        }

        if (serviceTypes.length === 0) {
            throw new Error('No service types found in the database.');
        }

        const defaultTrainer = await ensureDefaultTrainer();

        for (const subCategory of subCategories) {
            const subCategoryName = subCategory.name;
            const names = serviceNames[subCategoryName] || ['General Service'];

            for (let i = 0; i < 30; i++) { // Create 30 services per subcategory
                const serviceName = faker.helpers.arrayElement(names);
                const serviceType = faker.helpers.arrayElement(serviceTypes); // Randomly assign a service type
                const serviceTypeValue = faker.helpers.arrayElement(['Online', 'Meeting-Point', 'In-Person']); // Added type

                const service = await Service.create({
                    name: serviceName,
                    description: faker.lorem.sentences(3),
                    duration: 60,
                    level: faker.helpers.arrayElement(['Beginner', 'Advanced', 'Pro']),
                    subCategoryId: subCategory.id,
                    hourlyRate: serviceType.pricePerHour, // Use the price per hour from the service type
                    image: faker.image.imageUrl(undefined, undefined, 'business', true, true),
                    defaultTrainerId: defaultTrainer.id,
                    serviceTypeId: serviceType.id, // Assign service type
                    type: serviceTypeValue // Added type field
                });

                // Add service details with images
                await createServiceDetails(service);

                // Filter matching trainers based on subcategory, level, gender, and years of experience
                let matchingTrainers = trainers.filter(trainer =>
                    trainer.subcategoryId === subCategory.id &&
                    trainer.level === service.level &&
                    trainer.yearsOfExperience >= 3 // Example: filtering trainers with at least 3 years of experience
                );

                // Ensure at least 2 trainers
                const numberOfTrainersNeeded = 2 - matchingTrainers.length;
                if (numberOfTrainersNeeded > 0) {
                    // Create additional trainers if not enough available
                    for (let j = 0; j < numberOfTrainersNeeded; j++) {
                        const newTrainer = await Trainer.create({
                            name: faker.person.firstName(),
                            surname: faker.person.lastName(),
                            gender: faker.helpers.arrayElement(['Male', 'Female']),
                            ageGroup: faker.helpers.arrayElement(ageGroups),
                            description: faker.lorem.paragraph(),
                            avatar: faker.image.avatar(),
                            userRating: faker.number.int({ min: 1, max: 5 }),
                            specialization: faker.helpers.arrayElement(['Serve Techniques', 'Footwork Drills', 'Match Strategy']),
                            level: service.level,
                            hourlyRate: parseFloat(faker.commerce.price({ min: 30, max: 150, dec: 2 })),
                            categoryId: subCategory.categoryId,
                            subcategoryId: subCategory.id,
                            yearsOfExperience: faker.number.int({ min: 1, max: 25 }),
                            certification: faker.helpers.arrayElement(['Certified Professional Trainer', 'First Aid Certified', 'Advanced Coaching Techniques Certificate']),
                            skills: ['Mastering groundstrokes', 'Controlling the court', 'Mastering the serve'],
                        });
                        matchingTrainers.push(newTrainer);
                    }
                }

                for (const trainer of matchingTrainers.slice(0, 2)) { // Assign only 2 trainers per service
                    await ServiceTrainer.create({
                        serviceId: service.id,
                        trainerId: trainer.id
                    });
                }
            }
        }

        console.log('Sample services and default trainers created successfully!');
    } catch (error) {
        console.error('Error creating sample services and service details:', error);
        throw error;
    }
};


// Function to create sample reviews for each trainer
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

// Function to create service types with pictures and price per hour
const createServiceTypes = async () => {
    try {
        const serviceTypesData = [
            {
                name: 'Basic',
                pricePerHour: 50,
                picture: faker.image.imageUrl(640, 480, 'service', true) // Generate a random image
            },
            {
                name: 'Pro',
                pricePerHour: 70,
                picture: faker.image.imageUrl(640, 480, 'service', true) // Generate a random image
            },
            {
                name: 'Expert',
                pricePerHour: 100,
                picture: faker.image.imageUrl(640, 480, 'service', true) // Generate a random image
            },
            {
                name: 'Enterprise',
                pricePerHour: 130,
                picture: faker.image.imageUrl(640, 480, 'service', true) // Generate a random image
            }
        ];

        await ServiceType.bulkCreate(serviceTypesData, { ignoreDuplicates: true });

        console.log('Service types with pictures created successfully!');
    } catch (error) {
        console.error('Error creating service types:', error);
        throw error;
    }
};


// Run all functions to seed the database
const seedDatabase = async () => {
    try {
        await sequelize.sync();

        console.log('Emptying relevant tables...');
        await emptyDatabase();

        // Creating service types with prices
        console.log('Creating service types...');
        await createServiceTypes(); // Create service types with hourly rates

        console.log('Creating categories and subcategories...');
        await createCategoriesAndSubCategories();

        console.log('Creating users...');
        await createSampleUsers();

        console.log('Creating trainers...');
        await createSampleTrainers();

        console.log('Creating services and service details...');
        await createSampleServices();

        console.log('Creating reviews...');
        await createSampleReviews();
    } catch (error) {
        console.error('Error syncing database or creating sample data:', error);
    } finally {
        sequelize.close();
    }
};

seedDatabase();
