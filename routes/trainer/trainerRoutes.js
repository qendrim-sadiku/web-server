const express = require('express');
const router = express.Router();
const trainerController = require('../../controllers/trainer/trainerController');

router.post('/', trainerController.createTrainer);
router.get('/category/:categoryId', trainerController.getTrainersByCategory);
router.get('/:id', trainerController.getTrainerById);

module.exports = router;
