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
    },
    isFlagged: {
        type: Boolean,
        default: false
    },
    markedLocation: {
        lat: { type: Number },
        lng: { type: Number }
    }
}, {
    timestamps: true
});

// Prevent duplicate attendance
attendanceRecordSchema.index({ sessionId: 1, userId: 1 }, { unique: true });

// High-traffic performance indexes for rapid lookups and analytics
attendanceRecordSchema.index({ sessionId: 1, markedAt: -1 });
attendanceRecordSchema.index({ courseId: 1, userId: 1 });
attendanceRecordSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
