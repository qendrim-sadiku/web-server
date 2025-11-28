// controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcrypt');
const fs = require('fs');
const multer = require('multer');
const sendEmail = require('../config/emailService');
const Participant = require('../models/Bookings/Participant');

const path = require('path');
const { Op } = require('sequelize'); // Import Op from Sequelize
const { Sequelize } = require('sequelize');

const Booking = require('../models/Bookings/Booking');


const UserContactDetails = require('../models/UserProfile/UserContactDetails');
const Address = require('../models/UserProfile/Address');
const MeetingPoint = require('../models/UserProfile/MeetingPoint');
const UserDetails = require('../models/UserProfile/UserDetails');
const PaymentInfo = require('../models/UserProfile/PaymentInfo');
const UserPreferences = require('../models/UserProfile/UserPreferences');
const BrowsingHistory = require('../models/BrowsingHistory');
const {Service} = require('../models/Services/Service');
const RecentSearch = require('../models/RecentSearch ');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) { 
    cb(null, 'uploads/'); // Directory to save uploaded files
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });


// Get all users with their profile details
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [
        { model: UserContactDetails },
        { model: Address },
        { model: MeetingPoint },
        { model: UserDetails },
      ],
    });

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error });
  }
};

exports.updateProfile = async (req, res) => {
  const { userId, name, surname, userContactDetails, address, meetingPoints, userDetails, paymentInfo, currentPassword, newPassword } = req.body;

  const errors = []; // Array to collect validation errors

  try {
    // Ensure required fields are provided
    if (!userId) {
      return res.status(400).send({ message: 'User ID is required' });
    }

    // Find the user
    let user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Validate and handle password update
    if (newPassword) {
      // Ensure current password is provided
      if (!currentPassword) {
        return res.status(400).send({ message: 'Current password is required to update the password' });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).send({ message: 'Current password is incorrect' });
      }

      // Validate new password
      const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        errors.push({ field: 'newPassword', message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number' });
      }

      // Return errors if any
      if (errors.length > 0) {
        return res.status(400).send({ errors });
      }

      // Hash and update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password: hashedPassword });
    }

    // Handle name and surname update
    if (name || surname) {
      const updateData = {};
      if (name) updateData.name = name;
      if (surname) updateData.surname = surname;
      await user.update(updateData);
    }

    // Handle contactDetails
    if (userContactDetails) {
      if (userContactDetails.phoneNumber) {
        await UserContactDetails.upsert({ ...userContactDetails, UserId: user.id });
      } else {
        return res.status(400).send({ message: 'Contact details must include phoneNumber and email' });
      }
    } else {
      console.warn('Contact details were not provided');
    }

    // Ensure address contains country, city, and street
    if (address) {
      if (address.country && address.city && address.street) {
        // Check if the new address is marked as default
        if (address.defaultAddress) {
          // Set all previous addresses for this user to `defaultAddress: false`
          await Address.update(
            { defaultAddress: false },
            { where: { UserId: user.id } }
          );
        }
        await Address.upsert({ ...address, UserId: user.id });
      } else {
        return res.status(400).send({ message: 'Address must include country, city, and street' });
      }
    } else {
      console.warn('Address was not provided');
    }

    // Upsert userDetails
    if (userDetails) {
      await UserDetails.upsert({ ...userDetails, UserId: user.id });
    }

    // Handle meeting points
    if (meetingPoints) {
      await MeetingPoint.destroy({ where: { UserId: user.id } });
      await MeetingPoint.bulkCreate(meetingPoints.map(mp => ({ ...mp, UserId: user.id })));
    }

    // Handle payment info
    if (paymentInfo) {
      await PaymentInfo.upsert({ ...paymentInfo, UserId: user.id });
    }

    res.status(200).send({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).send({ message: 'Error updating profile', error: error.message || error });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      include: [
        {
          model: Address,
          attributes: ['country', 'city', 'street', 'zipCode', 'defaultAddress'] // Add all necessary attributes
        },
        {
          model: UserContactDetails,
          attributes: ['phoneNumber', 'countryCode'] // Add all necessary attributes
        },
        {
          model: MeetingPoint,
          attributes: ['address', 'city', 'street', 'zipCode'] // Add all necessary attributes
        },
        {
          model: UserDetails,
          attributes: ['birthDate', 'gender'] // Add all necessary attributes
        },
        {
          model: PaymentInfo,
          attributes: ['cardNumber', 'cardHolderName', 'cvv', 'expirationDate'] // Add all necessary attributes
        }
      ],
      attributes: ['id', 'username', 'email', 'name', 'surname', 'password', 'role', 'createdAt', 'updatedAt'] // Add all necessary attributes
    });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching profile', error });
  }
};
// Create new user
exports.createUser = async (req, res) => {
  const { name,surname,username, email, password, role } = req.body;

  try {
    // Check if the requesting user is an admin
    const requestingUser = await User.findByPk(req.userId); // Assuming req.userId contains the ID of the requesting user
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user with the provided role, or default to 'user'
    const newUser = await User.create({
      name,
      surname,
      username,
      email,
      password: hashedPassword,
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

exports.verifyCurrentPassword = async (req, res) => {
  const { userId, currentPassword } = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    

    console.log(`User found: ${user.username}, hashed password: ${user.password}`); // Log the hashed password
    console.log(`Current password provided: ${currentPassword}`); // Log the provided password

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    console.log(`Password match result: ${isMatch}`); // Log the comparison result

    if (isMatch) {
      return res.status(200).json({ isValid: true });
    } else {
      return res.status(400).json({ isValid: false, message: 'Current password is incorrect' });
    }
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



exports.updatePassword = async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash the new password and update
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    user.passwordLastUpdatedAt = new Date(); // Update timestamp
    await user.save();

    return res.status(200).json({
      message: 'Password updated successfully',
      passwordLastUpdatedAt: user.passwordLastUpdatedAt, // Return the updated timestamp
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPasswordLastUpdated = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findByPk(userId, {
      attributes: ['passwordLastUpdatedAt'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ passwordLastUpdatedAt: user.passwordLastUpdatedAt });
  } catch (error) {
    console.error('Error fetching last password update:', error);
    res.status(500).json({ message: 'Server error' });
  }
};









exports.updateContactDetails = async (req, res) => {
  const { userId, userContactDetails } = req.body;

  try {
    if (!userId) return res.status(400).send({ message: 'User ID is required' });

    let user = await User.findByPk(userId);
    if (!user) return res.status(404).send({ message: 'User not found' });

    if (!userContactDetails.phoneNumber || !userContactDetails.email) {
      return res.status(400).send({ message: 'Contact details must include phoneNumber and email' });
    }

    await UserContactDetails.upsert({ ...userContactDetails, UserId: user.id });
    res.status(200).send({ message: 'Contact details updated successfully' });
  } catch (error) {
    console.error('Error updating contact details:', error);
    res.status(500).send({ message: 'Error updating contact details', error: error.message || error });
  }
};


exports.updateUserInfo = async (req, res) => {
  const { userId, name, surname, username, gender, birthDate } = req.body;
  const avatar = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    if (!userId) {
      return res.status(400).send({ message: 'User ID is required' });
    }

    let user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Update user basic info
    const updateData = { name, surname, username };
    if (avatar) {
      updateData.avatar = avatar;
    }

    await user.update(updateData);

    // Update user details info
    let userDetails = await UserDetails.findOne({ where: { userId } });
    if (!userDetails) {
      return res.status(404).send({ message: 'User details not found' });
    }

    const UserDetail = { gender, birthDate };
    await userDetails.update(UserDetail);

    res.status(200).send({ message: 'User information updated successfully' });
  } catch (error) {
    console.error('Error updating user information:', error);
    res.status(500).send({ message: 'Error updating user information', error: error.message || error });
  }
};






// Update meeting points
exports.updateMeetingPoints = async (req, res) => {
  const { userId, meetingPoints } = req.body;

  try {
    if (!userId) {
      return res.status(400).send({ message: 'User ID is required' });
    }

    let user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    await MeetingPoint.destroy({ where: { UserId: user.id } });
    await MeetingPoint.bulkCreate(meetingPoints.map(mp => ({ ...mp, UserId: user.id })));

    res.status(200).send({ message: 'Meeting points updated successfully' });
  } catch (error) {
    console.error('Error updating meeting points:', error);
    res.status(500).send({ message: 'Error updating meeting points', error: error.message || error });
  }
};


// Get user profile
exports.getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      attributes: ['id', 'username', 'email', 'name', 'surname', 'avatar', 'password', 'role', 'createdAt', 'updatedAt', 'isProfileCompleted','parentUserId'] // Added avatar here
    });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching user', error });
  }
};


// Update user's profile completion status
exports.completeUserProfile = async (req, res) => {
  try {
    // Find the user
    const user = await User.findByPk(req.params.userId);

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Set isProfileCompleted to true when marking profile as completed
    user.isProfileCompleted = true;
    
    // Save the user
    await user.save();

    // Send success response
    return res.status(200).send({ message: 'Profile marked as completed' });

  } catch (error) {
    console.error('Error marking profile as completed:', error);
    return res.status(500).send({ message: 'Error marking profile as completed' });
  }
};


// Method to check if user profile is completed
exports.checkProfileCompletion = async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch the user along with necessary details
    const user = await User.findByPk(userId, {
      include: [
        { model: UserContactDetails },
        { model: Address },
        { model: UserDetails },
        { model: PaymentInfo }
      ]
    });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Return the current state of profile completion
    return res.status(200).send({ isProfileCompleted: user.isProfileCompleted });

  } catch (error) {
    console.error('Error checking profile completion:', error);
    return res.status(500).send({ message: 'Error checking profile completion' });
  }
};





