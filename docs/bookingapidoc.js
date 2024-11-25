/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: API endpoints for managing bookings
 */

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 1
 *               serviceId:
 *                 type: string
 *                 example: 101
 *               trainerId:
 *                 type: string
 *                 example: 202
 *               address:
 *                 type: string
 *                 example: "123 Main St, City, Country"
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "John"
 *                     surname:
 *                       type: string
 *                       example: "Doe"
 *                     age:
 *                       type: number
 *                       example: 25
 *                     category:
 *                       type: string
 *                       example: "Adult"
 *               dates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2024-12-01"
 *                     startTime:
 *                       type: string
 *                       example: "09:00"
 *                     endTime:
 *                       type: string
 *                       example: "11:00"
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /bookings/user/{userId}:
 *   get:
 *     summary: Get all bookings of a user
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user
 *     responses:
 *       200:
 *         description: A list of bookings for the user
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Get booking details by ID
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking details retrieved successfully
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /booking/{id}:
 *   put:
 *     summary: Edit a booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               address:
 *                 type: string
 *                 example: "456 New Address, City, Country"
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Jane"
 *                     surname:
 *                       type: string
 *                       example: "Doe"
 *                     age:
 *                       type: number
 *                       example: 30
 *                     category:
 *                       type: string
 *                       example: "Adult"
 *               dates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2024-12-05"
 *                     startTime:
 *                       type: string
 *                       example: "10:00"
 *                     endTime:
 *                       type: string
 *                       example: "12:00"
 *     responses:
 *       200:
 *         description: Booking updated successfully
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /bookings/extend-session/{id}:
 *   put:
 *     summary: Extend a booking session
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newEndTime:
 *                 type: string
 *                 example: "13:00"
 *               sessionDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-05"
 *     responses:
 *       200:
 *         description: Session extended successfully
 *       404:
 *         description: Booking or date not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /bookings/counts:
 *   post:
 *     summary: Get booking counts for multiple services
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["1", "2", "3"]
 *     responses:
 *       200:
 *         description: Booking counts retrieved successfully
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /bookings/rate/{id}:
 *   put:
 *     summary: Rate a booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               review:
 *                 type: string
 *                 example: "Great service!"
 *     responses:
 *       200:
 *         description: Rating and review updated successfully
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
