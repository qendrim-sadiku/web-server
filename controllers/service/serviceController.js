// Import necessary modules and models
const { Op } = require('sequelize');
const Category = require('../../models/Category/Category');
const SubCategory = require('../../models/Category/SubCategory');
const { Service, ServiceTrainer } = require('../../models/Services/Service');
const Trainer = require('../../models/Trainer/Trainer');
const ServiceDetails = require('../../models/Services/ServiceDetails');
const ServiceType = require('../../models/Services/ServiceType');

// Create a new service
exports.createService = async (req, res) => {
  try {
    const { trainerIds, serviceDetails, ...serviceData } = req.body;
    const service = await Service.create(serviceData);

    // Create ServiceTrainer relationships
    if (trainerIds && trainerIds.length > 0) {
      const serviceTrainers = trainerIds.map(trainerId => ({
        serviceId: service.id,
        trainerId
      }));
      await ServiceTrainer.bulkCreate(serviceTrainers);
    }

    // Create ServiceDetails if provided
    if (serviceDetails) {
      await ServiceDetails.create({
        serviceId: service.id, // Link service to serviceDetails
        fullDescription: serviceDetails.fullDescription,
        highlights: serviceDetails.highlights || [], // Ensure it's an array
        whatsIncluded: serviceDetails.whatsIncluded || [], // Ensure it's an array
        whatsNotIncluded: serviceDetails.whatsNotIncluded || [], // Ensure it's an array
        recommendations: serviceDetails.recommendations || [], // Ensure it's an array
        whatsToBring: serviceDetails.whatsToBring || [], // Ensure it's an array
        coachInfo: serviceDetails.coachInfo,
        serviceImage: serviceDetails.serviceImage || [], // Include serviceImage
      });
    }

    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log(error);
  }
};

