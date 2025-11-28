// Import necessary modules and models
const { Op } = require('sequelize');
const Category = require('../../models/Category/Category');
const SubCategory = require('../../models/Category/SubCategory');
const { Service, ServiceTrainer } = require('../../models/Services/Service');
const ServiceAddress = require('../../models/Services/ServiceAddress');
const Trainer = require('../../models/Trainer/Trainer');
const ServiceDetails = require('../../models/Services/ServiceDetails');
const ServiceType = require('../../models/Services/ServiceType');
const { enhancedSearch, getSearchSuggestions } = require('../../util/fuzzySearch');
const { convertZipCodeToCity, getZipCodeSuggestions, validateZipCode } = require('../../services/locationService');
const RecentSearch = require('../../models/RecentSearch ');

// Create a new service
exports.createService = async (req, res) => {
  try {
    const { trainerIds, serviceDetails, liveSession, serviceAddress, ...serviceData } = req.body;

    const service = await Service.create({
      ...serviceData,
      liveSession: Boolean(liveSession), // default false if not provided
    });

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
        serviceId: service.id,
        fullDescription: serviceDetails.fullDescription,
        highlights: serviceDetails.highlights || [],
        whatsIncluded: serviceDetails.whatsIncluded || [],
        whatsNotIncluded: serviceDetails.whatsNotIncluded || [],
        recommendations: serviceDetails.recommendations || [],
        whatsToBring: serviceDetails.whatsToBring || [],
        coachInfo: serviceDetails.coachInfo,
        serviceImage: serviceDetails.serviceImage || [],
      });
    }

    // Create ServiceAddress if provided
    if (serviceAddress) {
      await ServiceAddress.create({
        serviceId: service.id,
        street: serviceAddress.street,
        city: serviceAddress.city,
        state: serviceAddress.state,
        zipCode: serviceAddress.zipCode,
        country: serviceAddress.country || 'US',
        latitude: serviceAddress.latitude,
        longitude: serviceAddress.longitude,
        addressType: serviceAddress.addressType || 'meeting_point',
        instructions: serviceAddress.instructions
      });
    }

    res.status(201).json(service);
  } catch (error) {
    console.error('createService error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get services by subcategory (you named it "ByCategory", but it takes subCategoryId)
exports.getServicesByCategory = async (req, res) => {
  try {
    const services = await Service.findAll({
      where: { subCategoryId: req.params.subCategoryId },
      attributes: [
        'id','name','description','image','duration','hourlyRate','level','type',
        'liveSession', // 👈 ensure present
      ],
      include: [
        { model: Trainer },
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
    });
    res.status(200).json(services);
  } catch (error) {
    console.error('getServicesByCategory error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAllServicesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const {
      trainerId,
      subCategoryName,
      search,
      gender,
      yearsOfExperience,
      type,
      ageGroup
    } = req.query;

    const category = await Category.findByPk(categoryId);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const serviceQuery = {};
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

    const trainerQuery = {};
    if (trainerId) trainerQuery['$Trainers.id$'] = trainerId;
    if (gender) trainerQuery.gender = gender;
    if (yearsOfExperience) {
      const [min, max] = yearsOfExperience.split('-').map(n => parseInt(n, 10));
      trainerQuery.yearsOfExperience = { [Op.between]: [min, max] };
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
            attributes: ['id','name','gender','yearsOfExperience','ageGroup'],
            through: { attributes: [] },
          },
          {
            model: ServiceDetails,
            attributes: [
              'fullDescription','highlights','whatsIncluded','whatsNotIncluded',
              'recommendations','coachInfo','serviceImage'
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
        services: subCategory.Services.map((service) => {
          // Create time variations for each service
          const timeVariations = [
            { time: "09:00", available: true },
            { time: "10:00", available: true },
            { time: "11:00", available: true },
            { time: "14:00", available: true },
            { time: "15:00", available: true },
            { time: "16:00", available: true },
            { time: "17:00", available: true },
            { time: "18:00", available: true }
          ];

          return {
            id: service.id,
            name: service.name,
            description: service.description,
            image: service.image,
            duration: service.duration,
            hourlyRate: service.hourlyRate,
            type: service.type,
            liveSession: Boolean(service.liveSession),
            timeSlots: timeVariations,
            trainers: service.Trainers.map((trainer) => ({
              id: trainer.id,
              name: trainer.name,
              gender: trainer.gender,
              yearsOfExperience: trainer.yearsOfExperience,
              ageGroup: trainer.ageGroup,
            })),
            details: service.ServiceDetail,
          };
        }),
      })),
    });
  } catch (error) {
    console.error('getAllServicesByCategory error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getSubcategoryByCategory = async (req, res) => {
  try {
    const { categoryId, subCategoryId } = req.params;
    const { gender, yearsOfExperience, type, search, level, ageGroup } = req.query;

    const category = await Category.findByPk(categoryId);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const subCategory = await SubCategory.findOne({
      where: { id: subCategoryId, categoryId }
    });
    if (!subCategory) return res.status(404).json({ error: 'Subcategory not found' });

    const serviceQuery = {};
    if (type)  serviceQuery.type  = type;
    if (level) serviceQuery.level = level;
    if (search) {
      serviceQuery[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    const trainerQuery = {};
    if (gender) trainerQuery.gender = gender.trim();
    if (yearsOfExperience) {
      const [min, max] = yearsOfExperience.split('-').map(n => parseInt(n, 10));
      trainerQuery.yearsOfExperience = { [Op.between]: [min, max] };
    }
    if (ageGroup) trainerQuery.ageGroup = ageGroup;

    const services = await Service.findAll({
      where: { subCategoryId, ...serviceQuery },
      attributes: [
        'id','name','description','image','duration','hourlyRate','level','type',
        'liveSession','tags', // 👈 include it
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
            'serviceImage',
          ],
        },
        {
          model: Trainer,
          where: Object.keys(trainerQuery).length > 0 ? trainerQuery : undefined,
          attributes: ['id','name','gender','yearsOfExperience','ageGroup'],
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
          liveSession: Boolean(service.liveSession), // 👈 add to payload
          details: service.ServiceDetail,
          trainers: service.Trainers.map((t) => ({
            id: t.id,
            name: t.name,
            gender: t.gender,
            yearsOfExperience: t.yearsOfExperience,
            ageGroup: t.ageGroup,
          })),
        })),
      },
    });
  } catch (error) {
    console.error('getSubcategoryByCategory error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get a single service by ID
exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id, {
      attributes: [
        'id','name','description','image','duration','hourlyRate','level','type',
        'liveSession','tags', // 👈 include it
      ],
      include: [
        { model: Trainer },
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
    });
    if (service) {
      res.status(200).json(service);
    } else {
      res.status(404).json({ message: 'Service not found' });
    }
  } catch (error) {
    console.error('getServiceById error:', error);
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

    // Build base query without search
    const serviceQuery = {};
    if (type && type !== 'undefined')  serviceQuery.type  = type;
    if (level && level !== 'undefined') serviceQuery.level = level;

    const trainerQuery = {};
    if (gender && gender !== 'undefined') trainerQuery.gender = gender.trim();
    if (yearsOfExperience && yearsOfExperience !== 'undefined') {
      const [min, max] = yearsOfExperience.split('-').map(n => parseInt(n, 10));
      trainerQuery.yearsOfExperience = { [Op.between]: [min, max] };
    }
    if (ageGroup && ageGroup !== 'undefined') trainerQuery.ageGroup = ageGroup;

    // First, get all services that match the non-search filters
    let allServices = await Service.findAll({
      where: serviceQuery,
      attributes: [
        'id','name','description','image','duration','hourlyRate','level','type',
        'liveSession','tags',
      ],
      include: [
        {
          model: Trainer,
          where: Object.keys(trainerQuery).length > 0 ? trainerQuery : undefined,
          attributes: ['id','name','gender','yearsOfExperience','ageGroup'],
        },
        {
          model: SubCategory,
          attributes: ['id','name','categoryId'],
          include: [{ model: Category, attributes: ['id','name'] }],
        },
      ],
    });

    let filteredServices = allServices;
    let searchSuggestions = [];

    // Apply search logic if searchQuery is provided
    if (searchQuery.trim() !== '') {
      // Convert Sequelize instances to plain objects for fuzzy search
      const servicesData = allServices.map(service => service.toJSON());
      
      // Use enhanced search (exact match first, then fuzzy)
      const searchResults = enhancedSearch(servicesData, searchQuery.trim());
      
      if (searchResults.exactMatches.length > 0) {
        // Use exact matches
        filteredServices = searchResults.exactMatches;
      } else if (searchResults.fuzzyMatches.length > 0) {
        // Use fuzzy matches, sorted by relevance score
        filteredServices = searchResults.fuzzyMatches
          .sort((a, b) => a._fuzzyScore - b._fuzzyScore)
          .slice(0, 20); // Limit to top 20 fuzzy matches
      } else {
        // No matches found, get suggestions
        searchSuggestions = getSearchSuggestions(servicesData, searchQuery.trim(), 5);
        filteredServices = [];
      }
    }

    // Build unique subcategories with categoryId
    const subMap = new Map();
    const normalizedServices = filteredServices.map(svc => {
      const sc = svc.SubCategory;
      const categoryId = sc?.categoryId ?? sc?.Category?.id ?? null;

      if (sc && !subMap.has(sc.id)) {
        subMap.set(sc.id, { id: sc.id, name: sc.name, categoryId });
      }

      const json = svc.toJSON ? svc.toJSON() : svc;
      return {
        ...json,
        categoryId,
        tags: json.tags || null, // Explicitly include tags field
      };
    });

    const subcategories = Array.from(subMap.values());

    // If searching, enforce a deterministic relevance sort so exact phrase
    // matches like "Football Conditioning" appear first even when tags like
    // "ball" exist on other services.
    let sortedServices = normalizedServices;
    if (searchQuery && searchQuery.trim() !== '') {
      const phrase = searchQuery.trim().toLowerCase();
      const rank = (svc) => {
        const name = (svc.name || '').toLowerCase();
        const desc = (svc.description || '').toLowerCase();
        const tags = Array.isArray(svc.tags) ? svc.tags.map(t => (t || '').toLowerCase()) : [];
        const sub  = (svc.SubCategory?.name || '').toLowerCase();
        const cat  = (svc.SubCategory?.Category?.name || '').toLowerCase();

        if (name === phrase) return 0;              // exact name match
        if (name.startsWith(phrase)) return 1;      // name starts with
        if (name.includes(phrase)) return 2;        // name contains
        if (tags.some(t => t === phrase)) return 3; // exact tag match
        if (tags.some(t => t.includes(phrase))) return 4; // tag contains
        if (desc.includes(phrase)) return 5;        // description contains
        if (sub.includes(phrase)) return 6;         // subcategory contains
        if (cat.includes(phrase)) return 7;         // category contains
        return 100;                                  // fallback
      };
      sortedServices = [...normalizedServices].sort((a, b) => rank(a) - rank(b));
    }

    // Prepare response
    const response = { 
      services: sortedServices, 
      subcategories 
    };

    // Add search suggestions if no results found
    if (searchQuery.trim() !== '' && normalizedServices.length === 0 && searchSuggestions.length > 0) {
      response.searchSuggestions = searchSuggestions;
      response.message = `No exact matches found for "${searchQuery}". Did you mean one of these?`;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('getAllServices error:', error);
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
    const { ids } = req.query;

    if (!ids) {
      return res.status(400).json({ error: 'No service IDs provided in the query parameters.' });
    }

    const idsArray = ids
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => !isNaN(id));

    if (idsArray.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty service IDs provided.' });
    }

    const services = await Service.findAll({
      where: { id: { [Op.in]: idsArray } },
      attributes: [
        'id','name','description','image','duration','hourlyRate','level','type',
        'liveSession','tags', // 👈 include it
      ],
      include: [
        {
          model: Trainer,
          attributes: ['id','name'],
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
        {
          model: SubCategory,
          attributes: ['id','name'],
          include: [{ model: Category, attributes: ['id','name'] }],
        },
      ],
    });

    if (!services || services.length === 0) {
      return res.status(404).json({ error: 'No services found for the given IDs.' });
    }

    const result = services.map((service) => ({
      id: service.id,
      name: service.name,
      type: service.type,
      description: service.description,
      image: service.image,
      duration: service.duration,
      hourlyRate: service.hourlyRate,
      level: service.level,
      subCategoryId: service.SubCategory?.id,
      subCategoryName: service.SubCategory?.name,
      categoryId: service.SubCategory?.Category?.id,
      categoryName: service.SubCategory?.Category?.name,
      liveSession: Boolean(service.liveSession), // 👈 add to payload
      trainers: service.Trainers.map((trainer) => ({
        id: trainer.id,
        name: trainer.name,
      })),
      // fix: use ServiceDetail (Sequelize default singular alias), not "detail"
      serviceImage: service.ServiceDetail?.serviceImage || [],
      details: service.ServiceDetail,
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('getMultipleServicesByIds error:', error);
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
// Lightweight service info for detail page / hero
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
        'type',
        'liveSession','tags', // 👈 include it
      ],
      include: [{
        model: ServiceDetails,
        attributes: [
          'serviceImage',
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

    const detail = svc.ServiceDetail || {};
    const payload = {
      id:           svc.id,
      name:         svc.name,
      type:         svc.type,
      level:        svc.level,
      description:  svc.description,
      image:        svc.image,
      duration:     svc.duration,
      hourlyRate:   svc.hourlyRate,

      // 👇 NEW
      liveSession:  Boolean(svc.liveSession),

      serviceImages:  detail.serviceImage || [],
      fullDescription: detail.fullDescription || '',
      highlights:      detail.highlights || [],
      whatsIncluded:   detail.whatsIncluded || [],
      whatsNotIncluded:detail.whatsNotIncluded || [],
      recommendations: detail.recommendations || [],
      coachInfo:       detail.coachInfo || ''
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


exports.getServicesBySubCategoryName = async (req, res) => {
  try {
    const { subCategoryName } = req.query;

    if (!subCategoryName) {
      return res.status(400).json({ error: 'subCategoryName is required' });
    }

    // Fetch subcategory
    const subCategory = await SubCategory.findOne({ where: { name: subCategoryName } });
    if (!subCategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    const services = await Service.findAll({
      where: { subCategoryId: subCategory.id },
      include: [
        {
          model: Trainer,
          attributes: ['id', 'name', 'gender', 'yearsOfExperience', 'ageGroup'],
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
    });

    res.status(200).json(services);
  } catch (error) {
    console.error('Error fetching services by subCategoryName:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getServicesBySubCategoryWithFilters = async (req, res) => {
  try {
    const { subCategoryId } = req.params;
    let { searchQuery = '', gender, yearsOfExperience, type, ageGroup } = req.query;

    searchQuery = searchQuery && searchQuery !== 'undefined' ? searchQuery : null;
    type        = type        && type        !== 'undefined' ? type        : null;
    gender      = gender      && gender      !== 'undefined' ? gender      : null;
    yearsOfExperience = yearsOfExperience && yearsOfExperience !== 'undefined' ? yearsOfExperience : null;
    ageGroup    = ageGroup    && ageGroup    !== 'undefined' ? ageGroup    : null;

    const serviceQuery = { subCategoryId };
    if (searchQuery) {
      serviceQuery[Op.or] = [
        { name: { [Op.like]: `%${searchQuery}%` } },
        { description: { [Op.like]: `%${searchQuery}%` } },
      ];
    }
    if (type) serviceQuery.type = type;

    const trainerQuery = {};
    if (gender) trainerQuery.gender = gender.trim();
    if (yearsOfExperience) {
      const [min, max] = yearsOfExperience.split('-').map(Number);
      trainerQuery.yearsOfExperience = { [Op.between]: [min, max] };
    }
    if (ageGroup) trainerQuery.ageGroup = ageGroup;

    const services = await Service.findAll({
      where: serviceQuery,
      attributes: [
        'id','name','description','image','duration','hourlyRate','level','type',
        'liveSession','tags', // 👈 include it
      ],
      include: [
        {
          model: Trainer,
          where: Object.keys(trainerQuery).length > 0 ? trainerQuery : undefined,
          attributes: ['id','name','gender','yearsOfExperience','ageGroup'],
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
    });

    res.status(200).json(services);
  } catch (error) {
    console.error('getServicesBySubCategoryWithFilters error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get services by multiple subcategory IDs
exports.getServicesByMultipleSubCategories = async (req, res) => {
  try {
    const { subCategoryIds } = req.query;
    let { searchQuery = '', gender, yearsOfExperience, type, ageGroup } = req.query;

    // Validate subCategoryIds parameter
    if (!subCategoryIds) {
      return res.status(400).json({ error: 'subCategoryIds parameter is required' });
    }

    // Parse subCategoryIds - handle both single ID and comma-separated IDs
    let subCategoryIdsArray;
    if (typeof subCategoryIds === 'string') {
      subCategoryIdsArray = subCategoryIds
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id));
    } else {
      subCategoryIdsArray = [parseInt(subCategoryIds, 10)];
    }

    if (subCategoryIdsArray.length === 0) {
      return res.status(400).json({ error: 'Invalid subCategoryIds provided' });
    }

    // Clean up query parameters
    searchQuery = searchQuery && searchQuery !== 'undefined' ? searchQuery : null;
    type = type && type !== 'undefined' ? type : null;
    gender = gender && gender !== 'undefined' ? gender : null;
    yearsOfExperience = yearsOfExperience && yearsOfExperience !== 'undefined' ? yearsOfExperience : null;
    ageGroup = ageGroup && ageGroup !== 'undefined' ? ageGroup : null;

    // Build service query
    const serviceQuery = { 
      subCategoryId: { [Op.in]: subCategoryIdsArray } 
    };
    
    if (searchQuery) {
      serviceQuery[Op.or] = [
        { name: { [Op.like]: `%${searchQuery}%` } },
        { description: { [Op.like]: `%${searchQuery}%` } },
      ];
    }
    if (type) serviceQuery.type = type;

    // Build trainer query
    const trainerQuery = {};
    if (gender) trainerQuery.gender = gender.trim();
    if (yearsOfExperience) {
      const [min, max] = yearsOfExperience.split('-').map(Number);
      trainerQuery.yearsOfExperience = { [Op.between]: [min, max] };
    }
    if (ageGroup) trainerQuery.ageGroup = ageGroup;

    // Fetch services
    const services = await Service.findAll({
      where: serviceQuery,
      attributes: [
        'id','name','description','image','duration','hourlyRate','level','type',
        'liveSession','subCategoryId','tags'
      ],
      include: [
        {
          model: Trainer,
          where: Object.keys(trainerQuery).length > 0 ? trainerQuery : undefined,
          attributes: ['id','name','gender','yearsOfExperience','ageGroup'],
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
        }
      ],
    });

    res.status(200).json(services);
  } catch (error) {
    console.error('getServicesByMultipleSubCategories error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get services by zip code (meeting point services only)
exports.getServicesByZipCode = async (req, res) => {
  try {
    const { zipCode, countryCode } = req.query;
    
    if (!zipCode) {
      return res.status(400).json({ error: 'Zip code is required' });
    }

    // Convert zip code to city information (with optional country code for disambiguation)
    const cityInfo = await convertZipCodeToCity(zipCode, countryCode || null);
    
    if (!cityInfo) {
      const suggestions = await getZipCodeSuggestions(zipCode.substring(0, 3));
      let message = `The zip code ${zipCode} does not exist or is not recognized`;
      
      if (countryCode) {
        message += ` in ${countryCode}`;
      } else {
        message += '. Try adding a countryCode parameter (e.g., ?zipCode=40000&countryCode=US) to disambiguate';
      }
      
      return res.status(400).json({ 
        error: 'InvalidZipCode',
        message,
        isValid: false,
        suggestions: suggestions,
        hint: !countryCode ? 'Add countryCode parameter to search within a specific country' : null
      });
    }

  // Try to persist user's last ZIP searches (keep last 3 unique)
  try {
    const userId = req.user?.id || req.query.userId;
    if (userId) {
      const normalized = `ZIP:${zipCode}`;
      const existing = await RecentSearch.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
      });
      const zipEntries = existing.filter(r => typeof r.query === 'string' && r.query.startsWith('ZIP:'));
      const duplicate = zipEntries.find(r => r.query === normalized);
      if (duplicate) {
        await duplicate.destroy();
      }
      const toDelete = zipEntries.slice(2);
      for (const del of toDelete) {
        await del.destroy();
      }
      await RecentSearch.create({ userId, query: normalized });
    }
  } catch (e) {
    console.warn('recent-zip save warning:', e.message);
  }

  // Find services with meeting point addresses in the city
    const services = await Service.findAll({
      attributes: [
        'id','name','description','image','duration','hourlyRate','level','type',
        'liveSession','tags'
      ],
      include: [
        {
          model: ServiceAddress,
          where: {
            city: cityInfo.city,
            state: cityInfo.state,
            addressType: 'meeting_point',
            isActive: true
          },
          attributes: ['street', 'city', 'state', 'zipCode', 'instructions']
        },
        {
          model: Trainer,
          attributes: ['id','name','gender','yearsOfExperience','ageGroup']
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
            'serviceImage'
          ]
        },
        {
          model: SubCategory,
          attributes: ['id','name'],
          include: [{ model: Category, attributes: ['id','name'] }]
        }
      ]
    });

    // Check if no services found
    if (services.length === 0) {
      return res.status(200).json({
        zipCode,
        city: cityInfo.city,
        state: cityInfo.state,
        country: cityInfo.country,
        fullAddress: cityInfo.fullAddress,
        coordinates: cityInfo.coordinates,
        totalServices: 0,
        services: [],
        message: `No services found in ${cityInfo.city}, ${cityInfo.state} ${zipCode}`,
        suggestions: [
          "Try searching in nearby areas",
          "Check if you have the correct zip code",
          "Services might be available in surrounding cities"
        ]
      });
    }

    res.status(200).json({
      zipCode,
      city: cityInfo.city,
      state: cityInfo.state,
      country: cityInfo.country,
      fullAddress: cityInfo.fullAddress,
      coordinates: cityInfo.coordinates,
      totalServices: services.length,
      services: services.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        image: service.image,
        duration: service.duration,
        hourlyRate: service.hourlyRate,
        level: service.level,
        type: service.type,
        liveSession: Boolean(service.liveSession),
        tags: service.tags,
        address: service.ServiceAddress,
        trainers: service.Trainers,
        details: service.ServiceDetail,
        subCategory: service.SubCategory
      }))
    });

  } catch (error) {
    console.error('getServicesByZipCode error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get zip code suggestions
exports.getZipCodeSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const suggestions = await getZipCodeSuggestions(q);
    
    res.status(200).json({
      query: q,
      suggestions: suggestions.slice(0, 10) // Limit to 10 suggestions
    });

  } catch (error) {
    console.error('getZipCodeSuggestions error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Validate zip code
exports.validateZipCode = async (req, res) => {
  try {
    const { zipCode, countryCode } = req.query;
    
    if (!zipCode) {
      return res.status(400).json({ error: 'Zip code is required' });
    }

    const isValid = await validateZipCode(zipCode, countryCode || null);
    const cityInfo = isValid ? await convertZipCodeToCity(zipCode, countryCode || null) : null;
    
    res.status(200).json({
      zipCode,
      isValid,
      cityInfo: cityInfo ? {
        city: cityInfo.city,
        state: cityInfo.state,
        country: cityInfo.country,
        fullAddress: cityInfo.fullAddress
      } : null
    });

  } catch (error) {
    console.error('validateZipCode error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get recent ZIP codes for a user (last 3, unique)
exports.getRecentZipCodes = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const limit = parseInt(req.query.limit || '3', 10);

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const recents = await RecentSearch.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    const zips = recents
      .map(r => (typeof r.query === 'string' ? r.query : ''))
      .filter(q => q.startsWith('ZIP:'))
      .map(q => q.replace('ZIP:', ''))
      .filter((zip, idx, arr) => arr.indexOf(zip) === idx)
      .slice(0, limit);

    return res.status(200).json({ userId, zips });
  } catch (error) {
    console.error('getRecentZipCodes error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update service address
exports.updateServiceAddress = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const addressData = req.body;

    // Check if service exists
    const service = await Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Find existing address or create new one
    let serviceAddress = await ServiceAddress.findOne({ where: { serviceId } });
    
    if (serviceAddress) {
      // Update existing address
      await serviceAddress.update(addressData);
    } else {
      // Create new address
      serviceAddress = await ServiceAddress.create({
        serviceId,
        ...addressData
      });
    }

    res.status(200).json({
      message: 'Service address updated successfully',
      address: serviceAddress
    });

  } catch (error) {
    console.error('updateServiceAddress error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get service address
exports.getServiceAddress = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const serviceAddress = await ServiceAddress.findOne({
      where: { serviceId },
      include: [{
        model: Service,
        attributes: ['id', 'name']
      }]
    });

    if (!serviceAddress) {
      return res.status(404).json({ error: 'Service address not found' });
    }

    res.status(200).json(serviceAddress);

  } catch (error) {
    console.error('getServiceAddress error:', error);
    res.status(500).json({ error: error.message });
  }
};

