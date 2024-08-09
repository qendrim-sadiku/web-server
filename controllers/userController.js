// controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcrypt');
const fs = require('fs');
const multer = require('multer');

const path = require('path');

const UserContactDetails = require('../models/UserProfile/UserContactDetails');
const Address = require('../models/UserProfile/Address');
const MeetingPoint = require('../models/UserProfile/MeetingPoint');
const UserDetails = require('../models/UserProfile/UserDetails');
const PaymentInfo = require('../models/UserProfile/PaymentInfo');


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

// Update user profile (including all details)
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
          attributes: ['country', 'city', 'street', 'zipCode'] // Add all necessary attributes
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



// Update password
exports.updatePassword = async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    user.password = hashedNewPassword;
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePaymentInfo = async (req, res) => {
  const { userId, paymentInfo } = req.body;

  try {
    if (!userId) {
      return res.status(400).send({ message: 'User ID is required' });
    }

    let user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    await PaymentInfo.upsert({ ...paymentInfo, UserId: user.id });
    res.status(200).send({ message: 'Payment info updated successfully' });
  } catch (error) {
    console.error('Error updating payment info:', error);
    res.status(500).send({ message: 'Error updating payment info', error: error.message || error });
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




exports.updateUserDetails = async (req, res) => {
  const { userId, userDetails } = req.body;

  try {
    if (!userId) {
      return res.status(400).send({ message: 'User ID is required' });
    }

    let user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Update the user details in both User and UserDetails models
    await user.update({
      name: userDetails.name,
      surname: userDetails.surname,
      username: userDetails.username
    });

    await UserDetails.upsert({
      birthDate: userDetails.birthDate,
      gender: userDetails.gender,
      UserId: user.id
    });

    res.status(200).send({ message: 'User details updated successfully' });
  } catch (error) {
    console.error('Error updating user details:', error);
    res.status(500).send({ message: 'Error updating user details', error: error.message || error });
  }
};

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


// controllers/userProfileController.js
exports.updateAddress = async (req, res) => {
  const { userId, address } = req.body;

  try {
    if (!userId) {
      return res.status(400).send({ message: 'User ID is required' });
    }

    let user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    if (!address.country || !address.city || !address.street) {
      return res.status(400).send({ message: 'Address must include country, city, and street' });
    }

    await Address.upsert({ ...address, UserId: user.id });
    res.status(200).send({ message: 'Address updated successfully' });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).send({ message: 'Error updating address', error: error.message || error });
  }
};


// Get user profile
exports.getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      attributes: ['id', 'username', 'email', 'name', 'surname', 'password', 'role', 'createdAt', 'updatedAt'] // Add all necessary attributes
    });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching user', error });
  }
};

// Get user address
exports.getUserAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      where: { userId: req.params.userId },
      attributes: ['country', 'city', 'street', 'zipCode'], // Add all necessary attributes
      order: [['updatedAt', 'DESC']] // Order by the updated timestamp to get the latest address
    });

    if (!address) {
      return res.status(200).send({ message: 'No address available', data: {} });
    }

    res.status(200).send(address);
  } catch (error) {
    console.error('Error fetching address:', error);
    res.status(500).send({ message: 'Error fetching address', error });
  }
};


exports.getUserContactDetails = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Fetch the most recent contact details for the user
    const contactDetails = await UserContactDetails.findOne({
      where: { userId: userId },
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


exports.getMeetingPoints = async (req, res) => {
  try {
    const userId = req.params.userId;
    // Fetch all meeting points for the user from the database
    const meetingPoints = await MeetingPoint.findAll({ where: { userId } });

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
    // Fetch the user details along with associated user data
    const userDetails = await UserDetails.findOne({
      where: { UserId: req.params.userId },
      attributes: ['birthDate', 'gender'],
      include: [{
        model: User,
        attributes: ['name', 'surname', 'username']
      }],
      order: [['updatedAt', 'DESC']]
    });

    // Fetch the user data separately if userDetails is not found
    let user;
    if (!userDetails) {
      user = await User.findByPk(req.params.userId, {
        attributes: ['name', 'surname', 'username']
      });

      if (!user) {
        return res.status(404).send({ message: 'User not found' });
      }
    }

    // Prepare the response data
    const response = {
      birthDate: userDetails ? userDetails.birthDate : null,
      gender: userDetails ? userDetails.gender : null,
      name: userDetails ? userDetails.User.name : user.name,
      surname: userDetails ? userDetails.User.surname : user.surname,
      username: userDetails ? userDetails.User.username : user.username
    };

    res.status(200).send(response);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).send({ message: 'Error fetching user details', error: error.message || error });
  }
};


exports.getUserPaymentInfo = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Fetch the most recent payment info for the user
    const paymentInfo = await PaymentInfo.findOne({
      where: { userId: userId },
      attributes: ['cardNumber', 'cardHolderName', 'cvv', 'expirationDate'], // Add all necessary attributes
      order: [['updatedAt', 'DESC']] // Ensure you have an updatedAt column for sorting
    });

    if (!paymentInfo) {
      return res.status(200).send({ message: 'No payment info available', data: {} });
    }

    res.status(200).send(paymentInfo);
  } catch (error) {
    console.error('Error fetching payment info:', error);
    res.status(500).send({ message: 'Error fetching payment info', error });
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

// Get user preferences
exports.getUserPreferences = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.status(200).json({
      sportPreference: user.sportPreference,
      expertisePreference: user.expertisePreference
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ message: 'Error fetching user preferences', error });
  }
};