exports.getUserAddresses = async (req, res) => {
  try {
    // Fetch all addresses for the user
    let addresses = await Address.findAll({
      where: { UserId: req.params.userId },
      attributes: [
        'id',
        'country',
        'city',
        'street',
        'state',
        'zipCode',
        'instructions',
        'defaultAddress',
        'countryCode',
        'phoneNumber',
        'firstName',
        'lastName' // Include new fields
      ]
    });

    if (addresses.length === 0) {
      return res.status(200).send({ message: 'No addresses available', data: [] });
    }

    res.status(200).send({ message: 'Addresses fetched successfully', data: addresses });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).send({ message: 'Error fetching addresses', error });
  }
};


exports.setDefaultAddress = async (req, res) => {
  const { userId, addressId } = req.body; // Extract userId and addressId from request body

  try {
    // Fetch all addresses for the user
    const addresses = await Address.findAll({ where: { UserId: userId } });

    if (addresses.length === 0) {
      return res.status(404).send({ message: 'No addresses found for this user' });
    }

    // Remove default from all addresses
    await Address.update(
      { defaultAddress: false },
      { where: { UserId: userId } }
    );

    // Set the selected address as the default
    const [updated] = await Address.update(
      { defaultAddress: true },
      { where: { id: addressId, UserId: userId } }
    );

    if (updated === 0) {
      return res.status(404).send({ message: 'Address not found' });
    }

    res.status(200).send({ message: 'Default address updated successfully' });
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).send({ message: 'Error setting default address', error });
  }
};


exports.updateAddresses = async (req, res) => {
  const { userId, addresses, deletedAddresses } = req.body;

  try {
    if (!userId) {
      return res.status(400).send({ message: 'User ID is required' });
    }

    if (!addresses || !Array.isArray(addresses)) {
      return res.status(400).send({ message: 'Addresses array is required' });
    }

    let user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    if (deletedAddresses && Array.isArray(deletedAddresses) && deletedAddresses.length > 0) {
      await Address.destroy({
        where: {
          id: deletedAddresses,
          UserId: userId
        }
      });
    }

    const defaultAddresses = addresses.filter(address => address.defaultAddress === true);
    if (defaultAddresses.length > 1) {
      return res.status(400).send({ message: 'Only one address can be set as default' });
    }

    for (const address of addresses) {
      if (!address.country || !address.city || !address.street) {
        return res.status(400).send({ message: 'Each address must include country, city, and street' });
      }

      await Address.upsert({
        ...address,
        UserId: user.id,
        instructions: address.instructions || null,
        firstName: address.firstName || null,
        lastName: address.lastName || null, // Handle optional fields
        countryCode: address.countryCode || '+1',
        phoneNumber: address.phoneNumber || ''
      });
    }

    res.status(200).send({ message: 'Addresses updated successfully' });
  } catch (error) {
    console.error('Error updating addresses:', error);
    res.status(500).send({ message: 'Error updating addresses', error: error.message || error });
  }
};



exports.getUserContactDetails = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Fetch the most recent contact details for the user
    const contactDetails = await UserContactDetails.findOne({
      where: { UserId: userId },
      attributes: ['phoneNumber', 'countryCode'], // Add all necessary attributes
      order: [['updatedAt', 'DESC']] // Ensure you have an updatedAt column for sorting
    });

    // Fetch the email from the User model
    const user = await User.findByPk(userId, {
      attributes: ['email']
    });

    if (!contactDetails && !user) {
      return res.status(200).send({ message: 'No contact details available', data: {} });
    }

    const response = {
      phoneNumber: contactDetails ? contactDetails.phoneNumber : null,
      countryCode: contactDetails ? contactDetails.countryCode : null,
      email: user ? user.email : null
    };

    res.status(200).send(response);
  } catch (error) {
    console.error('Error fetching contact details:', error);
    res.status(500).send({ message: 'Error fetching contact details', error });
  }
};

