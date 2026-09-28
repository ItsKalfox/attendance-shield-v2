const express = require('express');
const router = express.Router();
const { getInvitation, acceptInvitation } = require('../controllers/invitationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:token', getInvitation);
router.post('/:token/accept', protect, acceptInvitation);

module.exports = router;
