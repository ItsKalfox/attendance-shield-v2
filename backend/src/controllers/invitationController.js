const OrganizationInvitation = require('../models/OrganizationInvitation');
const OrganizationMember = require('../models/OrganizationMember');
const Organization = require('../models/Organization');
const User = require('../models/User');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { getLogoAttachment, getOrganizationInvitationEmail } = require('../utils/emailTemplates');
const { getPrimaryClientUrl } = require('../config/client');

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

        // Get organization info
        const organization = await Organization.findById(organizationId);
        const orgName = organization?.name || 'Organization';

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

        // Send Email using standardized Attendance Shield template
        const inviteLink = `${getPrimaryClientUrl()}/invitation/${token}`;
        const message = `You have been invited to join ${orgName} on Attendance Shield.\n\nAccept your invitation here: ${inviteLink}`;
        const html = getOrganizationInvitationEmail({ orgName, role, inviteLink });
        const attachments = getLogoAttachment();

        await sendEmail({
            email,
            subject: `Invitation to join ${orgName} - Attendance Shield`,
            message,
            html,
            attachments
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
        }).populate('organizationId', 'name avatarUrl description');

        if (!invitation) {
            return res.status(400).json({ message: 'Invalid or expired invitation' });
        }

        res.status(200).json({
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
            organization: invitation.organizationId ? {
                _id: invitation.organizationId._id,
                name: invitation.organizationId.name,
                avatarUrl: invitation.organizationId.avatarUrl || '',
                description: invitation.organizationId.description || ''
            } : { name: 'Unknown Organization' }
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

// @desc    Get pending invitations for the logged-in user
// @route   GET /api/invitations/me/pending
// @access  Private
const getMyPendingInvitations = async (req, res, next) => {
    try {
        if (!req.user || !req.user.email) {
            return res.status(200).json([]);
        }

        const invitations = await OrganizationInvitation.find({
            email: req.user.email.toLowerCase(),
            status: 'PENDING',
            expiresAt: { $gt: Date.now() }
        })
        .populate('organizationId', 'name avatarUrl description')
        .populate('invitedBy', 'firstName lastName email')
        .sort({ createdAt: -1 });

        res.status(200).json(invitations);
    } catch (error) {
        next(error);
    }
};

// @desc    Accept invitation by Invitation ID (for authenticated users in-app)
// @route   POST /api/invitations/:invitationId/accept-id
// @access  Private
const acceptInvitationById = async (req, res, next) => {
    try {
        const { invitationId } = req.params;

        const invitation = await OrganizationInvitation.findOne({
            _id: invitationId,
            email: req.user.email.toLowerCase(),
            status: 'PENDING',
            expiresAt: { $gt: Date.now() }
        }).populate('organizationId', 'name avatarUrl description');

        if (!invitation) {
            return res.status(404).json({ message: 'Invitation not found or expired' });
        }

        // Check if already a member
        const existingMember = await OrganizationMember.findOne({
            organizationId: invitation.organizationId._id,
            userId: req.user._id
        });

        if (!existingMember) {
            await OrganizationMember.create({
                organizationId: invitation.organizationId._id,
                userId: req.user._id,
                role: invitation.role,
                status: 'ACTIVE'
            });
        }

        invitation.status = 'ACCEPTED';
        invitation.acceptedAt = Date.now();
        await invitation.save();

        res.status(200).json({ 
            message: 'Invitation accepted successfully',
            organization: invitation.organizationId
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Decline invitation by Invitation ID
// @route   POST /api/invitations/:invitationId/decline
// @access  Private
const declineInvitation = async (req, res, next) => {
    try {
        const { invitationId } = req.params;

        const invitation = await OrganizationInvitation.findOne({
            _id: invitationId,
            email: req.user.email.toLowerCase(),
            status: 'PENDING'
        });

        if (!invitation) {
            return res.status(404).json({ message: 'Invitation not found' });
        }

        invitation.status = 'CANCELLED';
        await invitation.save();

        res.status(200).json({ message: 'Invitation declined' });
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
    getMyPendingInvitations,
    acceptInvitationById,
    declineInvitation,
    getInvitations
};
