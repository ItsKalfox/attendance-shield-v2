const AttendanceRecord = require('../models/AttendanceRecord');
const AttendanceSession = require('../models/AttendanceSession');
const CourseMember = require('../models/CourseMember');
const OrganizationMember = require('../models/OrganizationMember');
const crypto = require('crypto');

// @desc    Scan QR to mark attendance
// @route   POST /api/attendance/scan
// @access  Private
const scanAttendance = async (req, res, next) => {
    try {
        const { qrToken } = req.body;

        if (!qrToken) {
            return res.status(400).json({ message: 'QR token is required' });
        }

        const tokenHash = crypto.createHash('sha256').update(qrToken).digest('hex');

        // 1. Validate session
        const session = await AttendanceSession.findOne({ qrTokenHash });
        if (!session) {
            return res.status(404).json({ message: 'Invalid QR code' });
        }

        // 2. Validate session is accepting attendance
        const now = new Date();
        if (session.status !== 'ACTIVE' || now >= session.expiresAt) {
            return res.status(400).json({ message: 'Attendance Session Expired' });
        }

        // 3. Verify user belongs to organization
        const orgMember = await OrganizationMember.findOne({
            organizationId: session.organizationId,
            userId: req.user._id,
            status: 'ACTIVE'
        });

        if (!orgMember) {
            return res.status(403).json({ message: 'You are not a member of this organization' });
        }

        // 4. Verify user is enrolled in course
        const courseMember = await CourseMember.findOne({
            courseId: session.courseId,
            userId: req.user._id,
            status: 'ACTIVE'
        });

        if (!courseMember) {
            return res.status(403).json({ message: 'You are not enrolled in this course.' });
        }

        // 5. Check if already marked
        const existingRecord = await AttendanceRecord.findOne({
            sessionId: session._id,
            userId: req.user._id
        });

        if (existingRecord && existingRecord.status === 'PRESENT') {
            return res.status(400).json({ message: 'Attendance Already Recorded' });
        }

        // 6. Create or update record
        if (existingRecord) {
            existingRecord.status = 'PRESENT';
            existingRecord.markedAt = Date.now();
            existingRecord.markedBy = 'SELF';
            await existingRecord.save();
        } else {
            await AttendanceRecord.create({
                organizationId: session.organizationId,
                courseId: session.courseId,
                sessionId: session._id,
                userId: req.user._id,
                organizationMemberId: orgMember._id,
                markedBy: 'SELF'
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

module.exports = {
    scanAttendance,
    getSessionAttendance,
    addManualAttendance,
    removeAttendance
};
