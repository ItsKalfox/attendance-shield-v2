const AttendanceRecord = require('../models/AttendanceRecord');
const AttendanceSession = require('../models/AttendanceSession');
const CourseMember = require('../models/CourseMember');
const OrganizationMember = require('../models/OrganizationMember');
const User = require('../models/User');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

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

// In-Memory Session Cache (short TTL to handle high-traffic bursts of 200-300 students scanning simultaneously)
const sessionCache = new Map();
const sessionInfoCache = new Map();
const CACHE_TTL_MS = 15 * 1000; // 15 seconds cache window

const getCachedSession = async (tokenHash) => {
    const cached = sessionCache.get(tokenHash);
    const now = Date.now();
    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
    }
    const session = await AttendanceSession.findOne({ qrTokenHash: tokenHash });
    if (session) {
        sessionCache.set(tokenHash, { data: session, timestamp: now });
        if (sessionCache.size > 200) {
            for (const [k, v] of sessionCache.entries()) {
                if (now - v.timestamp > CACHE_TTL_MS) sessionCache.delete(k);
            }
        }
    }
    return session;
};

const getCachedSessionInfo = async (tokenHash) => {
    const cached = sessionInfoCache.get(tokenHash);
    const now = Date.now();
    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
    }
    const session = await AttendanceSession.findOne({ qrTokenHash: tokenHash })
        .select('isGeofenceEnabled status startTime expiresAt courseId instructorId organizationId')
        .populate('courseId', 'name code')
        .populate('organizationId', 'name avatarUrl')
        .populate({
            path: 'instructorId',
            populate: { path: 'userId', select: 'firstName lastName' }
        });

    if (session) {
        const infoData = {
            isGeofenceEnabled: session.isGeofenceEnabled,
            status: session.status,
            organization: session.organizationId ? {
                name: session.organizationId.name,
                logoUrl: session.organizationId.avatarUrl
            } : null,
            course: session.courseId ? {
                name: session.courseId.name,
                code: session.courseId.code
            } : null,
            instructor: session.instructorId?.userId ? {
                firstName: session.instructorId.userId.firstName,
                lastName: session.instructorId.userId.lastName
            } : null
        };
        sessionInfoCache.set(tokenHash, { data: infoData, timestamp: now });
        if (sessionInfoCache.size > 200) {
            for (const [k, v] of sessionInfoCache.entries()) {
                if (now - v.timestamp > CACHE_TTL_MS) sessionInfoCache.delete(k);
            }
        }
        return infoData;
    }
    return null;
};

