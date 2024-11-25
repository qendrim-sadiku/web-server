/**
 * @swagger
 * tags:
 *   name: Services
 *   description: API endpoints for managing services
 */

/**
 * @swagger
 * /services/all:
 *   get:
 *     summary: Retrieve all services
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           example: "Male"
 *       - in: query
 *         name: yearsOfExperience
 *         schema:
 *           type: string
 *           example: "5-10"
 *       - in: query
 *         name: serviceType
 *         schema:
 *           type: string
 *           example: "Online"
 *       - in: query
 *         name: ageGroup
 *         schema:
 *           type: string
 *           example: "Adult"
 *       - in: query
 *         name: searchQuery
 *         schema:
 *           type: string
 *           example: "Yoga"
 *     responses:
 *       200:
 *         description: Successfully retrieved all services
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /services:
 *   post:
 *     summary: Create a new service
 *     tags: [Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Yoga Class"
 *               description:
 *                 type: string
 *                 example: "A relaxing yoga session for beginners."
 *               duration:
 *                 type: integer
 *                 example: 60
 *               hourlyRate:
 *                 type: number
 *                 example: 25
 *               level:
 *                 type: string
 *                 example: "Beginner"
 *               trainerIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2]
 *               serviceDetails:
 *                 type: object
 *                 properties:
 *                   fullDescription:
 *                     type: string
 *                     example: "A detailed description of the yoga session."
 *                   highlights:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Relaxation", "Flexibility"]
 *                   whatsIncluded:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Yoga mat", "Water bottle"]
 *                   whatsNotIncluded:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Towel"]
 *                   recommendations:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Arrive 15 minutes early"]
 *                   whatsToBring:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Comfortable clothes"]
 *     responses:
 *       201:
 *         description: Service created successfully
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /services/service-types:
 *   get:
 *     summary: Retrieve all service types
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Successfully retrieved service types
 *       500:
 *         description: Failed to fetch service types
 */

/**
 * @swagger
 * /services/multiple:
 *   get:
 *     summary: Retrieve multiple services by IDs
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: ids
 *         schema:
 *           type: string
 *           example: "1,2,3"
 *         description: Comma-separated list of service IDs
 *     responses:
 *       200:
 *         description: Successfully retrieved services
 *       400:
 *         description: No service IDs provided
 *       404:
 *         description: No services found for the given IDs
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /services/filter:
 *   get:
 *     summary: Filter services
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           example: "Intermediate"
 *       - in: query
 *         name: subCategoryName
 *         schema:
 *           type: string
 *           example: "Fitness"
 *     responses:
 *       200:
 *         description: Successfully retrieved filtered services
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /services/categories/{categoryId}/services-all:
 *   get:
 *     summary: Get all services by category
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           example: "Beginner"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: "Meditation"
 *     responses:
 *       200:
 *         description: Successfully retrieved services by category
 *       404:
 *         description: Category not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /services/{id}:
 *   get:
 *     summary: Retrieve a single service by ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Successfully retrieved the service
 *       404:
 *         description: Service not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /services/trainer/{trainerId}:
 *   get:
 *     summary: Retrieve all services provided by a specific trainer
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: trainerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Trainer ID
 *     responses:
 *       200:
 *         description: Successfully retrieved services by trainer
 *       500:
 *         description: Internal server error
 */
