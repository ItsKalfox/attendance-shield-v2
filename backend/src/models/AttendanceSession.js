const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
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
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: true
    },
    lectureType: {
        type: String,
        default: 'Lecture'
    },
    startTime: {
        type: Date,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    confirmationDeadline: {
        type: Date,
        required: true
    },
    qrToken: {
        type: String
    },
    qrTokenHash: {
        type: String
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED'],
        default: 'ACTIVE'
    },
    isGeofenceEnabled: {
        type: Boolean,
        default: false
    },
    geofenceCoordinates: {
        lat: { type: Number },
        lng: { type: Number }
    },
    geofenceRadius: {
        type: Number,
        default: 100 // meters
    },
    confirmedAt: {
        type: Date
    },
    confirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
