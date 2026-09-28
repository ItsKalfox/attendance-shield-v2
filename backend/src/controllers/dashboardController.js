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

            const enrolledCoursesCount = await CourseMember.countDocuments({
                organizationId,
                userId: req.user._id
            });

            const attendedSessionsCount = await AttendanceRecord.countDocuments({
                userId: req.user._id,
                status: 'PRESENT'
            });

            stats = {
                enrolledCourses: enrolledCoursesCount,
                attendedSessions: attendedSessionsCount,
                overallAttendance: 'N/A' // To be calculated properly later if needed
            };
            
            // Attendees don't need to see all recent sessions, just their recent records maybe,
            // but for now we'll pass an empty array to not break the frontend
            recentSessions = [];
            
        } else {
            // Stats for organizers
            const totalMembers = await OrganizationMember.countDocuments({ organizationId, status: 'ACTIVE' });
            const activeCourses = await Course.countDocuments({ organizationId, status: 'ACTIVE' });
            const activeSessions = await AttendanceSession.countDocuments({
                organizationId,
                status: { $in: ['ACTIVE', 'PENDING_CONFIRMATION'] }
            });

            stats = {
                totalMembers,
                activeCourses,
                activeSessions
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
