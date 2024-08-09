const Category = require('../../models/Category/Category');
const SubCategory = require('../../models/Category/SubCategory');
const {Service,ServiceTrainer} = require('../../models/Services/Service');
const Trainer = require('../../models/Trainer/Trainer');

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