// Get user meeting points
exports.getMeetingPoints = async (req, res) => {
  try {
    const userId = req.params.userId;
    // Fetch all meeting points for the user from the database
    const meetingPoints = await MeetingPoint.findAll({ where: { UserId: userId } });

    if (!meetingPoints || meetingPoints.length === 0) {
      return res.status(200).send({ message: 'No meeting points available', data: [] });
    }

    res.status(200).send(meetingPoints);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching meeting points', error });
  }
};


exports.getUserDetails = async (req, res) => {
  try {
    // Fetch the user details along with contact details
    const user = await User.findByPk(req.params.userId, {
      attributes: ['name', 'email', 'origin'], // Add 'email' if needed
      include: [
        {
          model: UserContactDetails,
          as: 'UserContactDetail', // Use the correct alias as defined in your model association
          attributes: ['countryCode', 'phoneNumber']
        }
      ]
    });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Prepare the response data
    const response = {
      name: user.name,
      email: user.email,
      origin: user.origin,
      countryCode: user.UserContactDetail?.countryCode || null,
      phoneNumber: user.UserContactDetail?.phoneNumber || null
    };

    res.status(200).send(response);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).send({ message: 'Error fetching user details', error: error.message || error });
  }
};


exports.updateUserDetails = async (req, res) => {
  const { userId, userDetails } = req.body;

  if (!userId || !userDetails) {
    return res.status(400).send({ message: 'User ID and userDetails are required' });
  }

  try {
    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Update User
    const { name, email, origin } = userDetails;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (origin !== undefined) updateFields.origin = origin;

    await user.update(updateFields);

    // Update UserContactDetails
    let userContact = await UserContactDetails.findOne({ where: { UserId: userId } });

    const { countryCode, phoneNumber } = userDetails;
    const contactUpdateFields = {};
    if (countryCode !== undefined) contactUpdateFields.countryCode = countryCode;
    if (phoneNumber !== undefined) contactUpdateFields.phoneNumber = phoneNumber;

    if (userContact) {
      await userContact.update(contactUpdateFields);
    } else if (countryCode || phoneNumber) {
      await UserContactDetails.create({
        UserId: userId,
        ...contactUpdateFields
      });
    }

    res.status(200).send({ message: 'User details updated successfully' });
  } catch (error) {
    console.error('Error updating user details:', error);
    res.status(500).send({ message: 'Error updating user details', error: error.message || error });
  }
};


exports.getUserPaymentInfo = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Fetch all payment info for the user
    const paymentInfo = await PaymentInfo.findAll({
      where: { UserId: userId },
      attributes: [
        'id',
        'cardNumber',
        'cardHolderName',
        'cvv',
        'expirationDate',
        'country',
        'zipCode',
        'isDefault'
      ],
      order: [['updatedAt', 'DESC']] // Sort by most recent update
    });

    if (!paymentInfo || paymentInfo.length === 0) {
      return res.status(200).send({ message: 'No payment info available', data: [] });
    }

    res.status(200).send(paymentInfo);
  } catch (error) {
    console.error('Error fetching payment info:', error);
    res.status(500).send({ message: 'Error fetching payment info', error });
  }
};

exports.updatePaymentInfo = async (req, res) => {
  const {
    userId,
    cardId, // this is optional: present only during edit
    cardNumber,
    cardHolderName,
    cvv,
    expirationDate,
    country,
    zipCode
  } = req.body;

  try {
    if (!userId) {
      return res.status(400).send({ message: 'User ID is required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Common validation
    if (!cardNumber || !cardHolderName || !cvv || !expirationDate) {
      return res.status(400).send({ message: 'All payment info fields are required' });
    }

    if (cardId) {
      // Edit mode
      const existingCard = await PaymentInfo.findOne({
        where: { id: cardId, UserId: userId }
      });

      if (!existingCard) {
        return res.status(404).send({ message: 'Card not found for this user' });
      }

      await existingCard.update({
        cardNumber,
        cardHolderName,
        cvv,
        expirationDate,
        country,
        zipCode
      });

      return res.status(200).send({ message: 'Payment info updated successfully', id: existingCard.id });
    } else {
      // Add new card
      const newCard = await PaymentInfo.create({
        cardNumber,
        cardHolderName,
        cvv,
        expirationDate,
        country,
        zipCode,
        UserId: user.id
      });

      return res.status(200).send({ message: 'Payment info added successfully', id: newCard.id });
    }
  } catch (error) {
    console.error('Error handling payment info:', error);
    return res.status(500).send({ message: 'Server error', error: error.message || error });
  }
};


// Delete payment info (single card)
exports.deletePaymentInfo = async (req, res) => {
  try {
    const paymentId = req.params.paymentId;

    // Find the payment info by ID and delete it
    const paymentInfo = await PaymentInfo.findByPk(paymentId);

    if (!paymentInfo) {
      return res.status(404).send({ message: 'Payment info not found' });
    }

    await paymentInfo.destroy();
    res.status(200).send({ message: 'Payment info deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment info:', error);
    res.status(500).send({ message: 'Error deleting payment info', error });
  }
};

// Set default payment method
exports.setDefaultPaymentMethod = async (req, res) => {
  const { userId, paymentId } = req.body;

  try {
    // Check if userId and paymentId exist in the request
    if (!userId || !paymentId) {
      return res.status(400).send({ message: 'User ID and payment ID are required' });
    }

    // Fetch the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Fetch the payment method to be marked as default
    const paymentInfo = await PaymentInfo.findOne({ where: { id: paymentId, UserId: userId } });
    if (!paymentInfo) {
      return res.status(404).send({ message: 'Payment method not found' });
    }

    // Set all payment methods for the user to not be default
    await PaymentInfo.update({ isDefault: false }, { where: { UserId: userId } });

    // Mark the selected payment method as default
    paymentInfo.isDefault = true;
    await paymentInfo.save();

    res.status(200).send({ message: 'Payment method set as default successfully' });
  } catch (error) {
    console.error('Error setting default payment method:', error);
    res.status(500).send({ message: 'Error setting default payment method', error: error.message || error });
  }
};



exports.getUserAvatar = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Fetch the user's avatar
    const user = await User.findOne({
      where: { id: userId },
      attributes: ['avatar'],
    });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.status(200).send(user);
  } catch (error) {
    console.error('Error fetching avatar:', error);
    res.status(500).send({ message: 'Error fetching avatar', error });
  }
};

// Update user avatar
exports.updateUserAvatar = async (req, res) => {
  upload.single('avatar')(req, res, async function (err) {
    if (err) {
      return res.status(500).send({ message: 'Error uploading avatar', error: err });
    }
    
    try {
      const userId = req.params.userId;
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).send({ message: 'User not found' });
      }

      // Remove the old avatar file if it exists
      if (user.avatar) {
        const oldAvatarPath = path.join(__dirname, '..', user.avatar);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      // Save the new avatar file path in the database
      user.avatar = req.file.path;
      await user.save();

      res.status(200).send({ avatarUrl: user.avatar });
    } catch (error) {
      console.error('Error updating avatar:', error);
      res.status(500).send({ message: 'Error updating avatar', error });
    }
  });
};

// Remove user avatar
exports.removeUserAvatar = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    if (user.avatar) {
      const avatarPath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    user.avatar = null;
    await user.save();

    res.status(200).send({ message: 'Avatar removed successfully' });
  } catch (error) {
    console.error('Error removing avatar:', error);
    res.status(500).send({ message: 'Error removing avatar', error });
  }
};

