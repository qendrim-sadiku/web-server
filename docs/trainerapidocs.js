/**
 * @swagger
 * tags:
 *   name: Trainers
 *   description: API endpoints for managing trainers
 */

/**
 * @swagger
 * /trainers:
 *   post:
 *     summary: Create a new trainer
 *     tags: [Trainers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John"
 *               surname:
 *                 type: string
 *                 example: "Doe"
 *               gender:
 *                 type: string
 *                 example: "Male"
 *               ageGroup:
 *                 type: string
 *                 example: "Adult"
 *               yearsOfExperience:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       201:
 *         description: Trainer created successfully
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /trainers/category/{categoryId}:
 *   get:
 *     summary: Get all trainers by category
 *     tags: [Trainers]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: ageGroup
 *         schema:
 *           type: string
 *           example: "Teenager"
 *     responses:
 *       200:
 *         description: Successfully retrieved trainers by category
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /trainers/{id}:
 *   get:
 *     summary: Get a single trainer by ID
 *     tags: [Trainers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully retrieved the trainer
 *       404:
 *         description: Trainer not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /trainers:
 *   get:
 *     summary: Get all trainers with reviews, ratings, and bookings
 *     tags: [Trainers]
 *     responses:
 *       200:
 *         description: Successfully retrieved trainers
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /trainers/details/{id}:
 *   get:
 *     summary: Get detailed information about a trainer
 *     tags: [Trainers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-01"
 *     responses:
 *       200:
 *         description: Successfully retrieved trainer details
 *       404:
 *         description: Trainer not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /trainers/trainer/{trainerId}/review:
 *   post:
 *     summary: Add a review for a specific trainer
 *     tags: [Trainers]
 *     parameters:
 *       - in: path
 *         name: trainerId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Great trainer!"
 *     responses:
 *       201:
 *         description: Review added successfully
 *       400:
 *         description: Invalid rating
 *       404:
 *         description: Trainer not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /trainers/availability/{id}:
 *   get:
 *     summary: Get trainer availability
 *     tags: [Trainers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-01"
 *     responses:
 *       200:
 *         description: Successfully retrieved availability
 *       404:
 *         description: Trainer not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /trainers/{trainerId}/bookings-count:
 *   get:
 *     summary: Get the bookings count for a trainer
 *     tags: [Trainers]
 *     parameters:
 *       - in: path
 *         name: trainerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully retrieved bookings count
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /trainers/availability/multiple:
 *   post:
 *     summary: Get availability for multiple trainers
 *     tags: [Trainers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trainerIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3]
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-01"
 *     responses:
 *       200:
 *         description: Successfully retrieved availability
 *       400:
 *         description: Date is required
 *       404:
 *         description: No trainers found
 *       500:
 *         description: Internal server error
 */
