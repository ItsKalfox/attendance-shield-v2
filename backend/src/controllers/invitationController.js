const OrganizationInvitation = require('../models/OrganizationInvitation');
const OrganizationMember = require('../models/OrganizationMember');
const User = require('../models/User');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// @desc    Invite a staff member
// @route   POST /api/organizations/:organizationId/invitations
// @access  Private (INSTRUCTOR/OWNER)
const inviteStaff = async (req, res, next) => {
    try {
        const { email, role } = req.body;
        const organizationId = req.params.organizationId;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const validRoles = ['INSTRUCTOR'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Check if user is already a member
        const user = await User.findOne({ email });
        if (user) {
            const isMember = await OrganizationMember.findOne({ organizationId, userId: user._id });
            if (isMember) {
                return res.status(400).json({ message: 'User is already a member' });
            }
        }

        // Delete any existing pending invitations for this email in this org
        await OrganizationInvitation.deleteMany({
            organizationId,
            email,
            status: 'PENDING'
        });

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const invitation = await OrganizationInvitation.create({
            organizationId,
            email,
            role,
            tokenHash,
            invitedBy: req.user._id,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Send Email
        const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invitation/${token}`;
        const message = `You have been invited to join an organization.\n\nRole: ${role}\n\nClick here to accept: ${inviteLink}`;

        await sendEmail({
            email,
            subject: 'Organization Invitation',
            message
        });

        res.status(201).json({ message: 'Invitation sent' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get invitation details via token
// @route   GET /api/invitations/:token
// @access  Public
const getInvitation = async (req, res, next) => {
    try {
        const token = req.params.token;
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const invitation = await OrganizationInvitation.findOne({
            tokenHash,
            status: 'PENDING',
            expiresAt: { $gt: Date.now() }
        }).populate('organizationId', 'name');

        if (!invitation) {
            return res.status(400).json({ message: 'Invalid or expired invitation' });
        }

        res.status(200).json({
            email: invitation.email,
            role: invitation.role,
            organization: invitation.organizationId.name
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Accept invitation
// @route   POST /api/invitations/:token/accept
// @access  Private (Requires login)
const acceptInvitation = async (req, res, next) => {
    try {
        const token = req.params.token;
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const invitation = await OrganizationInvitation.findOne({
            tokenHash,
            status: 'PENDING',
            expiresAt: { $gt: Date.now() }
        });

        if (!invitation) {
            return res.status(400).json({ message: 'Invalid or expired invitation' });
        }

        // Verify the authenticated user's email matches the invitation email
        if (req.user.email !== invitation.email) {
            return res.status(403).json({ message: 'This invitation was sent to a different email address' });
        }

        // Check if already a member
        const existingMember = await OrganizationMember.findOne({
            organizationId: invitation.organizationId,
            userId: req.user._id
        });

        if (!existingMember) {
            await OrganizationMember.create({
                organizationId: invitation.organizationId,
                userId: req.user._id,
                role: invitation.role,
                status: 'ACTIVE'
            });
        }

        invitation.status = 'ACCEPTED';
        invitation.acceptedAt = Date.now();
        await invitation.save();

        res.status(200).json({ message: 'Invitation accepted' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get pending invitations for an org
// @route   GET /api/organizations/:organizationId/invitations
// @access  Private (INSTRUCTOR/OWNER)
const getInvitations = async (req, res, next) => {
    try {
        const invitations = await OrganizationInvitation.find({
            organizationId: req.params.organizationId,
            status: 'PENDING'
        });

        res.status(200).json(invitations);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    inviteStaff,
    getInvitation,
    acceptInvitation,
    getInvitations
};
