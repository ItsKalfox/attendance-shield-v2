const Organization = require('../models/Organization');
const OrganizationMember = require('../models/OrganizationMember');

// @desc    Create a new organization
// @route   POST /api/organizations
// @access  Private
const createOrganization = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Organization name is required' });
        }

        if (!description || !description.trim()) {
            return res.status(400).json({ message: 'Organization description is required' });
        }

        const orgPayload = {
            name: name.trim(),
            description: description.trim(),
            createdBy: req.user._id
        };

        if (req.file) {
            orgPayload.avatarUrl = req.file.path;
            orgPayload.avatarPublicId = req.file.filename;
        }

        // Create the organization
        const organization = await Organization.create(orgPayload);

        // Make the creator the OWNER
        await OrganizationMember.create({
            organizationId: organization._id,
            userId: req.user._id,
            role: 'OWNER',
            status: 'ACTIVE'
        });

        res.status(201).json(organization);
    } catch (error) {
        next(error);
    }
};

// @desc    Get user's organizations
// @route   GET /api/organizations
// @access  Private
const getOrganizations = async (req, res, next) => {
    try {
        // Find all memberships for this user
        const memberships = await OrganizationMember.find({
            userId: req.user._id,
            status: 'ACTIVE'
        }).populate('organizationId');

        // Extract organizations and attach the user's role
        const organizations = memberships.map(m => {
            const org = m.organizationId.toObject();
            org.userRole = m.role;
            return org;
        });

        res.status(200).json(organizations);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single organization
// @route   GET /api/organizations/:organizationId
// @access  Private
const getOrganizationById = async (req, res, next) => {
    try {
        // The middleware ensures the user is a member
        const organization = await Organization.findById(req.params.organizationId);
        
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        res.status(200).json(organization);
    } catch (error) {
        next(error);
    }
};

// @desc    Update organization
// @route   PATCH /api/organizations/:organizationId
// @access  Private (OWNER only)
const updateOrganization = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        
        const organization = await Organization.findById(req.params.organizationId);
        
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        if (name) organization.name = name;
        if (description !== undefined) organization.description = description;
        
        if (req.file) {
            organization.avatarUrl = req.file.path;
            organization.avatarPublicId = req.file.filename;
        }
        
        await organization.save();

        res.status(200).json(organization);
    } catch (error) {
        next(error);
    }
};

const Course = require('../models/Course');
const CourseMember = require('../models/CourseMember');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');

// @desc    Export full organization data
// @route   GET /api/organizations/:organizationId/export
// @access  Private (OWNER and ADMIN only)
const exportOrganizationData = async (req, res, next) => {
    try {
        const orgId = req.params.organizationId;
        const organization = await Organization.findById(orgId);
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        const [members, courses, enrollments, sessions, attendanceRecords] = await Promise.all([
            OrganizationMember.find({ organizationId: orgId }).populate('userId', 'firstName lastName email studentId'),
            Course.find({ organizationId: orgId }).populate('instructor'),
            CourseMember.find({ organizationId: orgId }).populate('userId', 'firstName lastName email studentId').populate('organizationMemberId', 'firstName lastName studentId').populate('courseId', 'code name'),
            AttendanceSession.find({ organizationId: orgId }).populate('courseId', 'code name batch semester').populate('instructorId'),
            AttendanceRecord.find({ organizationId: orgId }).populate('userId', 'firstName lastName email studentId').populate('organizationMemberId', 'firstName lastName studentId').populate('courseId', 'code name').populate('sessionId', 'lectureType startTime')
        ]);

        res.status(200).json({
            exportedAt: new Date().toISOString(),
            organization: {
                id: organization._id,
                name: organization.name,
                description: organization.description,
                createdAt: organization.createdAt
            },
            members: members.map(m => ({
                id: m._id,
                role: m.role,
                studentId: m.studentId || m.userId?.studentId || '',
                firstName: m.firstName || m.userId?.firstName || '',
                lastName: m.lastName || m.userId?.lastName || '',
                email: m.userId?.email || '',
                status: m.status,
                joinedAt: m.createdAt
            })),
            courses: courses.map(c => ({
                id: c._id,
                code: c.code,
                name: c.name,
                description: c.description || '',
                batch: c.batch || '',
                semester: c.semester || '',
                status: c.status || 'ONGOING',
                minAttendancePercentage: c.minAttendancePercentage || 80,
                createdAt: c.createdAt
            })),
            enrollments: enrollments.map(e => ({
                id: e._id,
                courseCode: e.courseId?.code || '',
                courseName: e.courseId?.name || '',
                studentId: e.organizationMemberId?.studentId || e.userId?.studentId || '',
                studentName: `${e.organizationMemberId?.firstName || e.userId?.firstName || ''} ${e.organizationMemberId?.lastName || e.userId?.lastName || ''}`.trim(),
                studentEmail: e.userId?.email || '',
                enrolledAt: e.createdAt
            })),
            sessions: sessions.map(s => ({
                id: s._id,
                courseCode: s.courseId?.code || '',
                courseName: s.courseId?.name || '',
                lectureType: s.lectureType,
                status: s.status,
                startTime: s.startTime,
                expiresAt: s.expiresAt,
                isGeofenceEnabled: s.isGeofenceEnabled,
                geofenceRadius: s.geofenceRadius,
                createdAt: s.createdAt
            })),
            attendanceRecords: attendanceRecords.map(r => ({
                id: r._id,
                courseCode: r.courseId?.code || '',
                courseName: r.courseId?.name || '',
                sessionType: r.sessionId?.lectureType || '',
                sessionStartTime: r.sessionId?.startTime || '',
                studentId: r.organizationMemberId?.studentId || r.userId?.studentId || '',
                studentName: `${r.organizationMemberId?.firstName || r.userId?.firstName || ''} ${r.organizationMemberId?.lastName || r.userId?.lastName || ''}`.trim(),
                studentEmail: r.userId?.email || '',
                status: r.status,
                markedAt: r.markedAt,
                verificationMethod: r.markedBy || 'SELF',
                isFlagged: r.isFlagged || false,
                markedLocation: r.markedLocation || null
            }))
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrganization,
    getOrganizations,
    getOrganizationById,
    updateOrganization,
    exportOrganizationData
};
