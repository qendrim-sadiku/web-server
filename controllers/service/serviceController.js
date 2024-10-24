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

// Get all services by category with filters
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
      ageGroup,
    } = req.query;

    // Fetch the main category details
    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Build a query object for filtering services
    const serviceQuery = {};
    if (level) {
      serviceQuery.level = level;
    }
    if (type) {
      serviceQuery.type = type; // Filter by service type (e.g., 'Online', 'Meeting-Point')
    }
    if (search) {
      serviceQuery[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    // Build a query object for filtering trainers
    const trainerQuery = {};
    if (trainerId) {
      trainerQuery['$Trainers.id$'] = trainerId;
    }
    if (gender) {
      trainerQuery.gender = gender;
    }
    if (yearsOfExperience) {
      const experienceRange = yearsOfExperience.split('-');
      const minExperience = parseInt(experienceRange[0], 10);
      const maxExperience = parseInt(experienceRange[1], 10);

      trainerQuery.yearsOfExperience = {
        [Op.between]: [minExperience, maxExperience],
      };
    }
    if (ageGroup) {
      trainerQuery.ageGroup = ageGroup; // Apply the age group filter
    }

    // Fetch subcategories and their services
    const subCategories = await SubCategory.findAll({
      where: { categoryId: categoryId },
      include: {
        model: Service,
        where: serviceQuery,
        include: [
          {
            model: Trainer,
            where:
              Object.keys(trainerQuery).length > 0 ? trainerQuery : undefined, // Apply trainer filters only if provided
            attributes: [
              'id',
              'name',
              'gender',
              'yearsOfExperience',
              'ageGroup',
            ], // Include ageGroup in the attributes
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
              'serviceImage', // Include serviceImage
            ],
          },
        ],
      },
    });

    // Filter subcategories if subCategoryName is provided
    const filteredSubCategories = subCategoryName
      ? subCategories.filter(
          (subCategory) => subCategory.name === subCategoryName
        )
      : subCategories;

    const result = {
      categoryName: category.name,
      subCategories: filteredSubCategories.map((subCategory) => ({
        id: subCategory.id,
        name: subCategory.name,
        services: subCategory.Services.map((service) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          image: service.image,
          duration: service.duration,
          hourlyRate: service.hourlyRate,
          level: service.level,
          subCategoryId: subCategory.id,
          type: service.type, // Include the type in the response
          subCategoryName: subCategory.name,
          trainers: service.Trainers.map((trainer) => ({
            id: trainer.id,
            name: trainer.name,
            gender: trainer.gender,
            yearsOfExperience: trainer.yearsOfExperience,
            ageGroup: trainer.ageGroup, // Include age group in the response
          })),
          details: service.ServiceDetail,
        })),
      })),
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get subcategory by category with filters
exports.getSubcategoryByCategory = async (req, res) => {
  try {
    const { categoryId, subCategoryId } = req.params;
    const { gender, yearsOfExperience, type, search, level, ageGroup } =
      req.query;

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
    if (type) {
      serviceQuery.type = type; // Filter by service type (e.g., 'Online', 'Meeting-Point')
    }
    if (level) {
      serviceQuery.level = level; // Filter by level
    }
    if (search) {
      serviceQuery[Op.or] = [
        { name: { [Op.like]: `%${search}%` } }, // Search by name
        { description: { [Op.like]: `%${search}%` } }, // Search by description
      ];
    }

    // Build the trainer query
    const trainerQuery = {};
    if (gender) {
      trainerQuery.gender = gender.trim(); // Filter by gender
    }
    if (yearsOfExperience) {
      const experienceRange = yearsOfExperience.split('-');
      const minExperience = parseInt(experienceRange[0], 10);
      const maxExperience = parseInt(experienceRange[1], 10);
      trainerQuery.yearsOfExperience = {
        [Op.between]: [minExperience, maxExperience], // Filter by years of experience range
      };
    }
    if (ageGroup) {
      trainerQuery.ageGroup = ageGroup; // Apply the age group filter
    }

    // Find the services under the subcategory and apply filters
    const services = await Service.findAll({
      where: { subCategoryId: subCategoryId, ...serviceQuery },
      attributes: [
        'id',
        'name',
        'description',
        'image',
        'duration',
        'hourlyRate',
        'level',
        'type',
      ],
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
        {
          model: Trainer,
          where:
            Object.keys(trainerQuery).length > 0 ? trainerQuery : undefined, // Apply trainer filters only if they exist
          attributes: [
            'id',
            'name',
            'gender',
            'yearsOfExperience',
            'ageGroup',
          ], // Include ageGroup in the attributes
        },
      ],
    });

    // Check if any services were found
    if (services.length === 0) {
      return res.status(200).json({
        categoryName: category.name,
        subCategory: {
          id: subCategory.id,
          name: subCategory.name,
          services: [], // Return an empty list if no services were found
        },
      });
    }

    // Prepare the result with services
    const result = {
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
          type: service.type, // Include the type in the response
          details: service.ServiceDetail,
          trainers: service.Trainers.map((trainer) => ({
            id: trainer.id,
            name: trainer.name,
            gender: trainer.gender,
            yearsOfExperience: trainer.yearsOfExperience,
            ageGroup: trainer.ageGroup, // Include age group in the response
          })),
        })),
      },
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching subcategory:', error.message);
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