// Update user preferences
exports.updateUserPreferences = async (req, res) => {
  const { userId, sportPreference, expertisePreference } = req.body;

  try {
    let user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    await user.update({ sportPreference, expertisePreference });

    res.status(200).send({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).send({ message: 'Error updating preferences', error: error.message || error });
  }
};

exports.getSpecializationsAndExpertise = (req, res) => {
  try {
    const specializations = ['sport', 'art', 'science', 'technology', 'health', 'education'];
    const expertiseLevels = ['beginner', 'pro', 'advanced'];

    res.status(200).json({
      specializations,
      expertiseLevels
    });
  } catch (error) {
    console.error('Error fetching specializations and expertise levels:', error);
    res.status(500).json({ message: 'Error fetching specializations and expertise levels', error });
  }
};

// Get all user preferences
exports.getUserPreferences = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch user preferences based on the userId
    const userPreferences = await UserPreferences.findOne({ where: { UserId: userId } });

    // If preferences do not exist, return a default set or message
    if (!userPreferences) {
      return res.status(404).json({ message: 'User preferences not found' });
    }

    // Return the user preferences
    return res.status(200).json(userPreferences);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return res.status(500).json({ message: 'Failed to fetch user preferences', error });
  }
};

// Get two-factor authentication status
exports.getTwoFactorAuthenticationStatus = async (req, res) => {
  try {
    const { userId } = req.params; // Get userId from URL parameters

    // Validate if userId is provided
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    // Fetch the user preferences using UserId
    const userPreferences = await UserPreferences.findOne({ where: { UserId: userId } });

    // Check if user preferences exist
    if (!userPreferences) {
      return res.status(404).json({ message: 'User preferences not found.' });
    }

    // Return the two-factor authentication status
    res.status(200).json({
      message: 'Two-factor authentication status fetched successfully.',
      twoFactorAuthentication: userPreferences.twoFactorAuthentication,
    });
  } catch (error) {
    console.error('Error fetching two-factor authentication status:', error);
    res.status(500).json({ message: 'Failed to fetch two-factor authentication status.', error });
  }
};



// Update two-factor authentication
// exports.updateTwoFactorAuthentication = async (req, res) => {
//   try {
//     const { userId, twoFactorAuthentication } = req.body;

//     // Fetch the user preferences using UserId
//     let userPreferences = await UserPreferences.findOne({ where: { UserId: userId } });

//     // If preferences do not exist, create them
//     if (!userPreferences) {
//       userPreferences = await UserPreferences.create({ 
//         UserId: userId, 
//         twoFactorAuthentication: twoFactorAuthentication 
//       });
//     } else {
//       // Update the twoFactorAuthentication field
//       userPreferences.twoFactorAuthentication = twoFactorAuthentication;
//       await userPreferences.save();
//     }

//     res.status(200).json({ message: 'Two-factor authentication updated successfully' });
//   } catch (error) {
//     console.error('Error updating two-factor authentication:', error);
//     res.status(500).json({ message: 'Failed to update two-factor authentication', error });
//   }
// };

