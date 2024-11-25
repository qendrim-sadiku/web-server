/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: API endpoints for fetching countries, cities, and phone code entries
 */

/**
 * @swagger
 * /countries:
 *   get:
 *     summary: Get all countries
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: Successfully retrieved all countries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "United States"
 *                   code:
 *                     type: string
 *                     example: "US"
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /cities/{countryCode}:
 *   get:
 *     summary: Get cities by country code
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: countryCode
 *         required: true
 *         schema:
 *           type: string
 *           example: "US"
 *     responses:
 *       200:
 *         description: Successfully retrieved cities for the specified country code
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "New York"
 *                   adminName1:
 *                     type: string
 *                     example: "New York"
 *                   code:
 *                     type: string
 *                     example: "10001"
 *       400:
 *         description: Country code is required
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /entries:
 *   get:
 *     summary: Get countries with phone codes and flags
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: Successfully retrieved country phone codes and flags
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "United States"
 *                   phoneCode:
 *                     type: string
 *                     example: "+1"
 *                   flagUrl:
 *                     type: string
 *                     example: "https://restcountries.com/data/usa.png"
 *       500:
 *         description: Internal server error
 */
