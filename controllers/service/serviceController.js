const { Op } = require('sequelize');
const Category = require('../../models/Category/Category');
const SubCategory = require('../../models/Category/SubCategory');
const { Service, ServiceTrainer } = require('../../models/Services/Service');
const Trainer = require('../../models/Trainer/Trainer');
const ServiceDetails = require('../../models/Services/ServiceDetails');

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
          attributes: ['fullDescription', 'highlights', 'whatsIncluded', 'whatsNotIncluded', 'recommendations', 'coachInfo'],
        }
      ]
    });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all services by category with enhanced filtering
exports.getAllServicesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { level, trainerId, subCategoryName, search } = req.query;

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
    if (trainerId) {
      serviceQuery['$Trainers.id$'] = trainerId;
    }
    if (search) {
      serviceQuery[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Fetch subcategories and their services
    const subCategories = await SubCategory.findAll({
      where: { categoryId: categoryId },
      include: {
        model: Service,
        where: serviceQuery,
        include: [{
          model: Trainer, // Include trainers to enable trainer filtering
          attributes: [],
          through: { attributes: [] }
        }]
      }
    });

    // If subCategoryName is provided, filter subcategories by name
    const filteredSubCategories = subCategoryName 
      ? subCategories.filter(subCategory => subCategory.name === subCategoryName)
      : subCategories;

    const result = {
      categoryName: category.name,
      subCategories: filteredSubCategories.map(subCategory => ({
        id: subCategory.id,
        name: subCategory.name,
        services: subCategory.Services.map(service => ({
          id: service.id,
          name: service.name,
          description: service.description,
          image: service.image,
          duration: service.duration,
          hourlyRate: service.hourlyRate,
          level: service.level,
          subCategoryId: subCategory.id,
          subCategoryName: subCategory.name
        }))
      }))
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get subcategory by category
exports.getSubcategoryByCategory = async (req, res) => {
  try {
    const { categoryId, subCategoryId } = req.params;
    console.log('Category ID:', categoryId);
    console.log('SubCategory ID:', subCategoryId);

    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const subCategory = await SubCategory.findOne({
      where: { id: subCategoryId, categoryId: categoryId },
      include: [{
        model: Service,
        attributes: ['id', 'name', 'description', 'image', 'duration', 'hourlyRate', 'level'], 
        include: [{
          model: ServiceDetails,
          attributes: ['fullDescription', 'highlights', 'whatsIncluded', 'whatsNotIncluded', 'recommendations', 'coachInfo'],
        }]
      }]
    });

    if (!subCategory) {
      console.log('SubCategory not found with ID:', subCategoryId);
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    const result = {
      categoryName: category.name,
      subCategory: {
        id: subCategory.id,
        name: subCategory.name,
        services: subCategory.Services.map(service => ({
          id: service.id,
          name: service.name,
          description: service.description,
          image: service.image,
          duration: service.duration,
          hourlyRate: service.hourlyRate,
          level: service.level,
          details: service.ServiceDetails
        }))
      }
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
          attributes: ['fullDescription', 'highlights', 'whatsIncluded', 'whatsNotIncluded', 'recommendations', 'coachInfo'],
        }
      ]
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

// Get trainers for a specific service
exports.getTrainersForService = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id, { include: Trainer });
    if (service) {
      res.status(200).json(service.Trainers);
    } else {
      res.status(404).json({ message: 'Service not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all services
exports.getAllServices = async (req, res) => {
  try {
    const services = await Service.findAll({
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
          attributes: ['id', 'name'],
          through: { attributes: [] },
        },
        {
          model: ServiceDetails,
          attributes: ['fullDescription', 'highlights', 'whatsIncluded', 'whatsNotIncluded', 'recommendations', 'coachInfo'],
        }
      ],
    });

    const result = services.map(service => ({
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
      trainers: service.Trainers.map(trainer => ({
        id: trainer.id,
        name: trainer.name,
      })),
      details: service.ServiceDetails
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
          attributes: ['fullDescription', 'highlights', 'whatsIncluded', 'whatsNotIncluded', 'recommendations', 'coachInfo']
        }
      ]
    });

    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while filtering services' });
  }
};

// In your service controller
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
        id: { [Op.ne]: serviceId } // Exclude the current service
      },
      limit: 10 // Limit the number of results
    });

    res.status(200).json(similarServices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
