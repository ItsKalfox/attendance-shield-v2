const OrganizationMember = require('../models/OrganizationMember');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const dns = require('dns').promises;
const sendEmail = require('../utils/sendEmail');

// @desc    Get all members of an organization
// @route   GET /api/organizations/:organizationId/members
// @access  Private (OWNER/INSTRUCTOR)
const getMembers = async (req, res, next) => {
    try {
        const members = await OrganizationMember.find({ 
            organizationId: req.params.organizationId 
        }).populate('userId', 'firstName lastName email avatar');

        res.status(200).json(members);
    } catch (error) {
        next(error);
    }
};

// @desc    Add a single member (Instructor/Owner only)
// @route   POST /api/organizations/:organizationId/members
// @access  Private (INSTRUCTOR/OWNER)
const addMember = async (req, res, next) => {
    try {
        const { firstName, lastName, email, role, studentId } = req.body;
        const organizationId = req.params.organizationId;

        if (!firstName || !lastName || !email) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        let user = await User.findOne({ email });
        let isNewUser = false;
        let plainPassword = '';

        if (!user) {
            // Generate secure 64 character password
            const securePassword = crypto.randomBytes(32).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(securePassword, salt);

            user = await User.create({
                firstName,
                lastName,
                email,
                passwordHash
            });
            isNewUser = true;
        }

        // Check if already a member
        const existingMember = await OrganizationMember.findOne({
            organizationId,
            userId: user._id
        });

        if (existingMember) {
            return res.status(400).json({ message: 'User is already a member of this organization' });
        }

        const member = await OrganizationMember.create({
            organizationId,
            userId: user._id,
            role: role || 'ATTENDEE',
            studentId: studentId || ''
        });



        res.status(201).json(member);
    } catch (error) {
        next(error);
    }
};

// @desc    Bulk import members from CSV data
// @route   POST /api/organizations/:organizationId/members/import
// @access  Private (INSTRUCTOR/OWNER)
const importMembers = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { members } = req.body; // Array of { firstName, lastName, email, studentId }
        const organizationId = req.params.organizationId;

        if (!members || !Array.isArray(members)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Invalid members data' });
        }

        const results = {
            total: members.length,
            createdAccounts: 0,
            existingAdded: 0,
            alreadyMembers: 0,
            failed: 0,
            errors: []
        };

        for (const data of members) {
            try {
                const { firstName, lastName, email, studentId } = data;
                
                if (!email) {
                    results.failed++;
                    results.errors.push(`Missing email for ${firstName} ${lastName}`);
                    continue;
                }

                let user = await User.findOne({ email }).session(session);
                let isNewUser = false;

                if (!user) {
                    const securePassword = crypto.randomBytes(32).toString('hex');
                    const salt = await bcrypt.genSalt(10);
                    const passwordHash = await bcrypt.hash(securePassword, salt);

                    const createdUsers = await User.create([{
                        firstName: firstName || 'Unknown',
                        lastName: lastName || 'Unknown',
                        email,
                        passwordHash
                    }], { session });
                    user = createdUsers[0];
                    isNewUser = true;
                    results.createdAccounts++;
                }

                const existingMember = await OrganizationMember.findOne({
                    organizationId,
                    userId: user._id
                }).session(session);

                if (existingMember) {
                    results.alreadyMembers++;
                    continue;
                }

                await OrganizationMember.create([{
                    organizationId,
                    userId: user._id,
                    role: 'ATTENDEE',
                    studentId: studentId || ''
                }], { session });

                if (!isNewUser) {
                    results.existingAdded++;
                }
            } catch (err) {
                // Instantly throw to trigger the fail-safe rollback for the entire transaction
                throw err;
            }
        }

        await session.commitTransaction();
        session.endSession();
        res.status(200).json(results);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

