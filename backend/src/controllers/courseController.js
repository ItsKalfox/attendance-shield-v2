const Course = require('../models/Course');
const CourseMember = require('../models/CourseMember');
const OrganizationMember = require('../models/OrganizationMember');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');

// @desc    Get all courses for organization
// @route   GET /api/organizations/:organizationId/courses
// @access  Private
const getCourses = async (req, res, next) => {
    try {
        const organizationId = req.params.organizationId;
        const { status } = req.query; // optional filter: ONGOING or COMPLETED
        
        let query = { organizationId };
        
        if (status) {
            query.status = status;
        }

        if (req.member.role === 'ATTENDEE') {
            // Find courses this user is enrolled in
            const enrollments = await CourseMember.find({
                organizationId,
                userId: req.user._id
            });
            const courseIds = enrollments.map(e => e.courseId);
            query._id = { $in: courseIds };
        } else if (req.member.role === 'INSTRUCTOR') {
            // Instructors only see courses where they are the assigned instructor
            query.instructor = req.member._id;
        }
        // OWNER and ADMIN see all courses

        const courses = await Course.find(query)
            .populate({
                path: 'instructor',
                populate: { path: 'userId', select: 'firstName lastName email avatar' }
            })
            .sort({ createdAt: -1 })
            .lean();

        for (let course of courses) {
            course.attendeesCount = await CourseMember.countDocuments({ courseId: course._id });
        }

        res.status(200).json(courses);
    } catch (error) {
        next(error);
    }
};

