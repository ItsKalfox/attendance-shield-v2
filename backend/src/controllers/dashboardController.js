const Course = require('../models/Course');
const OrganizationMember = require('../models/OrganizationMember');
const AttendanceSession = require('../models/AttendanceSession');

// @desc    Get dashboard statistics
// @route   GET /api/organizations/:organizationId/dashboard
// @access  Private
const getDashboardStats = async (req, res, next) => {
    try {
        const organizationId = req.params.organizationId;

        // Total members
        const totalMembers = await OrganizationMember.countDocuments({ organizationId, status: 'ACTIVE' });

        // Total active courses
        const activeCourses = await Course.countDocuments({ organizationId, status: 'ACTIVE' });

        // Total active sessions
        const activeSessions = await AttendanceSession.countDocuments({
            organizationId,
            status: { $in: ['ACTIVE', 'PENDING_CONFIRMATION'] }
        });

        // Get recent active sessions
        const recentSessions = await AttendanceSession.find({
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

        res.status(200).json({
            stats: {
                totalMembers,
                activeCourses,
                activeSessions
            },
            recentSessions
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardStats
};
