const Course = require('../models/Course');
const CourseMember = require('../models/CourseMember');
const OrganizationMember = require('../models/OrganizationMember');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const mongoose = require('mongoose');

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
            // Instructors see courses where they are either the coordinator or an additional instructor
            query.$or = [
                { instructor: req.member._id },
                { instructors: req.member._id }
            ];
        }
        // OWNER and ADMIN see all courses

        const courses = await Course.find(query)
            .populate({
                path: 'instructor',
                populate: { path: 'userId', select: 'name firstName lastName email avatar' }
            })
            .populate({
                path: 'instructors',
                populate: { path: 'userId', select: 'name firstName lastName email avatar' }
            })
            .sort({ createdAt: -1 })
            .lean();

        for (let course of courses) {
            course.attendeesCount = await CourseMember.countDocuments({ courseId: course._id });
            if (!course.instructor) {
                const ownerMember = await OrganizationMember.findOne({ organizationId, role: 'OWNER' })
                    .populate('userId', 'name firstName lastName email avatar');
                if (ownerMember) {
                    course.instructor = ownerMember;
                    await Course.updateOne({ _id: course._id }, { $set: { instructor: ownerMember._id } });
                }
            }
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
        const { name, code, batch, semester, startDate, endDate, instructor, instructors, description } = req.body;
        const organizationId = req.params.organizationId;

        if (!name || !code || !batch || !semester || !instructor) {
            return res.status(400).json({ message: 'Course name, code, batch, semester, and course coordinator are required' });
        }

        // Verify that primary instructor / coordinator exists in organization
        const instructorMember = await OrganizationMember.findOne({
            _id: instructor,
            organizationId
        });
        if (!instructorMember) {
            return res.status(400).json({ message: 'Selected course coordinator does not belong to this organization' });
        }

        let coInstructors = [];
        if (Array.isArray(instructors) && instructors.length > 0) {
            const coordIdStr = instructor.toString();
            const uniqueIds = [...new Set(instructors.map(id => id.toString()))].filter(id => id !== coordIdStr);
            if (uniqueIds.length > 8) {
                return res.status(400).json({ message: 'A maximum of 8 additional instructors can be assigned to a course' });
            }
            if (uniqueIds.length > 0) {
                const validStaff = await OrganizationMember.find({
                    _id: { $in: uniqueIds },
                    organizationId,
                    role: { $in: ['OWNER', 'INSTRUCTOR'] }
                });
                if (validStaff.length !== uniqueIds.length) {
                    return res.status(400).json({ message: 'One or more selected additional instructors are invalid or do not belong to this organization' });
                }
                coInstructors = uniqueIds;
            }
        }

        if (startDate && endDate) {
            const sDate = new Date(startDate);
            const eDate = new Date(endDate);
            if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && eDate < sDate) {
                return res.status(400).json({ message: 'Course end date cannot be earlier than start date' });
            }
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
            instructors: coInstructors,
            description: description ? description.trim() : '',
            status: 'ONGOING'
        });

        const populatedCourse = await Course.findById(course._id)
            .populate({
                path: 'instructor',
                populate: { path: 'userId', select: 'name firstName lastName email avatar' }
            })
            .populate({
                path: 'instructors',
                populate: { path: 'userId', select: 'name firstName lastName email avatar' }
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
        let course = await Course.findOne({
            _id: req.params.courseId,
            organizationId: req.params.organizationId
        })
        .populate({
            path: 'instructor',
            populate: { path: 'userId', select: 'name firstName lastName email avatar' }
        })
        .populate({
            path: 'instructors',
            populate: { path: 'userId', select: 'name firstName lastName email avatar' }
        });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // If older course without instructor, assign owner
        if (!course.instructor) {
            const ownerMember = await OrganizationMember.findOne({ organizationId: req.params.organizationId, role: 'OWNER' })
                .populate('userId', 'name firstName lastName email avatar');
            if (ownerMember) {
                course.instructor = ownerMember;
                await Course.updateOne({ _id: course._id }, { $set: { instructor: ownerMember._id } });
            }
        }

        // If requester is an INSTRUCTOR, ensure they are assigned to this course (as coordinator or co-instructor)
        if (req.member.role === 'INSTRUCTOR') {
            const isAssigned = (course.instructor && (course.instructor._id || course.instructor).toString() === req.member._id.toString()) ||
                (course.instructors && course.instructors.some(inst => (inst._id || inst).toString() === req.member._id.toString()));
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
// @access  Private (ADMIN/OWNER/INSTRUCTOR - Coordinator only)
const updateCourse = async (req, res, next) => {
    try {
        const { name, code, batch, semester, startDate, endDate, instructor, instructors, description, status } = req.body;
        
        const course = await Course.findOne({
            _id: req.params.courseId,
            organizationId: req.params.organizationId
        });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Only OWNER/ADMIN or assigned Course Coordinator can update course settings
        const requesterRole = req.member.role;
        const isCoordinator = course.instructor && course.instructor.toString() === req.member._id.toString();
        const isAdmin = requesterRole === 'OWNER' || requesterRole === 'ADMIN';

        if (!isAdmin && !isCoordinator) {
            return res.status(403).json({ message: 'Only organization administrators or the course coordinator can modify course settings' });
        }

        const effectiveStart = (startDate !== undefined && isAdmin) ? (startDate || null) : course.startDate;
        const effectiveEnd = (endDate !== undefined && isAdmin) ? (endDate || null) : course.endDate;
        if (effectiveStart && effectiveEnd) {
            const sDate = new Date(effectiveStart);
            const eDate = new Date(effectiveEnd);
            if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && eDate < sDate) {
                return res.status(400).json({ message: 'Course end date cannot be earlier than start date' });
            }
        }

        if (name && isAdmin) course.name = name.trim();
        if (code && isAdmin) course.code = code.trim();
        if (batch && isAdmin) course.batch = batch.trim();
        if (semester && isAdmin) course.semester = semester.trim();
        if (startDate !== undefined && isAdmin) course.startDate = startDate || null;
        if (endDate !== undefined && isAdmin) course.endDate = endDate || null;
        
        // Changing Course Coordinator is strictly allowed for ADMIN/OWNER
        if (instructor && isAdmin) {
            const coordMember = await OrganizationMember.findOne({
                _id: instructor,
                organizationId: req.params.organizationId,
                role: { $in: ['OWNER', 'INSTRUCTOR'] }
            });
            if (!coordMember) {
                return res.status(400).json({ message: 'Selected course coordinator does not belong to this organization' });
            }
            course.instructor = instructor;
            // If new coordinator is present in instructors list, remove them
            if (Array.isArray(course.instructors)) {
                course.instructors = course.instructors.filter(id => id.toString() !== instructor.toString());
            }
        }

        // Updating Additional Instructors (allowed for ADMIN/OWNER or Course Coordinator)
        if (instructors !== undefined) {
            if (!Array.isArray(instructors)) {
                return res.status(400).json({ message: 'Additional instructors must be an array' });
            }

            const currentCoordId = course.instructor.toString();
            const uniqueInstructors = [...new Set(instructors.map(id => id.toString()))].filter(id => id !== currentCoordId);

            if (uniqueInstructors.length > 8) {
                return res.status(400).json({ message: 'A maximum of 8 additional instructors can be assigned to a course' });
            }

            if (uniqueInstructors.length > 0) {
                const validStaff = await OrganizationMember.find({
                    _id: { $in: uniqueInstructors },
                    organizationId: req.params.organizationId,
                    role: { $in: ['OWNER', 'INSTRUCTOR'] }
                });
                if (validStaff.length !== uniqueInstructors.length) {
                    return res.status(400).json({ message: 'One or more selected instructors are invalid or do not belong to this organization' });
                }
            }

            course.instructors = uniqueInstructors;
        }

        if (description !== undefined) course.description = description ? description.trim() : '';
        if (status && ['ONGOING', 'COMPLETED'].includes(status)) {
            course.status = status;
        }

        if (req.body.attendanceSettings) {
            course.attendanceSettings = {
                minOverallPercentage: req.body.attendanceSettings.minOverallPercentage !== undefined 
                    ? Number(req.body.attendanceSettings.minOverallPercentage) 
                    : (course.attendanceSettings?.minOverallPercentage ?? 80),
                typeRequirements: Array.isArray(req.body.attendanceSettings.typeRequirements)
                    ? req.body.attendanceSettings.typeRequirements
                    : (course.attendanceSettings?.typeRequirements ?? [])
            };
        }

        await course.save();

        const populatedCourse = await Course.findById(course._id)
            .populate({
                path: 'instructor',
                populate: { path: 'userId', select: 'name firstName lastName email avatar' }
            })
            .populate({
                path: 'instructors',
                populate: { path: 'userId', select: 'name firstName lastName email avatar' }
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
            select: 'name firstName lastName email avatar'
        })
        .populate({
            path: 'organizationMemberId',
            select: 'studentId role status joinedAt name firstName lastName'
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
        const isCoordinator = course.instructor && course.instructor.toString() === req.member._id.toString();

        if (requesterRole === 'INSTRUCTOR' && !isCoordinator) {
            return res.status(403).json({ message: 'Only the course coordinator or organization admin can enroll members in this course' });
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
        const isCoordinator = course.instructor && course.instructor.toString() === req.member._id.toString();

        if (requesterRole === 'INSTRUCTOR' && !isCoordinator) {
            return res.status(403).json({ message: 'Only the course coordinator or organization admin can remove members from this course' });
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

        const minPercentage = req.query.threshold 
            ? Number(req.query.threshold) 
            : (course.attendanceSettings?.minOverallPercentage ?? 80);

        let isStudentEligible = overallPercentage >= minPercentage;
        let typeRequirements = course.attendanceSettings?.typeRequirements || [];
        if (req.query.typeRequirements) {
            try {
                const parsed = JSON.parse(req.query.typeRequirements);
                if (Array.isArray(parsed)) typeRequirements = parsed;
            } catch (e) {
                // Ignore parse error
            }
        }
        if (Array.isArray(typeRequirements) && typeRequirements.length > 0) {
            for (const reqItem of typeRequirements) {
                if (reqItem.minSessions > 0) {
                    const attendedForType = breakdownMap[reqItem.lectureType]?.attended || 0;
                    if (attendedForType < reqItem.minSessions) {
                        isStudentEligible = false;
                        break;
                    }
                }
            }
        }

        res.status(200).json({
            student: {
                _id: studentMember._id,
                name: `${studentMember.firstName || studentMember.userId?.firstName || ''} ${studentMember.lastName || studentMember.userId?.lastName || ''}`.trim() || 'Student',
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
                } : null,
                attendanceSettings: {
                    minOverallPercentage: minPercentage,
                    typeRequirements
                }
            },
            breakdown: breakdownList,
            summary: {
                totalConducted,
                totalAttended,
                totalAbsent,
                overallPercentage,
                threshold: minPercentage,
                isEligible: isStudentEligible
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Validate bulk course import data
// @route   POST /api/organizations/:organizationId/courses/validate-import
// @access  Private (ADMIN/OWNER)
const validateImportCourses = async (req, res, next) => {
    try {
        const { courses } = req.body;
        const organizationId = req.params.organizationId;

        if (!courses || !Array.isArray(courses)) {
            return res.status(400).json({ message: 'Invalid courses data array' });
        }

        // 1. Fetch all existing course codes in this organization
        const existingCourses = await Course.find({ organizationId }).select('code');
        const existingCodeSet = new Set(existingCourses.map(c => (c.code || '').toLowerCase().trim()));

        // 2. Fetch all staff members (OWNER, INSTRUCTOR, ADMIN) in this organization
        const staffMembers = await OrganizationMember.find({
            organizationId,
            role: { $in: ['OWNER', 'INSTRUCTOR', 'ADMIN'] }
        }).populate('userId', 'firstName lastName email avatar');

        const staffByEmail = new Map();
        staffMembers.forEach(m => {
            const email = m.userId?.email?.toLowerCase().trim();
            if (email) {
                staffByEmail.set(email, {
                    memberId: m._id,
                    name: `${m.firstName || m.userId?.firstName || ''} ${m.lastName || m.userId?.lastName || ''}`.trim() || 'Instructor',
                    role: m.role,
                    email: m.userId?.email
                });
            }
        });

        // 3. Validate each course
        const results = courses.map((course, index) => {
            const code = (course.courseCode || course.code || '').trim();
            const name = (course.courseName || course.name || '').trim();
            const batch = (course.batch || '').trim();
            const semester = (course.semester || '').trim();
            const instructorEmail = (course.instructorEmail || course.instructor || '').toLowerCase().trim();
            const description = (course.description || '').trim();
            const startDateStr = course.startDate || '';
            const endDateStr = course.endDate || '';

            const errors = [];
            let isCodeDuplicateInOrg = false;
            let instructorFound = null;
            let isDateInvalid = false;

            // Validate Code
            if (!code) {
                errors.push('Course code is required');
            } else if (existingCodeSet.has(code.toLowerCase())) {
                isCodeDuplicateInOrg = true;
                errors.push('Course code already exists in organization');
            }

            // Validate Name
            if (!name) {
                errors.push('Course name is required');
            }

            // Validate Batch & Semester
            if (!batch) {
                errors.push('Batch is required');
            }
            if (!semester) {
                errors.push('Semester is required');
            }

            // Validate Dates
            let parsedStartDate = null;
            let parsedEndDate = null;
            if (startDateStr) {
                const d = new Date(startDateStr);
                if (isNaN(d.getTime())) {
                    isDateInvalid = true;
                    errors.push('Invalid start date');
                } else {
                    parsedStartDate = d.toISOString().split('T')[0];
                }
            }
            if (endDateStr) {
                const d = new Date(endDateStr);
                if (isNaN(d.getTime())) {
                    isDateInvalid = true;
                    errors.push('Invalid end date');
                } else {
                    parsedEndDate = d.toISOString().split('T')[0];
                }
            }
            if (parsedStartDate && parsedEndDate) {
                if (new Date(parsedEndDate) < new Date(parsedStartDate)) {
                    isDateInvalid = true;
                    errors.push('End date cannot be earlier than start date');
                }
            }

            // Validate Instructor
            if (!instructorEmail) {
                errors.push('Instructor email is required');
            } else {
                const staff = staffByEmail.get(instructorEmail);
                if (staff) {
                    instructorFound = {
                        memberId: staff.memberId,
                        name: staff.name,
                        email: staff.email,
                        role: staff.role
                    };
                } else {
                    errors.push('Instructor not found in organization (must be registered staff)');
                }
            }

            return {
                _tempId: course._tempId || index.toString(),
                courseCode: code,
                courseName: name,
                batch,
                semester,
                startDate: parsedStartDate || startDateStr,
                endDate: parsedEndDate || endDateStr,
                instructorEmail,
                description,
                isCodeDuplicateInOrg,
                isDateInvalid,
                instructorFound,
                isValid: errors.length === 0,
                errors
            };
        });

        res.status(200).json({
            results,
            availableInstructors: Array.from(staffByEmail.values())
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Bulk create courses from validated import
// @route   POST /api/organizations/:organizationId/courses/bulk-create
// @access  Private (ADMIN/OWNER)
const bulkCreateCourses = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { courses } = req.body;
        const organizationId = req.params.organizationId;

        if (!courses || !Array.isArray(courses) || courses.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'No courses provided to create' });
        }

        // Fetch staff in organization
        const staffMembers = await OrganizationMember.find({
            organizationId,
            role: { $in: ['OWNER', 'INSTRUCTOR', 'ADMIN'] }
        }).populate('userId', 'email').session(session);

        const staffByEmail = new Map();
        staffMembers.forEach(m => {
            const email = m.userId?.email?.toLowerCase().trim();
            if (email) staffByEmail.set(email, m._id);
        });

        const staffById = new Set(staffMembers.map(m => m._id.toString()));
        const createdCourses = [];

        for (const item of courses) {
            const code = (item.courseCode || item.code || '').trim().toUpperCase();
            const name = (item.courseName || item.name || '').trim();
            const batch = (item.batch || '').trim();
            const semester = (item.semester || '').trim();
            const instructorEmail = (item.instructorEmail || item.instructor || '').toLowerCase().trim();
            const instructorMemberId = item.instructorMemberId || item.instructorFound?.memberId;
            const description = (item.description || '').trim();
            const startDate = item.startDate ? new Date(item.startDate) : null;
            const endDate = item.endDate ? new Date(item.endDate) : null;

            if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate < startDate) {
                throw new Error(`End date cannot be earlier than start date for course "${code || name || 'Unknown'}"`);
            }

            if (!code || !name || !batch || !semester) {
                throw new Error(`Missing required fields for course code: ${code || name || 'Unknown'}`);
            }

            let assignedInstructorId = null;
            if (instructorMemberId && staffById.has(instructorMemberId.toString())) {
                assignedInstructorId = instructorMemberId;
            } else if (instructorEmail && staffByEmail.has(instructorEmail)) {
                assignedInstructorId = staffByEmail.get(instructorEmail);
            } else {
                throw new Error(`Invalid or missing instructor for course "${code}"`);
            }

            // Check duplicate code in DB during transaction
            const existingCourse = await Course.findOne({
                organizationId,
                code: { $regex: new RegExp(`^${code}$`, 'i') }
            }).session(session);

            if (existingCourse) {
                throw new Error(`Course code "${code}" already exists in the organization.`);
            }

            const created = await Course.create([{
                organizationId,
                name,
                code,
                batch,
                semester,
                startDate: startDate && !isNaN(startDate.getTime()) ? startDate : null,
                endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
                instructor: assignedInstructorId,
                description,
                status: 'ONGOING'
            }], { session });

            createdCourses.push(created[0]);
        }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            message: `Successfully created ${createdCourses.length} courses`,
            total: createdCourses.length,
            courses: createdCourses
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

// @desc    Get course attendance report for all enrolled students
// @route   GET /api/organizations/:organizationId/courses/:courseId/attendance-report
// @access  Private (OWNER, ADMIN, INSTRUCTOR)
const getCourseAttendanceReport = async (req, res, next) => {
    try {
        const { organizationId, courseId } = req.params;

        const course = await Course.findOne({ _id: courseId, organizationId })
            .populate('organizationId', 'name avatarUrl')
            .populate({
                path: 'instructor',
                populate: { path: 'userId', select: 'firstName lastName email' }
            });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Get all conducted sessions for this course (excluding CANCELLED)
        const sessions = await AttendanceSession.find({
            courseId,
            organizationId,
            status: { $ne: 'CANCELLED' }
        }).sort({ startTime: 1 });

        // Calculate session count by lectureType
        const lectureTypeCounts = {};
        sessions.forEach(s => {
            const type = s.lectureType || 'Lecture';
            lectureTypeCounts[type] = (lectureTypeCounts[type] || 0) + 1;
        });

        // Standard lecture types supported by Attendance Shield
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

        // Combine standard types and any extra types that might have been recorded
        const allTypesSet = new Set([...standardTypes, ...Object.keys(lectureTypeCounts)]);
        const allLectureTypes = Array.from(allTypesSet);
        const totalSessionsConducted = sessions.length;

        // Get all enrolled students in this course
        const enrolledMembers = await CourseMember.find({
            courseId,
            organizationId,
            status: 'ACTIVE'
        })
        .populate({
            path: 'organizationMemberId',
            select: 'firstName lastName studentId userId'
        })
        .populate({
            path: 'userId',
            select: 'firstName lastName email studentId'
        });

        // Get all PRESENT attendance records for these sessions
        const sessionIds = sessions.map(s => s._id);
        const records = await AttendanceRecord.find({
            sessionId: { $in: sessionIds },
            courseId,
            organizationId,
            status: 'PRESENT'
        }).select('sessionId organizationMemberId userId');

        // Map session ID to lectureType
        const sessionTypeMap = {};
        sessions.forEach(s => {
            sessionTypeMap[s._id.toString()] = s.lectureType || 'Lecture';
        });

        // Map student identifier -> set of attended session IDs
        const studentAttendedMap = {};
        records.forEach(r => {
            const memberKey = r.organizationMemberId?.toString() || r.userId?.toString();
            if (!studentAttendedMap[memberKey]) {
                studentAttendedMap[memberKey] = new Set();
            }
            studentAttendedMap[memberKey].add(r.sessionId.toString());
        });

        const minPercentage = req.query.threshold 
            ? Number(req.query.threshold) 
            : (course.attendanceSettings?.minOverallPercentage ?? 80);

        let typeRequirements = course.attendanceSettings?.typeRequirements || [];
        if (req.query.typeRequirements) {
            try {
                const parsed = JSON.parse(req.query.typeRequirements);
                if (Array.isArray(parsed)) typeRequirements = parsed;
            } catch (e) {
                // Ignore parse error
            }
        }

        // Build student report rows
        const studentRows = enrolledMembers.map(em => {
            const orgMember = em.organizationMemberId;
            const user = em.userId;

            const memberKey = orgMember?._id?.toString() || user?._id?.toString();
            const attendedSessions = studentAttendedMap[memberKey] || new Set();

            const fName = orgMember?.firstName || user?.firstName || '';
            const lName = orgMember?.lastName || user?.lastName || '';
            const fullName = `${fName} ${lName}`.trim() || 'Student';
            const studentId = orgMember?.studentId || user?.studentId || '-';
            const email = user?.email || '';

            // Count per lecture type
            const attendanceByType = {};
            allLectureTypes.forEach(type => {
                attendanceByType[type] = 0;
            });

            attendedSessions.forEach(sessionId => {
                const type = sessionTypeMap[sessionId];
                if (type && attendanceByType[type] !== undefined) {
                    attendanceByType[type] += 1;
                }
            });

            const totalAttended = attendedSessions.size;
            const percentage = totalSessionsConducted > 0 
                ? Math.round((totalAttended / totalSessionsConducted) * 100) 
                : 0;

            let isEligible = percentage >= minPercentage;
            if (Array.isArray(typeRequirements) && typeRequirements.length > 0) {
                for (const reqItem of typeRequirements) {
                    if (reqItem.minSessions > 0) {
                        const attendedForType = attendanceByType[reqItem.lectureType] || 0;
                        if (attendedForType < reqItem.minSessions) {
                            isEligible = false;
                            break;
                        }
                    }
                }
            }

            return {
                studentId,
                name: fullName,
                email,
                attendanceByType,
                totalAttended,
                totalConducted: totalSessionsConducted,
                percentage,
                isEligible
            };
        });

        // Sort students naturally by studentId, then name
        studentRows.sort((a, b) => {
            if (a.studentId !== '-' && b.studentId !== '-') {
                return a.studentId.localeCompare(b.studentId, undefined, { numeric: true });
            }
            return a.name.localeCompare(b.name);
        });

        const instructorUser = course.instructor?.userId;
        const instructorName = instructorUser 
            ? `${instructorUser.firstName || ''} ${instructorUser.lastName || ''}`.trim() 
            : 'Unassigned';

        res.json({
            organization: {
                name: course.organizationId?.name || '',
                logo: course.organizationId?.avatarUrl || ''
            },
            course: {
                id: course._id,
                name: course.name,
                code: course.code,
                batch: course.batch || '',
                semester: course.semester || '',
                instructor: {
                    name: instructorName,
                    email: instructorUser?.email || ''
                },
                attendanceSettings: {
                    minOverallPercentage: minPercentage,
                    typeRequirements
                }
            },
            lectureTypeSummary: allLectureTypes.map(type => ({
                type,
                conducted: lectureTypeCounts[type] || 0
            })),
            totalSessionsConducted,
            totalStudentsEnrolled: enrolledMembers.length,
            students: studentRows
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
    getCourseStudentAttendance,
    getCourseAttendanceReport,
    validateImportCourses,
    bulkCreateCourses
};