// @desc    Create a course
// @route   POST /api/organizations/:organizationId/courses
// @access  Private (ADMIN/OWNER)
const createCourse = async (req, res, next) => {
    try {
        const { name, code, batch, semester, startDate, endDate, instructor, description } = req.body;
        const organizationId = req.params.organizationId;

        if (!name || !code || !batch || !semester || !instructor) {
            return res.status(400).json({ message: 'Course name, code, batch, semester, and instructor are required' });
        }

        // Verify that instructor exists in organization
        const instructorMember = await OrganizationMember.findOne({
            _id: instructor,
            organizationId
        });
        if (!instructorMember) {
            return res.status(400).json({ message: 'Selected instructor does not belong to this organization' });
        }

        const course = await Course.create({
            organizationId,
            name: name.trim(),
            code: code.trim(),
            batch: batch.trim(),
            semester: semester.trim(),
            startDate: startDate || null,
            endDate: endDate || null,
            instructor,
            description: description ? description.trim() : '',
            status: 'ONGOING'
        });

        const populatedCourse = await Course.findById(course._id)
            .populate({
                path: 'instructor',
                populate: { path: 'userId', select: 'firstName lastName email avatar' }
            });

        res.status(201).json(populatedCourse);
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
        })
        .populate({
            path: 'instructor',
            populate: { path: 'userId', select: 'firstName lastName email avatar' }
        });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // If requester is an INSTRUCTOR, ensure they are assigned to this course
        if (req.member.role === 'INSTRUCTOR') {
            const isAssigned = course.instructor && course.instructor._id.toString() === req.member._id.toString();
            if (!isAssigned) {
                return res.status(403).json({ message: 'You are not assigned to this course' });
            }
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
        const { name, code, batch, semester, startDate, endDate, instructor, description, status } = req.body;
        
        const course = await Course.findOne({
            _id: req.params.courseId,
            organizationId: req.params.organizationId
        });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Only OWNER/ADMIN can update course details
        const requesterRole = req.member.role;
        if (requesterRole !== 'OWNER' && requesterRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Only organization administrators can modify courses' });
        }

        if (name) course.name = name.trim();
        if (code) course.code = code.trim();
        if (batch) course.batch = batch.trim();
        if (semester) course.semester = semester.trim();
        if (startDate !== undefined) course.startDate = startDate || null;
        if (endDate !== undefined) course.endDate = endDate || null;
        if (instructor) course.instructor = instructor;
        if (description !== undefined) course.description = description ? description.trim() : '';
        if (status && ['ONGOING', 'COMPLETED'].includes(status)) {
            course.status = status;
        }

        await course.save();

        const populatedCourse = await Course.findById(course._id)
            .populate({
                path: 'instructor',
                populate: { path: 'userId', select: 'firstName lastName email avatar' }
            });

        res.status(200).json(populatedCourse);
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
        })
        .populate({
            path: 'userId',
            select: 'firstName lastName email avatar'
        })
        .populate({
            path: 'organizationMemberId',
            select: 'studentId role status joinedAt'
        });

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

        if (!organizationMemberIds || !Array.isArray(organizationMemberIds) || organizationMemberIds.length === 0) {
            return res.status(400).json({ message: 'Provide an array of organizationMemberIds' });
        }

        const course = await Course.findOne({ _id: courseId, organizationId });
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const requesterRole = req.member.role;
        const isAssigned = course.instructor && course.instructor.toString() === req.member._id.toString();

        if (requesterRole === 'INSTRUCTOR' && !isAssigned) {
            return res.status(403).json({ message: 'Only the assigned instructor or organization admin can enroll members in this course' });
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
                    continue; // Skip if already enrolled
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

// @desc    Remove member from course
// @route   DELETE /api/organizations/:organizationId/courses/:courseId/members/:memberId
// @access  Private (ADMIN/OWNER/INSTRUCTOR)
const removeMemberFromCourse = async (req, res, next) => {
    try {
        const { organizationId, courseId, memberId } = req.params;

        const course = await Course.findOne({ _id: courseId, organizationId });
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const requesterRole = req.member.role;
        const isAssigned = course.instructor && course.instructor.toString() === req.member._id.toString();

        if (requesterRole === 'INSTRUCTOR' && !isAssigned) {
            return res.status(403).json({ message: 'Only the assigned instructor or organization admin can remove members from this course' });
        }

        const courseMember = await CourseMember.findOne({
            _id: memberId,
            courseId,
            organizationId
        });

        if (!courseMember) {
            return res.status(404).json({ message: 'Member not found in course' });
        }

        await CourseMember.findByIdAndDelete(memberId);

        res.status(200).json({ message: 'Member removed from course' });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete course
// @route   DELETE /api/organizations/:organizationId/courses/:courseId
// @access  Private (ADMIN/OWNER)
const deleteCourse = async (req, res, next) => {
    try {
        const course = await Course.findOne({
            _id: req.params.courseId,
            organizationId: req.params.organizationId
        });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const requesterRole = req.member.role;
        if (requesterRole !== 'OWNER' && requesterRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Only organization administrators can delete courses' });
        }

        await Course.findByIdAndDelete(course._id);
        await CourseMember.deleteMany({ courseId: req.params.courseId });
        await AttendanceSession.deleteMany({ courseId: req.params.courseId });
        await AttendanceRecord.deleteMany({ courseId: req.params.courseId });

        res.status(200).json({ message: 'Course deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get detailed attendance breakdown for a student in a course
// @route   GET /api/organizations/:organizationId/courses/:courseId/students/:studentId/attendance
// @access  Private
const getCourseStudentAttendance = async (req, res, next) => {
    try {
        const { organizationId, courseId, studentId } = req.params;

        const course = await Course.findOne({ _id: courseId, organizationId })
            .populate({
                path: 'instructor',
                populate: { path: 'userId', select: 'firstName lastName email' }
            });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Find the student's OrganizationMember record
        const studentMember = await OrganizationMember.findOne({
            _id: studentId,
            organizationId
        }).populate('userId', 'firstName lastName email avatar');

        if (!studentMember) {
            return res.status(404).json({ message: 'Student not found in this organization' });
        }

        // Check if student is enrolled in this course
        const isEnrolled = await CourseMember.findOne({
            courseId,
            organizationId,
            organizationMemberId: studentMember._id
        });

        // Get all conducted sessions for this course
        const sessions = await AttendanceSession.find({
            courseId,
            organizationId,
            status: { $ne: 'CANCELLED' }
        }).sort({ startTime: 1 });

        const sessionIds = sessions.map(s => s._id);

        // Get all present attendance records for this student across these sessions
        const attendanceRecords = await AttendanceRecord.find({
            sessionId: { $in: sessionIds },
            organizationMemberId: studentMember._id,
            status: 'PRESENT'
        });

        const attendedSessionIdSet = new Set(attendanceRecords.map(r => r.sessionId.toString()));

        // Supported standard lecture types
        const standardTypes = [
            'Lecture',
            'Tutorial',
            'Practical',
            'Workshop',
            'Lab',
            'Field Visit',
            'Field Work',
            'Presentation'
        ];

        const breakdownMap = {};
        standardTypes.forEach(type => {
            breakdownMap[type] = {
                type,
                conducted: 0,
                attended: 0,
                absent: 0,
                percentage: 0
            };
        });

        // Count sessions by lecture type
        sessions.forEach(session => {
            const type = session.lectureType || 'Lecture';
            if (!breakdownMap[type]) {
                breakdownMap[type] = {
                    type,
                    conducted: 0,
                    attended: 0,
                    absent: 0,
                    percentage: 0
                };
            }
            breakdownMap[type].conducted += 1;
            if (attendedSessionIdSet.has(session._id.toString())) {
                breakdownMap[type].attended += 1;
            }
        });

        let totalConducted = 0;
        let totalAttended = 0;

        const breakdownList = Object.values(breakdownMap).map(item => {
            item.absent = Math.max(0, item.conducted - item.attended);
            item.percentage = item.conducted > 0 
                ? Number(((item.attended / item.conducted) * 100).toFixed(1))
                : 0;
            totalConducted += item.conducted;
            totalAttended += item.attended;
            return item;
        });

        const totalAbsent = Math.max(0, totalConducted - totalAttended);
        const overallPercentage = totalConducted > 0 
            ? Number(((totalAttended / totalConducted) * 100).toFixed(1))
            : 0;

        const activeInstructor = course.instructor;

        res.status(200).json({
            student: {
                _id: studentMember._id,
                name: `${studentMember.userId?.firstName || ''} ${studentMember.userId?.lastName || ''}`.trim() || 'Student',
                email: studentMember.userId?.email || '',
                studentId: studentMember.studentId || '',
                avatar: studentMember.userId?.avatar || '',
                isEnrolled: !!isEnrolled
            },
            course: {
                _id: course._id,
                name: course.name,
                code: course.code,
                batch: course.batch || '',
                semester: course.semester || '',
                startDate: course.startDate,
                endDate: course.endDate,
                status: course.status || 'ONGOING',
                instructor: activeInstructor ? {
                    name: `${activeInstructor.userId?.firstName || ''} ${activeInstructor.userId?.lastName || ''}`.trim(),
                    email: activeInstructor.userId?.email || ''
                } : null
            },
            breakdown: breakdownList,
            summary: {
                totalConducted,
                totalAttended,
                totalAbsent,
                overallPercentage,
                isEligible: overallPercentage >= 80
            }
        });
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
    enrollMembers,
    deleteCourse,
    removeMemberFromCourse,
    getCourseStudentAttendance
};