// Get all services with optional filtering
exports.getAllServices = async (req, res) => {
  try {
    const {
      gender,
      yearsOfExperience,
      serviceType,
      ageGroup,
      searchQuery,
    } = req.query;

    // Build the query object for services
    const serviceQuery = {};
    if (serviceType) {
      serviceQuery.serviceTypeId = serviceType;
    }

    // If searchQuery is provided, search by name, level, and category
    if (searchQuery) {
      serviceQuery[Op.or] = [
        { name: { [Op.like]: `%${searchQuery}%` } }, // Search by service name
        { level: { [Op.like]: `%${searchQuery}%` } }, // Search by service level
        { '$SubCategory.name$': { [Op.like]: `%${searchQuery}%` } }, // Search by subcategory name
        { '$SubCategory.Category.name$': { [Op.like]: `%${searchQuery}%` } }, // Search by category name
      ];
    }

    // Build the query object for trainer filters
    const trainerQuery = {};
    if (gender) {
      trainerQuery.gender = gender;
    }

    if (yearsOfExperience) {
      const experienceRange = yearsOfExperience.split('-');
      const minExperience = parseInt(experienceRange[0], 10);
      const maxExperience = parseInt(experienceRange[1], 10);

      trainerQuery.yearsOfExperience = {
        [Op.between]: [minExperience, maxExperience],
      };
    }

    if (ageGroup) {
      trainerQuery.ageGroup = ageGroup; // Ensure ageGroup is used correctly here
    }

    // Fetch services with optional filtering
    const services = await Service.findAll({
      where: serviceQuery, // Apply service filters if provided
      include: [
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
        {
          model: Trainer,
          where:
            Object.keys(trainerQuery).length > 0 ? trainerQuery : undefined, // Apply trainer filters only if provided
          attributes: [
            'id',
            'name',
            'gender',
            'yearsOfExperience',
            'ageGroup',
          ],
          through: { attributes: [] }, // Exclude join table attributes
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
      type: service.type, // Include the type in the response
      trainers: service.Trainers.map((trainer) => ({
        id: trainer.id,
        name: trainer.name,
        gender: trainer.gender,
        yearsOfExperience: trainer.yearsOfExperience,
        ageGroup: trainer.ageGroup, // Ensure ageGroup is displayed correctly
      })),
      details: service.ServiceDetail,
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
exports.getMultipleServicesByIds = async (req, res) => {
  try {
    const { ids } = req.query; // Expecting service IDs as a query parameter (e.g., ?ids=1,2,3)

    // Convert ids from a string to an array of numbers
    const idsArray = ids ? ids.split(',').map(Number) : [];

    console.log('Received IDs:', idsArray); // Log the parsed IDs

    // Ensure that idsArray is not empty
    if (!Array.isArray(idsArray) || idsArray.length === 0) {
      return res.status(400).json({ error: 'No service IDs provided' });
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
    if (services.length === 0) {
      return res
        .status(404)
        .json({ error: 'No services found for the given IDs' });
    }

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
