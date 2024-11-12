const UserInterest = require('../models/UserInterest');
const {Service} = require('../models/Services/Service');
const SubCategory = require('../models/Category/SubCategory');
const User = require('../models/User');

// 1. Show all services for a specific subcategory, including service image
exports.showServicesBySubCategory = async (req, res) => {
    try {
      const { subCategoryId } = req.params;
      const services = await Service.findAll({
        where: { subCategoryId },
        attributes: ['id', 'name', 'description', 'image'],
        limit: 6 // Limit to 6 services
      });
      res.status(200).json(services);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch services for the subcategory' });
    }
  };
  
// 2. Add a service to user interests
exports.addServiceToInterest = async (req, res) => {
  try {
    const { userId, serviceId } = req.body;
    const existingInterest = await UserInterest.findOne({ where: { userId, serviceId } });

    if (existingInterest) {
      return res.status(400).json({ message: 'Service already added to interests' });
    }

    await UserInterest.create({ userId, serviceId });
    res.status(201).json({ message: 'Service added to interests' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add service to interests' });
  }
};

// 3. Remove a service from user interests
exports.removeServiceFromInterest = async (req, res) => {
  try {
    const { userId, serviceId } = req.body;
    await UserInterest.destroy({ where: { userId, serviceId } });
    res.status(200).json({ message: 'Service removed from interests' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove service from interests' });
  }
};

// 4. Show all interests for a user
// 4. Show all interests for a user, including service image
exports.showUserInterests = async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findByPk(userId, {
        include: [
          {
            model: Service,
            as: 'interests',
            attributes: ['id', 'name', 'description', 'image'], // Include image attribute
            include: {
              model: SubCategory,
              attributes: ['name'] // Include subcategory details
            }
          }
        ]
      });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.status(200).json(user.interests);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user interests' });
    }
  };
  
