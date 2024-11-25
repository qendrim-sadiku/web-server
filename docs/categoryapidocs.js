/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: API endpoints for managing categories and subcategories
 */

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Successfully retrieved all categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: "Sports"
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /categories/{categoryId}/subcategories:
 *   get:
 *     summary: Get all subcategories for a specific category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Successfully retrieved all subcategories for the category
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
 *                     example: "Football"
 *                   categoryId:
 *                     type: integer
 *                     example: 1
 *       500:
 *         description: Internal server error
 */
