// routes/subUserRoutes.js

const express = require('express');
const router = express.Router();
const { inviteSubUser, acceptInvitation, cancelInvitation, getUserSubUsers, deleteInvitation,resendInvite, 
    getInvitationDetails,
     getSubUserDetails,
      deleteSubUser,
       getInvitationById,
       deleteFamilyAccount  ,
       updateSubUser

} = require('../controllers/subUserController');
const { authenticateToken } = require('../controllers/authController');

// POST /invite-sub-user
router.post('/invite-sub-user', inviteSubUser);

// POST /accept-invite
router.post('/accept-invite', acceptInvitation);

router.get('/users/:parentUserId/sub-users', getUserSubUsers);

router.delete('/delete-invitation', deleteInvitation);

router.get('/invite-details/:token', getInvitationDetails);

router.put('/sub-user/:subUserId', updateSubUser);


// GET invitation by ID
router.get('/invitations/:invitationId',getInvitationById);

router.get('/sub-user/:subUserId', getSubUserDetails);

router.delete('/sub-user/:subUserId', deleteSubUser); // ✅ New Route for Deleting Sub-User


router.delete('/cancel-invitation/:invitationId',  cancelInvitation);

// ✅ DELETE Family Account - Removes all invitations & sub-users for a parent user
router.delete('/family-account/:parentUserId', deleteFamilyAccount);

router.post('/resend-invite', resendInvite);

module.exports = router;
