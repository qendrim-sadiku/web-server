// controllers/userController.js
const bcrypt = require('bcrypt');
const User = require('../models/User');

const ContactDetails = require('../models/UserProfile/ContactDetails');
const Address = require('../models/UserProfile/Address');
const MeetingPoint = require('../models/UserProfile/MeetingPoint');

exports.getAllUsers = async (req, res) => {
    try {
      const users = await User.findAll({
        include: [
          { model: ContactDetails },
          { model: Address },
          { model: MeetingPoint }
        ]
      });
  
      res.status(200).json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Error fetching users', error });
    }
  };


  exports.updateProfile = async (req, res) => {
    const { userId, name, surname, contactDetails, address, meetingPoints } = req.body;
  
    try {
      let user = await User.findByPk(userId);
      if (!user) {
        user = await User.create({ id: userId, name, surname });
      } else {
        await user.update({ name, surname });
      }
  
      await ContactDetails.upsert({ ...contactDetails, UserId: user.id });
      await Address.upsert({ ...address, UserId: user.id });
  
      if (meetingPoints) {
        await MeetingPoint.destroy({ where: { UserId: user.id } });
        await MeetingPoint.bulkCreate(meetingPoints.map(mp => ({ ...mp, UserId: user.id })));
      }
  
      res.status(200).send({ message: 'Profile updated successfully' });
    } catch (error) {
      res.status(500).send({ message: 'Error updating profile', error });
    }
  };
  
  exports.getProfile = async (req, res) => {
    try {
      const user = await User.findByPk(req.params.userId, {
        include: [ContactDetails, Address, MeetingPoint]
      });
  
      if (!user) {
        return res.status(404).send({ message: 'User not found' });
      }
  
      res.status(200).send(user);
    } catch (error) {
      res.status(500).send({ message: 'Error fetching profile', error });
    }
  };

exports.createUser = async (req, res) => {
    const { username, email, password, role } = req.body;
  
    try {
      // Check if role is provided, if not, default to 'user'
      const newUser = await User.create({
        username,
        email,
        password,
        role: role || 'user' // Default role to 'user' if not provided
      });
  
      res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
      // Handle Sequelize validation errors
      if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
        const errors = error.errors.map(err => ({ field: err.path, message: err.message }));
        return res.status(400).json({ error: errors });
      }
  
      // Handle other errors
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  };

  // Function to create or update user profile
exports.updateProfile = async (req, res) => {
    const { userId, name, surname, contactDetails, address, meetingPoints } = req.body;
  
    try {
      let user = await User.findByPk(userId);
      if (!user) {
        user = await User.create({ id: userId, name, surname });
      } else {
        await user.update({ name, surname });
      }
  
      await ContactDetails.upsert({ ...contactDetails, UserId: user.id });
      await Address.upsert({ ...address, UserId: user.id });
  
      if (meetingPoints) {
        await MeetingPoint.destroy({ where: { UserId: user.id } });
        await MeetingPoint.bulkCreate(meetingPoints.map(mp => ({ ...mp, UserId: user.id })));
      }
  
      res.status(200).send({ message: 'Profile updated successfully' });
    } catch (error) {
      res.status(500).send({ message: 'Error updating profile', error });
    }
  };
  
  // Function to get user profile
//   exports.getProfile = async (req, res) => {
//     try {
//       const user = await User.findByPk(req.params.userId, {
//         include: [ContactDetails, Address, MeetingPoint]
//       });
  
//       if (!user) {
//         return res.status(404).send({ message: 'User not found' });
//       }
  
//       res.status(200).send(user);
//     } catch (error) {
//       res.status(500).send({ message: 'Error fetching profile', error });
//     }
//   };