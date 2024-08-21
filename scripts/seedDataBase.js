// seedDatabase.js
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize'); // Adjust the path as necessary
const { faker } = require('@faker-js/faker'); // Ensure this is the correct import
const Category = require('../models/Category/Category'); // Adjust the path as necessary
const SubCategory = require('../models/Category/SubCategory'); // Adjust the path as necessary
const { Service, ServiceTrainer } = require('../models/Services/Service'); // Adjust the path as necessary
const ServiceDetails = require('../models/Services/ServiceDetails'); // Add this import
const Trainer = require('../models/Trainer/Trainer'); // Adjust the path as necessary
const Booking = require('../models/Bookings/Booking'); // Add this import

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

            await Trainer.create({
                name: faker.person.firstName(),
                surname: faker.person.lastName(),
                description: faker.lorem.paragraph(),
                avatar: faker.image.avatar(),
                userRating: faker.number.int({ min: 1, max: 5 }),
                specialization,
                level: faker.helpers.arrayElement(['Beginner', 'Advanced', 'Pro']),
                hourlyRate: parseFloat(faker.commerce.price({ min: 30, max: 150, dec: 2 })),
                categoryId: subCategory.categoryId,
                subcategoryId: subCategory.id,
                image: faker.image.url(640, 480, 'people', true, true)
            });
        }

        console.log('Sample trainers created successfully!');

        // Verify trainers creation
        const trainerCount = await Trainer.count();
        console.log(`Total trainers created: ${trainerCount}`);

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

            for (let i = 0; i < 10; i++) { // Create more services
                const serviceName = faker.helpers.arrayElement(names);
                const keyword = toKeyword(serviceName);
                
                // Use a random image for services
                const randomImage = faker.image.url(640, 480, 'service', true, true);

                const service = await Service.create({
                    name: serviceName,
                    description: faker.lorem.sentences(3),
                    duration: 60, // Set duration to 1 hour (60 minutes)
                    level: faker.helpers.arrayElement(['Beginner', 'Advanced', 'Pro']),
                    subCategoryId: subCategory.id,
                    hourlyRate: parseFloat(faker.commerce.price({ min: 30, max: 150, dec: 2 })),
                    image: randomImage
                });

                // Create associated service details based on the screenshots
                if (subCategory.name === 'Tennis') {
                    await ServiceDetails.create({
                        serviceId: service.id,
                        fullDescription: "Tennis Coaches provide training to students who wish to learn how to play tennis, improve their tennis skills, or compete in tennis tournaments. They coordinate individual and group tennis lessons, develop training programs based on students' tennis skills, and evaluate students’ performance.",
                        highlights: [
                            "Accelerating Your Improvement, Coaches will find flaws in your game and help you fix them quicker than you could by yourself.",
                            "Proper technique, learning proper form is crucial for both effective and injury-free play.",
                            "Formulating the right game plan before tennis matches can make a huge difference in the outcome of your match.",
                            "One of the main roles of a tennis coach is to be a mentor. Coaches will teach you what you need to do to succeed, get you on the right mental path to success, and keep you motivated to train hard to reach your goals.",
                            "Increase confidence, boost self-assurance, making you more comfortable and competitive during matches."
                        ],
                        whatsIncluded: [
                            "Introduction",
                            "Footwork and movement drills",
                            "Practice drills",
                            "Warm-up exercises"
                        ],
                        whatsNotIncluded: [
                            "Tennis racket",
                            "Court fee"
                        ],
                        recommendations: [
                            "Accompanied by a parent"
                        ],
                        whatsToBring: [
                            "Tennis Rackets and tennis balls",
                            "Comfortable sneakers",
                            "Towel, water bottle",
                            "Sunscreen (optional)",
                            "Hat (optional)"
                        ],
                        coachInfo: "Coach John Doe is a professional tennis instructor with over 15 years of experience in training both beginners and advanced players."
                    });
                } else {
                    // For other services, use faker-generated service details
                    await ServiceDetails.create({
                        serviceId: service.id,
                        fullDescription: faker.lorem.paragraphs(2),
                        highlights: faker.lorem.sentences(2),
                        whatsIncluded: faker.lorem.sentences(2),
                        whatsNotIncluded: faker.lorem.sentence(),
                        recommendations: faker.lorem.sentences(2),
                        whatsToBring: faker.lorem.sentence(),
                        coachInfo: faker.lorem.sentence()
                    });
                }

                // Find trainers that match the category, subcategory, and level
                const matchingTrainers = trainers.filter(trainer =>
                    trainer.categoryId === subCategory.categoryId &&
                    trainer.subcategoryId === subCategory.id &&
                    trainer.level === service.level
                );

                // Assign more than one trainer to each service
                const numberOfTrainers = Math.min(faker.number.int({ min: 2, max: 5 }), matchingTrainers.length); // Ensure at least 2 trainers

                for (let j = 0; j < numberOfTrainers; j++) {
                    const trainer = matchingTrainers[j];

                    const existingEntry = await ServiceTrainer.findOne({
                        where: {
                            serviceId: service.id,
                            trainerId: trainer.id
                        }
                    });

                    if (!existingEntry) {
                        await ServiceTrainer.create({
                            serviceId: service.id,
                            trainerId: trainer.id
                        });
                    }
                }
            }
        }

        console.log('Sample services and service details created successfully!');
    } catch (error) {
        console.error('Error creating sample services and service details:', error);
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
    } catch (error) {
        console.error('Error syncing database or creating sample data:', error);
    } finally {
        sequelize.close();
    }
};

seedDatabase();
