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
        // Can't remove yourself through this endpoint
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
            return res.status(400).json({ message: 'Cannot remove the organization owner' });
        }

        await OrganizationMember.findByIdAndDelete(req.params.memberId);

        res.status(200).json({ message: 'Member removed' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMembers,
    addMember,
    importMembers,
    removeMember
};
