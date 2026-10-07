const Course = require('../models/Course');
const OrganizationMember = require('../models/OrganizationMember');
const AttendanceSession = require('../models/AttendanceSession');

// @desc    Get dashboard statistics
// @route   GET /api/organizations/:organizationId/dashboard
// @access  Private
const getDashboardStats = async (req, res, next) => {
    try {
        const organizationId = req.params.organizationId;

        let stats = {};
        let recentSessions = [];

        if (req.member.role === 'ATTENDEE') {
            // Stats for attendee
            const CourseMember = require('../models/CourseMember');
            const AttendanceRecord = require('../models/AttendanceRecord');

            const enrollments = await CourseMember.find({
                organizationId,
                userId: req.user._id,
                status: 'ACTIVE'
            });

            const enrolledCourseIds = enrollments.map(e => e.courseId);

            const totalConductedSessions = await AttendanceSession.countDocuments({
                courseId: { $in: enrolledCourseIds },
                organizationId,
                status: { $in: ['ACTIVE', 'CONFIRMED'] }
            });

            const attendedSessionsCount = await AttendanceRecord.countDocuments({
                organizationId,
                userId: req.user._id,
                status: 'PRESENT'
            });

            const overallPct = totalConductedSessions > 0
                ? `${((attendedSessionsCount / totalConductedSessions) * 100).toFixed(1)}%`
                : '100%';

            stats = {
                enrolledCourses: enrolledCourseIds.length,
                attendedSessions: attendedSessionsCount,
                totalSessions: totalConductedSessions,
                overallAttendance: overallPct
            };
            
            recentSessions = await AttendanceRecord.find({
                organizationId,
                userId: req.user._id
            })
            .sort({ markedAt: -1, createdAt: -1 })
            .limit(5)
            .populate('courseId', 'name code')
            .populate('sessionId', 'sessionName startTime expiresAt status');
            
        } else {
            // Stats for organizers
            const totalAttendees = await OrganizationMember.countDocuments({ organizationId, role: 'ATTENDEE', status: 'ACTIVE' });
            const activeCourses = await Course.countDocuments({ organizationId, status: 'ACTIVE' });
            const activeSessions = await AttendanceSession.countDocuments({
                organizationId,
                status: { $in: ['ACTIVE', 'PENDING_CONFIRMATION'] }
            });

            // Handle query filters for overview
            const { courseId, timeRange } = req.query;
            let sessionQuery = { organizationId };
            
            if (courseId && courseId !== 'all') {
                sessionQuery.courseId = courseId;
            }

            if (timeRange) {
                const now = new Date();
                if (timeRange === 'month') {
                    sessionQuery.startTime = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
                } else if (timeRange === 'week') {
                    sessionQuery.startTime = { $gte: new Date(now.setDate(now.getDate() - 7)) };
                }
            }

            const sessions = await AttendanceSession.find(sessionQuery).select('_id courseId');
            
            let presentCount = 0;
            let absentCount = 0;
            let topAttendees = [];
            
            if (sessions.length > 0) {
                const sessionIds = sessions.map(s => s._id);
                const courseIds = [...new Set(sessions.map(s => s.courseId.toString()))];
                
                const AttendanceRecord = require('../models/AttendanceRecord');
                const CourseMember = require('../models/CourseMember');

                // Get total present across these sessions
                presentCount = await AttendanceRecord.countDocuments({
                    sessionId: { $in: sessionIds },
                    status: 'PRESENT'
                });

                // Calculate expected attendees for each session
                let totalExpected = 0;
                for (const cid of courseIds) {
                    const enrolled = await CourseMember.countDocuments({ courseId: cid, status: 'ACTIVE' });
                    const sessionCount = sessions.filter(s => s.courseId.toString() === cid).length;
                    totalExpected += enrolled * sessionCount;
                }
                
                absentCount = Math.max(0, totalExpected - presentCount);

                // Calculate top attendees
                topAttendees = await AttendanceRecord.aggregate([
                    { $match: { sessionId: { $in: sessionIds }, status: 'PRESENT' } },
                    { $group: { _id: '$userId', attendanceCount: { $sum: 1 } } },
                    { $sort: { attendanceCount: -1 } },
                    { $limit: 5 },
                    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                    { $unwind: '$user' },
                    { $project: { _id: 1, attendanceCount: 1, 'user.firstName': 1, 'user.lastName': 1, 'user.email': 1 } }
                ]);
            }

            stats = {
                totalAttendees,
                activeCourses,
                activeSessions,
                attendanceOverview: {
                    present: presentCount,
                    absent: absentCount
                },
                topAttendees
            };

            recentSessions = await AttendanceSession.find({
                organizationId,
                status: { $in: ['ACTIVE', 'PENDING_CONFIRMATION'] }
            })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('courseId', 'name code')
            .populate({
                path: 'instructorId',
                populate: { path: 'userId', select: 'firstName lastName' }
            });
        }

        res.status(200).json({
            stats,
            recentSessions
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardStats
};
