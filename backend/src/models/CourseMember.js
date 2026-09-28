const mongoose = require('mongoose');

const courseMemberSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    organizationMemberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: true
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'REMOVED'],
        default: 'ACTIVE'
    },
    enrolledAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Prevent duplicate course enrollment
courseMemberSchema.index({ courseId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('CourseMember', courseMemberSchema);
