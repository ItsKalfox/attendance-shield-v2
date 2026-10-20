const express = require('express');
const router = express.Router();
const { 
    createOrganization, 
    getOrganizations, 
    getOrganizationById, 
    updateOrganization,
    exportOrganizationData
} = require('../controllers/organizationController');
const { getMembers, addMember, importMembers, removeMember, updateMember, validateEmails } = require('../controllers/memberController');
const { inviteStaff, getInvitations } = require('../controllers/invitationController');
const { 
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
} = require('../controllers/courseController');
const { getSessions, createSession, getSessionById, confirmSession, cancelSession, deleteSession } = require('../controllers/sessionController');
const { getSessionAttendance, getSessionAttendanceStats, addManualAttendance, removeAttendance, getMyAttendance } = require('../controllers/attendanceController');
const { getDashboardStats } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { requireOrganizationRole } = require('../middleware/organizationMiddleware');
const { upload } = require('../config/cloudinary');

// All organization routes require authentication
router.use(protect);

router.post('/', upload.single('avatar'), createOrganization);
router.get('/', getOrganizations);

router.get('/:organizationId', requireOrganizationRole(), getOrganizationById);
router.patch('/:organizationId', requireOrganizationRole('OWNER'), upload.single('avatar'), updateOrganization);
router.get('/:organizationId/export', requireOrganizationRole('OWNER', 'ADMIN'), exportOrganizationData);

// Dashboard route
router.get('/:organizationId/dashboard', requireOrganizationRole(), getDashboardStats);

// Member routes
router.get('/:organizationId/members', requireOrganizationRole('OWNER', 'INSTRUCTOR'), getMembers);
router.post('/:organizationId/members', requireOrganizationRole('OWNER'), addMember);
router.post('/:organizationId/members/import', requireOrganizationRole('OWNER'), importMembers);
router.delete('/:organizationId/members/:memberId', requireOrganizationRole('OWNER'), removeMember);
router.patch('/:organizationId/members/:memberId', requireOrganizationRole('OWNER'), updateMember);
router.post('/:organizationId/members/validate-emails', requireOrganizationRole('OWNER'), validateEmails);

// Invitation routes
router.get('/:organizationId/invitations', requireOrganizationRole('OWNER'), getInvitations);
router.post('/:organizationId/invitations', requireOrganizationRole('OWNER'), inviteStaff);

// Course routes
router.get('/:organizationId/courses', requireOrganizationRole(), getCourses);
router.post('/:organizationId/courses/validate-import', requireOrganizationRole('OWNER', 'ADMIN'), validateImportCourses);
router.post('/:organizationId/courses/bulk-create', requireOrganizationRole('OWNER', 'ADMIN'), bulkCreateCourses);
router.post('/:organizationId/courses', requireOrganizationRole('OWNER', 'ADMIN'), createCourse);
router.get('/:organizationId/courses/:courseId', requireOrganizationRole(), getCourseById);
router.patch('/:organizationId/courses/:courseId', requireOrganizationRole('OWNER', 'ADMIN', 'INSTRUCTOR'), updateCourse);
router.delete('/:organizationId/courses/:courseId', requireOrganizationRole('OWNER', 'ADMIN'), deleteCourse);
router.get('/:organizationId/courses/:courseId/members', requireOrganizationRole(), getCourseMembers);
router.post('/:organizationId/courses/:courseId/members', requireOrganizationRole('OWNER', 'ADMIN', 'INSTRUCTOR'), enrollMembers);
router.delete('/:organizationId/courses/:courseId/members/:memberId', requireOrganizationRole('OWNER', 'ADMIN', 'INSTRUCTOR'), removeMemberFromCourse);
router.get('/:organizationId/courses/:courseId/students/:studentId/attendance', requireOrganizationRole(), getCourseStudentAttendance);
router.get('/:organizationId/courses/:courseId/attendance-report', requireOrganizationRole('OWNER', 'ADMIN', 'INSTRUCTOR'), getCourseAttendanceReport);

// Session routes
router.get('/:organizationId/sessions', requireOrganizationRole(), getSessions);
router.post('/:organizationId/sessions', requireOrganizationRole('OWNER', 'INSTRUCTOR'), createSession);
router.get('/:organizationId/sessions/:sessionId', requireOrganizationRole(), getSessionById);
router.post('/:organizationId/sessions/:sessionId/confirm', requireOrganizationRole('OWNER', 'INSTRUCTOR'), confirmSession);
router.post('/:organizationId/sessions/:sessionId/cancel', requireOrganizationRole('OWNER', 'INSTRUCTOR'), cancelSession);
router.delete('/:organizationId/sessions/:sessionId', requireOrganizationRole('OWNER'), deleteSession);

// Attendance routes (Organization scope)
router.get('/:organizationId/my-attendance', requireOrganizationRole(), getMyAttendance);
router.get('/:organizationId/sessions/:sessionId/attendance', requireOrganizationRole('OWNER', 'INSTRUCTOR'), getSessionAttendance);
router.get('/:organizationId/sessions/:sessionId/attendance/stats', requireOrganizationRole('OWNER', 'INSTRUCTOR'), getSessionAttendanceStats);
router.post('/:organizationId/sessions/:sessionId/attendance/manual', requireOrganizationRole('OWNER', 'INSTRUCTOR'), addManualAttendance);
router.delete('/:organizationId/sessions/:sessionId/attendance/:attendanceId', requireOrganizationRole('OWNER', 'INSTRUCTOR'), removeAttendance);

module.exports = router;
