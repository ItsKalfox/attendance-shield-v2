const OrganizationMember = require('../models/OrganizationMember');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// @desc    Get all members of an organization
// @route   GET /api/organizations/:organizationId/members
// @access  Private (Any member)
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
            // Generate password
            plainPassword = crypto.randomBytes(6).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(plainPassword, salt);

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

        // Send Email
        let message = `You have been added to the organization.\n\n`;
        if (isNewUser) {
            message += `An account was created for you.\nEmail: ${email}\nTemporary Password: ${plainPassword}\n\nPlease change your password after logging in.`;
        } else {
            message += `You can log in using your existing credentials.`;
        }

        await sendEmail({
            email,
            subject: 'Added to Organization',
            message
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
    try {
        const { members } = req.body; // Array of { firstName, lastName, email, studentId }
        const organizationId = req.params.organizationId;

        if (!members || !Array.isArray(members)) {
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

                let user = await User.findOne({ email });
                let isNewUser = false;
                let plainPassword = '';

                if (!user) {
                    plainPassword = crypto.randomBytes(6).toString('hex');
                    const salt = await bcrypt.genSalt(10);
                    const passwordHash = await bcrypt.hash(plainPassword, salt);

                    user = await User.create({
                        firstName: firstName || 'Unknown',
                        lastName: lastName || 'Unknown',
                        email,
                        passwordHash
                    });
                    isNewUser = true;
                    results.createdAccounts++;
                }

                const existingMember = await OrganizationMember.findOne({
                    organizationId,
                    userId: user._id
                });

                if (existingMember) {
                    results.alreadyMembers++;
                    continue;
                }

                await OrganizationMember.create({
                    organizationId,
                    userId: user._id,
                    role: 'ATTENDEE',
                    studentId: studentId || ''
                });

                if (!isNewUser) {
                    results.existingAdded++;
                }

                // Send email for newly created accounts
                if (isNewUser) {
                    let message = `You have been added to the organization as an Attendee.\n\n`;
                    message += `An account was created for you.\nEmail: ${email}\nTemporary Password: ${plainPassword}\n\nPlease change your password after logging in.`;
                    await sendEmail({ email, subject: 'Added to Organization', message });
                }
            } catch (err) {
                results.failed++;
                results.errors.push(`Error processing ${data.email}: ${err.message}`);
            }
        }

        res.status(200).json(results);
    } catch (error) {
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

module.exports = {
    getMembers,
    addMember,
    importMembers,
    removeMember,
    updateMember,
    resetMemberPassword
};
