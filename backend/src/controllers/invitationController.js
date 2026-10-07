const OrganizationInvitation = require('../models/OrganizationInvitation');
const OrganizationMember = require('../models/OrganizationMember');
const Organization = require('../models/Organization');
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

        // Send Email
        const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invitation/${token}`;
        const message = `You have been invited to join ${orgName} as an Instructor.\n\nClick here to accept: ${inviteLink}`;
        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="color: #1e293b; margin: 0; font-size: 24px;">Organization Invitation</h2>
                    <p style="color: #64748b; font-size: 14px; margin-top: 6px;">Attendance Shield Platform</p>
                </div>
                <div style="padding: 20px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
                    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 12px 0;">
                        Hello,
                    </p>
                    <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
                        You have been invited to join <strong>${orgName}</strong> as an <strong>Instructor</strong>.
                    </p>
                </div>
                <div style="text-align: center; margin-bottom: 28px;">
                    <a href="${inviteLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                        Accept Invitation
                    </a>
                </div>
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                    If the button does not work, copy and paste this link in your browser:<br/>
                    <a href="${inviteLink}" style="color: #4f46e5; word-break: break-all;">${inviteLink}</a>
                </p>
            </div>
        `;

        await sendEmail({
            email,
            subject: `Invitation to join ${orgName} as an Instructor`,
            message,
            html
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
