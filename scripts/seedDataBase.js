const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize'); // Adjust the path as necessary
const { faker } = require('@faker-js/faker'); // Ensure this is the correct import
const Category = require('../models/Category/Category'); // Adjust the path as necessary
const SubCategory = require('../models/Category/SubCategory'); // Adjust the path as necessary
const { Service, ServiceTrainer } = require('../models/Services/Service'); // Adjust the path as necessary
const ServiceDetails = require('../models/Services/ServiceDetails'); // Add this import
const Trainer = require('../models/Trainer/Trainer'); // Adjust the path as necessary
const Booking = require('../models/Bookings/Booking'); // Add this import
const Review = require('../models/Trainer/Review'); // Add this import
const User = require('../models/User'); // Add this import if you have a User model

// Define service names for different subcategories
const serviceNames = {
    'Tennis': ['Beginner Tennis Lessons', 'Advanced Serve Techniques', 'Tennis Footwork Drills', 'Doubles Strategy Training'],
    'Football': ['Youth Football Training', 'Advanced Goalkeeping', 'Tactical Play Sessions', 'Football Conditioning'],
    'Basketball': ['Beginner Throwing Techniques', 'Advanced Dribbling Skills', 'Basketball Defense Strategies', 'Shooting Accuracy Drills'],
    'Volleyball': ['Beginner Volleyball Drills', 'Advanced Spiking Techniques', 'Team Coordination Training', 'Volleyball Defense Skills'],
    'Painting': ['Intro to Watercolors', 'Advanced Oil Painting', 'Abstract Art Techniques', 'Portrait Painting'],
    'Contemporary': ['Modern Art Styles', 'Contemporary Sculpture', 'Mixed Media Art', 'Conceptual Art Techniques'],
    'Sculpture': ['Beginner Clay Modeling', 'Advanced Stone Carving', 'Metal Sculpture Techniques', 'Sculptural Installation'],
    'Abstract': ['Abstract Expressionism', 'Geometric Abstraction', 'Non-representational Art', 'Color Theory in Abstract Art'],
    'Shopper': ['Personal Shopping Assistant', 'Wardrobe Makeover', 'Gift Shopping Services', 'Home Décor Shopping'],
    'Handyman': ['General Home Repairs', 'Electrical Fixes', 'Plumbing Services', 'Furniture Assembly'],
    'Cleaning': ['Residential Cleaning', 'Office Cleaning', 'Deep Cleaning Services', 'Move-In/Move-Out Cleaning'],
    'Pet care': ['Dog Walking', 'Pet Sitting', 'Pet Grooming', 'Behavioral Training']
};

// Function to create a URL-friendly keyword string
const toKeyword = (title) => title.toLowerCase().split(' ').join('+');

// Function to empty only the necessary tables, excluding users and keeping bookings table intact
const emptyDatabase = async () => {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });
    await ServiceTrainer.destroy({ where: {}, truncate: true });
    await ServiceDetails.destroy({ where: {}, truncate: true });
    await Trainer.destroy({ where: {}, truncate: true });
    await Service.destroy({ where: {}, truncate: true });
    await SubCategory.destroy({ where: {}, truncate: true });
    await Category.destroy({ where: {}, truncate: true });
    await Booking.destroy({ where: {}, truncate: true }); // This empties only the bookings table
    await Review.destroy({ where: {}, truncate: true }); // Add this to empty the reviews table
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
        throw error; // Rethrow to stop execution
    }
};

