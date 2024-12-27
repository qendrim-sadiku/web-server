const UserInterest = require('../models/UserInterest');
const {Service} = require('../models/Services/Service');
const SubCategory = require('../models/Category/SubCategory');
const User = require('../models/User');

// 1. Show all services for a specific subcategory, including service image
// exports.showServicesBySubCategory = async (req, res) => {
//   try {
//       const { subCategoryId } = req.params;
//       const { page = 1, limit = 6, showAll } = req.query; // Extract query parameters

//       // Default limit for showing services or the specified limit
//       const itemsPerPage = showAll ? parseInt(limit) : 6;

//       // Calculate offset for pagination
//       const offset = (parseInt(page) - 1) * itemsPerPage;

//       // Query services with pagination if showAll is true
//       const options = {
//           where: { subCategoryId },
//           attributes: ['id', 'name', 'description', 'image'],
//           limit: itemsPerPage,
//           offset: showAll ? offset : 0,
//       };

//       const services = await Service.findAndCountAll(options);

//       // Prepare pagination metadata
//       const totalPages = showAll ? Math.ceil(services.count / itemsPerPage) : 1;

//       res.status(200).json({
//           services: services.rows,
//           pagination: showAll ? {
//               currentPage: parseInt(page),
//               totalPages,
//               totalItems: services.count
//           } : null
//       });
//   } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: 'Failed to fetch services for the subcategory' });
//   }
// };

exports.showServicesBySubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params;
    const { showAll = 'false', page = 1, limit = 6 } = req.query; // Default limit for non-showAll mode

    const queryOptions = {
      where: { subCategoryId },
      attributes: ['id', 'name', 'description', 'image'],
    };

    if (showAll === 'true') {
      // Apply pagination for "See All" mode
      const offset = (page - 1) * limit;
      queryOptions.limit = parseInt(limit, 10);
      queryOptions.offset = offset;
    } else {
      // Default limit for the initial view
      queryOptions.limit = 6;
    }

    const services = await Service.findAndCountAll(queryOptions);

    res.status(200).json({
      services: services.rows,
      pagination: {
        totalItems: services.count,
        totalPages: Math.ceil(services.count / limit),
        currentPage: parseInt(page, 10),
      },
    });
  } catch (error) {
    console.error(error);
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
  