// Send verification code to enable/disable twoFactorAuthentication
exports.sendVerificationCodeForTwoFactor = async (req, res) => {
  const { userId, enableTwoFactor } = req.body;

  try {
    if (!userId || typeof enableTwoFactor === 'undefined') {
      return res.status(400).json({ message: 'User ID and enableTwoFactor flag are required' });
    }

    const user = await User.findByPk(userId, { attributes: ['id', 'email'] });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find or create user preferences
    let preferences = await UserPreferences.findOne({ where: { UserId: user.id } });
    if (!preferences) {
      preferences = await UserPreferences.create({ UserId: user.id });
    }

    // Generate a new 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    // Set code expiry to 2 minutes from now
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 2);

    // Save code and expiry in userPreferences
    preferences.twoFactorVerificationCode = verificationCode;
    preferences.twoFactorVerificationCodeExpires = expiry;
    preferences.twoFactorRequestedValue = enableTwoFactor; // Store the requested value (true/false) to be applied upon verification
    await preferences.save();

    // Send the verification code to user's email
    await sendEmail(
      user.email,
      'Two-Factor Authentication Change Verification',
      `Your verification code is: ${verificationCode}. It will expire at ${expiry.toLocaleTimeString()}.`
    );

    return res.status(200).json({
      message: 'Verification code sent successfully for changing two-factor authentication setting. It will expire in 2 minutes.'
    });
  } catch (error) {
    console.error('Error sending two-factor verification code:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Resend verification code for twoFactorAuthentication
exports.resendVerificationCodeForTwoFactor = async (req, res) => {
  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    const user = await User.findByPk(userId, { attributes: ['id', 'email'] });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Fetch user preferences
    let preferences = await UserPreferences.findOne({ where: { UserId: user.id } });
    if (!preferences) {
      return res.status(404).json({ message: 'User preferences not found. Please request code first.' });
    }

    // Generate a new 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 2);

    // Update preferences with new code
    preferences.twoFactorVerificationCode = verificationCode;
    preferences.twoFactorVerificationCodeExpires = expiry;
    await preferences.save();

    // Resend the verification code to the user's email
    await sendEmail(
      user.email,
      'Resend: Two-Factor Authentication Change Verification',
      `Your new verification code is: ${verificationCode}. It expires in 2 minutes.`
    );

    return res.status(200).json({ message: 'Verification code resent successfully.' });
  } catch (error) {
    console.error('Error resending two-factor verification code:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify the twoFactor code and update the preference if valid
exports.verifyTwoFactorCodeAndUpdate = async (req, res) => {
  const { userId, verificationCode } = req.body;

  try {
    if (!userId || !verificationCode) {
      return res.status(400).json({ message: 'User ID and verification code are required' });
    }

    const user = await User.findByPk(userId, { attributes: ['id', 'email'] });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch user preferences
    const preferences = await UserPreferences.findOne({ where: { UserId: user.id } });
    if (!preferences || !preferences.twoFactorVerificationCode || !preferences.twoFactorVerificationCodeExpires) {
      return res.status(400).json({ message: 'No verification code was requested for two-factor changes.' });
    }

    // Verify the code
    const currentTime = new Date();
    const expiryTime = new Date(preferences.twoFactorVerificationCodeExpires);

    if (
      preferences.twoFactorVerificationCode !== parseInt(verificationCode, 10) ||
      currentTime > expiryTime
    ) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Code is valid, update twoFactorAuthentication setting
    preferences.twoFactorAuthentication = preferences.twoFactorRequestedValue;
    // Clear code and expiry from preferences
    preferences.twoFactorVerificationCode = null;
    preferences.twoFactorVerificationCodeExpires = null;
    preferences.twoFactorRequestedValue = null;

    await preferences.save();

    return res.status(200).json({ 
      message: 'Two-factor authentication setting updated successfully.',
      twoFactorAuthentication: preferences.twoFactorAuthentication
    });
  } catch (error) {
    console.error('Error verifying two-factor code and updating:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// Update email notifications preference
exports.updateEmailNotifications = async (req, res) => {
  const { userId, emailNotifications } = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    const userPreferences = await user.getUserPreferences();
    await userPreferences.update({ emailNotifications });

    res.status(200).send({ message: 'Email notifications updated successfully' });
  } catch (error) {
    console.error('Error updating email notifications:', error);
    res.status(500).send({ message: 'Error updating email notifications', error });
  }
};


// Update device location preference
exports.updateDeviceLocation = async (req, res) => {
  try {
    const { userId } = req.params; // Get userId from URL params
    const { deviceLocation } = req.body; // Get diveLocation from request body

    if (!userId) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    // Fetch the user preferences using userId
    let userPreferences = await UserPreferences.findOne({ where: { userId } });

    // If preferences do not exist, create them
    if (!userPreferences) {
      userPreferences = await UserPreferences.create({ 
        UserId: userId, // Make sure to include userId here
        deviceLocation: deviceLocation 
      });
    } else {
      // Update the diveLocation field
      userPreferences.deviceLocation = deviceLocation;
      await userPreferences.save();
    }

    res.status(200).json({ message: 'Device location preference updated successfully' });
  } catch (error) {
    console.error('Error updating device location preference:', error);
    res.status(500).json({ message: 'Failed to update device location preference', error });
  }
};



exports.updateLiveLocation = async (req, res) => {
  try {
    const { userId } = req.params; // Get userId from URL params
    const { liveLocation } = req.body; // Get liveLocation from the request body

    // Check if userId exists
    if (!userId) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    // Fetch the user preferences using UserId (case-sensitive)
    let userPreferences = await UserPreferences.findOne({ where: { UserId: userId } });

    // If preferences do not exist, create them
    if (!userPreferences) {
      userPreferences = await UserPreferences.create({
        UserId: userId, // Ensure proper case for the UserId
        liveLocation: liveLocation 
      });
    } else {
      // Update the liveLocation field
      userPreferences.liveLocation = liveLocation;
      await userPreferences.save();
    }

    res.status(200).json({ message: 'Live location preference updated successfully' });
  } catch (error) {
    console.error('Error updating live location preference:', error);
    res.status(500).json({ message: 'Failed to update live location preference', error });
  }
};


// Get device location preference
exports.getDeviceLocationPreference = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch the user preferences using userId
    let userPreferences = await UserPreferences.findOne({ where: {  UserId: userId  } });

    // If preferences do not exist, create default preferences
    if (!userPreferences) {
      userPreferences = await UserPreferences.create({ 
        UserId: userId, 
        deviceLocation: false // Default value for diveLocation
      });
    }

    res.status(200).json({ deviceLocation: userPreferences.deviceLocation });
  } catch (error) {
    console.error('Error fetching device location preference:', error);
    res.status(500).json({ message: 'Failed to fetch device location preference', error });
  }
};

// Get live location preference
exports.getLiveLocationPreference = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch the user preferences using userId
    let userPreferences = await UserPreferences.findOne({ where: { userId } });

    // If preferences do not exist, create default preferences
    if (!userPreferences) {
      userPreferences = await UserPreferences.create({ 
        userId: userId, 
        liveLocation: false // Default value for liveLocation
      });
    }

    res.status(200).json({ liveLocation: userPreferences.liveLocation });
  } catch (error) {
    console.error('Error fetching live location preference:', error);
    res.status(500).json({ message: 'Failed to fetch live location preference', error });
  }
};

exports.updateUserPhoneNumber = async (req, res) => {
  const { userId, phoneNumber, countryCode } = req.body;

  try {
    // Check if userId, phoneNumber, and countryCode are provided
    if (!userId) {
      return res.status(400).send({ message: 'User ID is required' });
    }
    if (!phoneNumber || !countryCode) {
      return res.status(400).send({ message: 'Phone number and country code are required' });
    }

    // Find the user's contact details
    let userDetails = await UserContactDetails.findOne({ where: { UserId: userId } });

    if (!userDetails) {
      // If no contact details exist, create a new record
      userDetails = await UserContactDetails.create({
        UserId: userId,
        phoneNumber: phoneNumber,
        countryCode: countryCode
      });
      return res.status(201).send({ message: 'Phone number created successfully' });
    }

    // Update existing contact details with new phone number and country code
    await userDetails.update({
      phoneNumber: phoneNumber,
      countryCode: countryCode
    });

    res.status(200).send({ message: 'Phone number updated successfully' });
  } catch (error) {
    console.error('Error updating phone number:', error);
    res.status(500).send({ message: 'Error updating phone number', error: error.message || error });
  }
};


exports.getUserPhoneNumber = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!userId) {
      return res.status(400).send({ message: 'User ID is required' });
    }

    let userDetails = await UserContactDetails.findOne({
      where: { UserId: userId },
      attributes: ['phoneNumber', 'countryCode']
    });

    if (!userDetails) {
      return res.status(404).send({ message: 'User details not found' });
    }

    res.status(200).send({
      phoneNumber: userDetails.phoneNumber,
      countryCode: userDetails.countryCode
    });
  } catch (error) {
    console.error('Error fetching phone number:', error);
    res.status(500).send({ message: 'Error fetching phone number', error: error.message || error });
  }
};




/**
 * Get the appearance preference for a user by userId.
 */
/**
 * Get the appearance preference for a user by userId, or create default preferences if not found.
 */
