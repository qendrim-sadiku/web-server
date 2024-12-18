const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/User');
const sendEmail = require('../config/emailService');
const UserPreferences = require('../models/UserProfile/UserPreferences');



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
      { expiresIn: '7d' } // Set token expiration to 24 hours
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
      { expiresIn: '7d' } // Set token expiration to 24 hours
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


// exports.loginOrSignup = async (req, res) => {
//   const { email, password, name } = req.body;

//   if (!email || !password || !name) {
//     return res.status(400).json({ message: 'Email, password, and name are required' });
//   }

//   try {
//     let user = await User.findOne({ where: { email } });

//     if (!user) {
//       // If user doesn't exist, create a new user with a hashed password
//       const hashedPassword = await bcrypt.hash(password, 10);
//       user = await User.create({
//         email,
//         password: hashedPassword,
//         name,
//       });
//     } else {
//       // Ensure user has a password before calling bcrypt.compare
//       if (!user.password) {
//         return res.status(400).json({ message: 'User does not have a password set' });
//       }

//       // Verify the password
//       const isPasswordValid = await bcrypt.compare(password, user.password);
//       if (!isPasswordValid) {
//         return res.status(401).json({ message: 'Invalid email or password' });
//       }
//     }

//     // Generate a 6-digit verification code
//     const verificationCode = Math.floor(100000 + Math.random() * 900000);

//     // Set code expiry (e.g., 5 minutes from now)
//     const expiry = new Date();
//     expiry.setMinutes(expiry.getMinutes() + 5);

//     // Save the code and expiry
//     user.verificationCode = verificationCode;
//     user.verificationCodeExpires = expiry;
//     await user.save();

//     // Send the code to the user's email
//     await sendEmail(email, 'Your Verification Code', `Your verification code is: ${verificationCode}`);

//     res.status(200).json({ message: 'Verification code sent to your email' });
//   } catch (error) {
//     console.error('Error during login/signup:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

exports.signup = async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Email, password, and name are required' });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'This email is already in use. Please log in instead.' });
    }

    // Hash the password and create the user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email,
      password: hashedPassword,
      name,
    });

    // Send a verification code
    await exports.resendVerificationCode({ body: { email } }, res);

  } catch (error) {
    console.error('Error during signup:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Invalid input data', details: error.errors });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

// exports.signin = async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ message: 'Email and password are required' });
//   }

//   try {
//     // Check if the user exists
//     const user = await User.findOne({ where: { email } });
//     if (!user) {
//       return res.status(404).json({ message: 'No account found with this email. Please sign up.' });
//     }

//     // Check if the user has a password set
//     if (!user.password) {
//       return res.status(400).json({ message: 'User does not have a password set. Please contact support.' });
//     }

//     // Validate the password
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: 'Invalid email or password' });
//     }

//     // Send a verification code
//     await exports.resendVerificationCode({ body: { email } }, res);

//   } catch (error) {
//     console.error('Error during signin:', error);

//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

// exports.signin = async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ message: 'Email and password are required' });
//   }

//   try {
//     // Check if the user exists
//     const user = await User.findOne({ where: { email } });
//     if (!user) {
//       return res.status(404).json({ message: 'No account found with this email. Please sign up.' });
//     }

//     // Check if the user has a password set
//     if (!user.password) {
//       return res.status(400).json({ message: 'User does not have a password set. Please contact support.' });
//     }

//     // Validate the password
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: 'Invalid email or password' });
//     }

//     // Fetch user's preferences to check twoFactorAuthentication
//     const userPreferences = await UserPreferences.findOne({ where: { UserId: user.id } });
//     const twoFactorEnabled = userPreferences ? userPreferences.twoFactorAuthentication : false;

//     if (twoFactorEnabled) {
//       // Send verification code for 2FA
//       const verificationCode = Math.floor(100000 + Math.random() * 900000);
//       const codeExpiry = new Date(Date.now() + 2 * 60 * 1000); // Code expires in 2 minutes

//       // Save the code and expiry in the user record
//       user.verificationCode = verificationCode;
//       user.verificationCodeExpires = codeExpiry;
//       await user.save();

//       // Send email
//       await sendEmail(
//         user.email,
//         'Your Two-Factor Authentication Code',
//         `Your verification code is: ${verificationCode}. It expires in 2 minutes.`
//       );

//       return res.status(200).json({
//         message: 'Two-factor authentication code sent. Please verify to proceed.',
//         twoFactorRequired: true,
//       });
//     }

//     // If 2FA is disabled, log the user in directly
//     const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
//       expiresIn: '1h',
//     });

//     return res.status(200).json({
//       message: 'Login successful',
//       token,
//       twoFactorRequired: false,
//     });
//   } catch (error) {
//     console.error('Error during signin:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

exports.signin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Check if the user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email. Please sign up.' });
    }

    // Check if the user has a password set
    if (!user.password) {
      return res.status(400).json({ message: 'User does not have a password set. Please contact support.' });
    }

    // Validate the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Fetch user's preferences to check twoFactorAuthentication
    const userPreferences = await UserPreferences.findOne({ where: { UserId: user.id } });
    const twoFactorEnabled = userPreferences ? userPreferences.twoFactorAuthentication : false;

    if (twoFactorEnabled) {
      // Send verification code for 2FA
      const verificationCode = Math.floor(100000 + Math.random() * 900000);
      const codeExpiry = new Date(Date.now() + 2 * 60 * 1000); // Code expires in 2 minutes

      // Save the code and expiry in the user record
      user.verificationCode = verificationCode;
      user.verificationCodeExpires = codeExpiry;
      await user.save();

      // Send email
      await sendEmail(
        user.email,
        'Your Two-Factor Authentication Code',
        `Your verification code is: ${verificationCode}. It expires in 2 minutes.`
      );

      return res.status(200).json({
        message: 'Two-factor authentication code sent. Please verify to proceed.',
        twoFactorRequired: true,
      });
    }

    // If 2FA is disabled, log the user in directly
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return res.status(200).json({
      message: 'Login successful',
      token,
      twoFactorRequired: false,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,  // Include if available in your User model
        role: user.role,          // Include if available in your User model
      },
    });
  } catch (error) {
    console.error('Error during signin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};




exports.verifyCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log for debugging
    console.log('Current time:', new Date());
    console.log('Code expiry time:', new Date(user.verificationCodeExpires));

    // Check if the code matches and is not expired
    const currentTime = new Date();
    const expiryTime = new Date(user.verificationCodeExpires);

    if (
      user.verificationCode !== parseInt(code, 10) ||
      currentTime > expiryTime
    ) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Clear the verification code
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    // Generate a JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Exclude sensitive data like password from the user object
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    res.status(200).json({
      message: 'Verification successful',
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.resendVerificationCode = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a new 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    // Set expiry to 2 minutes from now
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 2);

    // Save the new code and expiry in the database
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = expiry;
    await user.save();

    // Send the verification code via email
    await sendEmail(
      email,
      'Your Verification Code',
      `Your verification code is: ${verificationCode}`
    );

    res.status(200).json({ message: 'Verification code resent successfully' });
  } catch (error) {
    console.error('Error resending verification code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
