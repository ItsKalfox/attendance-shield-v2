const express = require('express');
const router = express.Router();
const { 
    signup, 
    sendSignupOtp, 
    verifySignupOtp, 
    login, 
    getMe, 
    forgotPassword, 
    verifyResetOtp, 
    resetPassword, 
    updateMe, 
    updatePassword, 
    updatePreferences, 
    googleAuth, 
    microsoftAuth 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiters');

router.post('/send-signup-otp', authLimiter, sendSignupOtp);
router.post('/verify-signup-otp', authLimiter, verifySignupOtp);
router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/google', googleAuth);
router.post('/microsoft', microsoftAuth);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/verify-reset-otp', authLimiter, verifyResetOtp);
router.post('/reset-password', authLimiter, resetPassword);
router.get('/me', protect, getMe);

const { upload } = require('../config/cloudinary');
router.patch('/me', protect, upload.single('avatar'), updateMe);
router.patch('/me/password', protect, updatePassword);
router.patch('/me/preferences', protect, updatePreferences);

module.exports = router;
