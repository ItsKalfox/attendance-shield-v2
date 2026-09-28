const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
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
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AttendanceSession',
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
    markedAt: {
        type: Date,
        default: Date.now
    },
    markedBy: {
        type: String,
        enum: ['SELF', 'INSTRUCTOR', 'ADMIN'],
        default: 'SELF'
    },
    status: {
        type: String,
        enum: ['PRESENT', 'REMOVED'],
        default: 'PRESENT'
    }
}, {
    timestamps: true
});

// Prevent duplicate attendance
attendanceRecordSchema.index({ sessionId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