// @desc    Remove a member
// @route   DELETE /api/organizations/:organizationId/members/:memberId
// @access  Private (INSTRUCTOR/OWNER)
const removeMember = async (req, res, next) => {
    try {
        const memberToRemove = await OrganizationMember.findOne({
            _id: req.params.memberId,
            organizationId: req.params.organizationId
        });

        if (!memberToRemove) {
            return res.status(404).json({ message: 'Member not found' });
        }

        if (memberToRemove.userId.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot remove yourself' });
        }

        if (memberToRemove.role === 'OWNER') {
            return res.status(403).json({ message: 'Cannot remove the organization owner' });
        }

        const requester = await OrganizationMember.findOne({
            organizationId: req.params.organizationId,
            userId: req.user._id
        });

        // Instructors cannot remove other instructors
        if (requester.role === 'INSTRUCTOR' && memberToRemove.role === 'INSTRUCTOR') {
            return res.status(403).json({ message: 'Instructors cannot remove other instructors' });
        }

        await OrganizationMember.findByIdAndDelete(req.params.memberId);

        res.status(200).json({ message: 'Member removed' });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a member's details
// @route   PATCH /api/organizations/:organizationId/members/:memberId
// @access  Private (INSTRUCTOR/OWNER)
const updateMember = async (req, res, next) => {
    try {
        const { firstName, lastName, studentId, email } = req.body;
        
        const member = await OrganizationMember.findOne({
            _id: req.params.memberId,
            organizationId: req.params.organizationId
        }).populate('userId');

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        const requester = await OrganizationMember.findOne({
            organizationId: req.params.organizationId,
            userId: req.user._id
        });

        if (member.role === 'OWNER' && requester.role !== 'OWNER') {
            return res.status(403).json({ message: 'Only owners can edit the owner details' });
        }
        if (member.role === 'INSTRUCTOR' && requester.role !== 'OWNER' && member.userId._id.toString() !== req.user._id.toString()) {
             return res.status(403).json({ message: 'Instructors cannot edit other instructors' });
        }

        if (studentId !== undefined) {
            member.studentId = studentId;
            await member.save();
        }

        if (firstName || lastName || email) {
            const user = await User.findById(member.userId._id);
            if (firstName) user.firstName = firstName;
            if (lastName) user.lastName = lastName;
            
            if (email && email !== user.email) {
                const existing = await User.findOne({ email });
                if (existing) {
                    return res.status(400).json({ message: 'Email already in use' });
                }
                user.email = email;
            }
            
            await user.save();
        }

        const updatedMember = await OrganizationMember.findById(member._id).populate('userId', 'firstName lastName email avatar');
        res.status(200).json(updatedMember);
    } catch (error) {
        next(error);
    }
};

// @desc    Reset a member's password
// @route   POST /api/organizations/:organizationId/members/:memberId/reset-password
// @access  Private (INSTRUCTOR/OWNER)
const resetMemberPassword = async (req, res, next) => {
    try {
        const member = await OrganizationMember.findOne({
            _id: req.params.memberId,
            organizationId: req.params.organizationId
        }).populate('userId');

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        const requester = await OrganizationMember.findOne({
            organizationId: req.params.organizationId,
            userId: req.user._id
        });

        if (member.role === 'OWNER' && requester.role !== 'OWNER') {
            return res.status(403).json({ message: 'Cannot reset owner password' });
        }
        if (member.role === 'INSTRUCTOR' && requester.role !== 'OWNER' && member.userId._id.toString() !== req.user._id.toString()) {
             return res.status(403).json({ message: 'Instructors cannot reset other instructors passwords' });
        }

        const user = await User.findById(member.userId._id);
        
        const plainPassword = crypto.randomBytes(6).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(plainPassword, salt);
        
        user.passwordHash = passwordHash;
        await user.save();

        let message = `Your password for the attendance system has been reset by an administrator.\n\n`;
        message += `Your new temporary password is: ${plainPassword}\n\nPlease log in and change your password immediately.`;

        await sendEmail({
            email: user.email,
            subject: 'Password Reset Notification',
            message
        });

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Validate emails via MX records
// @route   POST /api/organizations/:organizationId/members/validate-emails
// @access  Private (INSTRUCTOR/OWNER)
const validateEmails = async (req, res, next) => {
    try {
        const { emails } = req.body;
        if (!emails || !Array.isArray(emails)) {
            return res.status(400).json({ message: 'Invalid emails array' });
        }

        const validGoogleMx = ['google.com', 'googlemail.com'];
        const validMicrosoftMx = ['outlook.com', 'protection.outlook.com'];

        const results = await Promise.all(emails.map(async (email) => {
            const domain = email.split('@')[1];
            if (!domain) return { email, valid: false, provider: null };

            // For common public domains, skip dns lookup to save time
            if (['gmail.com'].includes(domain)) return { email, valid: true, provider: 'Google' };
            if (['hotmail.com', 'outlook.com', 'live.com'].includes(domain)) return { email, valid: true, provider: 'Microsoft' };

            try {
                const mxRecords = await dns.resolveMx(domain);
                
                const isGoogle = mxRecords.some(mx => validGoogleMx.some(g => mx.exchange.toLowerCase().includes(g)));
                if (isGoogle) return { email, valid: true, provider: 'Google' };

                const isMicrosoft = mxRecords.some(mx => validMicrosoftMx.some(m => mx.exchange.toLowerCase().includes(m)));
                if (isMicrosoft) return { email, valid: true, provider: 'Microsoft' };

                return { email, valid: false, provider: null };
            } catch (err) {
                return { email, valid: false, provider: null };
            }
        }));

        res.status(200).json(results);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMembers,
    addMember,
    importMembers,
    removeMember,
    updateMember,
    resetMemberPassword,
    validateEmails
};
