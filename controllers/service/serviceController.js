const Category = require('../../models/Category/Category');
const SubCategory = require('../../models/Category/SubCategory');
const {Service,ServiceTrainer} = require('../../models/Services/Service');
const Trainer = require('../../models/Trainer/Trainer');
const { Op } = require('sequelize');

// Create a new service
exports.createService = async (req, res) => {
  try {
    const { trainerIds, ...serviceData } = req.body;
    const service = await Service.create(serviceData);

    console.log(req.body);

    if (trainerIds && trainerIds.length > 0) {
      const serviceTrainers = trainerIds.map(trainerId => ({
        serviceId: service.id,
        trainerId
      }));
      await ServiceTrainer.bulkCreate(serviceTrainers);
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
      include: Trainer
    });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all services by category
exports.getAllServicesByCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    // Fetch the main category details
    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Fetch subcategories and their services
    const subCategories = await SubCategory.findAll({
      where: { categoryId: categoryId },
      include: {
        model: Service
      }
    });

    const result = {
      categoryName: category.name,
      subCategories: subCategories.map(subCategory => ({
        id: subCategory.id,
        name: subCategory.name,
        services: subCategory.Services.map(service => ({
          id: service.id,
          name: service.name,
          description: service.description,
          image: service.image,
          duration: service.duration,
          hourlyRate: service.hourlyRate,
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

// Get all subcategories by category
exports.getAllSubcategoriesByCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    // Fetch the main category details
    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Fetch subcategories and their services
    const subCategories = await SubCategory.findAll({
      where: { categoryId: categoryId },
      include: {
        model: Service,
        attributes: ['id', 'name', 'description', 'image', 'duration', 'hourlyRate']
      }
    });

    const result = {
      categoryName: category.name,
      subCategories: subCategories.map(subCategory => ({
        id: subCategory.id,
        name: subCategory.name,
        services: subCategory.Services.map(service => ({
          id: service.id,
          name: service.name,
          description: service.description,
          image: service.image,
          duration: service.duration,
          hourlyRate: service.hourlyRate,
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

// Get a single service by ID
exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id, { include: Trainer });
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
          through: { attributes: [] }, // Assuming many-to-many relationship without including junction table attributes
        },
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
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.filterServices = async (req, res) => {
  try {
    const { level, subCategoryName, search } = req.query;

    // Define the query options
    const queryOptions = {
      where: {},
      include: [
        {
          model: SubCategory,
          attributes: ['id', 'name'],
          where: {},
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
          through: { attributes: [] }, // Assuming many-to-many relationship without including junction table attributes
        },
      ],
    };

    // Add level filter if provided
    if (level) {
      queryOptions.where.level = level;
    }

    // Add subCategoryName filter if provided
    if (subCategoryName) {
      queryOptions.include[0].where.name = subCategoryName;
    }

    // Add search filter for name or description
    if (search) {
      queryOptions.where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    // Fetch the services from the database with the filters applied
    const services = await Service.findAll(queryOptions);

    // Format the result
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
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('Error filtering services:', error);
    res.status(500).json({ error: 'An error occurred while filtering services' });
  }
};