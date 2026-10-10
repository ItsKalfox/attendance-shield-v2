const mongoose = require('mongoose');

const organizationMemberSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ['OWNER', 'INSTRUCTOR', 'ATTENDEE'],
        default: 'ATTENDEE'
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'PENDING', 'SUSPENDED'],
        default: 'ACTIVE'
    },
    studentId: {
        type: String,
        trim: true,
        default: ''
    },
    firstName: {
        type: String,
        trim: true,
        default: ''
    },
    lastName: {
        type: String,
        trim: true,
        default: ''
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Prevent duplicate membership
organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('OrganizationMember', organizationMemberSchema);