// @desc    Scan QR to mark attendance
// @route   POST /api/attendance/scan
// @access  Private
const scanAttendance = async (req, res, next) => {
    try {
        const { qrToken, email, password, googleToken, microsoftToken, lat, lng } = req.body;

        if (!qrToken) {
            return res.status(400).json({ message: 'QR token is required' });
        }

        let userEmail = email;

        // 1. Authenticate user inline via Token or Password
        if (googleToken) {
            try {
                const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${googleToken}` }
                });
                if (!response.ok) throw new Error('Invalid Google token');
                const data = await response.json();
                userEmail = data.email;
            } catch (err) {
                return res.status(401).json({ message: 'Google Authentication failed' });
            }
        } else if (microsoftToken) {
            try {
                const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
                    headers: { Authorization: `Bearer ${microsoftToken}` }
                });
                userEmail = response.data.mail || response.data.userPrincipalName;
            } catch (err) {
                return res.status(401).json({ message: 'Microsoft Authentication failed' });
            }
        } else if (!email || !password) {
            return res.status(400).json({ message: 'Authentication required to mark attendance' });
        }

        if (!userEmail) {
            return res.status(401).json({ message: 'Could not extract email from authentication provider' });
        }

        const user = await User.findOne({ email: userEmail }).select('+passwordHash');
        if (!user) {
            return res.status(401).json({ message: 'User not found in system' });
        }

        // If they logged in with email/password, verify password
        if (!googleToken && !microsoftToken) {
            if (!(await bcrypt.compare(password, user.passwordHash))) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
        }

        const tokenHash = crypto.createHash('sha256').update(qrToken).digest('hex');

        // 2. Validate session (using high-speed in-memory cache for high concurrency)
        const session = await getCachedSession(tokenHash);
        if (!session) {
            return res.status(404).json({ message: 'Invalid or expired QR code.' });
        }

        // 3. Validate session is accepting attendance (with 45-second clock skew grace period)
        const nowMs = Date.now();
        const CLOCK_SKEW_GRACE_MS = 45 * 1000;
        const sessionStartMs = new Date(session.startTime).getTime();
        const sessionExpiryMs = new Date(session.expiresAt).getTime();

        if (session.status === 'SCHEDULED' && (nowMs + CLOCK_SKEW_GRACE_MS < sessionStartMs)) {
            return res.status(400).json({ message: 'The session has not started yet.' });
        }
        if (session.status !== 'ACTIVE' || (nowMs - CLOCK_SKEW_GRACE_MS >= sessionExpiryMs)) {
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
        let finalRecord;
        if (existingRecord) {
            existingRecord.status = 'PRESENT';
            existingRecord.markedAt = Date.now();
            existingRecord.markedBy = 'SELF';
            existingRecord.isFlagged = isFlagged;
            if (markedLocation) existingRecord.markedLocation = markedLocation;
            await existingRecord.save();
            finalRecord = existingRecord;
        } else {
            finalRecord = await AttendanceRecord.create({
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

        // Emit real-time update directly from memory (avoids extra findById + double populates under 300 concurrent requests)
        if (req.io) {
            const socketPayload = {
                _id: finalRecord._id,
                sessionId: session._id,
                courseId: session.courseId,
                organizationId: session.organizationId,
                status: finalRecord.status,
                markedAt: finalRecord.markedAt,
                markedBy: finalRecord.markedBy,
                isFlagged: finalRecord.isFlagged,
                markedLocation: finalRecord.markedLocation,
                createdAt: finalRecord.createdAt,
                updatedAt: finalRecord.updatedAt,
                userId: {
                    _id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email
                },
                organizationMemberId: {
                    _id: orgMember._id,
                    studentId: orgMember?.studentId || ''
                }
            };
            req.io.to(session._id.toString()).emit('attendance_updated', socketPayload);
        }

        const markedTime = new Date();
        if (isFlagged) {
            return res.status(200).json({ 
                message: 'Attendance marked successfully.',
                flagged: true,
                markedAt: markedTime,
                user: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    studentId: orgMember?.studentId || null
                }
            });
        }

        res.status(200).json({ 
            message: 'Attendance marked successfully.',
            flagged: false,
            markedAt: markedTime,
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                studentId: orgMember?.studentId || null
            }
        });
    } catch (error) {
        // Gracefully handle concurrent duplicate submissions
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Attendance already marked.' });
        }
        next(error);
    }
};

// @desc    Get attendance for a session (paginated with search)
// @route   GET /api/organizations/:organizationId/sessions/:sessionId/attendance
// @access  Private (ADMIN/OWNER/INSTRUCTOR)
const getSessionAttendance = async (req, res, next) => {
    try {
        const { search = '', page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);
        const mongoose = require('mongoose');

        let matchStage = {
            sessionId: new mongoose.Types.ObjectId(req.params.sessionId),
            organizationId: new mongoose.Types.ObjectId(req.params.organizationId),
            status: { $ne: 'REMOVED' }
        };

        let userIds = [];
        let orgMemberIds = [];

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            
            const users = await User.find({
                $or: [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { email: searchRegex }
                ]
            }).select('_id');
            userIds = users.map(u => u._id);

            const orgMembers = await OrganizationMember.find({
                organizationId: req.params.organizationId,
                studentId: searchRegex
            }).select('_id');
            orgMemberIds = orgMembers.map(m => m._id);

            matchStage.$or = [
                { userId: { $in: userIds } },
                { organizationMemberId: { $in: orgMemberIds } }
            ];
        }

        const totalRecords = await AttendanceRecord.countDocuments(matchStage);
        const records = await AttendanceRecord.find(matchStage)
            .sort({ markedAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('userId', 'firstName lastName email')
            .populate('organizationMemberId', 'studentId');

        res.status(200).json({
            records,
            totalRecords,
            totalPages: Math.ceil(totalRecords / limitNum),
            currentPage: parseInt(page)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get session attendance stats (for dashboard cards and manual dropdown)
// @route   GET /api/organizations/:organizationId/sessions/:sessionId/attendance/stats
// @access  Private (ADMIN/OWNER/INSTRUCTOR)
const getSessionAttendanceStats = async (req, res, next) => {
    try {
        const { sessionId, organizationId } = req.params;
        const { includeFlagged } = req.query;
        const mongoose = require('mongoose');

        const session = await AttendanceSession.findById(sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });

        const members = await CourseMember.find({
            courseId: session.courseId,
            status: 'ACTIVE'
        }).populate('userId', 'firstName lastName email');

        const allRecords = await AttendanceRecord.find({ 
            sessionId: new mongoose.Types.ObjectId(sessionId), 
            status: 'PRESENT' 
        });

        let statsRecords = allRecords;
        if (includeFlagged !== 'true') {
            statsRecords = allRecords.filter(r => !r.isFlagged);
        }
        
        const totalMarked = statsRecords.length;
        const selfMarkedCount = statsRecords.filter(r => r.markedBy === 'SELF').length;
        const adminMarkedCount = statsRecords.filter(r => r.markedBy !== 'SELF').length;

        const markedUserIds = new Set(allRecords.map(r => r.userId.toString()));
        const unmarkedMembers = members.filter(m => !markedUserIds.has(m.userId._id.toString()));

        const unmarkedUserIds = unmarkedMembers.map(m => m.userId._id);
        const orgMembers = await OrganizationMember.find({
            organizationId: new mongoose.Types.ObjectId(organizationId),
            userId: { $in: unmarkedUserIds }
        });

        const studentIdMap = {};
        orgMembers.forEach(om => {
            studentIdMap[om.userId.toString()] = om.studentId;
        });

        res.status(200).json({
            totalEnrolled: members.length,
            totalMarked,
            selfMarkedCount,
            adminMarkedCount,
            totalAttendanceCount: allRecords.length,
            flaggedCount: allRecords.filter(r => r.isFlagged).length,
            unmarkedMembers: unmarkedMembers.map(m => ({
                _id: m._id,
                userId: m.userId,
                studentId: studentIdMap[m.userId._id.toString()] || null
            }))
        });
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

        // Emit real-time update
        if (req.io) {
            const populatedRecord = await AttendanceRecord.findById(record._id)
                .populate('userId', 'firstName lastName email')
                .populate('organizationMemberId', 'studentId');
            req.io.to(sessionId.toString()).emit('attendance_updated', populatedRecord);
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

        const record = await AttendanceRecord.findOneAndDelete({
            _id: req.params.attendanceId,
            sessionId: req.params.sessionId
        });

        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }

        // Emit real-time update
        if (req.io) {
            req.io.to(req.params.sessionId.toString()).emit('attendance_removed', record._id);
        }

        res.status(200).json({ message: 'Attendance removed completely' });
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
        const sessionInfo = await getCachedSessionInfo(tokenHash);
        
        if (!sessionInfo) {
            return res.status(404).json({ message: 'Invalid or expired QR code.' });
        }

        res.status(200).json(sessionInfo);
    } catch (error) {
        next(error);
    }
};

// @desc    Get logged-in attendee attendance overview and logs
// @route   GET /api/organizations/:organizationId/my-attendance
// @access  Private (ATTENDEE/MEMBER)
const getMyAttendance = async (req, res, next) => {
    try {
        const organizationId = req.params.organizationId;
        const userId = req.user._id;

        // 1. Get all courses the user is enrolled in
        const enrollments = await CourseMember.find({
            organizationId,
            userId,
            status: 'ACTIVE'
        }).populate({
            path: 'courseId',
            populate: {
                path: 'instructor',
                populate: { path: 'userId', select: 'firstName lastName email avatar' }
            }
        });

        const courseSummaries = [];
        let totalConductedAcrossCourses = 0;
        let totalAttendedAcrossCourses = 0;

        for (const enrollment of enrollments) {
            const course = enrollment.courseId;
            if (!course) continue;

            const sessions = await AttendanceSession.find({
                courseId: course._id,
                organizationId,
                status: { $in: ['ACTIVE', 'CONFIRMED'] }
            });

            const sessionIds = sessions.map(s => s._id);

            const attendedCount = await AttendanceRecord.countDocuments({
                sessionId: { $in: sessionIds },
                userId,
                status: 'PRESENT'
            });

            const conductedCount = sessions.length;
            const percentage = conductedCount > 0
                ? Number(((attendedCount / conductedCount) * 100).toFixed(1))
                : 0;

            totalConductedAcrossCourses += conductedCount;
            totalAttendedAcrossCourses += attendedCount;

            courseSummaries.push({
                course: {
                    _id: course._id,
                    name: course.name,
                    code: course.code,
                    batch: course.batch,
                    semester: course.semester,
                    instructor: course.instructor ? {
                        name: `${course.instructor.userId?.firstName || ''} ${course.instructor.userId?.lastName || ''}`.trim(),
                        email: course.instructor.userId?.email || ''
                    } : null
                },
                conducted: conductedCount,
                attended: attendedCount,
                absent: Math.max(0, conductedCount - attendedCount),
                percentage,
                isEligible: percentage >= 80
            });
        }

        // 2. Fetch detailed attendance log records for the user
        const records = await AttendanceRecord.find({
            organizationId,
            userId
        })
        .populate({
            path: 'sessionId',
            select: 'sessionName startTime expiresAt status isGeofenceEnabled'
        })
        .populate({
            path: 'courseId',
            select: 'name code'
        })
        .sort({ markedAt: -1, createdAt: -1 });

        const overallPercentage = totalConductedAcrossCourses > 0
            ? Number(((totalAttendedAcrossCourses / totalConductedAcrossCourses) * 100).toFixed(1))
            : 0;

        res.status(200).json({
            summary: {
                enrolledCourses: courseSummaries.length,
                totalConducted: totalConductedAcrossCourses,
                totalAttended: totalAttendedAcrossCourses,
                totalAbsent: Math.max(0, totalConductedAcrossCourses - totalAttendedAcrossCourses),
                overallPercentage
            },
            courses: courseSummaries,
            records
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    scanAttendance,
    getSessionAttendance,
    getSessionAttendanceStats,
    addManualAttendance,
    removeAttendance,
    getSessionInfo,
    getMyAttendance
};