exports.getAppearance = async (req, res) => {
  try {
    const { userId } = req.params; // Extract userId from the request params

    // Try to find the user's preferences
    let preferences = await UserPreferences.findOne({ where: { UserId: userId } });

    // If no preferences are found, create default preferences
    if (!preferences) {
      preferences = await UserPreferences.create({
        UserId: userId,
        appearance: 'light' // Default appearance is 'light'
      });
    }

    res.status(200).json({ appearance: preferences.appearance });
  } catch (error) {
    console.error('Error fetching appearance preference:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Update the appearance preference for a user by userId.
 */
exports.setAppearance = async (req, res) => {
  try {
    const { userId } = req.params; // Extract userId from the request params
    const { appearance } = req.body; // Get the appearance value from the request body

    // Validate the appearance value
    if (!['light', 'dark'].includes(appearance)) {
      return res.status(400).json({ message: 'Invalid appearance value. It must be either "light" or "dark".' });
    }

    // Find the user's preferences
    const preferences = await UserPreferences.findOne({ where: { UserId: userId } });

    if (!preferences) {
      return res.status(404).json({ message: 'User preferences not found.' });
    }

    // Update the appearance preference
    preferences.appearance = appearance;
    await preferences.save();

    res.status(200).json({ message: 'Appearance preference updated successfully.', appearance: preferences.appearance });
  } catch (error) {
    console.error('Error updating appearance preference:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Get Communication Method Preference
 */
exports.getCommunicationMethod = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    // Fetch the user preferences using UserId
    let preferences = await UserPreferences.findOne({ where: { UserId: userId } });

    // If no preferences are found, create default preferences
    if (!preferences) {
      preferences = await UserPreferences.create({
        UserId: userId,
        communicationMethod: 'text', // Default communication method
      });
    }

    res.status(200).json({ communicationMethod: preferences.communicationMethod });
  } catch (error) {
    console.error('Error fetching communication method preference:', error);
    res.status(500).json({ message: 'Failed to fetch communication method preference.', error: error.message || error });
  }
};

/**
 * Update Communication Method Preference
 */
exports.updateCommunicationMethod = async (req, res) => {
  try {
    const { userId } = req.params;
    const { communicationMethod } = req.body;

    const validMethods = ['call', 'text', 'both'];
    if (!validMethods.includes(communicationMethod)) {
      return res.status(400).json({
        message: `Invalid communication method. It must be one of: ${validMethods.join(', ')}.`,
      });
    }

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    // Find the user's preferences
    const preferences = await UserPreferences.findOne({ where: { UserId: userId } });

    if (!preferences) {
      return res.status(404).json({ message: 'User preferences not found.' });
    }

    // Update the communicationMethod preference
    preferences.communicationMethod = communicationMethod;
    await preferences.save();

    res.status(200).json({
      message: 'Communication method preference updated successfully.',
      communicationMethod: preferences.communicationMethod,
    });
  } catch (error) {
    console.error('Error updating communication method preference:', error);
    res.status(500).json({ message: 'Failed to update communication method preference.', error: error.message || error });
  }
};

/**
 * Get Notifications Preference
 */
exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    // Fetch the user preferences using UserId
    let preferences = await UserPreferences.findOne({ where: { UserId: userId } });

    // If no preferences are found, create default preferences
    if (!preferences) {
      preferences = await UserPreferences.create({
        UserId: userId,
        notifications: true, // Default is enabled
      });
    }

    res.status(200).json({ notifications: preferences.notifications });
  } catch (error) {
    console.error('Error fetching notifications preference:', error);
    res.status(500).json({ message: 'Failed to fetch notifications preference.', error: error.message || error });
  }
};

/**
 * Update Notifications Preference
 */
exports.updateNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { notifications } = req.body;

    if (typeof notifications !== 'boolean') {
      return res.status(400).json({ message: 'Notifications must be a boolean value.' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    // Find the user's preferences
    const preferences = await UserPreferences.findOne({ where: { UserId: userId } });

    if (!preferences) {
      return res.status(404).json({ message: 'User preferences not found.' });
    }

    // Update the notifications preference
    preferences.notifications = notifications;
    await preferences.save();

    res.status(200).json({
      message: 'Notifications preference updated successfully.',
      notifications: preferences.notifications,
    });
  } catch (error) {
    console.error('Error updating notifications preference:', error);
    res.status(500).json({ message: 'Failed to update notifications preference.', error: error.message || error });
  }
};

/**
 * Get Email Notifications Preference
 */
exports.getEmailNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    // Fetch the user preferences using UserId
    let preferences = await UserPreferences.findOne({ where: { UserId: userId } });

    // If no preferences are found, create default preferences
    if (!preferences) {
      preferences = await UserPreferences.create({
        UserId: userId,
        emailNotifications: true, // Default is enabled
      });
    }

    res.status(200).json({ emailNotifications: preferences.emailNotifications });
  } catch (error) {
    console.error('Error fetching email notifications preference:', error);
    res.status(500).json({ message: 'Failed to fetch email notifications preference.', error: error.message || error });
  }
};

/**
 * Update Email Notifications Preference
 */
exports.updateEmailNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { emailNotifications } = req.body;

    if (typeof emailNotifications !== 'boolean') {
      return res.status(400).json({ message: 'Email notifications must be a boolean value.' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    // Find the user's preferences
    const preferences = await UserPreferences.findOne({ where: { UserId: userId } });

    if (!preferences) {
      return res.status(404).json({ message: 'User preferences not found.' });
    }

    // Update the emailNotifications preference
    preferences.emailNotifications = emailNotifications;
    await preferences.save();

    res.status(200).json({
      message: 'Email notifications preference updated successfully.',
      emailNotifications: preferences.emailNotifications,
    });
  } catch (error) {
    console.error('Error updating email notifications preference:', error);
    res.status(500).json({ message: 'Failed to update email notifications preference.', error: error.message || error });
  }
};


// Update FCM Token
exports.updateFcmToken = async (req, res) => {
  const { userId, fcmToken } = req.body;

  try {
    if (!userId || !fcmToken) {
      return res.status(400).json({ message: 'User ID and FCM token are required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.update({ fcmToken });

    res.status(200).json({ message: 'FCM token updated successfully', fcmToken });
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({ message: 'Failed to update FCM token', error });
  }
};

exports.removeFcmToken = async (req, res) => {
  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set the FCM token to null or an empty string
    await user.update({ fcmToken: null });

    res.status(200).json({ message: 'FCM token removed successfully' });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({ message: 'Failed to remove FCM token', error });
  }
};

// Controller method to get FCM token for a user
exports.getFcmToken = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the FCM token
    res.status(200).json({ fcmToken: user.fcmToken });
  } catch (error) {
    console.error('Error fetching FCM token:', error);
    res.status(500).json({ message: 'Failed to fetch FCM token', error });
  }
};




// Add a service to browsing history
exports.addBrowsingHistory = async (req, res) => {
  const { userId, serviceId } = req.body;

  try {
    // Check if the service already exists in the browsing history
    const existingEntry = await BrowsingHistory.findOne({
      where: { userId, serviceId }
    });

    if (existingEntry) {
      // Update the viewedAt timestamp instead of adding a duplicate entry
      await existingEntry.update({ viewedAt: new Date() });

      return res.status(200).json({
        message: 'Browsing history updated',
        data: existingEntry
      });
    }

    // If not found, create a new browsing history entry
    const newEntry = await BrowsingHistory.create({ userId, serviceId, viewedAt: new Date() });

    res.status(201).json({
      message: 'Added to browsing history',
      data: newEntry
    });
  } catch (error) {
    console.error('Error adding to browsing history:', error);
    res.status(500).json({ message: 'Failed to add to browsing history', error });
  }
};

// Get browsing history for a user with search functionality (without duplicates)
exports.getBrowsingHistory = async (req, res) => {
  const userId = req.params.userId;
  const searchQuery = req.query.search || '';

  try {
    const history = await BrowsingHistory.findAll({
      where: { userId },
      attributes: [
        'serviceId',
        [Sequelize.fn('MAX', Sequelize.col('viewedAt')), 'latestViewedAt']
      ],
      group: ['serviceId'],
      include: [
        {
          model: Service,
          attributes: ['id', 'name', 'description', 'image'],
          where: searchQuery
            ? {
                [Op.or]: [
                  { name: { [Op.like]: `%${searchQuery}%` } },
                  { description: { [Op.like]: `%${searchQuery}%` } }
                ]
              }
            : undefined
        }
      ],
      order: [[Sequelize.fn('MAX', Sequelize.col('viewedAt')), 'DESC']]
    });

    res.status(200).json({
      message: 'Browsing history fetched successfully',
      data: history
    });
  } catch (error) {
    console.error('Error fetching browsing history:', error);
    res.status(500).json({ message: 'Failed to fetch browsing history', error });
  }
};

// Remove a specific item from browsing history
exports.removeBrowsingHistoryItem = async (req, res) => {
  const { userId, historyId } = req.body;

  try {
    const historyItem = await BrowsingHistory.findOne({
      where: { id: historyId, userId }
    });

    if (!historyItem) {
      return res.status(404).json({ message: 'Browsing history item not found' });
    }

    await historyItem.destroy();
    res.status(200).json({ message: 'Browsing history item removed successfully' });
  } catch (error) {
    console.error('Error removing browsing history item:', error);
    res.status(500).json({ message: 'Failed to remove browsing history item', error });
  }
};

// Clear all browsing history for a user
exports.clearBrowsingHistory = async (req, res) => {
  const userId = req.params.userId;

  try {
    await BrowsingHistory.destroy({ where: { userId } });
    res.status(200).json({ message: 'Browsing history cleared successfully' });
  } catch (error) {
    console.error('Error clearing browsing history:', error);
    res.status(500).json({ message: 'Failed to clear browsing history', error });
  }
};


exports.updateEmailWithVerification = async (req, res) => {
  const { userId, newEmail, verificationCode } = req.body;

  try {
    if (!userId || !newEmail || !verificationCode) {
      return res.status(400).json({ message: 'User ID, new email, and verification code are required' });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify the code
    const currentTime = new Date();
    const expiryTime = new Date(user.verificationCodeExpires);

    if (
      user.verificationCode !== parseInt(verificationCode, 10) ||
      currentTime > expiryTime
    ) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Update the email and clear the verification code
    user.email = newEmail;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    res.status(200).json({ message: 'Email updated successfully' });
  } catch (error) {
    console.error('Error updating email with verification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.sendVerificationCodeForEmailUpdate = async (req, res) => {
  const { userId, newEmail } = req.body;

  try {
    if (!userId || !newEmail) {
      return res.status(400).json({ message: 'User ID and new email are required' });
    }

    // Find the user attempting to update their email
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the new email is already in use by another user
    const existingUser = await User.findOne({ where: { email: newEmail } });
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ message: 'This email is already used by another account' });
    }

    // Check if a verification code is already set and not expired
    const currentTime = new Date();
    if (user.verificationCodeExpires && new Date(user.verificationCodeExpires) > currentTime) {
      return res.status(400).json({
        message: `A verification code was already sent and is valid until ${new Date(
          user.verificationCodeExpires
        ).toLocaleTimeString()}`,
      });
    }

    // Generate a new 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    // Set expiry to 2 minutes from now
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 2);

    // Save the code and expiry
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = expiry;
    await user.save();

    // Send the verification code to the new email
    await sendEmail(
      newEmail,
      'Verify Your Email Update',
      `Your verification code is: ${verificationCode}. The code will expire at ${expiry.toLocaleTimeString()}.`
    );

    res.status(200).json({
      message: 'Verification code sent successfully. It will expire in 2 minutes.',
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.resendVerificationCodeForEmailUpdate = async (req, res) => {
  const { userId, newEmail } = req.body;

  try {
    if (!userId || !newEmail) {
      return res.status(400).json({ message: 'User ID and new email are required' });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a new 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    // Set expiry to 2 minutes from now
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 2);

    // Save the new code and expiry
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = expiry;
    await user.save();

    // Resend the verification code to the new email
    await sendEmail(
      newEmail,
      'Resend: Verify Your Email Update',
      `Your verification code is: ${verificationCode}`
    );

    res.status(200).json({ message: 'Verification code resent successfully' });
  } catch (error) {
    console.error('Error resending verification code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.verifyCodeForEmailUpdate = async (req, res) => {
  const { userId, verificationCode } = req.body;

  try {
    if (!userId || !verificationCode) {
      return res.status(400).json({ message: 'User ID and verification code are required' });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify the code
    const currentTime = new Date();
    const expiryTime = new Date(user.verificationCodeExpires);

    if (
      user.verificationCode !== parseInt(verificationCode, 10) ||
      currentTime > expiryTime
    ) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Code is valid
    res.status(200).json({ message: 'Verification code is valid' });
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Update user description
exports.updateUserDescription = async (req, res) => {
  const { userId, description } = req.body;

  try {
    if (!userId) {
      return res.status(400).send({ message: 'User ID is required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Update the description field
    await user.update({ description });

    res.status(200).send({ message: 'User description updated successfully', description });
  } catch (error) {
    console.error('Error updating user description:', error);
    res.status(500).send({ message: 'Error updating user description', error });
  }
};

// Get user description
exports.getUserDescription = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findByPk(userId, {
      attributes: ['description'] // Fetch only the description field
    });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.status(200).send({ description: user.description });
  } catch (error) {
    console.error('Error fetching user description:', error);
    res.status(500).send({ message: 'Error fetching user description', error });
  }
};

// Save a ZIP code to user's recent list (keep last 3 unique)
exports.addUserZipCode = async (req, res) => {
  const { userId } = req.params;
  const { zipCode } = req.body;

  try {
    if (!userId || !zipCode) {
      return res.status(400).json({ message: 'userId and zipCode are required' });
    }

    const normalized = `ZIP:${zipCode}`;

    const existing = await RecentSearch.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    const zipEntries = existing.filter(r => typeof r.query === 'string' && r.query.startsWith('ZIP:'));

    const duplicate = zipEntries.find(r => r.query === normalized);
    if (duplicate) {
      await duplicate.destroy();
    }

    const toDelete = zipEntries.slice(2); // keep two; we'll add one new -> total 3
    for (const del of toDelete) {
      await del.destroy();
    }

    const created = await RecentSearch.create({ userId, query: normalized });

    return res.status(201).json({ message: 'ZIP saved', id: created.id });
  } catch (error) {
    console.error('addUserZipCode error:', error);
    return res.status(500).json({ message: 'Failed to save zip code' });
  }
};

// Get last ZIP codes for user (max 3)
exports.getUserZipCodes = async (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit || '3', 10);

  try {
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const recents = await RecentSearch.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    const zips = recents
      .map(r => (typeof r.query === 'string' ? r.query : ''))
      .filter(q => q.startsWith('ZIP:'))
      .map(q => q.replace('ZIP:', ''))
      .filter((zip, idx, arr) => arr.indexOf(zip) === idx)
      .slice(0, limit);

    return res.status(200).json({ userId, zips });
  } catch (error) {
    console.error('getUserZipCodes error:', error);
    return res.status(500).json({ message: 'Failed to get zip codes' });
  }
};

// Clear all saved ZIP codes for user
exports.clearUserZipCodes = async (req, res) => {
  const { userId } = req.params;
  try {
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const recents = await RecentSearch.findAll({ where: { userId } });
    const toDelete = recents.filter(r => typeof r.query === 'string' && r.query.startsWith('ZIP:'));
    for (const row of toDelete) {
      await row.destroy();
    }
    return res.status(200).json({ message: 'ZIP history cleared' });
  } catch (error) {
    console.error('clearUserZipCodes error:', error);
    return res.status(500).json({ message: 'Failed to clear zip codes' });
  }
};



exports.sendForgotPasswordCode = async (req, res) => {
  const { userId, email } = req.body; // Expect userId and email from the request body

  try {
    // Validate that userId and email are provided
    if (!userId || !email) {
      return res.status(400).json({ message: 'User ID and email are required.' });
    }

    // Find the user by ID
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Verify if the provided email matches the user's email
    if (user.email !== email) {
      return res.status(400).json({ message: 'The provided email does not match the user account.' });
    }

    // Generate a 6-digit verification code and set expiry (2 minutes)
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    const codeExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes validity

    // Save the code and expiry in the user record
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = codeExpiry;
    await user.save();

    // Send the code via email
    await sendEmail(
      email,
      'Reset Password Code',
      `Your verification code is: ${verificationCode}. It expires in 2 minutes.`
    );

    // Respond with success message
    res.status(200).json({ message: 'Verification code sent successfully.' });
  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ message: 'Failed to send verification code.' });
  }
};

exports.resendForgotPasswordCode = async (req, res) => {
  const { userId, email } = req.body; // Expect userId and email from the request body

  try {
    // Validate that userId and email are provided
    if (!userId || !email) {
      return res.status(400).json({ message: 'User ID and email are required.' });
    }

    // Find the user by ID
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Verify if the provided email matches the user's email
    if (user.email !== email) {
      return res.status(400).json({ message: 'The provided email does not match the user account.' });
    }

    // Generate a new 6-digit verification code and set expiry (2 minutes)
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    const codeExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes validity

    // Save the new code and expiry in the user record
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = codeExpiry;
    await user.save();

    // Resend the code via email
    await sendEmail(
      email,
      'Resend: Reset Password Code',
      `Your new verification code is: ${verificationCode}. It expires in 2 minutes.`
    );

    // Respond with success message
    res.status(200).json({ message: 'Verification code resent successfully.' });
  } catch (error) {
    console.error('Error resending verification code:', error);
    res.status(500).json({ message: 'Failed to resend verification code.' });
  }
};
exports.resendForgotPasswordCode = async (req, res) => {
  const { userId, email } = req.body; // Expect userId and email from the request body

  try {
    // Validate that userId and email are provided
    if (!userId || !email) {
      return res.status(400).json({ message: 'User ID and email are required.' });
    }

    // Find the user by ID
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Verify if the provided email matches the user's email
    if (user.email !== email) {
      return res.status(400).json({ message: 'The provided email does not match the user account.' });
    }

    // Generate a new 6-digit verification code and set expiry (2 minutes)
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    const codeExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes validity

    // Save the new code and expiry in the user record
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = codeExpiry;
    await user.save();

    // Resend the code via email
    await sendEmail(
      email,
      'Resend: Reset Password Code',
      `Your new verification code is: ${verificationCode}. It expires in 2 minutes.`
    );

    // Respond with success message
    res.status(200).json({ message: 'Verification code resent successfully.' });
  } catch (error) {
    console.error('Error resending verification code:', error);
    res.status(500).json({ message: 'Failed to resend verification code.' });
  }
};





// Verify the 6-digit code
exports.verifyForgotPasswordCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Email not found' });

    // Check if the code matches and is not expired
    const currentTime = new Date();
    if (user.verificationCode !== parseInt(code) || currentTime > new Date(user.verificationCodeExpires)) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    // Code is valid, clear it and allow password reset
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    res.status(200).json({ message: 'Code verified successfully. Proceed to reset your password.' });
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ message: 'Failed to verify code' });
  }
};

// Reset the password without requiring the current password
exports.resetPasswordWithoutCurrent = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Email not found' });

    // Hash and update the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

// Returns unique participants for a user across all their bookings (no duplicates)
// GET /users/:userId/saved-participants
exports.getSavedParticipants = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Group by fields that define "same participant"
    const rows = await Participant.findAll({
      attributes: [
        // a representative id (lowest)
        [Sequelize.fn('MIN', Sequelize.col('Participant.id')), 'id'],
        'name',
        'surname',
        'age',
        'category',
        // helpful stats
        [Sequelize.fn('COUNT', '*'), 'timesUsed'],
        [Sequelize.fn('MAX', Sequelize.col('Participant.createdAt')), 'lastUsedAt'],
      ],
      include: [
        {
          model: Booking,
          attributes: [],
          where: { userId }, // only participants from this user's bookings
        },
      ],
      group: ['name', 'surname', 'age', 'category'],
      order: [[Sequelize.fn('MAX', Sequelize.col('Participant.createdAt')), 'DESC']],
      raw: true,
    });

    // Optional: normalize the shape a bit
    const saved = rows.map(r => ({
      id: Number(r.id),
      name: r.name,
      surname: r.surname,
      age: r.age === null ? null : Number(r.age),
      category: r.category, // 'Adult' | 'Teenager' | 'Child'
      timesUsed: Number(r.timesUsed),
      lastUsedAt: r.lastUsedAt,
    }));

    return res.status(200).json({ participants: saved });
  } catch (error) {
    console.error('Error fetching saved participants:', error);
    return res.status(500).json({ message: 'Failed to fetch saved participants' });
  }
};
