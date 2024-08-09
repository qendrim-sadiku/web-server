const Trainer = require('../../models/Trainer/Trainer');

exports.createTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.create(req.body);
    res.status(201).json(trainer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTrainersByCategory = async (req, res) => {
  try {
    const trainers = await Trainer.findAll({ where: { categoryId: req.params.categoryId } });
    res.status(200).json(trainers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTrainerById = async (req, res) => {
  try {
    const trainer = await Trainer.findByPk(req.params.id);
    if (trainer) {
      res.status(200).json(trainer);
    } else {
      res.status(404).json({ message: 'Trainer not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
