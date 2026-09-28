const mongoose = require('mongoose');

const organizationInvitationSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['INSTRUCTOR'],
        default: 'INSTRUCTOR'
    },
    tokenHash: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED'],
        default: 'PENDING'
    },
    acceptedAt: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('OrganizationInvitation', organizationInvitationSchema);
