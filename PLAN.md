# Project Plan: Multi-Organization QR Attendance Platform

## Phase 1: Project Setup (In Progress)
- [x] Initialize backend Node.js, Express, MongoDB
- [x] Initialize frontend React, Vite, React Router
- [ ] Set up environment variables and config
- [ ] Configure MongoDB connection
- [ ] Setup backend error handling and basic middleware
- [ ] Basic frontend layout and routing

## Phase 2: Authentication
- [ ] User Mongoose Model
- [ ] Auth routes (Signup, Login, Forgot Password, Reset Password)
- [ ] JWT authentication middleware
- [ ] OTP for password reset (w/ email service stub)
- [ ] Frontend Auth context and pages

## Phase 3: Organizations
- [ ] Organization & OrganizationMember Models
- [ ] API routes for creating/managing organizations
- [ ] Frontend organization switcher
- [ ] Organization creation workflow for new users
- [ ] Role-based authorization middleware (OWNER, ADMIN, INSTRUCTOR, MEMBER)

## Phase 4: Members
- [ ] OrganizationInvitation Model
- [ ] Member management APIs (List, Add, Import, Invite)
- [ ] Frontend Members list & add student modal
- [ ] CSV Parsing and bulk import preview UI
- [ ] Instructor invitation flow

## Phase 5: Courses
- [ ] Course & CourseMember Models
- [ ] API routes for courses (CRUD, Enroll members)
- [ ] Frontend Courses page and creation modal
- [ ] Course details view

## Phase 6: Sessions
- [ ] AttendanceSession Model
- [ ] API routes for creating and viewing sessions
- [ ] Secure QR generation (tokens)
- [ ] Instructor session management UI
- [ ] Session timers and state handling (ACTIVE -> PENDING_CONFIRMATION)

## Phase 7: Attendance
- [ ] AttendanceRecord Model
- [ ] QR Scanning API and validation rules
- [ ] Instructor manual attendance API
- [ ] Auto-confirmation backend logic (or endpoint trigger)
- [ ] Frontend student scanning flow and feedback

## Phase 8: Dashboard
- [ ] Dashboard API for summary statistics
- [ ] Dashboard UI layout with cards and active sessions list
- [ ] Polish UI with loading states and empty states
