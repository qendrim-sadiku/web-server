const express = require('express');
const router = express.Router();
const { authenticateJWT, verifyAdmin } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

// Example route to create a user with role restriction (admin only)
router.post('/create', verifyAdmin, userController.createUser);

// Fetch all users (restricted to admins)
router.get('/all', userController.getAllUsers);

// Route for creating or updating user profile (authenticated users only)
router.post('/profile', authenticateJWT, userController.updateProfile);

// Route for fetching user profile by userId (authenticated users only)
router.get('/profile/:userId', userController.getProfile);

// Route for updating user profile by userId (authenticated users only)
router.put('/profile/:userId', authenticateJWT, userController.updateProfile);

// Route to verify current password (authenticated users only)
router.post('/verify', authenticateJWT, userController.verifyCurrentPassword);

// Route for updating password (authenticated users only)
router.put('/change-password', authenticateJWT, userController.updatePassword);

// Route to get the last password update timestamp
router.get('/:userId/password-last-updated', userController.getPasswordLastUpdated);

// Update contact details (authenticated users only)
router.put('/update-contact-details', authenticateJWT, userController.updateContactDetails);

// Update address (authenticated users only)
router.put('/update-addresses', userController.updateAddresses);

// Set default address (authenticated users only)
router.put('/set-default-address', authenticateJWT, userController.setDefaultAddress);


// Update meeting points (authenticated users only)
router.put('/update-meeting-points', authenticateJWT, userController.updateMeetingPoints);

// Update user details (authenticated users only)
router.put('/update-user-details', authenticateJWT, userController.updateUserDetails);

// Update payment info (authenticated users only)
router.put('/update-payment-info', authenticateJWT, userController.updatePaymentInfo);
router.put('/user/:userId/default-address', authenticateJWT, userController.setDefaultAddress);
router.delete('/payment-info/:paymentId', userController.deletePaymentInfo);

// Update user info (authenticated users only)
router.put('/user-info', authenticateJWT, userController.updateUserInfo);

// Get user details by userId (authenticated users only)
router.get('/user/:userId', authenticateJWT, userController.getUser);
router.put('/user/:userId/complete-profile', userController.completeUserProfile);

router.get('/user/:userId/addresses', authenticateJWT, userController.getUserAddresses);
router.get('/user/:userId/contact-details', authenticateJWT, userController.getUserContactDetails);
router.get('/user/:userId/meeting-point', authenticateJWT, userController.getMeetingPoints);
router.get('/user/:userId/details', authenticateJWT, userController.getUserDetails);
router.get('/user/:userId/payment-info', authenticateJWT, userController.getUserPaymentInfo);
router.put('/user/set-default-payment', userController.setDefaultPaymentMethod);

// Handle user avatar (authenticated users only)
router.get('/user/:userId/avatar', authenticateJWT, userController.getUserAvatar);
router.put('/user/:userId/avatar', authenticateJWT, userController.updateUserAvatar);
router.delete('/user/:userId/avatar', authenticateJWT, userController.removeUserAvatar);

// Route to update user preferences (authenticated users only)
router.put('/user/:userId/preferences', userController.updateUserPreferences);

// Route to get user preferences (authenticated users only)
// router.get('/user/:userId/preferences', userController.getUserPreferences);

// Add the separate routes for updating individual preferences
router.get('/user/:userId/preferences', authenticateJWT, userController.getUserPreferences);

// Route to update two-factor authentication (authenticated users only)
// router.put('/user/:userId/preferences/two-factor-authentication', userController.updateTwoFactorAuthentication);

router.get('/:userId/preferences/two-factor-authentication', userController.getTwoFactorAuthenticationStatus);

// Send verification code for two-factor authentication
router.post('/twoFactor/sendVerificationCode', userController.sendVerificationCodeForTwoFactor);

// Resend verification code for two-factor authentication
router.post('/twoFactor/resendVerificationCode', userController.resendVerificationCodeForTwoFactor);

// Verify the code and update two-factor authentication setting
router.post('/twoFactor/verifyCode', userController.verifyTwoFactorCodeAndUpdate);

// Route to update email notifications (authenticated users only)
router.put('/user/:userId/preferences/email-notifications', authenticateJWT, userController.updateEmailNotifications);

// Route to update dive location preference (authenticated users only)
router.put('/user/:userId/preferences/device-location', userController.updateDeviceLocation);

// Route to update live location preference (authenticated users only)
router.put('/user/:userId/preferences/live-location', userController.updateLiveLocation);

// Add these routes to userRouter.js or wherever you manage user-related routes

// Route to get dive location preference
router.get('/user/:userId/preferences/device-location', userController.getDeviceLocationPreference);

// Route to get live location preference
router.get('/user/:userId/preferences/live-location', userController.getLiveLocationPreference);


// Route to get specializations and expertise levels (public route, no authentication)
router.get('/specializations-expertise', userController.getSpecializationsAndExpertise);

// Route to check if the user's profile is completed (authenticated users only)
router.get('/user/:userId/check-profile-completion', userController.checkProfileCompletion);

router.put('/update-phone', userController.updateUserPhoneNumber);
router.get('/get-phone/:userId', userController.getUserPhoneNumber);

// GET appearance preference
router.get('/user/:userId/preferences/appearance', userController.getAppearance);

// PUT appearance preference
router.put('/user/:userId/preferences/appearance', userController.setAppearance);

router.get(
    '/user/:userId/preferences/communication-method',
    authenticateJWT,
    userController.getCommunicationMethod
);

router.put(
    '/user/:userId/preferences/communication-method',
    authenticateJWT,
    userController.updateCommunicationMethod
);

router.get(
    '/user/:userId/preferences/notifications',
    authenticateJWT,
    userController.getNotifications
);

router.put(
    '/user/:userId/preferences/notifications',
    authenticateJWT,
    userController.updateNotifications
);

router.get('/user/:userId/preferences/email-notifications', authenticateJWT, userController.getEmailNotifications);

// Add route to update FCM token
router.put('/user/update-fcm-token', userController.updateFcmToken);

router.put('/user/remove-fcm-token', userController.removeFcmToken); // Remove FCM Token


// Add to browsing history
router.post('/user/browsing-history', userController.addBrowsingHistory);

// Get browsing history for a user
router.get('/user/browsing-history/:userId', userController.getBrowsingHistory);

// Remove specific item from browsing history
router.delete('/user/browsing-history/item', userController.removeBrowsingHistoryItem);

// Clear all browsing history for a user
router.delete('/user/browsing-history/:userId', userController.clearBrowsingHistory);


// Route to send verification code for email update
router.post('/send-verification-code', userController.sendVerificationCodeForEmailUpdate);

// Route to update email with verification
router.put('/update-email', userController.updateEmailWithVerification);

router.post('/resend-email-update-code', userController.resendVerificationCodeForEmailUpdate);

router.post('/verify-email-code', userController.verifyCodeForEmailUpdate);

// Add routes for updating and retrieving description
router.put('/description', userController.updateUserDescription);
router.get('/:userId/description', userController.getUserDescription);



// Send code for forgot password
router.post('/forgot-password/send-code', userController.sendForgotPasswordCode);

router.post('/forgot-password/resend-code', userController.resendForgotPasswordCode);


// Verify the code
router.post('/forgot-password/verify-code', userController.verifyForgotPasswordCode);

// Reset password without current password
router.post('/forgot-password/reset-password', userController.resetPasswordWithoutCurrent);


module.exports = router;
