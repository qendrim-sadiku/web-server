
// seedDatabase();
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize'); // Adjust the path as necessary
const { faker } = require('@faker-js/faker'); // Ensure this is the correct import
const Category = require('../models/Category/Category'); // Adjust the path as necessary
const SubCategory = require('../models/Category/SubCategory'); // Adjust the path as necessary
const { Service, ServiceTrainer } = require('../models/Services/Service'); // Adjust the path as necessary
const Trainer = require('../models/Trainer/Trainer'); // Adjust the path as necessary

const serviceNames = {
    'Tennis Coach': ['Beginner Tennis Lessons', 'Advanced Serve Techniques', 'Tennis Footwork Drills', 'Doubles Strategy Training'],
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

// Function to empty current data in the tables and skip foreign key constraints
const emptyDatabase = async () => {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });
    await ServiceTrainer.destroy({ where: {}, truncate: true });
    await Trainer.destroy({ where: {}, truncate: true });
    await Service.destroy({ where: {}, truncate: true });
    await SubCategory.destroy({ where: {}, truncate: true });
    await Category.destroy({ where: {}, truncate: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
    console.log('Database emptied successfully.');
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
            { name: 'Tennis Coach', categoryId: categories.find(cat => cat.name === 'Sport').id },
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
                case 'Tennis Coach':
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

// Function to create sample services
const createSampleServices = async () => {
    try {
        const subCategories = await SubCategory.findAll();
        const trainers = await Trainer.findAll();

        if (subCategories.length === 0) {
            console.error('No subcategories found in the database.');
            throw new Error('No subcategories found in the database.');
        }

        if (trainers.length === 0) {
            console.error('No trainers found in the database.');
            throw new Error('No trainers found in the database.');
        }

        console.log('Creating services with subcategories and trainers...');
        console.log(`Total subcategories: ${subCategories.length}`);
        console.log(`Total trainers: ${trainers.length}`);

        for (const subCategory of subCategories) {
            const subCategoryName = subCategory.name;
            const names = serviceNames[subCategoryName] || ['General Service'];

            for (let i = 0; i < 10; i++) { // Create more services
                const serviceName = faker.helpers.arrayElement(names);
                const service = await Service.create({
                    name: serviceName,
                    description: faker.lorem.sentences(3),
                    duration: 60, // Set duration to 1 hour (60 minutes)
                    level: faker.helpers.arrayElement(['Beginner', 'Advanced', 'Pro']),
                    subCategoryId: subCategory.id,
                    hourlyRate: parseFloat(faker.commerce.price({ min: 30, max: 150, dec: 2 })),
                    image: faker.image.imageUrl(undefined, undefined, 'business', true, true)
                });

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

        console.log('Sample services created successfully!');
    } catch (error) {
        console.error('Error creating sample services:', error);
        throw error; // Rethrow to stop execution
    }
};


// Run all functions to seed the database
const seedDatabase = async () => {
    try {
        await sequelize.sync(); // Ensure all tables are created if they don't exist

        console.log('Emptying current database...');
        await emptyDatabase();

        console.log('Creating categories and subcategories...');
        await createCategoriesAndSubCategories();
        
        console.log('Creating trainers...');
        await createSampleTrainers();
        
        console.log('Creating services...');
        await createSampleServices();
    } catch (error) {
        console.error('Error syncing database or creating sample data:', error);
    } finally {
        sequelize.close();
    }
};

seedDatabase();
