const Course = require('../models/Course');
const CourseMember = require('../models/CourseMember');
const OrganizationMember = require('../models/OrganizationMember');

// @desc    Get all courses for organization
// @route   GET /api/organizations/:organizationId/courses
// @access  Private
const getCourses = async (req, res, next) => {
    try {
        const organizationId = req.params.organizationId;
        
        let query = { organizationId };
        
        if (req.member.role === 'ATTENDEE') {
            // Find courses this user is enrolled in
            const enrollments = await CourseMember.find({
                organizationId,
                userId: req.user._id
            });
            const courseIds = enrollments.map(e => e.courseId);
            
            query._id = { $in: courseIds };
            query.status = 'ACTIVE'; // Only show active courses for attendees
        }

        const courses = await Course.find(query)
            .populate({
                path: 'instructors',
                populate: { path: 'userId', select: 'firstName lastName email' }
            });

        res.status(200).json(courses);
    } catch (error) {
        next(error);
    }
};

// @desc    Create a course
// @route   POST /api/organizations/:organizationId/courses
// @access  Private (ADMIN/OWNER/INSTRUCTOR)
const createCourse = async (req, res, next) => {
    try {
        const { name, code, description, instructors, attendees } = req.body;
        const organizationId = req.params.organizationId;

        const course = await Course.create({
            organizationId,
            name,
            code,
            description,
            instructors: instructors || [req.member._id] // Default to creator if none provided
        });

        if (attendees && Array.isArray(attendees) && attendees.length > 0) {
            const courseMembersToInsert = [];
            
            for (const orgMemberId of attendees) {
                const orgMember = await OrganizationMember.findOne({
                    _id: orgMemberId,
                    organizationId
                });
                
                if (orgMember) {
                    courseMembersToInsert.push({
                        organizationId,
                        courseId: course._id,
                        userId: orgMember.userId,
                        organizationMemberId: orgMember._id
                    });
                }
            }
            
            if (courseMembersToInsert.length > 0) {
                await CourseMember.insertMany(courseMembersToInsert);
            }
        }

        res.status(201).json(course);
    } catch (error) {
        next(error);
    }
};

// @desc    Get course by ID
// @route   GET /api/organizations/:organizationId/courses/:courseId
// @access  Private
const getCourseById = async (req, res, next) => {
    try {
        const course = await Course.findOne({
            _id: req.params.courseId,
            organizationId: req.params.organizationId
        }).populate({
            path: 'instructors',
            populate: { path: 'userId', select: 'firstName lastName email' }
        });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        res.status(200).json(course);
    } catch (error) {
        next(error);
    }
};

// @desc    Update course
// @route   PATCH /api/organizations/:organizationId/courses/:courseId
// @access  Private (ADMIN/OWNER)
const updateCourse = async (req, res, next) => {
    try {
        const { name, code, description, status, instructors } = req.body;
        
        const course = await Course.findOne({
            _id: req.params.courseId,
            organizationId: req.params.organizationId
        });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        if (name) course.name = name;
        if (code) course.code = code;
        if (description !== undefined) course.description = description;
        if (status) course.status = status;
        if (instructors) course.instructors = instructors;

        await course.save();

        res.status(200).json(course);
    } catch (error) {
        next(error);
    }
};

// @desc    Get course members
// @route   GET /api/organizations/:organizationId/courses/:courseId/members
// @access  Private
const getCourseMembers = async (req, res, next) => {
    try {
        const members = await CourseMember.find({
            courseId: req.params.courseId,
            organizationId: req.params.organizationId
        }).populate('userId', 'firstName lastName email studentId');

        res.status(200).json(members);
    } catch (error) {
        next(error);
    }
};

// @desc    Enroll members in course
// @route   POST /api/organizations/:organizationId/courses/:courseId/members
// @access  Private (ADMIN/OWNER/INSTRUCTOR)
const enrollMembers = async (req, res, next) => {
    try {
        const { organizationMemberIds } = req.body; // Array of member IDs
        const courseId = req.params.courseId;
        const organizationId = req.params.organizationId;

        if (!organizationMemberIds || !Array.isArray(organizationMemberIds)) {
            return res.status(400).json({ message: 'Provide an array of organizationMemberIds' });
        }

        const enrolled = [];
        const errors = [];

        for (const orgMemberId of organizationMemberIds) {
            try {
                const orgMember = await OrganizationMember.findOne({
                    _id: orgMemberId,
                    organizationId
                });

                if (!orgMember) {
                    errors.push(`Member ${orgMemberId} not found in org`);
                    continue;
                }

                // Check if already enrolled
                const existing = await CourseMember.findOne({
                    courseId,
                    userId: orgMember.userId
                });

                if (existing) {
                    errors.push(`User ${orgMember.userId} already enrolled`);
                    continue;
                }

                const cm = await CourseMember.create({
                    organizationId,
                    courseId,
                    userId: orgMember.userId,
                    organizationMemberId: orgMember._id
                });

                enrolled.push(cm);
            } catch (err) {
                errors.push(err.message);
            }
        }

        res.status(201).json({ enrolled, errors });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCourses,
    createCourse,
    getCourseById,
    updateCourse,
    getCourseMembers,
    enrollMembers
};
