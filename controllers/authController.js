// controllers/authController.js
const bcrypt = require('bcrypt');
const { Op } = require('sequelize'); // Make sure to import Op from sequelize

const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.signup = async (req, res) => {
    const { username, email, password } = req.body;
  
    try {
      // Create user
      const user = await User.create({ username, email, password });
  
      // Generate JWT token
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
      res.status(201).json({ message: 'User created successfully', token });
    } catch (error) {
      // Handle Sequelize validation errors
      if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
        const errors = error.errors.map(err => ({ field: err.path, message: err.message }));
        return res.status(400).json({ error: errors });
      }
  
      // Handle other errors
      res.status(500).json({ error: error.message });
    }
  };
  // exports.login = async (req, res) => {
  //   try {
  //     const { emailOrUsername, password } = req.body;
  
  //     if (!emailOrUsername || !password) {
  //       return res.status(400).json({ error: 'Username or email and password are required' });
  //     }
  
  //     // Find user by username or email
  //     const user = await User.findOne({
  //       where: {
  //         [Op.or]: [
  //           { username: emailOrUsername },
  //           { email: emailOrUsername }
  //         ]
  //       }
  //     });
  
  //     if (!user) {
  //       return res.status(404).json({ error: 'User not found' });
  //     }
  
  //     // Compare passwords
  //     const isPasswordValid = await bcrypt.compare(password, user.password);
  //     if (!isPasswordValid) {
  //       return res.status(401).json({ error: 'Invalid password' });
  //     }
  
  //     // Generate JWT token
  //     const tokenPayload = { id: user.id, role: user.role };
  //     const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
  
  //     // Respond with token
  //     res.status(200).json({
  //       message: 'Login successful',
  //       token: token
  //     });
  //   } catch (error) {
  //     console.error('Login error:', error);
  //     res.status(500).json({ error: 'Internal server error' });
  //   }
  // };
  exports.login = async (req, res) => {
    try {
      const { emailOrUsername, password } = req.body;
  
      if (!emailOrUsername || !password) {
        return res.status(400).json({ error: 'Username or email and password are required' });
      }
  
      // Find user by username or email
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { username: emailOrUsername },
            { email: emailOrUsername }
          ]
        }
      });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Compare passwords
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
  
      // Generate JWT token
      const tokenPayload = { id: user.id, role: user.role };
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
  
      // Respond with token
      res.status(200).json({
        message: 'Login successful',
        token: token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };