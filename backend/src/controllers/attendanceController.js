const AttendanceRecord = require('../models/AttendanceRecord');
const AttendanceSession = require('../models/AttendanceSession');
const CourseMember = require('../models/CourseMember');
const OrganizationMember = require('../models/OrganizationMember');
const User = require('../models/User');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radius of the earth in m
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1); 
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in m
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// @desc    Scan QR to mark attendance
// @route   POST /api/attendance/scan
// @access  Private
const scanAttendance = async (req, res, next) => {
    try {
        const { qrToken, email, password, lat, lng } = req.body;

        if (!qrToken || !email || !password) {
            return res.status(400).json({ message: 'QR token, email, and password are required' });
        }

        // 1. Authenticate user inline
        const user = await User.findOne({ email }).select('+passwordHash');
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const tokenHash = crypto.createHash('sha256').update(qrToken).digest('hex');

        // 2. Validate session
        const session = await AttendanceSession.findOne({ qrTokenHash: tokenHash });
        if (!session) {
            return res.status(404).json({ message: 'Invalid or expired QR code.' });
        }

        // 3. Validate session is accepting attendance
        const now = new Date();
        if (session.status === 'SCHEDULED' || now < session.startTime) {
            return res.status(400).json({ message: 'The session has not started yet.' });
        }
        if (session.status !== 'ACTIVE' || now >= session.expiresAt) {
            return res.status(400).json({ message: 'Attendance Session Expired' });
        }

        // 4. Verify user belongs to organization
        const orgMember = await OrganizationMember.findOne({
            organizationId: session.organizationId,
            userId: user._id,
            status: 'ACTIVE'
        });

        if (!orgMember) {
            return res.status(403).json({ message: 'You are not a member of this organization' });
        }

        // 5. Verify user is enrolled in course
        const courseMember = await CourseMember.findOne({
            courseId: session.courseId,
            userId: user._id,
            status: 'ACTIVE'
        });

        if (!courseMember) {
            return res.status(403).json({ message: 'You are not enrolled in the course associated with this session.' });
        }

        // 6. Check if already marked
        const existingRecord = await AttendanceRecord.findOne({
            sessionId: session._id,
            userId: user._id
        });

        if (existingRecord && existingRecord.status === 'PRESENT') {
            return res.status(400).json({ message: 'Attendance already marked.' });
        }

        // 7. Geofence Check
        let isFlagged = false;
        let markedLocation = undefined;

        if (session.isGeofenceEnabled && session.geofenceCoordinates && session.geofenceCoordinates.lat != null) {
            if (lat == null || lng == null) {
                isFlagged = true; // Flag if location denied or unavailable
            } else {
                markedLocation = { lat, lng };
                const distance = getDistanceFromLatLonInM(
                    session.geofenceCoordinates.lat,
                    session.geofenceCoordinates.lng,
                    lat,
                    lng
                );
                if (distance > session.geofenceRadius) {
                    isFlagged = true;
                }
            }
        }

        // 8. Create or update record
        if (existingRecord) {
            existingRecord.status = 'PRESENT';
            existingRecord.markedAt = Date.now();
            existingRecord.markedBy = 'SELF';
            existingRecord.isFlagged = isFlagged;
            if (markedLocation) existingRecord.markedLocation = markedLocation;
            await existingRecord.save();
        } else {
            await AttendanceRecord.create({
                organizationId: session.organizationId,
                courseId: session.courseId,
                sessionId: session._id,
                userId: user._id,
                organizationMemberId: orgMember._id,
                markedBy: 'SELF',
                isFlagged,
                markedLocation
            });
        }

        if (isFlagged) {
            return res.status(200).json({ 
                message: 'You are outside the marking area. This attendance has been recorded but flagged.',
                flagged: true
            });
        }

        res.status(200).json({ message: 'Attendance marked successfully.' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get attendance for a session
// @route   GET /api/organizations/:organizationId/sessions/:sessionId/attendance
// @access  Private (ADMIN/OWNER/INSTRUCTOR)
const getSessionAttendance = async (req, res, next) => {
    try {
        const records = await AttendanceRecord.find({
            sessionId: req.params.sessionId,
            organizationId: req.params.organizationId
        }).populate('userId', 'firstName lastName email').populate('organizationMemberId', 'studentId');

        res.status(200).json(records);
    } catch (error) {
        next(error);
    }
};

// @desc    Manually add attendance
// @route   POST /api/organizations/:organizationId/sessions/:sessionId/attendance/manual
// @access  Private (ADMIN/OWNER/INSTRUCTOR)
const addManualAttendance = async (req, res, next) => {
    try {
        const { userId } = req.body;
        const sessionId = req.params.sessionId;
        const organizationId = req.params.organizationId;

        const session = await AttendanceSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        if (session.status === 'CONFIRMED') {
            return res.status(400).json({ message: 'Cannot modify confirmed session' });
        }

        if (req.member.role === 'INSTRUCTOR' && session.instructorId.toString() !== req.member._id.toString()) {
            return res.status(403).json({ message: 'You cannot modify attendance for other instructors\' sessions.' });
        }

        const orgMember = await OrganizationMember.findOne({
            organizationId,
            userId,
            status: 'ACTIVE'
        });

        if (!orgMember) {
            return res.status(400).json({ message: 'User is not a member of the organization' });
        }

        let record = await AttendanceRecord.findOne({ sessionId, userId });

        if (record) {
            if (record.status === 'PRESENT') {
                return res.status(400).json({ message: 'Attendance Already Recorded' });
            }
            record.status = 'PRESENT';
            record.markedAt = Date.now();
            record.markedBy = req.member.role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'ADMIN';
            await record.save();
        } else {
            record = await AttendanceRecord.create({
                organizationId,
                courseId: session.courseId,
                sessionId,
                userId,
                organizationMemberId: orgMember._id,
                markedBy: req.member.role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'ADMIN'
            });
        }

        res.status(201).json(record);
    } catch (error) {
        next(error);
    }
};

// @desc    Remove attendance
// @route   DELETE /api/organizations/:organizationId/sessions/:sessionId/attendance/:attendanceId
// @access  Private (ADMIN/OWNER/INSTRUCTOR)
const removeAttendance = async (req, res, next) => {
    try {
        const session = await AttendanceSession.findById(req.params.sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        if (session.status === 'CONFIRMED') {
            return res.status(400).json({ message: 'Cannot modify confirmed session' });
        }

        if (req.member.role === 'INSTRUCTOR' && session.instructorId.toString() !== req.member._id.toString()) {
            return res.status(403).json({ message: 'You cannot modify attendance for other instructors\' sessions.' });
        }

        const record = await AttendanceRecord.findOne({
            _id: req.params.attendanceId,
            sessionId: req.params.sessionId
        });

        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }

        // According to requirements, better to preserve history than delete
        record.status = 'REMOVED';
        await record.save();

        res.status(200).json({ message: 'Attendance removed' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get session info for public scan page
// @route   GET /api/attendance/session-info/:qrToken
// @access  Public
const getSessionInfo = async (req, res, next) => {
    try {
        const tokenHash = crypto.createHash('sha256').update(req.params.qrToken).digest('hex');
        const session = await AttendanceSession.findOne({ qrTokenHash: tokenHash })
            .select('isGeofenceEnabled status startTime expiresAt courseId instructorId')
            .populate('courseId', 'name code')
            .populate({
                path: 'instructorId',
                populate: { path: 'userId', select: 'firstName lastName' }
            });
        
        if (!session) {
            return res.status(404).json({ message: 'Invalid or expired QR code.' });
        }

        res.status(200).json({ 
            isGeofenceEnabled: session.isGeofenceEnabled,
            status: session.status,
            course: session.courseId ? {
                name: session.courseId.name,
                code: session.courseId.code
            } : null,
            instructor: session.instructorId?.userId ? {
                firstName: session.instructorId.userId.firstName,
                lastName: session.instructorId.userId.lastName
            } : null
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    scanAttendance,
    getSessionAttendance,
    addManualAttendance,
    removeAttendance,
    getSessionInfo
};
