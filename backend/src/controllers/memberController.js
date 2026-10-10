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
            studentId: studentId ? studentId.trim() : '',
            firstName: firstName ? firstName.trim() : '',
            lastName: lastName ? lastName.trim() : ''
        });

        const populatedMember = await OrganizationMember.findById(member._id).populate('userId', 'firstName lastName email avatar');
        res.status(201).json(populatedMember);
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
                        firstName: firstName ? firstName.trim() : 'Unknown',
                        lastName: lastName ? lastName.trim() : 'Unknown',
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
                    studentId: studentId ? studentId.trim() : '',
                    firstName: firstName ? firstName.trim() : (user.firstName || ''),
                    lastName: lastName ? lastName.trim() : (user.lastName || '')
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

// @desc    Update a member's details (Organization-scoped)
// @route   PATCH /api/organizations/:organizationId/members/:memberId
// @access  Private (INSTRUCTOR/OWNER)
const updateMember = async (req, res, next) => {
    try {
        const { firstName, lastName, studentId } = req.body;
        
        const member = await OrganizationMember.findOne({
            _id: req.params.memberId,
            organizationId: req.params.organizationId
        }).populate('userId', 'firstName lastName email avatar');

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        const requester = await OrganizationMember.findOne({
            organizationId: req.params.organizationId,
            userId: req.user._id
        });

        if (!requester || (requester.role !== 'OWNER' && requester.role !== 'INSTRUCTOR')) {
            return res.status(403).json({ message: 'Not authorized to update members' });
        }

        if (member.role === 'OWNER' && requester.role !== 'OWNER') {
            return res.status(403).json({ message: 'Only owners can edit the owner details' });
        }
        if (member.role === 'INSTRUCTOR' && requester.role !== 'OWNER') {
             return res.status(403).json({ message: 'Instructors cannot edit other instructors' });
        }

        // Update organization-scoped roster attributes
        if (studentId !== undefined) {
            member.studentId = studentId.trim();
        }
        if (firstName !== undefined) {
            member.firstName = firstName.trim();
        }
        if (lastName !== undefined) {
            member.lastName = lastName.trim();
        }

        await member.save();

        const updatedMember = await OrganizationMember.findById(member._id).populate('userId', 'firstName lastName email avatar');
        res.status(200).json(updatedMember);
    } catch (error) {
        next(error);
    }
};

// @desc    Validate emails via MX records and check existing organization membership
// @route   POST /api/organizations/:organizationId/members/validate-emails
// @access  Private (INSTRUCTOR/OWNER)
const validateEmails = async (req, res, next) => {
    try {
        const { emails, studentIds } = req.body;
        if (!emails || !Array.isArray(emails)) {
            return res.status(400).json({ message: 'Invalid emails array' });
        }

        const organizationId = req.params.organizationId;
        const validGoogleMx = ['google.com', 'googlemail.com'];
        const validMicrosoftMx = ['outlook.com', 'protection.outlook.com'];

        // Find existing users by email
        const cleanEmails = emails.map(e => (typeof e === 'string' ? e.toLowerCase().trim() : '')).filter(Boolean);
        const matchedUsers = await User.find({ email: { $in: cleanEmails } }).select('_id email');
        const userByEmail = new Map(matchedUsers.map(u => [u.email.toLowerCase(), u]));
        const userIds = matchedUsers.map(u => u._id);

        // Find existing organization members for these userIds
        const existingOrgMembers = await OrganizationMember.find({
            organizationId,
            userId: { $in: userIds }
        }).select('userId');
        const existingMemberUserIds = new Set(existingOrgMembers.map(m => m.userId.toString()));

        // Also check if any provided studentIds already exist in this organization
        let existingStudentIdSet = new Set();
        if (studentIds && Array.isArray(studentIds)) {
            const cleanStudentIds = studentIds.map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
            if (cleanStudentIds.length > 0) {
                const existingOrgMembersByStudentId = await OrganizationMember.find({
                    organizationId,
                    studentId: { $in: cleanStudentIds }
                }).select('studentId');
                existingStudentIdSet = new Set(existingOrgMembersByStudentId.map(m => m.studentId));
            }
        }

        const results = await Promise.all(emails.map(async (email) => {
            const cleanEmail = (typeof email === 'string' ? email.toLowerCase().trim() : '');
            const domain = cleanEmail.split('@')[1];

            const matchedUser = userByEmail.get(cleanEmail);
            const isExistingMember = matchedUser ? existingMemberUserIds.has(matchedUser._id.toString()) : false;

            if (!domain) return { email, valid: false, provider: null, isExistingMember };

            // For common public domains, skip dns lookup to save time
            if (['gmail.com'].includes(domain)) return { email, valid: true, provider: 'Google', isExistingMember };
            if (['hotmail.com', 'outlook.com', 'live.com'].includes(domain)) return { email, valid: true, provider: 'Microsoft', isExistingMember };

            try {
                const mxRecords = await dns.resolveMx(domain);
                
                const isGoogle = mxRecords.some(mx => validGoogleMx.some(g => mx.exchange.toLowerCase().includes(g)));
                if (isGoogle) return { email, valid: true, provider: 'Google', isExistingMember };

                const isMicrosoft = mxRecords.some(mx => validMicrosoftMx.some(m => mx.exchange.toLowerCase().includes(m)));
                if (isMicrosoft) return { email, valid: true, provider: 'Microsoft', isExistingMember };

                return { email, valid: false, provider: null, isExistingMember };
            } catch (err) {
                return { email, valid: false, provider: null, isExistingMember };
            }
        }));

        res.status(200).json({
            results,
            existingStudentIds: Array.from(existingStudentIdSet)
        });
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
    validateEmails
};
