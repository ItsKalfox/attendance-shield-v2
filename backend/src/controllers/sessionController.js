const AttendanceSession = require('../models/AttendanceSession');
const crypto = require('crypto');

// @desc    Get all sessions for organization
// @route   GET /api/organizations/:organizationId/sessions
// @access  Private
const getSessions = async (req, res, next) => {
    try {
        const organizationId = req.params.organizationId;
        const { courseId, status } = req.query;

        const query = { organizationId };
        if (courseId) query.courseId = courseId;
        if (status) query.status = status;

        const sessions = await AttendanceSession.find(query)
            .populate('courseId', 'name code')
            .populate({
                path: 'instructorId',
                populate: { path: 'userId', select: 'firstName lastName' }
            })
            .sort({ startTime: -1 });

        res.status(200).json(sessions);
    } catch (error) {
        next(error);
    }
};

// @desc    Create a session
// @route   POST /api/organizations/:organizationId/sessions
// @access  Private (ADMIN/OWNER/INSTRUCTOR)
const createSession = async (req, res, next) => {
    try {
        const { courseId, instructorId, lectureType, startTime, expiresAt } = req.body;
        const organizationId = req.params.organizationId;

        // confirmationDeadline = expiresAt + 30 mins
        const expiresAtDate = new Date(expiresAt);
        const confirmationDeadline = new Date(expiresAtDate.getTime() + 30 * 60000);

        // Generate QR token
        const qrToken = crypto.randomBytes(32).toString('hex');
        const qrTokenHash = crypto.createHash('sha256').update(qrToken).digest('hex');

        const session = await AttendanceSession.create({
            organizationId,
            courseId,
            instructorId,
            lectureType,
            startTime,
            expiresAt: expiresAtDate,
            confirmationDeadline,
            qrTokenHash
        });

        res.status(201).json({
            session,
            qrToken // Only send this once to the frontend!
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get session by ID
// @route   GET /api/organizations/:organizationId/sessions/:sessionId
// @access  Private
const getSessionById = async (req, res, next) => {
    try {
        const session = await AttendanceSession.findOne({
            _id: req.params.sessionId,
            organizationId: req.params.organizationId
        })
        .populate('courseId', 'name code')
        .populate({
            path: 'instructorId',
            populate: { path: 'userId', select: 'firstName lastName email' }
        });

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Logic to transition session state if needed before returning
        const now = new Date();
        if (session.status === 'ACTIVE' && now >= session.expiresAt) {
            session.status = 'PENDING_CONFIRMATION';
            await session.save();
        }
        
        if (session.status === 'PENDING_CONFIRMATION' && now >= session.confirmationDeadline) {
            session.status = 'CONFIRMED';
            session.confirmedAt = session.confirmationDeadline; // auto confirmed time
            await session.save();
        }

        res.status(200).json(session);
    } catch (error) {
        next(error);
    }
};

// @desc    Confirm a session
// @route   POST /api/organizations/:organizationId/sessions/:sessionId/confirm
// @access  Private (ADMIN/OWNER/INSTRUCTOR)
const confirmSession = async (req, res, next) => {
    try {
        const session = await AttendanceSession.findOne({
            _id: req.params.sessionId,
            organizationId: req.params.organizationId
        });

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        if (session.status === 'CONFIRMED') {
            return res.status(400).json({ message: 'Session is already confirmed' });
        }

        session.status = 'CONFIRMED';
        session.confirmedAt = new Date();
        session.confirmedBy = req.member._id;
        await session.save();

        res.status(200).json(session);
    } catch (error) {
        next(error);
    }
};

// @desc    Cancel a session
// @route   POST /api/organizations/:organizationId/sessions/:sessionId/cancel
// @access  Private (ADMIN/OWNER/INSTRUCTOR)
const cancelSession = async (req, res, next) => {
    try {
        const session = await AttendanceSession.findOne({
            _id: req.params.sessionId,
            organizationId: req.params.organizationId
        });

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        session.status = 'CANCELLED';
        await session.save();

        res.status(200).json(session);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSessions,
    createSession,
    getSessionById,
    confirmSession,
    cancelSession
};
