// controllers/subUserController.js

const crypto = require('crypto');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid'); // for unique tokens
const bcrypt = require('bcrypt');
const twilio = require('twilio');

const { Sequelize } = require('sequelize');

const Invitation = require('../models/Invitation');
const User = require('../models/User');
const UserDetails = require('../models/UserProfile/UserDetails');
const sendEmail = require('../config/emailService');
const sequelize = require('../config/sequelize');
const UserContactDetails = require('../models/UserProfile/UserContactDetails');

// Initialize Twilio Client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Accept an existing invitation and create a sub-user account.
 */
exports.acceptInvitation = async (req, res) => {
  try {
    const { token, password, email, firstName, lastName } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        message: 'Token and password are required',
      });
    }

    // 1. Find the invitation
    const invitation = await Invitation.findOne({ where: { token } });
    if (!invitation) {
      return res.status(404).json({ message: 'Invalid or expired invitation' });
    }

    // 2. Check if already used or expired
    if (invitation.used || new Date() > invitation.expiresAt) {
      return res.status(400).json({ message: 'Invitation has already been used or expired' });
    }

    // 3. Create the new User
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name: firstName || '',
      surname: lastName || '',
      email: email || '',
      password: hashedPassword,
      parentUserId: invitation.parentUserId,
    });

    // ✅ 4. Store birthDate in UserDetails from Invitation
    await UserDetails.create({
      UserId: newUser.id,
      birthDate: invitation.birthDate,
    });

    // ✅ 5. Update UserContactDetails to link it to the correct UserId
    await UserContactDetails.update(
      { UserId: newUser.id }, // Link to the real UserId
      { where: { UserId: invitation.id } } // Previously linked to the Invitation
    );

    // 6. Mark the invitation as used
    invitation.used = true;
    invitation.usedAt = new Date();
    await invitation.save();

    return res.status(201).json({
      message: 'Sub-user account created successfully',
      userId: newUser.id,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



/**
 * Invite a new sub-user (with birthDate).
 */
// exports.inviteSubUser = async (req, res) => {
//   try {
//     const { parentUserId, email, firstName, lastName, phoneNumber, birthDate } = req.body;

//     if (!parentUserId || !email || !phoneNumber || !birthDate) {
//       return res.status(400).json({
//         message: 'All fields including birthDate are required',
//       });
//     }

//     const parentUser = await User.findByPk(parentUserId);
//     if (!parentUser) {
//       return res.status(404).json({ message: 'Parent user not found' });
//     }

//     if (email === parentUser.email) {
//       return res
//         .status(400)
//         .json({ message: 'Cannot send an invitation to yourself.' });
//     }

//     const existingUser = await User.findOne({ where: { email } });
//     if (existingUser) {
//       return res.status(400).json({ message: 'User already exists.' });
//     }

//     const token = uuidv4();
//     const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
//     const inviteLink = `http://localhost:4200/accept-invite?token=${token}`;

//     await Invitation.create({
//       token,
//       parentUserId,
//       email,
//       name: `${firstName} ${lastName}`.trim(),
//       phoneNumber,
//       birthDate,
//       expiresAt,
//       used: false,
//     });

//     // Generate the HTML email
//     const emailBody = generateEmailTemplate(
//       firstName,
//       parentUser.name,
//       parentUser.email,
//       inviteLink,
//       expiresAt
//     );

//     // Send the email
//     await sendEmail(email, 'You’re Invited to Join Aroit!', emailBody);

//     // -----------------------------------------
//     //          ADDING TWILIO SMS BACK:
//     // -----------------------------------------
//     const smsBody = `
//       Hello ${firstName},
//       You have been invited to join Aroit by ${parentUser.name} (${parentUser.email}).
//       Please accept via: ${inviteLink}
//       (Expires: ${expiresAt.toLocaleString()})
//     `;
//     try {
//       await twilioClient.messages.create({
//         body: smsBody,
//         from: process.env.TWILIO_PHONE_NUMBER,
//         to: phoneNumber,
//       });
//       console.log(`SMS sent successfully to ${phoneNumber}`);
//     } catch (smsError) {
//       console.error('Error sending SMS:', smsError);
//     }
//     // -----------------------------------------

//     return res.status(200).json({
//       message: 'Invitation sent successfully',
//       token,
//       expiresAt,
//     });
//   } catch (error) {
//     console.error('Error inviting sub-user:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// };


exports.inviteSubUser = async (req, res) => {
  try {
    const { parentUserId, email, firstName, lastName, phoneNumber, countryCode, birthDate } = req.body;

    if (!parentUserId || !email || !phoneNumber || !countryCode || !birthDate) {
      return res.status(400).json({
        message: 'All fields including birthDate, countryCode, and phoneNumber are required',
      });
    }

    const parentUser = await User.findByPk(parentUserId);
    if (!parentUser) {
      return res.status(404).json({ message: 'Parent user not found' });
    }

    if (email === parentUser.email) {
      return res.status(400).json({ message: 'Cannot send an invitation to yourself.' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const inviteLink = `http://localhost:4200/accept-invite?token=${token}`;

    // ✅ Store the invitation
    const invitation = await Invitation.create({
      token,
      parentUserId,
      email,
      name: `${firstName} ${lastName}`.trim(),
      phoneNumber,
      countryCode,
      birthDate,
      expiresAt,
      used: false,
    });

    // ✅ Immediately store phone number in UserContactDetails
    await UserContactDetails.create({
      UserId: invitation.id, // Temporary association with Invitation ID
      phoneNumber,
      countryCode,
    });

    // Generate the HTML email
    const emailBody = generateEmailTemplate(
      firstName,
      parentUser.name,
      parentUser.email,
      inviteLink,
      expiresAt
    );

    // Send the email
    await sendEmail(email, 'You’re Invited to Join Aroit!', emailBody);

    // ✅ Send SMS with Twilio
    const formattedPhoneNumber = `${countryCode}${phoneNumber}`;
    const smsBody = `
      Hello ${firstName},
      You have been invited to join Aroit by ${parentUser.name} (${parentUser.email}).
      Please accept via: ${inviteLink}
      (Expires: ${expiresAt.toLocaleString()})
    `;

    try {
      await twilioClient.messages.create({
        body: smsBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhoneNumber,
      });
      console.log(`SMS sent successfully to ${formattedPhoneNumber}`);
    } catch (smsError) {
      console.error('Error sending SMS:', smsError);
    }

    return res.status(200).json({
      message: 'Invitation sent successfully',
      token,
      expiresAt,
    });
  } catch (error) {
    console.error('Error inviting sub-user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



/**
 * Get invitation details by token, including birthDate.
 */
exports.getInvitationDetails = async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findOne({ where: { token, used: false } });
    if (!invitation) {
      return res
        .status(404)
        .json({ message: 'Invitation not found or already used.' });
    }

    const parentUser = await User.findByPk(invitation.parentUserId);
    if (!parentUser) {
      return res
        .status(404)
        .json({ message: 'Parent user not found.' });
    }

    return res.status(200).json({
      user: {
        email: invitation.email,
        firstName: invitation.name.split(' ')[0],
        lastName: invitation.name.split(' ')[1],
        birthDate: invitation.birthDate,
      },
      parentEmail: parentUser.email,
    });
  } catch (error) {
    console.error('Error fetching invitation details:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Delete an invitation. If it has been used (i.e. the sub-user exists), delete that user as well.
 */
exports.deleteInvitation = async (req, res) => {
  try {
    const { invitationId } = req.body;

    // Find the invitation by ID
    const invitation = await Invitation.findByPk(invitationId);
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    // If the invitation was accepted (used), find the associated user
    if (invitation.used) {
      const user = await User.findOne({
        where: { email: invitation.email },
      });
      if (user) {
        // Delete the user
        await user.destroy();
      }
    }

    // Delete the invitation
    await invitation.destroy();

    return res.status(200).json({
      message: 'Invitation and associated user (if any) deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all sub-users (invitations) for a particular parent user, excluding expired invitations.
 */
exports.getUserSubUsers = async (req, res) => {
  try {
    const { parentUserId } = req.params;

    const parentUser = await User.findByPk(parentUserId);
    if (!parentUser) {
      return res.status(404).json({ message: 'Parent user not found' });
    }

    // Fetch all invitations that are either:
    // - Not expired
    // - Expired but already used
    const invitations = await Invitation.findAll({
      where: {
        parentUserId,
        [Op.or]: [
          { expiresAt: { [Op.gt]: new Date() } }, // Exclude expired invitations
          { used: true }, // Keep invitations that were accepted even if expired
        ],
      },
      attributes: [
        'id',
        'email',
        'name',
        'phoneNumber',
        'expiresAt',
        'used',
        'usedAt',
        'birthDate',
      ],
    });

    const processedInvitations = [];

    for (const invitation of invitations) {
      let invitedUser = null;
      let invitedUserId = null;
      let userBirthDate = invitation.birthDate;

      if (invitation.used && invitation.email) {
        invitedUser = await User.findOne({
          where: { email: invitation.email },
        });

        if (invitedUser) {
          invitedUserId = invitedUser.id;
          const userDetails = await UserDetails.findOne({
            where: { UserId: invitedUserId },
          });
          userBirthDate = userDetails ? userDetails.birthDate : null;
        } else {
          // Only remove invitations that are expired and not used
          if (!invitation.used) {
            await Invitation.destroy({ where: { id: invitation.id } });
          }
          continue;
        }
      }

      processedInvitations.push({
        id: invitation.id,
        email: invitation.email || null,
        name: invitation.name || null,
        phoneNumber: invitation.phoneNumber || null,
        expiresAt: invitation.expiresAt,
        used: invitation.used,
        usedAt: invitation.usedAt,
        userId: invitedUserId,
        birthDate: userBirthDate,
        status: invitation.used ? 'Accepted' : 'Pending',
      });
    }

    return res.status(200).json({
      parentUserId,
      invitations: processedInvitations,
    });
  } catch (error) {
    console.error('Error fetching sub-users:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


/**
 * Cancel an invitation by ID (DELETE).
 */
exports.cancelInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;

    if (!invitationId) {
      return res.status(400).json({ message: 'Invitation ID is required' });
    }

    const invitation = await Invitation.findByPk(invitationId);
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    await invitation.destroy();

    return res.status(200).json({ message: 'Invitation canceled successfully' });
  } catch (error) {
    console.error('❌ Error cancelling invitation:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get details of a specific sub-user, including birthDate.
 */
// exports.getSubUserDetails = async (req, res) => {
//   try {
//     const { subUserId } = req.params;

//     const subUser = await User.findByPk(subUserId, {
//       attributes: ['id', 'name', 'surname', 'email', 'createdAt', 'parentUserId'],
//     });
//     if (!subUser) {
//       return res.status(404).json({ message: 'Sub-user not found' });
//     }

//     let parentUser = null;
//     let birthDate = null;

//     if (subUser.parentUserId) {
//       parentUser = await User.findByPk(subUser.parentUserId, {
//         attributes: ['id', 'email', 'name'],
//       });
//     }

//     const userDetails = await UserDetails.findOne({
//       where: { UserId: subUser.id },
//     });
//     if (userDetails) {
//       birthDate = userDetails.birthDate;
//     }

//     return res.status(200).json({
//       id: subUser.id,
//       name: subUser.name,
//       surname: subUser.surname,
//       email: subUser.email,
//       createdAt: subUser.createdAt,
//       birthDate,
//       parentUser: parentUser
//         ? {
//             id: parentUser.id,
//             email: parentUser.email,
//             name: parentUser.name,
//           }
//         : null,
//     });
//   } catch (error) {
//     console.error('Error fetching sub-user details:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// };

exports.getSubUserDetails = async (req, res) => {
  try {
    const { subUserId } = req.params;

    const subUser = await User.findByPk(subUserId, {
      attributes: ['id', 'name', 'surname', 'email', 'createdAt', 'parentUserId'],
    });

    if (!subUser) {
      return res.status(404).json({ message: 'Sub-user not found' });
    }

    let parentUser = null;
    let birthDate = null;
    let phoneNumber = null;
    let countryCode = null;

    if (subUser.parentUserId) {
      parentUser = await User.findByPk(subUser.parentUserId, {
        attributes: ['id', 'email', 'name'],
      });
    }

    const userDetails = await UserDetails.findOne({
      where: { UserId: subUser.id },
    });

    if (userDetails) {
      birthDate = userDetails.birthDate;
    }

    const contactDetails = await UserContactDetails.findOne({
      where: { UserId: subUser.id },
      attributes: ['countryCode', 'phoneNumber'],
    });

    if (contactDetails) {
      countryCode = contactDetails.countryCode;
      phoneNumber = contactDetails.phoneNumber;
    }

    return res.status(200).json({
      id: subUser.id,
      name: subUser.name,
      surname: subUser.surname,
      email: subUser.email,
      createdAt: subUser.createdAt,
      birthDate,
      phoneNumber: phoneNumber ? `${countryCode} ${phoneNumber}` : null,
      parentUser: parentUser
        ? {
            id: parentUser.id,
            email: parentUser.email,
            name: parentUser.name,
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching sub-user details:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


/**
 * Delete a sub-user (who has already accepted an invitation).
 */
exports.deleteSubUser = async (req, res) => {
  try {
    const { subUserId } = req.params;

    const subUser = await User.findByPk(subUserId);
    if (!subUser) {
      return res.status(404).json({ message: 'Sub-user not found' });
    }

    if (!subUser.parentUserId) {
      return res.status(400).json({ message: 'This user is not a sub-user' });
    }

    await subUser.destroy();
    return res.status(200).json({ message: 'Sub-user deleted successfully' });
  } catch (error) {
    console.error('Error deleting sub-user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /invitations/:invitationId
 * Returns invitation details by ID, only if not used/expired (includes birthDate).
 */
exports.getInvitationById = async (req, res) => {
  try {
    const { invitationId } = req.params;

    const invitation = await Invitation.findByPk(invitationId);
    if (!invitation) {
      return res
        .status(404)
        .json({ message: 'Invitation not found.' });
    }

    if (invitation.used) {
      return res
        .status(400)
        .json({ message: 'Invitation already used.' });
    }
    if (new Date() > invitation.expiresAt) {
      return res
        .status(400)
        .json({ message: 'Invitation has expired.' });
    }

    const parentUser = await User.findByPk(invitation.parentUserId);

    return res.status(200).json({
      id: invitation.id,
      token: invitation.token,
      email: invitation.email,
      name: invitation.name,
      phoneNumber: invitation.phoneNumber,
      birthDate: invitation.birthDate,
      expiresAt: invitation.expiresAt,
      used: invitation.used,
      usedAt: invitation.usedAt,
      parentUserId: invitation.parentUserId,
      parentEmail: parentUser ? parentUser.email : null,
    });
  } catch (error) {
    console.error('Error fetching invitation by ID:', error);
    return res
      .status(500)
      .json({ message: 'Internal server error.' });
  }
};


exports.updateSubUser = async (req, res) => {
  try {
    const { subUserId } = req.params;
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      countryCode,
      birthDate
    } = req.body;

    // 1. Find the sub-user (User table)
    const subUser = await User.findByPk(subUserId);
    if (!subUser) {
      return res.status(404).json({ message: 'Sub-user not found' });
    }

    // 2. Ensure it’s actually a sub-user
    if (!subUser.parentUserId) {
      return res.status(400).json({ message: 'This user is not a sub-user' });
    }

    // 3. Update User basic info (User table)
    subUser.name = firstName || subUser.name;
    subUser.surname = lastName || subUser.surname;
    subUser.email = email || subUser.email;
    await subUser.save();

    // 4. Update birthDate in UserDetails table
    let userDetails = await UserDetails.findOne({ where: { UserId: subUserId } });
    if (!userDetails && birthDate) {
      userDetails = await UserDetails.create({
        UserId: subUserId,
        birthDate: birthDate,
      });
    } else if (userDetails && birthDate) {
      userDetails.birthDate = birthDate;
      await userDetails.save();
    }

    // 5. Update phoneNumber and countryCode in UserContactDetails table
    let contactDetails = await UserContactDetails.findOne({ where: { UserId: subUserId } });
    if (!contactDetails && (phoneNumber || countryCode)) {
      contactDetails = await UserContactDetails.create({
        UserId: subUserId,
        phoneNumber: phoneNumber || '',
        countryCode: countryCode || '',
      });
    } else if (contactDetails) {
      contactDetails.phoneNumber = phoneNumber || contactDetails.phoneNumber;
      contactDetails.countryCode = countryCode || contactDetails.countryCode;
      await contactDetails.save();
    }

    // 6. [NEW] Also update the Invitation's name to match the new first/last name
    //    (Only if the invitation still exists for this sub-user).
    const invitation = await Invitation.findOne({
      where: {
        email: subUser.email,             // match email
        parentUserId: subUser.parentUserId,
        used: true                        // because they accepted
      }
    });
    if (invitation) {
      invitation.name = `${firstName} ${lastName}`.trim();
      await invitation.save();
    }

    return res.status(200).json({ message: 'Sub-user updated successfully' });
  } catch (error) {
    console.error('Error updating sub-user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


/**
 * Delete Family Account - Deletes all sub-users and invitations for a given parent user.
 */
exports.deleteFamilyAccount = async (req, res) => {
  const { parentUserId } = req.params;

  const transaction = await sequelize.transaction(); // Start transaction

  try {
    const parentUser = await User.findByPk(parentUserId);
    if (!parentUser) {
      return res.status(404).json({ message: 'Parent user not found' });
    }

    // 1️⃣ Find and delete all sub-users associated with the parentUserId
    const subUsers = await User.findAll({ where: { parentUserId } });
    for (const subUser of subUsers) {
      await UserDetails.destroy({ where: { UserId: subUser.id }, transaction });
      await subUser.destroy({ transaction }); // Delete sub-user
    }

    // 2️⃣ Delete all invitations associated with the parent user
    await Invitation.destroy({ where: { parentUserId }, transaction });

    await transaction.commit(); // ✅ Commit transaction if everything succeeded

    return res.status(200).json({ message: 'Family account and all sub-users deleted successfully' });
  } catch (error) {
    await transaction.rollback(); // ❌ Rollback transaction if anything fails
    console.error('Error deleting family account:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /resend-invite
 * Resends an invitation by generating a new token and updating expiry.
 */
exports.resendInvite = async (req, res) => {
  try {
    const { invitationId } = req.body;

    if (!invitationId) {
      return res
        .status(400)
        .json({ message: 'Invitation ID is required' });
    }

    const invitation = await Invitation.findByPk(invitationId);
    if (!invitation) {
      return res
        .status(404)
        .json({ message: 'Invitation not found.' });
    }

    if (invitation.used) {
      return res
        .status(400)
        .json({ message: 'Cannot resend an already used invitation.' });
    }

    const newToken = uuidv4();
    const newExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const inviteLink = `http://localhost:4200/accept-invite?token=${newToken}`;

    invitation.token = newToken;
    invitation.expiresAt = newExpiresAt;
    await invitation.save();

    const parentUser = await User.findByPk(invitation.parentUserId);
    if (!parentUser) {
      return res
        .status(404)
        .json({ message: 'Parent user not found.' });
    }

    const emailBody = generateEmailTemplate(
      invitation.name,
      parentUser.name,
      parentUser.email,
      inviteLink,
      newExpiresAt
    );

    await sendEmail(invitation.email, 'Your Invitation Has Been Resent', emailBody);

    // If you also want to re-send SMS on invitation resend, uncomment here:
    
    const smsBody = `
      Hi ${invitation.name || ''},
      Your Aroit invitation has been resent by ${parentUser.name} (${parentUser.email}).
      Accept here: ${inviteLink}
      (Expires: ${newExpiresAt.toLocaleString()})
    `;
    try {
      await twilioClient.messages.create({
        body: smsBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: invitation.phoneNumber, // Make sure phoneNumber is valid
      });
      console.log(`SMS resent successfully to ${invitation.phoneNumber}`);
    } catch (smsError) {
      console.error('Error resending SMS:', smsError);
    }
 

    return res.status(200).json({
      message: 'Invitation resent successfully',
      newToken,
      newExpiresAt,
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    return res
      .status(500)
      .json({ message: 'Internal server error.' });
  }
};

/**
 * Generates an HTML email template. 
 * 
 * @param {string} recipientName - The name of the invited user
 * @param {string} senderName - The name of the user sending the invite
 * @param {string} senderEmail - The email of the user sending the invite
 * @param {string} inviteLink - The link to accept the invite
 * @param {Date} expiresAt - The expiration date/time of the invitation
 * @returns {string} HTML string
 */
const generateEmailTemplate = (
  recipientName,
  senderName,
  senderEmail,
  inviteLink,
  expiresAt
) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Aroit Invitation</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          .container {
            width: 600px;
            background-color: #ffffff;
            margin: 30px auto;
            padding: 20px;
            box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
            border-collapse: collapse;
          }
          .header {
            text-align: center;
            padding: 20px;
            background-color: #007bff;
            color: #ffffff;
          }
          .content {
            padding: 20px;
            color: #333;
          }
          .button-container {
            text-align: center;
            margin: 20px 0;
          }
          .button {
            background-color: #007bff;
            color: #ffffff;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            font-size: 16px;
          }
          .footer {
            text-align: center;
            padding: 15px;
            background-color: #f5f5f5;
            font-size: 14px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <table class="container">
          <tr>
            <td class="header">
              <h2>Aroit Invitation</h2>
            </td>
          </tr>
          <tr>
            <td class="content">
              <p style="font-size: 16px;">Hello <strong>${recipientName}</strong>,</p>
              <p style="font-size: 16px;">
                You have been invited to join <strong>Aroit</strong> by 
                <strong>${senderName}</strong> (<em>${senderEmail}</em>).
              </p>
              <p style="font-size: 16px;">
                Click the button below to set up your account:
              </p>
              <p class="button-container">
                <a href="${inviteLink}" class="button">Accept Invitation</a>
              </p>
              <p style="font-size: 16px;">
                This invitation will expire on <strong>${expiresAt.toLocaleString()}</strong>.
              </p>
              <p style="font-size: 16px;">
                If you did not request this invitation, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p>Regards, <br><strong>The Aroit Team</strong></p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};
