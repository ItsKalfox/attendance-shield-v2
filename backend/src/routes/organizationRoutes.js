const express = require('express');
const router = express.Router();
const { 
    createOrganization, 
    getOrganizations, 
    getOrganizationById, 
    updateOrganization 
} = require('../controllers/organizationController');
const { getMembers, addMember, importMembers, removeMember, updateMember, resetMemberPassword } = require('../controllers/memberController');
const { inviteStaff, getInvitations } = require('../controllers/invitationController');
const { getCourses, createCourse, getCourseById, updateCourse, getCourseMembers, enrollMembers, deleteCourse, removeMemberFromCourse } = require('../controllers/courseController');
const { getSessions, createSession, getSessionById, confirmSession, cancelSession, deleteSession } = require('../controllers/sessionController');
const { getSessionAttendance, addManualAttendance, removeAttendance } = require('../controllers/attendanceController');
const { getDashboardStats } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { requireOrganizationRole } = require('../middleware/organizationMiddleware');
const { upload } = require('../config/cloudinary');

// All organization routes require authentication
router.use(protect);

router.post('/', createOrganization);
router.get('/', getOrganizations);

router.get('/:organizationId', requireOrganizationRole(), getOrganizationById);
router.patch('/:organizationId', requireOrganizationRole('OWNER'), upload.single('avatar'), updateOrganization);

// Dashboard route
router.get('/:organizationId/dashboard', requireOrganizationRole(), getDashboardStats);

// Member routes
router.get('/:organizationId/members', requireOrganizationRole(), getMembers);
router.post('/:organizationId/members', requireOrganizationRole('OWNER', 'INSTRUCTOR'), addMember);
router.post('/:organizationId/members/import', requireOrganizationRole('OWNER', 'INSTRUCTOR'), importMembers);
router.delete('/:organizationId/members/:memberId', requireOrganizationRole('OWNER', 'INSTRUCTOR'), removeMember);
router.patch('/:organizationId/members/:memberId', requireOrganizationRole('OWNER', 'INSTRUCTOR'), updateMember);
router.post('/:organizationId/members/:memberId/reset-password', requireOrganizationRole('OWNER', 'INSTRUCTOR'), resetMemberPassword);

// Invitation routes
router.get('/:organizationId/invitations', requireOrganizationRole('OWNER', 'INSTRUCTOR'), getInvitations);
router.post('/:organizationId/invitations', requireOrganizationRole('OWNER', 'INSTRUCTOR'), inviteStaff);

// Course routes
router.get('/:organizationId/courses', requireOrganizationRole(), getCourses);
router.post('/:organizationId/courses', requireOrganizationRole('OWNER', 'INSTRUCTOR'), createCourse);
router.get('/:organizationId/courses/:courseId', requireOrganizationRole(), getCourseById);
router.patch('/:organizationId/courses/:courseId', requireOrganizationRole('OWNER', 'INSTRUCTOR'), updateCourse);
router.get('/:organizationId/courses/:courseId/members', requireOrganizationRole(), getCourseMembers);
router.post('/:organizationId/courses/:courseId/members', requireOrganizationRole('OWNER', 'INSTRUCTOR'), enrollMembers);
router.delete('/:organizationId/courses/:courseId/members/:memberId', requireOrganizationRole('OWNER', 'INSTRUCTOR'), removeMemberFromCourse);
router.delete('/:organizationId/courses/:courseId', requireOrganizationRole('OWNER', 'INSTRUCTOR'), deleteCourse);

// Session routes
router.get('/:organizationId/sessions', requireOrganizationRole(), getSessions);
router.post('/:organizationId/sessions', requireOrganizationRole('OWNER', 'INSTRUCTOR'), createSession);
router.get('/:organizationId/sessions/:sessionId', requireOrganizationRole(), getSessionById);
router.post('/:organizationId/sessions/:sessionId/confirm', requireOrganizationRole('OWNER', 'INSTRUCTOR'), confirmSession);
router.post('/:organizationId/sessions/:sessionId/cancel', requireOrganizationRole('OWNER', 'INSTRUCTOR'), cancelSession);
router.delete('/:organizationId/sessions/:sessionId', requireOrganizationRole('OWNER'), deleteSession);

// Attendance routes (Organization scope)
router.get('/:organizationId/sessions/:sessionId/attendance', requireOrganizationRole('OWNER', 'INSTRUCTOR'), getSessionAttendance);
router.post('/:organizationId/sessions/:sessionId/attendance/manual', requireOrganizationRole('OWNER', 'INSTRUCTOR'), addManualAttendance);
router.delete('/:organizationId/sessions/:sessionId/attendance/:attendanceId', requireOrganizationRole('OWNER', 'INSTRUCTOR'), removeAttendance);

module.exports = router;