// Function to create sample trainers
const createSampleTrainers = async () => {
    try {
        const categories = await Category.findAll();
        const subCategories = await SubCategory.findAll();

        if (categories.length === 0 || subCategories.length === 0) {
            throw new Error('No categories or subcategories found in the database.');
        }

        for (let i = 0; i < 100; i++) { // Create more trainers
            const subCategory = faker.helpers.arrayElement(subCategories);
            let specialization;

            // Ensure specialization is always assigned based on the subcategory
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
                    specialization = 'General Service'; // Fallback specialization if no subcategory matches
                    break;
            }

            // Create the trainer with new fields for skills, yearsOfExperience, and certification
            await Trainer.create({
                name: faker.person.firstName(),
                surname: faker.person.lastName(),
                description: faker.lorem.paragraph(),
                avatar: faker.image.avatar(),
                userRating: faker.number.int({ min: 1, max: 5 }),
                specialization, // Now guaranteed to have a value
                level: faker.helpers.arrayElement(['Beginner', 'Advanced', 'Pro']),
                hourlyRate: parseFloat(faker.commerce.price({ min: 30, max: 150, dec: 2 })),
                categoryId: subCategory.categoryId,
                subcategoryId: subCategory.id,
                image: faker.image.url(640, 480, 'people', true, true),
                yearsOfExperience: faker.number.int({ min: 1, max: 25 }), // Random experience between 1 and 25 years
                certification: faker.helpers.arrayElement([
                    'Certified Professional Trainer', 
                    'First Aid Certified', 
                    'Advanced Coaching Techniques Certificate'
                ]), // Random certification
                skills: ['Mastering groundstrokes', 'Controlling the court', 'Mastering the serve'], // Example skills
            });
        }

        console.log('Sample trainers created successfully!');

    } catch (error) {
        console.error('Error creating sample trainers:', error);
        throw error; // Rethrow to stop execution
    }
};

// Function to create sample services with random images and service details
const createSampleServices = async () => {
    try {
        const subCategories = await SubCategory.findAll();
        const trainers = await Trainer.findAll();

        if (subCategories.length === 0) {
            throw new Error('No subcategories found in the database.');
        }

        if (trainers.length === 0) {
            throw new Error('No trainers found in the database.');
        }

        for (const subCategory of subCategories) {
            const subCategoryName = subCategory.name;
            const names = serviceNames[subCategoryName] || ['General Service'];

            for (let i = 0; i < 5; i++) { // Create 5 services per subcategory
                const serviceName = faker.helpers.arrayElement(names);
                
                // Create a service with random image and details
                const service = await Service.create({
                    name: serviceName,
                    description: faker.lorem.sentences(3),
                    duration: 60, // Set duration to 1 hour (60 minutes)
                    level: faker.helpers.arrayElement(['Beginner', 'Advanced', 'Pro']),
                    subCategoryId: subCategory.id,
                    hourlyRate: parseFloat(faker.commerce.price({ min: 30, max: 150, dec: 2 })),
                    image: faker.image.url(640, 480, 'service', true, true)
                });

                // Add service details
                await ServiceDetails.create({
                    serviceId: service.id,
                    fullDescription: faker.lorem.paragraphs(2),
                    highlights: [faker.lorem.sentence(), faker.lorem.sentence()],
                    whatsIncluded: [faker.lorem.word(), faker.lorem.word()],
                    whatsNotIncluded: [faker.lorem.word()],
                    recommendations: [faker.lorem.sentence()],
                    whatsToBring: [faker.lorem.sentence()],
                    coachInfo: faker.lorem.sentence(),
                });

                // Assign 2 to 3 trainers to each service
                const matchingTrainers = trainers.filter(trainer => 
                    trainer.subcategoryId === subCategory.id && 
                    trainer.level === service.level
                );

                const numberOfTrainers = Math.min(faker.number.int({ min: 2, max: 3 }), matchingTrainers.length);

                for (let j = 0; j < numberOfTrainers; j++) {
                    const trainer = matchingTrainers[j];
                    await ServiceTrainer.create({
                        serviceId: service.id,
                        trainerId: trainer.id
                    });
                }
            }
        }

        console.log('Sample services and service details created successfully!');
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
            // Create 3 to 4 random reviews for each trainer
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

// Run all functions to seed the database
const seedDatabase = async () => {
    try {
        await sequelize.sync(); // Ensure all tables are created if they don't exist

        console.log('Emptying relevant tables...');
        await emptyDatabase();

        console.log('Creating categories and subcategories...');
        await createCategoriesAndSubCategories();
        
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