// Get services by subcategory and level
exports.getServicesByCategory = async (req, res) => {
  try {
    const services = await Service.findAll({
      where: { subCategoryId: req.params.subCategoryId, level: req.query.level },
      include: [
        {
          model: Trainer,
        },
        {
          model: ServiceDetails,
          attributes: [
            'fullDescription',
            'highlights',
            'whatsIncluded',
            'whatsNotIncluded',
            'recommendations',
            'coachInfo',
            'serviceImage', // Include serviceImage
          ],
        },
      ],
    });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getAllServicesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const {
      level,
      trainerId,
      subCategoryName,
      search,
      gender,
      yearsOfExperience,
      type,
      ageGroup
    } = req.query;

    // Fetch the main category details
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Build the query for filtering services
    const serviceQuery = {};
    if (level) serviceQuery.level = level;
    if (type) serviceQuery.type = type;

    if (search) {
      const matchingSubCategories = await SubCategory.findAll({
        where: { categoryId, name: { [Op.like]: `%${search}%` } },
        attributes: ['id'],
      });
      const matchingSubCategoryIds = matchingSubCategories.map(sc => sc.id);

      serviceQuery[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
      if (matchingSubCategoryIds.length > 0) {
        serviceQuery[Op.or].push({ subCategoryId: { [Op.in]: matchingSubCategoryIds } });
      }
    }

    // Build trainer filtering criteria
    const trainerQuery = {};
    if (trainerId) trainerQuery['$Trainers.id$'] = trainerId;
    if (gender) trainerQuery.gender = gender;
    if (yearsOfExperience) {
      const experienceRange = yearsOfExperience.split('-');
      trainerQuery.yearsOfExperience = {
        [Op.between]: [parseInt(experienceRange[0]), parseInt(experienceRange[1])],
      };
    }
    if (ageGroup) trainerQuery.ageGroup = ageGroup;

    const subCategories = await SubCategory.findAll({
      where: { categoryId },
      include: {
        model: Service,
        where: serviceQuery,
        required: false,
        include: [
          {
            model: Trainer,
            where: Object.keys(trainerQuery).length > 0 ? trainerQuery : undefined,
            attributes: ['id', 'name', 'gender', 'yearsOfExperience', 'ageGroup'],
            through: { attributes: [] },
          },
          {
            model: ServiceDetails,
            attributes: [
              'fullDescription',
              'highlights',
              'whatsIncluded',
              'whatsNotIncluded',
              'recommendations',
              'coachInfo',
              'serviceImage',
            ],
          },
        ],
      },
    });

    res.status(200).json({
      categoryName: category.name,
      subCategories: subCategories.map((subCategory) => ({
        id: subCategory.id,
        name: subCategory.name,
        totalServices: subCategory.Services.length,
        services: subCategory.Services.map((service) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          image: service.image,
          duration: service.duration,
          hourlyRate: service.hourlyRate,
          level: service.level,
          type: service.type,
          trainers: service.Trainers.map((trainer) => ({
            id: trainer.id,
            name: trainer.name,
            gender: trainer.gender,
            yearsOfExperience: trainer.yearsOfExperience,
            ageGroup: trainer.ageGroup,
          })),
          details: service.ServiceDetail,
        })),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getSubcategoryByCategory = async (req, res) => {
  try {
    const { categoryId, subCategoryId } = req.params;
    const { gender, yearsOfExperience, type, search, level, ageGroup } = req.query;

    // Fetch the main category
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Fetch the subcategory
    const subCategory = await SubCategory.findOne({
      where: { id: subCategoryId, categoryId: categoryId },
    });
    if (!subCategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    // Build the service query
    const serviceQuery = {};
    if (type) serviceQuery.type = type;
    if (level) serviceQuery.level = level;
    if (search) {
      serviceQuery[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    // Build the trainer query
    const trainerQuery = {};
    if (gender) trainerQuery.gender = gender.trim();
    if (yearsOfExperience) {
      const experienceRange = yearsOfExperience.split('-');
      trainerQuery.yearsOfExperience = {
        [Op.between]: [parseInt(experienceRange[0]), parseInt(experienceRange[1])],
      };
    }
    if (ageGroup) trainerQuery.ageGroup = ageGroup;

    const services = await Service.findAll({
      where: { subCategoryId: subCategoryId, ...serviceQuery },
      attributes: ['id', 'name', 'description', 'image', 'duration', 'hourlyRate', 'level', 'type'],
      include: [
        {
          model: ServiceDetails,
          attributes: [
            'fullDescription',
            'highlights',
            'whatsIncluded',
            'whatsNotIncluded',
            'recommendations',
            'coachInfo',
            'serviceImage',
          ],
        },
        {
          model: Trainer,
          where: Object.keys(trainerQuery).length > 0 ? trainerQuery : undefined,
          attributes: ['id', 'name', 'gender', 'yearsOfExperience', 'ageGroup'],
        },
      ],
    });

    res.status(200).json({
      categoryName: category.name,
      subCategory: {
        id: subCategory.id,
        name: subCategory.name,
        services: services.map((service) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          image: service.image,
          duration: service.duration,
          hourlyRate: service.hourlyRate,
          level: service.level,
          type: service.type,
          details: service.ServiceDetail,
          trainers: service.Trainers.map((trainer) => ({
            id: trainer.id,
            name: trainer.name,
            gender: trainer.gender,
            yearsOfExperience: trainer.yearsOfExperience,
            ageGroup: trainer.ageGroup,
          })),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// Get a single service by ID
exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id, {
      include: [
        {
          model: Trainer,
        },
        {
          model: ServiceDetails,
          attributes: [
            'fullDescription',
            'highlights',
            'whatsIncluded',
            'whatsNotIncluded',
            'recommendations',
            'coachInfo',
            'serviceImage', // Include serviceImage
          ],
        },
      ],
    });
    if (service) {
      res.status(200).json(service);
    } else {
      res.status(404).json({ message: 'Service not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get trainers for a specific service with filters
exports.getTrainersForService = async (req, res) => {
  try {
    // Fetch the service by its ID and include associated trainers
    const service = await Service.findByPk(req.params.id, {
      include: {
        model: Trainer,
        through: {
          attributes: [], // Keep the association between Service and Trainer intact without adding extra info
        },
      },
    });

    // If the service is not found, return a 404 error
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const { serviceTypeId, defaultTrainerId } = service;

    let trainers = service.Trainers;

    // Fetch the service type to determine if it's "Basic"
    const serviceType = await ServiceType.findByPk(serviceTypeId);

    if (!serviceType) {
      return res.status(404).json({ message: 'Service type not found' });
    }

    // If the service type is not "Basic", filter out the default trainer
    if (serviceType.name !== 'Basic') {
      trainers = trainers.filter(
        (trainer) => trainer.id !== defaultTrainerId
      );
    }

    // Optional filters
    const { ageGroup, gender, yearsOfExperience } = req.query; // Expect yearsOfExperience in the query

    // Filter by age group if provided
    if (ageGroup) {
      trainers = trainers.filter((trainer) => trainer.ageGroup === ageGroup);
    }

    // Filter by gender if provided
    if (gender) {
      trainers = trainers.filter((trainer) => trainer.gender === gender);
    }

    // Filter by years of experience if provided
    if (yearsOfExperience) {
      const [minYears, maxYears] = yearsOfExperience
        .split('-')
        .map((year) => parseInt(year, 10));
      trainers = trainers.filter(
        (trainer) =>
          trainer.yearsOfExperience >= minYears &&
          trainer.yearsOfExperience <= maxYears
      );
    }

    // Include full trainer details, including the ageGroup and yearsOfExperience, in the response
    res.status(200).json(trainers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// exports.getAllServices = async (req, res) => {
//   try {
//     const {
//       searchQuery = '', // Search query
//       page = 1, // Current page (default to 1)
//       limit = 10, // Limit per page (default to 10)
//     } = req.query;

//     // Ensure page and limit are integers
//     const parsedPage = parseInt(page, 10);
//     const parsedLimit = parseInt(limit, 10);

//     // Calculate offset for pagination
//     const offset = (parsedPage - 1) * parsedLimit;

//     // Build the query object
//     const serviceQuery = {};
//     if (searchQuery) {
//       serviceQuery[Op.or] = [
//         { name: { [Op.like]: `%${searchQuery}%` } },
//         { level: { [Op.like]: `%${searchQuery}%` } },
//       ];
//     }

//     // Fetch services with total count
//     const { count, rows } = await Service.findAndCountAll({
//       where: serviceQuery, // Filters
//       limit: parsedLimit, // Apply limit
//       offset: offset, // Apply offset
//     });

//     // Calculate total pages
//     const totalPages = Math.ceil(count / parsedLimit);

//     // Return response
//     res.status(200).json({
//       totalItems: count,
//       totalPages: totalPages,
//       currentPage: parsedPage,
//       data: rows, // Services for the current page
//     });
//   } catch (error) {
//     console.error('Error fetching services:', error);
//     res.status(500).json({ error: error.message });
//   }
// };




exports.getAllServices = async (req, res) => {
  try {
    const {
      searchQuery = '',
      gender,
      yearsOfExperience,
      type,
      level,
      ageGroup,
    } = req.query;

    // Build the service query
    const serviceQuery = {};

    // Check if searchQuery exists and is not empty
    if (searchQuery.trim() !== '') {
      serviceQuery[Op.or] = [
        { name: { [Op.like]: `%${searchQuery}%` } },
        { description: { [Op.like]: `%${searchQuery}%` } },
      ];
    }

    // Check if filtering by type or level
    if (type) serviceQuery.type = type;
    if (level) serviceQuery.level = level;

    // Build the trainer query
    const trainerQuery = {};
    if (gender) trainerQuery.gender = gender.trim();
    if (yearsOfExperience) {
      const experienceRange = yearsOfExperience.split('-');
      trainerQuery.yearsOfExperience = {
        [Op.between]: [parseInt(experienceRange[0]), parseInt(experienceRange[1])],
      };
    }
    if (ageGroup) trainerQuery.ageGroup = ageGroup;

    // Fetch services with filters
    const services = await Service.findAll({
      where: serviceQuery,
      include: [
        {
          model: Trainer,
          where: Object.keys(trainerQuery).length > 0 ? trainerQuery : undefined,
          attributes: ['id', 'name', 'gender', 'yearsOfExperience', 'ageGroup'],
        },
      ],
    });

    res.status(200).json(services);
  } catch (error) {
    console.error('Error fetching services:', error.message);
    res.status(500).json({ error: error.message });
  }
};




// exports.getAllServices = async (req, res) => {
//   try {
//     const {
//       searchQuery = '', // Search query
//       page = 1, // Current page (default to 1)
//       limit = 10, // Limit per page (default to 10)
//       gender, // Gender filter
//       yearsOfExperience, // Experience range filter
//       type, // Service type filter
//       level, // Level filter
//       ageGroup, // Age group filter
//     } = req.query;

//     // Ensure page and limit are integers
//     const parsedPage = parseInt(page, 10);
//     const parsedLimit = parseInt(limit, 10);

//     // Calculate offset for pagination
//     const offset = (parsedPage - 1) * parsedLimit;

//     // Build the service query object
//     const serviceQuery = {};
//     if (type) {
//       serviceQuery.type = type; // Filter by service type
//     }
//     if (level) {
//       serviceQuery.level = level; // Filter by level
//     }
//     if (searchQuery) {
//       serviceQuery[Op.or] = [
//         { name: { [Op.like]: `%${searchQuery}%` } }, // Search by name
//         { description: { [Op.like]: `%${searchQuery}%` } }, // Search by description
//       ];
//     }

//     // Build the trainer query object
//     const trainerQuery = {};
//     if (gender) {
//       trainerQuery.gender = gender.trim(); // Filter by gender
//     }
//     if (yearsOfExperience) {
//       const experienceRange = yearsOfExperience.split('-');
//       const minExperience = parseInt(experienceRange[0], 10);
//       const maxExperience = parseInt(experienceRange[1], 10);
//       trainerQuery.yearsOfExperience = {
//         [Op.between]: [minExperience, maxExperience], // Filter by years of experience range
//       };
//     }
//     if (ageGroup) {
//       trainerQuery.ageGroup = ageGroup; // Apply age group filter
//     }

//     // Fetch services with filters, pagination, and trainer inclusion
//     const { count, rows } = await Service.findAndCountAll({
//       where: serviceQuery, // Apply service filters
//       attributes: [
//         'id',
//         'name',
//         'description',
//         'image',
//         'duration',
//         'hourlyRate',
//         'level',
//         'type',
//       ],
//       include: [
//         {
//           model: Trainer,
//           where: Object.keys(trainerQuery).length > 0 ? trainerQuery : undefined,
//           attributes: ['id', 'name', 'gender', 'yearsOfExperience', 'ageGroup'],
//         },
//       ],
//       limit: parsedLimit, // Apply limit
//       offset: offset, // Apply offset
//       distinct: true, // Ensure accurate unique count
//     });

//     // Calculate total pages
//     const totalPages = Math.ceil(count / parsedLimit);

//     // Return response
//     res.status(200).json({
//       totalItems: count,
//       totalPages: totalPages,
//       currentPage: parsedPage,
//       data: rows.map((service) => ({
//         id: service.id,
//         name: service.name,
//         description: service.description,
//         image: service.image,
//         duration: service.duration,
//         hourlyRate: service.hourlyRate,
//         level: service.level,
//         type: service.type,
//         trainers: service.Trainers.map((trainer) => ({
//           id: trainer.id,
//           name: trainer.name,
//           gender: trainer.gender,
//           yearsOfExperience: trainer.yearsOfExperience,
//           ageGroup: trainer.ageGroup,
//         })),
//       })),
//     });
//   } catch (error) {
//     console.error('Error fetching services:', error.message);
//     res.status(500).json({ error: error.message });
//   }
// };




// Filter services with improved query
exports.filterServices = async (req, res) => {
  try {
    const { level, subCategoryName } = req.query;

    // Build a query object based on the parameters
    const query = {};
    if (level) {
      query.level = level;
    }
    if (subCategoryName) {
      query.subCategoryName = subCategoryName;
    }

    // Fetch the services from the database with the filters applied
    const services = await Service.findAll({
      where: query,
      include: [
        {
          model: ServiceDetails,
          attributes: [
            'fullDescription',
            'highlights',
            'whatsIncluded',
            'whatsNotIncluded',
            'recommendations',
            'coachInfo',
            'serviceImage', // Include serviceImage
          ],
        },
      ],
    });

    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({
      error: 'An error occurred while filtering services',
    });
  }
};

// Get similar services
exports.getSimilarServices = async (req, res) => {
  try {
    const { serviceId } = req.params;

    // Fetch the service details to get the subCategory and level
    const currentService = await Service.findByPk(serviceId);

    if (!currentService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Find similar services with the same subCategory and level, excluding the current service
    const similarServices = await Service.findAll({
      where: {
        subCategoryId: currentService.subCategoryId,
        level: currentService.level,
        id: { [Op.ne]: serviceId }, // Exclude the current service
      },
      limit: 10, // Limit the number of results
    });

    res.status(200).json(similarServices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get services provided by a specific trainer
exports.getServicesByTrainer = async (req, res) => {
  try {
    const { trainerId } = req.params;

    // Fetch services for the specified trainer
    const services = await Service.findAll({
      include: [
        {
          model: Trainer,
          where: { id: trainerId }, // Filter by trainerId
          attributes: ['id', 'name'],
          through: { attributes: [] }, // Exclude the join table attributes
        },
        {
          model: ServiceDetails,
          attributes: [
            'fullDescription',
            'highlights',
            'whatsIncluded',
            'whatsNotIncluded',
            'recommendations',
            'coachInfo',
            'serviceImage', // Include serviceImage
          ],
        },
        {
          model: SubCategory,
          attributes: ['id', 'name'],
          include: [
            {
              model: Category,
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });

    // Format the response
    const result = services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      image: service.image,
      duration: service.duration,
      hourlyRate: service.hourlyRate,
      level: service.level,
      subCategoryId: service.SubCategory.id,
      subCategoryName: service.SubCategory.name,
      categoryId: service.SubCategory.Category.id,
      categoryName: service.SubCategory.Category.name,
      trainers: service.Trainers.map((trainer) => ({
        id: trainer.id,
        name: trainer.name,
      })),
      details: service.ServiceDetail,
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get multiple services by an array of IDs using a GET request
// exports.getMultipleServicesByIds = async (req, res) => {
//   try {
//     const { ids } = req.query; // Expecting service IDs as a query parameter (e.g., ?ids=1,2,3)

//     // Convert ids from a string to an array of numbers
//     const idsArray = ids ? ids.split(',').map(Number) : [];

//     console.log('Received IDs:', idsArray); // Log the parsed IDs

//     // Ensure that idsArray is not empty
//     if (!Array.isArray(idsArray) || idsArray.length === 0) {
//       return res.status(400).json({ error: 'No service IDs provided' });
//     }

//     // Fetch services that match the provided IDs
//     const services = await Service.findAll({
//       where: {
//         id: { [Op.in]: idsArray }, // Sequelize's `Op.in` to match any of the given IDs
//       },
//       include: [
//         {
//           model: Trainer,
//           attributes: ['id', 'name'],
//         },
//         {
//           model: ServiceDetails,
//           attributes: [
//             'fullDescription',
//             'highlights',
//             'whatsIncluded',
//             'whatsNotIncluded',
//             'recommendations',
//             'coachInfo',
//             'serviceImage', // Include serviceImage
//           ],
//         },
//         {
//           model: SubCategory,
//           attributes: ['id', 'name'],
//           include: [
//             {
//               model: Category,
//               attributes: ['id', 'name'],
//             },
//           ],
//         },
//       ],
//     });

//     console.log('Found Services:', services); // Log the services retrieved

//     // Check if any services were found
//     if (services.length === 0) {
//       return res
//         .status(404)
//         .json({ error: 'No services found for the given IDs' });
//     }

//     // Format the response
//     const result = services.map((service) => ({
//       id: service.id,
//       name: service.name,
//       type: service.type, // Add type here

//       description: service.description,
//       image: service.image,
//       duration: service.duration,
//       hourlyRate: service.hourlyRate,
//       level: service.level,
//       subCategoryId: service.SubCategory.id,
//       subCategoryName: service.SubCategory.name,
//       categoryId: service.SubCategory.Category.id,
//       categoryName: service.SubCategory.Category.name,
//       trainers: service.Trainers.map((trainer) => ({
//         id: trainer.id,
//         name: trainer.name,
//       })),
//       details: service.ServiceDetail,
//     }));

//     res.status(200).json(result);
//   } catch (error) {
//     console.error('Error fetching services:', error.message); // Log any errors
//     res.status(500).json({ error: error.message });
//   }
// };

// Get multiple services by an array of IDs using a GET request
exports.getMultipleServicesByIds = async (req, res) => {
  try {
    const { ids } = req.query; // Expecting service IDs as a query parameter (e.g., ?ids=1,2,3)

    // Validate that `ids` exists and is not empty
    if (!ids) {
      return res.status(400).json({ error: 'No service IDs provided in the query parameters.' });
    }

    // Convert ids from a string to an array of numbers
    const idsArray = ids.split(',').map((id) => Number(id.trim())).filter((id) => !isNaN(id));

    console.log('Received IDs:', idsArray); // Log the parsed IDs

    // Ensure that idsArray is not empty after parsing
    if (idsArray.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty service IDs provided.' });
    }

    // Fetch services that match the provided IDs
    const services = await Service.findAll({
      where: {
        id: { [Op.in]: idsArray }, // Sequelize's `Op.in` to match any of the given IDs
      },
      include: [
        {
          model: Trainer,
          attributes: ['id', 'name'],
        },
        {
          model: ServiceDetails,
          attributes: [
            'fullDescription',
            'highlights',
            'whatsIncluded',
            'whatsNotIncluded',
            'recommendations',
            'coachInfo',
            'serviceImage', // Include serviceImage
          ],
        },
        {
          model: SubCategory,
          attributes: ['id', 'name'],
          include: [
            {
              model: Category,
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });

    console.log('Found Services:', services); // Log the services retrieved

    // Check if any services were found
    if (!services || services.length === 0) {
      return res.status(404).json({ error: 'No services found for the given IDs.' });
    }

    // Format the response
    const result = services.map((service) => ({
      id: service.id,
      name: service.name,
      type: service.type, // Add type here
      description: service.description,
      image: service.image,
      duration: service.duration,
      hourlyRate: service.hourlyRate,
      level: service.level,
      subCategoryId: service.SubCategory.id,
      subCategoryName: service.SubCategory.name,
      categoryId: service.SubCategory.Category.id,
      categoryName: service.SubCategory.Category.name,
      trainers: service.Trainers.map((trainer) => ({
        id: trainer.id,
        name: trainer.name,
      })),
      serviceImage:     service.detail?.serviceImage     || [] ,  // ← here are all your service images

      details: service.ServiceDetails, // Updated relationship name
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching services:', error.message); // Log any errors
    res.status(500).json({ error: error.message });
  }
};


// Fetch all service types
exports.getAllServiceTypes = async (req, res) => {
  try {
    const serviceTypes = await ServiceType.findAll();
    res.status(200).json(serviceTypes);
  } catch (error) {
    console.error('Error fetching service types:', error);
    res.status(500).json({ message: 'Failed to fetch service types' });
  }
};


// Get all trainers assigned to a specific service
exports.getTrainersByServiceId = async (req, res) => {
  try {
    const { serviceId } = req.params;

    // First, ensure the service exists
    const service = await Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Fetch trainers assigned via the pivot table
    const trainers = await Trainer.findAll({
      include: [
        {
          model: Service,
          where: { id: serviceId },
          attributes: [], // Don't include the service info
          through: { attributes: [] }, // Hide join table data
        },
      ],
      attributes: ['id', 'name', 'gender', 'yearsOfExperience', 'ageGroup'],
    });

    res.status(200).json({ serviceId, trainers });
  } catch (error) {
    console.error('Error fetching trainers for service:', error.message);
    res.status(500).json({ error: error.message });
  }
};


exports.getServiceInfo = async (req, res) => {
  try {
    const svc = await Service.findByPk(req.params.id, {
      attributes: [
        'id',
        'name',
        'description',
        'image',
        'duration',
        'hourlyRate',
        'level',
        'type'
      ],
      include: [{
        model: ServiceDetails,
        attributes: [
          'serviceImage',      // JSON array of gallery URLs
          'fullDescription',
          'highlights',
          'whatsIncluded',
          'whatsNotIncluded',
          'recommendations',
          'coachInfo'
        ]
      }]
    });

    if (!svc) return res.status(404).json({ error: 'Service not found' });

    // massage the JSON a bit so the client doesn’t have to dive into ServiceDetails
    const detail = svc.ServiceDetail || {};
    const payload = {
      id:           svc.id,
      name:         svc.name,
      type:         svc.type,
      level:        svc.level,
      description:  svc.description,
      image:        svc.image,           // hero / banner (optional column on Service)
      duration:     svc.duration,
      hourlyRate:   svc.hourlyRate,

      /* SHARED gallery (if you kept it) */
      serviceImages: detail.serviceImage || [],

      /* extra long‑form info */
      fullDescription: detail.fullDescription || '',
      highlights:      detail.highlights      || [],
      whatsIncluded:   detail.whatsIncluded   || [],
      whatsNotIncluded:detail.whatsNotIncluded|| [],
      recommendations: detail.recommendations || [],
      coachInfo:       detail.coachInfo       || ''
    };

    res.json(payload);
  } catch (err) {
    console.error('getServiceInfo error:', err);
    res.status(500).json({ error: 'Failed to fetch service info.' });
  }
};



// GET /api/services/category/:subCategoryId/all-no-filter
exports.getServicesBySubCategoryAll = async (req, res) => {
  try {
    const { subCategoryId } = req.params;

    const services = await Service.findAll({
      where: { subCategoryId },           // 🚫 no level / other filters
      include: [
        { model: Trainer },               // pull assigned trainers
        {
          model: ServiceDetails,          // pull long-form info
          attributes: [
            'fullDescription',
            'highlights',
            'whatsIncluded',
            'whatsNotIncluded',
            'recommendations',
            'coachInfo',
            'serviceImage'
          ]
        }
      ]
    });

    return res.status(200).json(services);
  } catch (err) {
    console.error('getServicesBySubCategoryAll:', err);
    return res.status(500).json({ error: err.message });
  }
};
