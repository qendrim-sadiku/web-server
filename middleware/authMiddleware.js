const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust the import path if necessary

// Middleware to authenticate any JWT token
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from Bearer scheme

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(403).json({ message: 'Unauthorized: Invalid or expired token' });
    }

    req.user = decoded; // Attach user details to req for further use
    next(); // Proceed to the next middleware/route handler
  });
};

// Middleware to verify if the user is an admin
const verifyAdmin = (req, res, next) => {
  authenticateJWT(req, res, () => { // Use authenticateJWT to verify token first
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin role required' });
    }
    next(); // User is authenticated and an admin
  });
};

module.exports = { authenticateJWT, verifyAdmin };
