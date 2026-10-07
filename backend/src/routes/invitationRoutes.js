const express = require('express');
const router = express.Router();
const { 
    getInvitation, 
    acceptInvitation, 
    getMyPendingInvitations, 
    acceptInvitationById, 
    declineInvitation 
} = require('../controllers/invitationController');
const { protect } = require('../middleware/authMiddleware');

// Logged-in user pending invitations
router.get('/me/pending', protect, getMyPendingInvitations);
router.post('/:invitationId/accept-id', protect, acceptInvitationById);
router.post('/:invitationId/decline', protect, declineInvitation);

// Token-based invitations
router.get('/:token', getInvitation);
router.post('/:token/accept', protect, acceptInvitation);

module.exports = router;
