const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/sequelize');
const User = require('../models/User');
const { getProfile } = require('../controllers/userController');


const verifyAdmin = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).send({ message: 'No token provided!' });
  }

  // Remove 'Bearer ' from the token string if present
  const tokenWithoutBearer = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;

  jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('JWT verification error:', err); // Log the error for debugging
      return res.status(401).send({ message: 'Unauthorized!', error: err });
    }

    req.userId = decoded.id;
    req.userRole = decoded.role; // Assuming role is included in the JWT payload

    if (req.userRole !== 'admin') {
      return res.status(403).send({ message: 'Require Admin Role!' });
    }

    next();
  });
};

// Function to create or update user profile
exports.updateProfile = async (req, res) => {
  const userId = req.user.id; // Get logged-in user's ID
  const { name, surname, contactDetails, address, meetingPoints } = req.body;

  try {
    let user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    await user.update({ name, surname });

    await ContactDetails.upsert({ ...contactDetails, UserId: userId });
    await Address.upsert({ ...address, UserId: userId });

    if (meetingPoints) {
      await MeetingPoint.destroy({ where: { UserId: userId } });
      await MeetingPoint.bulkCreate(meetingPoints.map(mp => ({ ...mp, UserId: userId })));
    }

    res.status(200).send({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).send({ message: 'Error updating profile', error });
  }
};

// Function to fetch user profile by userId
exports.getProfile = async (req, res) => {
  const userId = req.params.userId;

  try {
    // Check if userId matches the logged-in user's ID
    if (userId !== req.user.id) {
      return res.status(403).send({ message: 'Unauthorized: You do not have permission to access this resource' });
    }

    const user = await User.findByPk(userId, {
      include: [ContactDetails, Address, MeetingPoint]
    });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.status(200).send(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).send({ message: 'Error fetching profile', error });
  }
};


const authenticateJWT = (req, res, next) => {

  // Implement JWT authentication logic here
  // Example implementation:
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    // Verify token, decode it, and set req.user with user details
    // Example:
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      req.user = decoded; // Set authenticated user details in req.user
      next();
    });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

module.exports = verifyAdmin;
module.exports = authenticateJWT;