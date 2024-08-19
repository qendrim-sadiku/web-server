const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/User');

// User signup
exports.signup = async (req, res) => {
  const { name, surname, username, email, password } = req.body;

  // Validate fields
  const errors = [];

  if (!name) errors.push({ field: 'name', message: 'Name is required' });
  if (!surname) errors.push({ field: 'surname', message: 'Surname is required' });
  if (!username) errors.push({ field: 'username', message: 'Username is required' });
  else {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      errors.push({ field: 'username', message: 'Username must be between 3 and 20 characters long and can only contain letters, numbers, underscores, and hyphens' });
    }
  }
  if (!email) errors.push({ field: 'email', message: 'Email is required' });
  else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }
  }
  if (!password) errors.push({ field: 'password', message: 'Password is required' });
  else {
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;
    if (!passwordRegex.test(password)) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number' });
    }
  }

  // Return validation errors if any
  if (errors.length > 0) {
    return res.status(400).json({ error: errors });
  }

  try {
    // Check if username or email already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username: username }, { email: email }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with hashed password
    const newUser = await User.create({ name, surname, username, email, password: hashedPassword });

    // Generate JWT token with 24-hour expiration
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Set token expiration to 24 hours
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role },
    });
  } catch (error) {
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      const sequelizeErrors = error.errors.map((err) => ({ field: err.path, message: err.message }));
      return res.status(400).json({ error: sequelizeErrors });
    }

    // Handle other errors
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// User login
exports.login = async (req, res) => {
  const { emailOrUsername, password } = req.body;

  // Validate fields
  const errors = [];
  if (!emailOrUsername) errors.push({ field: 'emailOrUsername', message: 'Email or Username is required' });
  if (!password) errors.push({ field: 'password', message: 'Password is required' });

  if (errors.length > 0) {
    return res.status(400).json({ error: errors });
  }

  try {
    // Check if user exists with the given email or username
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid email/username or password' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Invalid email/username or password' });
    }

    // Generate JWT token with 24-hour expiration
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Set token expiration to 24 hours
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  const { userId } = req.params;
  const { currentPassword, newPassword } = req.body;

  const errors = [];

  if (!currentPassword) {
    errors.push({ field: 'currentPassword', message: 'Current password is required' });
  }

  if (!newPassword) {
    errors.push({ field: 'newPassword', message: 'New password is required' });
  } else {
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      errors.push({
        field: 'newPassword',
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
      });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors });
  }

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;

    // Save the updated user
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to authenticate token
exports.authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token expired or invalid' });

    req.user = decoded; // Attach decoded user to request
    next();
  });
};
