/**
 * @swagger
 * tags:
 *   name: User Interests
 *   description: API endpoints for managing user interests in services
 */

/**
 * @swagger
 * /subcategory/{subCategoryId}/services:
 *   get:
 *     summary: Get services by subcategory
 *     tags: [User Interests]
 *     parameters:
 *       - in: path
 *         name: subCategoryId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: ID of the subcategory to fetch services for
 *     responses:
 *       200:
 *         description: Successfully fetched services for the subcategory
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 101
 *                   name:
 *                     type: string
 *                     example: "Yoga Class"
 *                   description:
 *                     type: string
 *                     example: "A relaxing yoga session"
 *                   image:
 *                     type: string
 *                     example: "https://example.com/yoga.jpg"
 *       500:
 *         description: Failed to fetch services for the subcategory
 */

/**
 * @swagger
 * /add-interest:
 *   post:
 *     summary: Add a service to user interests
 *     tags: [User Interests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 123
 *               serviceId:
 *                 type: integer
 *                 example: 101
 *     responses:
 *       201:
 *         description: Successfully added service to interests
 *       400:
 *         description: Service already added to interests
 *       500:
 *         description: Failed to add service to interests
 */

/**
 * @swagger
 * /remove-interest:
 *   delete:
 *     summary: Remove a service from user interests
 *     tags: [User Interests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 123
 *               serviceId:
 *                 type: integer
 *                 example: 101
 *     responses:
 *       200:
 *         description: Successfully removed service from interests
 *       500:
 *         description: Failed to remove service from interests
 */

/**
 * @swagger
 * /user/{userId}/interests:
 *   get:
 *     summary: Show all interests for a user
 *     tags: [User Interests]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 123
 *         description: ID of the user to fetch interests for
 *     responses:
 *       200:
 *         description: Successfully fetched user interests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 101
 *                   name:
 *                     type: string
 *                     example: "Yoga Class"
 *                   description:
 *                     type: string
 *                     example: "A relaxing yoga session"
 *                   image:
 *                     type: string
 *                     example: "https://example.com/yoga.jpg"
 *                   subCategory:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "Wellness"
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to fetch user interests
 */
