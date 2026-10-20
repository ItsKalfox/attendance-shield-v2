const User = require('../models/User');
const PasswordResetOTP = require('../models/PasswordResetOTP');
const EmailVerificationOTP = require('../models/EmailVerificationOTP');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { 
    getLogoAttachment, 
    getSignupOtpEmail, 
    getWelcomeEmail,
    getPasswordResetOtpEmail,
    getPasswordChangedEmail 
} = require('../utils/emailTemplates');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const { cloudinary } = require('../config/cloudinary');
const { getPrimaryClientUrl } = require('../config/client');

const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// @desc    Send OTP to verify email for signup
// @route   POST /api/auth/send-signup-otp
// @access  Public
const sendSignupOtp = async (req, res, next) => {
    try {
        const { name, email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Please provide an email address' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Validate basic email format
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ message: 'An account with this email already exists. Please log in instead.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash OTP for DB storage
        const salt = await bcrypt.genSalt(10);
        const otpHash = await bcrypt.hash(otp, salt);

        // Delete any existing unverified OTPs for this email
        await EmailVerificationOTP.deleteMany({ email: normalizedEmail });

        // Save new OTP record (valid for 10 minutes)
        await EmailVerificationOTP.create({
            email: normalizedEmail,
            otpHash,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });

        // Send Email with official Attendance Shield template
        const html = getSignupOtpEmail({ name, otp });
        const textMessage = `Your Attendance Shield verification code is: ${otp}\n\nThis verification code is valid for 10 minutes.\n\nIf you did not request this, please ignore this email.`;
        const attachments = getLogoAttachment();

        try {
            await sendEmail({
                email: normalizedEmail,
                subject: `Attendance Shield - Verification Code: ${otp}`,
                message: textMessage,
                html,
                attachments
            });
        } catch (emailErr) {
            console.error('Failed to send signup OTP email:', emailErr);
            return res.status(500).json({ message: 'Failed to send verification email. Please check your email address and try again.' });
        }

        res.status(200).json({
            success: true,
            message: 'Verification code sent to your email.'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify OTP for signup
// @route   POST /api/auth/verify-signup-otp
// @access  Public
const verifySignupOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Please provide both email and verification code' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const otpRecord = await EmailVerificationOTP.findOne({
            email: normalizedEmail,
            expiresAt: { $gt: Date.now() }
        });

        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid or expired verification code. Please request a new one.' });
        }

        if (otpRecord.attempts >= 5) {
            return res.status(400).json({ message: 'Too many incorrect attempts. Please request a new verification code.' });
        }

        const isMatch = await bcrypt.compare(otp.toString().trim(), otpRecord.otpHash);

        if (!isMatch) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            return res.status(400).json({ message: 'Invalid verification code. Please check and try again.' });
        }

        // Generate a signed verification token (valid for 20 minutes)
        const verificationToken = jwt.sign(
            { email: normalizedEmail, purpose: 'signup_verified' },
            process.env.JWT_SECRET,
            { expiresIn: '20m' }
        );

        otpRecord.verified = true;
        otpRecord.verificationToken = verificationToken;
        await otpRecord.save();

        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            verificationToken
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res, next) => {
    try {
        const { name, firstName, lastName, email, password, verificationToken } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Parse full name or firstName/lastName
        let fName = (firstName || '').trim();
        let lName = (lastName || '').trim();
        if (name && (!fName || !lName)) {
            const parts = name.trim().split(/\s+/);
            fName = parts[0] || '';
            lName = parts.slice(1).join(' ') || '';
        }

        if (!fName) {
            fName = 'User';
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Verify verificationToken
        if (!verificationToken) {
            return res.status(400).json({ message: 'Please verify your email address before creating an account.' });
        }

        try {
            const decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
            if (decoded.purpose !== 'signup_verified' || decoded.email !== normalizedEmail) {
                return res.status(400).json({ message: 'Invalid or expired email verification token. Please verify your email again.' });
            }
        } catch (tokenErr) {
            return res.status(400).json({ message: 'Email verification has expired. Please verify your email again.' });
        }

        // Check if user exists
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const resolvedName = (name || `${fName} ${lName}`).trim() || 'User';

        // Create user
        const user = await User.create({
            name: resolvedName,
            firstName: fName,
            lastName: lName,
            email: normalizedEmail,
            passwordHash,
            authProvider: 'LOCAL'
        });

        // Clean up OTP records for this email
        await EmailVerificationOTP.deleteMany({ email: normalizedEmail });

        // Send Welcome Email asynchronously
        try {
            const welcomeHtml = getWelcomeEmail({ name: resolvedName, email: normalizedEmail });
            const welcomeText = `Welcome to Attendance Shield, ${fName}! Your account is ready. Visit ${getPrimaryClientUrl()}/app/dashboard to get started.`;
            const welcomeAttachments = getLogoAttachment();
            await sendEmail({
                email: normalizedEmail,
                subject: `Welcome to Attendance Shield, ${fName}!`,
                message: welcomeText,
                html: welcomeHtml,
                attachments: welcomeAttachments
            });
        } catch (welcomeErr) {
            console.error('Failed to send welcome email:', welcomeErr);
        }

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                avatar: user.avatar,
                authProvider: user.authProvider,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Check for user email
        const user = await User.findOne({ email }).select('+passwordHash');

        if (user && (await bcrypt.compare(password, user.passwordHash))) {
            res.json({
                _id: user.id,
                name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                avatar: user.avatar,
                authProvider: user.authProvider,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
    try {
        res.status(200).json(req.user);
    } catch (error) {
        next(error);
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Please provide an email address' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            // Return success even if user not found to prevent enumeration
            return res.status(200).json({ message: 'If an account exists, an OTP has been sent.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Hash OTP for DB storage
        const salt = await bcrypt.genSalt(10);
        const otpHash = await bcrypt.hash(otp, salt);

        // Delete any existing OTPs for user
        await PasswordResetOTP.deleteMany({ userId: user._id });

        // Save new OTP (valid for 10 minutes)
        await PasswordResetOTP.create({
            userId: user._id,
            otpHash,
            expiresAt: Date.now() + 10 * 60 * 1000
        });

        // Send Email
        const html = getPasswordResetOtpEmail({ name: user.firstName, otp });
        const message = `Your Attendance Shield password reset code is: ${otp}\n\nThis verification code is valid for 10 minutes.\n\nIf you did not request this, please ignore this email.`;
        const attachments = getLogoAttachment();
        
        try {
            await sendEmail({
                email: user.email,
                subject: `Attendance Shield - Password Reset Code: ${otp}`,
                message,
                html,
                attachments
            });
        } catch (emailErr) {
            console.error('Failed to send password reset email:', emailErr);
        }

        res.status(200).json({ message: 'If an account exists, an OTP has been sent.' });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-reset-otp
// @access  Public
const verifyResetOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ message: 'Please provide email and OTP' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const otpRecord = await PasswordResetOTP.findOne({ 
            userId: user._id,
            used: false,
            expiresAt: { $gt: Date.now() }
        });

        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Check attempts
        if (otpRecord.attempts >= 5) {
            return res.status(400).json({ message: 'Too many attempts. Request a new OTP.' });
        }

        const isMatch = await bcrypt.compare(otp.toString().trim(), otpRecord.otpHash);

        if (!isMatch) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        otpRecord.used = true;
        await otpRecord.save();
        
        // Generate temporary token for password reset
        const tempToken = jwt.sign({ id: user._id, type: 'reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });

        res.status(200).json({ 
            message: 'OTP Verified',
            resetToken: tempToken
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
    try {
        const { resetToken, email, otp, password, newPassword } = req.body;
        const targetPassword = newPassword || password;

        if (!targetPassword) {
            return res.status(400).json({ message: 'Please provide a new password' });
        }

        if (targetPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        let user;

        if (email && otp) {
            // Direct OTP-based reset
            user = await User.findOne({ email: email.toLowerCase().trim() });
            if (!user) {
                return res.status(400).json({ message: 'Invalid or expired OTP' });
            }

            const otpRecord = await PasswordResetOTP.findOne({
                userId: user._id,
                used: false,
                expiresAt: { $gt: Date.now() }
            });

            if (!otpRecord) {
                return res.status(400).json({ message: 'Invalid or expired OTP' });
            }

            if (otpRecord.attempts >= 5) {
                return res.status(400).json({ message: 'Too many attempts. Request a new OTP.' });
            }

            const isMatch = await bcrypt.compare(otp.toString().trim(), otpRecord.otpHash);
            if (!isMatch) {
                otpRecord.attempts += 1;
                await otpRecord.save();
                return res.status(400).json({ message: 'Invalid OTP' });
            }

            otpRecord.used = true;
            await otpRecord.save();
        } else if (resetToken) {
            let decoded;
            try {
                decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
            } catch (error) {
                return res.status(400).json({ message: 'Invalid or expired reset token' });
            }

            if (decoded.type !== 'reset') {
                return res.status(400).json({ message: 'Invalid token type' });
            }

            user = await User.findById(decoded.id);
            if (!user) {
                return res.status(400).json({ message: 'User not found' });
            }
        } else {
            return res.status(400).json({ message: 'Please provide verification code or reset token' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(targetPassword, salt);

        user.passwordHash = passwordHash;
        await user.save();

        // Send Password Changed confirmation email asynchronously
        try {
            const changedHtml = getPasswordChangedEmail({ name: user.firstName, email: user.email });
            const changedText = `Hi ${user.firstName || 'there'},\n\nThe password for your Attendance Shield account (${user.email}) has been changed successfully.\n\nIf you did not make this change, please contact your administrator or reset your password immediately.`;
            const attachments = getLogoAttachment();
            await sendEmail({
                email: user.email,
                subject: 'Attendance Shield - Password Changed Successfully',
                message: changedText,
                html: changedHtml,
                attachments
            });
        } catch (emailErr) {
            console.error('Failed to send password changed email:', emailErr);
        }

        res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PATCH /api/auth/me
// @access  Private
const updateMe = async (req, res, next) => {
    try {
        const { name, firstName, lastName, email } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (name !== undefined) {
            user.name = name.trim();
            const parts = user.name.split(/\s+/);
            user.firstName = parts[0] || 'User';
            user.lastName = parts.slice(1).join(' ') || '';
        } else {
            if (firstName !== undefined) user.firstName = firstName.trim();
            if (lastName !== undefined) user.lastName = lastName.trim();
            user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        }

        if (email) {
            // Check if email is already used by another user
            const emailExists = await User.findOne({ email });
            if (emailExists && emailExists._id.toString() !== user._id.toString()) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            user.email = email;
        }

        if (req.file) {
            user.avatar = req.file.path;
        }

        await user.save();
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

// @desc    Update password
// @route   PATCH /api/auth/me/password
// @access  Private
const updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select('+passwordHash');

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Please provide current and new password' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid current password' });
        }

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();

        // Send Password Changed confirmation email asynchronously
        try {
            const changedHtml = getPasswordChangedEmail({ name: user.firstName, email: user.email });
            const changedText = `Hi ${user.firstName || 'there'},\n\nThe password for your Attendance Shield account (${user.email}) has been changed successfully.\n\nIf you did not make this change, please contact your administrator or reset your password immediately.`;
            const attachments = getLogoAttachment();
            await sendEmail({
                email: user.email,
                subject: 'Attendance Shield - Password Changed Successfully',
                message: changedText,
                html: changedHtml,
                attachments
            });
        } catch (emailErr) {
            console.error('Failed to send password changed email:', emailErr);
        }

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Authenticate with Google
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: 'Google token is required' });
        }

        let email, given_name, family_name, picture, full_name;

        try {
            // First try treating the token as an ID token
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.VITE_GOOGLE_CLIENT_ID
            });
            const payload = ticket.getPayload();
            email = payload.email;
            full_name = payload.name;
            given_name = payload.given_name || payload.name?.split(' ')[0];
            family_name = payload.family_name || (payload.name?.split(' ').slice(1).join(' ') || '');
            picture = payload.picture || payload.avatar_url;
        } catch (err) {
            // Fallback to fetching userinfo with access token
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                // Secondary fallback
                const altResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!altResponse.ok) {
                    throw new Error('Failed to fetch user profile with access token');
                }
                const altData = await altResponse.json();
                email = altData.email;
                full_name = altData.name;
                given_name = altData.given_name || altData.name?.split(' ')[0];
                family_name = altData.family_name || (altData.name?.split(' ').slice(1).join(' ') || '');
                picture = altData.picture || altData.avatar_url;
            } else {
                const data = await response.json();
                email = data.email;
                full_name = data.name;
                given_name = data.given_name || data.name?.split(' ')[0];
                family_name = data.family_name || (data.name?.split(' ').slice(1).join(' ') || '');
                picture = data.picture || data.avatar_url || data.photo || data.picture_url;
            }
        }

        let user = await User.findOne({ email });

        const googleFullName = (full_name || `${given_name || ''} ${family_name || ''}`).trim() || 'User';

        if (!user) {
            // Generate a random secure password for the user
            const randomPassword = crypto.randomBytes(32).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(randomPassword, salt);

            user = await User.create({
                name: googleFullName,
                firstName: given_name || 'User',
                lastName: family_name || '',
                email,
                passwordHash,
                avatar: picture || '',
                authProvider: 'GOOGLE'
            });
        } else {
            // Update existing user's avatar and provider
            user.authProvider = 'GOOGLE';
            if (picture) {
                user.avatar = picture;
            }
            if (!user.name || user.name === 'Unknown' || user.name === 'User') {
                user.name = googleFullName;
            }
            if (given_name && (!user.firstName || user.firstName === 'Unknown' || user.firstName === 'User')) {
                user.firstName = given_name;
            }
            if (family_name && (!user.lastName || user.lastName === 'Unknown')) {
                user.lastName = family_name;
            }
            await user.save();
        }

        res.status(200).json({
            _id: user.id,
            name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatar: user.avatar,
            authProvider: user.authProvider,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(400).json({ message: 'Invalid Google token' });
    }
};

// @desc    Authenticate with Microsoft
// @route   POST /api/auth/microsoft
// @access  Public
const microsoftAuth = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: 'Microsoft token is required' });
        }

        // Verify the token by fetching user profile from Microsoft Graph API
        const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = response.data;
        // email can be in mail or userPrincipalName
        const email = data.mail || data.userPrincipalName;
        const displayName = (data.displayName || '').trim();
        
        let given_name = data.givenName ? data.givenName.trim() : '';
        let family_name = data.surname ? data.surname.trim() : '';

        // If either given_name or family_name is missing, extract from displayName
        if ((!given_name || !family_name) && displayName) {
            const nameParts = displayName.split(/\s+/);
            if (!given_name && nameParts.length > 0) {
                given_name = nameParts[0];
            }
            if (!family_name && nameParts.length > 1) {
                family_name = nameParts.slice(1).join(' ');
            }
        }

        // If given_name is still empty, derive from email address prefix
        if (!given_name && email) {
            const emailPrefix = email.split('@')[0];
            const cleanParts = emailPrefix.replace(/[._-]/g, ' ').trim().split(/\s+/);
            given_name = cleanParts[0] ? cleanParts[0].charAt(0).toUpperCase() + cleanParts[0].slice(1) : 'User';
            if (!family_name && cleanParts.length > 1) {
                family_name = cleanParts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
            }
        }

        if (!given_name) given_name = 'User';

        if (!email) {
            return res.status(400).json({ message: 'Could not extract email from Microsoft account' });
        }

        // Attempt to fetch profile photo from Microsoft Graph API
        let avatarUrl = '';
        try {
            const photoResponse = await axios.get('https://graph.microsoft.com/v1.0/me/photo/$value', {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'arraybuffer'
            });

            if (photoResponse.status === 200 && photoResponse.data) {
                const contentType = photoResponse.headers['content-type'] || 'image/jpeg';
                const buffer = Buffer.from(photoResponse.data);

                if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
                    try {
                        const uploadResult = await new Promise((resolve, reject) => {
                            const stream = cloudinary.uploader.upload_stream(
                                {
                                    folder: 'attendance_shield/avatars',
                                    resource_type: 'image'
                                },
                                (error, result) => {
                                    if (result) resolve(result);
                                    else reject(error);
                                }
                            );
                            stream.end(buffer);
                        });
                        avatarUrl = uploadResult.secure_url;
                    } catch (cloudErr) {
                        console.warn("Cloudinary upload failed for Microsoft avatar, falling back to data URI:", cloudErr.message);
                        avatarUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
                    }
                } else {
                    avatarUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
                }
            }
        } catch (photoErr) {
            console.log("Microsoft profile photo not available or not accessible:", photoErr.response?.status || photoErr.message);
        }

        let user = await User.findOne({ email });

        const msFullName = (displayName || `${given_name || ''} ${family_name || ''}`).trim() || 'User';

        if (!user) {
            // Generate a random secure password for the user
            const randomPassword = crypto.randomBytes(32).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(randomPassword, salt);

            user = await User.create({
                name: msFullName,
                firstName: given_name,
                lastName: family_name,
                email,
                passwordHash,
                avatar: avatarUrl || '',
                authProvider: 'MICROSOFT'
            });
        } else {
            // Update existing user's provider, avatar, and correct any fallback placeholder names
            user.authProvider = 'MICROSOFT';
            if (avatarUrl) {
                user.avatar = avatarUrl;
            }
            if (!user.name || user.name === 'User' || user.name === 'Unknown') {
                user.name = msFullName;
            }
            if (given_name && (!user.firstName || user.firstName === 'User' || user.firstName === 'Unknown')) {
                user.firstName = given_name;
            }
            if (family_name && (!user.lastName || user.lastName === 'Unknown')) {
                user.lastName = family_name;
            }
            await user.save();
        }

        res.status(200).json({
            _id: user.id,
            name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatar: user.avatar,
            authProvider: user.authProvider,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error("Microsoft Auth Error:", error.response?.data || error.message);
        res.status(400).json({ message: 'Invalid Microsoft token' });
    }
};

// @desc    Update user preferences (e.g. PDF export settings)
// @route   PATCH /api/auth/me/preferences
// @access  Private
const updatePreferences = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.preferences = {
            ...(user.preferences || {}),
            ...(req.body.preferences || req.body)
        };
        user.markModified('preferences');
        await user.save();

        res.status(200).json({
            message: 'Preferences updated successfully',
            preferences: user.preferences
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
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
};
