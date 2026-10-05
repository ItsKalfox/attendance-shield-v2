const express = require('express');
const router = express.Router();
const { signup, login, getMe, forgotPassword, verifyResetOtp, resetPassword, updateMe, updatePassword, googleAuth } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

const { upload } = require('../config/cloudinary');
router.patch('/me', protect, upload.single('avatar'), updateMe);
router.patch('/me/password', protect, updatePassword);

module.exports = router;
