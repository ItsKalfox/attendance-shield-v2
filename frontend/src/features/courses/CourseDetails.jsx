import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
    ArrowLeft, Users, UserPlus, Trash2, Calendar, 
    BookOpen, GraduationCap, CheckCircle2, Clock, 
    Search, FileSpreadsheet, Eye, AlertCircle, RefreshCw 
} from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import StudentAttendanceModal from './StudentAttendanceModal';

const CourseDetails = () => {
    const { courseId } = useParams();
    const { activeOrganization } = useOrganization();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [course, setCourse] = useState(null);
    const [members, setMembers] = useState([]);
    const [orgMembers, setOrgMembers] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [statusToggling, setStatusToggling] = useState(false);
    
    // Search states
    const [memberSearch, setMemberSearch] = useState('');
    const [enrollSearch, setEnrollSearch] = useState('');
    
    // Enrollment multi-select state
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    
    // Attendance modal state
    const [attendanceModalConfig, setAttendanceModalConfig] = useState({
        isOpen: false,
        studentOrgMemberId: null,
        studentName: ''
    });

    const [confirmModalConfig, setConfirmModalConfig] = useState({ 
        isOpen: false, 
        type: '', 
        message: '', 
        action: null, 
        data: null 
    });

    const fetchDetails = async () => {
        if (!activeOrganization) return;
        try {
            setLoading(true);
            const [courseRes, courseMembersRes, orgMembersRes, sessionsRes] = await Promise.all([
                api.get(`/organizations/${activeOrganization._id}/courses/${courseId}`),
                api.get(`/organizations/${activeOrganization._id}/courses/${courseId}/members`),
                api.get(`/organizations/${activeOrganization._id}/members`),
                api.get(`/organizations/${activeOrganization._id}/sessions?courseId=${courseId}`)
            ]);
            
            setCourse(courseRes.data);
            setMembers(courseMembersRes.data);
            setSessions(sessionsRes.data);
            
            // Filter out those already in the course and non-attendees
            const enrolledUserIds = courseMembersRes.data.map(m => m.userId?._id);
            setOrgMembers(orgMembersRes.data.filter(m => !enrolledUserIds.includes(m.userId?._id) && m.role === 'ATTENDEE'));
        } catch (error) {
            console.error("Failed to load course details", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [activeOrganization, courseId]);

    const handleEnroll = async () => {
        if (selectedMemberIds.length === 0) return;
        
        try {
            setEnrolling(true);
            await api.post(`/organizations/${activeOrganization._id}/courses/${courseId}/members`, {
                organizationMemberIds: selectedMemberIds
            });
            
            // Reload members
            const [courseMembersRes, orgMembersRes] = await Promise.all([
                api.get(`/organizations/${activeOrganization._id}/courses/${courseId}/members`),
                api.get(`/organizations/${activeOrganization._id}/members`)
            ]);
            setMembers(courseMembersRes.data);
            const enrolledUserIds = courseMembersRes.data.map(m => m.userId?._id);
            setOrgMembers(orgMembersRes.data.filter(m => !enrolledUserIds.includes(m.userId?._id) && m.role === 'ATTENDEE'));
            
            setShowEnrollModal(false);
            setSelectedMemberIds([]);
            setEnrollSearch('');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to enroll members');
        } finally {
            setEnrolling(false);
        }
    };

    const toggleMemberSelection = (orgMemberId) => {
        setSelectedMemberIds(prev => 
            prev.includes(orgMemberId) 
                ? prev.filter(id => id !== orgMemberId)
                : [...prev, orgMemberId]
        );
    };

    const selectAllFiltered = (filteredList) => {
        const ids = filteredList.map(m => m._id);
        setSelectedMemberIds(ids);
    };

    const clearAllSelections = () => {
        setSelectedMemberIds([]);
    };

    const handleToggleStatus = async () => {
        if (!course) return;
        const newStatus = course.status === 'COMPLETED' ? 'ONGOING' : 'COMPLETED';
        try {
            setStatusToggling(true);
            const res = await api.patch(`/organizations/${activeOrganization._id}/courses/${courseId}`, {
                status: newStatus
            });
            setCourse(res.data);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update course status');
        } finally {
            setStatusToggling(false);
        }
    };

    const handleRemoveMemberClick = (memberId) => {
        setConfirmModalConfig({
            isOpen: true,
            type: 'delete',
            action: 'remove_member',
            message: "Are you sure you want to remove this student from this course? Their attendance history in this course will be retained.",
            data: { memberId }
        });
    };

    const executeRemoveMember = async () => {
        const memberId = confirmModalConfig.data?.memberId;
        if (!memberId) return;
        
        try {
            await api.delete(`/organizations/${activeOrganization._id}/courses/${courseId}/members/${memberId}`);
            setMembers(prev => prev.filter(m => m._id !== memberId));
            
            // Reload org members
            const orgMembersRes = await api.get(`/organizations/${activeOrganization._id}/members`);
            const enrolledUserIds = members.filter(m => m._id !== memberId).map(m => m.userId?._id);
            setOrgMembers(orgMembersRes.data.filter(m => !enrolledUserIds.includes(m.userId?._id) && m.role === 'ATTENDEE'));
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleDeleteCourse = async () => {
        setConfirmModalConfig({
            isOpen: true,
            type: 'delete',
            action: 'delete_course',
            message: `Are you sure you want to delete ${course.code} (${course.name})? This will permanently delete all associated sessions, enrollments, and attendance records.`
        });
    };

    const executeDelete = async () => {
        try {
            await api.delete(`/organizations/${activeOrganization._id}/courses/${courseId}`);
            navigate('/app/courses');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete course');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mr-3"></div>
            <span className="text-sm font-medium">Loading course information...</span>
        </div>
    );

    if (!course) return (
        <div className="card text-center py-16">
            <AlertCircle size={36} className="mx-auto text-amber-500 mb-3" />
            <h3 className="text-lg font-bold text-slate-800">Course Not Found</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">This course may have been removed or you do not have permission to view it.</p>
            <Link to="/app/courses" className="btn btn-outline">Back to Courses</Link>
        </div>
    );

    const isOwnerOrAdmin = activeOrganization?.userRole === 'OWNER' || activeOrganization?.userRole === 'ADMIN';
    const isAttendee = activeOrganization?.userRole === 'ATTENDEE';

    // Instructor check: single instructor or backward compat
    const isAssignedInstructor = (course.instructor && (
        course.instructor._id === activeOrganization?.memberId || 
        course.instructor.userId?._id === user?._id
    )) || (course.instructors && course.instructors.some(inst => 
        inst._id === activeOrganization?.memberId || 
        inst.userId?._id === user?._id
    ));

    // Role capabilities based on user requests:
    // 1. Only admin/owner can change status or delete
    const canManageCourse = isOwnerOrAdmin;
    // 2. Both admin and assigned instructor can enroll/remove students
    const canManageStudents = isOwnerOrAdmin || isAssignedInstructor;

    const assignedInstructor = course.instructor || (course.instructors && course.instructors[0]);

    // Filter enrolled members by search
    const filteredMembers = members.filter(m => {
        const query = memberSearch.toLowerCase();
        const fullName = `${m.userId?.firstName || ''} ${m.userId?.lastName || ''}`.toLowerCase();
        const email = (m.userId?.email || '').toLowerCase();
        const studentId = (m.organizationMemberId?.studentId || m.userId?.studentId || '').toLowerCase();
        return fullName.includes(query) || email.includes(query) || studentId.includes(query);
    });

    // Filter un-enrolled members in modal
    const filteredOrgMembers = orgMembers.filter(m => {
        const query = enrollSearch.toLowerCase();
        const fullName = `${m.userId?.firstName || ''} ${m.userId?.lastName || ''}`.toLowerCase();
        const email = (m.userId?.email || '').toLowerCase();
        const studentId = (m.studentId || m.userId?.studentId || '').toLowerCase();
        return fullName.includes(query) || email.includes(query) || studentId.includes(query);
    });

    const isOngoing = (course.status || 'ONGOING') === 'ONGOING' || course.status === 'ACTIVE';

    return (
        <div className="animate-fade-in space-y-6">
            {/* Top Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Link 
                    to="/app/courses" 
                    className="text-brand-600 hover:text-brand-800 flex items-center w-fit text-sm font-semibold bg-brand-50/80 px-3 py-1.5 rounded-xl border border-brand-100 transition"
                >
                    <ArrowLeft size={16} className="mr-2" /> Back to Courses
                </Link>

                {/* Course Status & Admin Controls */}
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                        isOngoing 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                        {isOngoing ? <Clock size={14} /> : <CheckCircle2 size={14} />}
                        {isOngoing ? 'ONGOING' : 'COMPLETED'}
                    </span>

                    {/* Admin Status Toggle */}
                    {canManageCourse && (
                        <button
                            onClick={handleToggleStatus}
                            disabled={statusToggling}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition flex items-center ${
                                isOngoing 
                                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                    : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                            }`}
                        >
                            <RefreshCw size={13} className={`mr-1.5 ${statusToggling ? 'animate-spin' : ''}`} />
                            {isOngoing ? 'Mark as Completed' : 'Reopen Course'}
                        </button>
                    )}

                    {/* Admin Delete Course */}
                    {canManageCourse && (
                        <button 
                            className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition flex items-center"
                            onClick={handleDeleteCourse}
                            title="Delete this course"
                        >
                            <Trash2 size={14} className="mr-1.5" /> Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Main Layout: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left/Main Column: Enrolled Students List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
                        {/* Table Header / Action Bar */}
                        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                                    <Users size={18} className="mr-2 text-brand-600" />
                                    Enrolled Students ({members.length})
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">Track attendance and export transcripts for each attendee</p>
                            </div>

                            <div className="flex items-center gap-2">
                                {canManageStudents && (
                                    <button 
                                        className="btn btn-primary text-xs py-2 px-3.5 shadow-sm shadow-brand-500/20"
                                        onClick={() => setShowEnrollModal(true)}
                                    >
                                        <UserPlus size={15} className="mr-1.5" /> Enroll Students
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="px-5 py-3 border-b border-slate-100 bg-white">
                            <div className="relative">
                                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="Search student by name, email, or Student ID..."
                                    value={memberSearch}
                                    onChange={(e) => setMemberSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                                />
                            </div>
                        </div>

                        {/* Students Table */}
                        {members.length === 0 ? (
                            <div className="text-center py-16 px-4 text-slate-400">
                                <Users size={32} className="mx-auto mb-2 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-600">No students enrolled yet</p>
                                <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
                                    {canManageStudents 
                                        ? "Click 'Enroll Students' above to add attendees from this organization into this course."
                                        : "Your lecturer or administrator will enroll students into this course."}
                                </p>
                            </div>
                        ) : filteredMembers.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs">
                                No students match "{memberSearch}".
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="py-3 px-5">Student</th>
                                            <th className="py-3 px-4">Student ID</th>
                                            <th className="py-3 px-4 text-center">Status</th>
                                            <th className="py-3 px-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {filteredMembers.map(m => {
                                            const studentIdVal = m.organizationMemberId?.studentId || m.userId?.studentId || '-';
                                            const studentName = `${m.userId?.firstName || ''} ${m.userId?.lastName || ''}`.trim() || 'Student';
                                            const studentOrgMemberId = m.organizationMemberId?._id || m._id;

                                            return (
                                                <tr key={m._id} className="hover:bg-slate-50/60 transition group">
                                                    <td className="py-3.5 px-5">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {m.userId?.firstName?.charAt(0) || 'S'}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-slate-900 group-hover:text-brand-600 transition">
                                                                    {studentName}
                                                                </div>
                                                                <div className="text-[11px] text-slate-400 font-normal">
                                                                    {m.userId?.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-slate-600">
                                                        {studentIdVal !== '-' ? (
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                                                {studentIdVal}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                            Enrolled
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-5 text-right">
                                                        <div className="flex items-center justify-end space-x-2">
                                                            {/* View Attendance Button */}
                                                            <button
                                                                onClick={() => setAttendanceModalConfig({
                                                                    isOpen: true,
                                                                    studentOrgMemberId: m.organizationMemberId?._id || m.organizationMemberId,
                                                                    studentName
                                                                })}
                                                                className="flex items-center px-2.5 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200/60 transition shadow-sm"
                                                                title="View attendance metrics and export PDF"
                                                            >
                                                                <Eye size={13} className="mr-1 text-brand-600" />
                                                                View Attendance
                                                            </button>

                                                            {/* Remove Member Button */}
                                                            {canManageStudents && (
                                                                <button 
                                                                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                                                                    onClick={() => handleRemoveMemberClick(m._id)}
                                                                    title="Remove from course"
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Course Specifications & Lecturer Info */}
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
                        <div className="border-b border-slate-100 pb-4">
                            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg border border-brand-100">
                                {course.code}
                            </span>
                            <h2 className="text-xl font-bold text-slate-900 mt-2.5">
                                {course.name}
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                {course.description || 'No description provided.'}
                            </p>
                        </div>

                        {/* Cohort & Semester Badges */}
                        <div className="space-y-3 text-xs">
                            <div className="flex items-center justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-400 font-medium">Batch / Cohort:</span>
                                <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                    {course.batch || 'Unspecified'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-400 font-medium">Semester / Term:</span>
                                <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                    {course.semester || 'Unspecified'}
                                </span>
                            </div>

                            {/* Term Dates */}
                            {(course.startDate || course.endDate) && (
                                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                                    <span className="text-slate-400 font-medium flex items-center">
                                        <Calendar size={13} className="mr-1 text-slate-400" /> Academic Term:
                                    </span>
                                    <span className="font-medium text-slate-700 text-[11px]">
                                        {course.startDate ? new Date(course.startDate).toLocaleDateString() : 'Start'} &ndash; {course.endDate ? new Date(course.endDate).toLocaleDateString() : 'End'}
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-400 font-medium">Sessions Held:</span>
                                <span className="font-bold text-slate-900">
                                    {sessions.length} sessions
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1">
                                <span className="text-slate-400 font-medium">Enrolled Students:</span>
                                <span className="font-bold text-brand-700">
                                    {members.length} students
                                </span>
                            </div>
                        </div>

                        {/* Assigned Instructor Profile */}
                        <div className="pt-4 border-t border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                                <GraduationCap size={15} className="mr-1 text-slate-500" /> Assigned Lecturer
                            </div>
                            {assignedInstructor?.userId ? (
                                <div className="flex items-center p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm mr-3 border border-brand-200 shrink-0">
                                        {assignedInstructor.userId.firstName?.charAt(0)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="font-bold text-slate-900 text-xs truncate">
                                            {assignedInstructor.userId.firstName} {assignedInstructor.userId.lastName || ''}
                                        </div>
                                        <div className="text-[11px] text-slate-400 truncate">
                                            {assignedInstructor.userId.email}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 italic">No lecturer assigned</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Enroll Students Modal */}
            {showEnrollModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Enroll Students into {course.code}</h3>
                                <p className="text-xs text-slate-500">Select organization attendees to enroll in this course offering</p>
                            </div>
                            <button 
                                onClick={() => { setShowEnrollModal(false); setEnrollSearch(''); }}
                                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition"
                            >
                                <ArrowLeft size={16} />
                            </button>
                        </div>

                        {/* Search & Bulk Select Controls */}
                        <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Filter available attendees by name, email, or Student ID..."
                                    value={enrollSearch}
                                    onChange={(e) => setEnrollSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                                />
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <div>
                                    Selected: <span className="font-bold text-brand-700">{selectedMemberIds.length}</span> / {filteredOrgMembers.length}
                                </div>
                                <div className="space-x-3">
                                    <button 
                                        type="button" 
                                        onClick={() => selectAllFiltered(filteredOrgMembers)}
                                        className="text-brand-600 hover:underline font-semibold"
                                    >
                                        Select All
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={clearAllSelections}
                                        className="text-slate-400 hover:text-slate-600 font-semibold"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Attendee Checklist */}
                        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
                            {filteredOrgMembers.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-xs">
                                    {orgMembers.length === 0 
                                        ? "All organization attendees are already enrolled in this course!" 
                                        : `No available attendees match "${enrollSearch}".`}
                                </div>
                            ) : (
                                filteredOrgMembers.map(m => {
                                    const isSelected = selectedMemberIds.includes(m._id);
                                    const studentIdVal = m.studentId || m.userId?.studentId;

                                    return (
                                        <label 
                                            key={m._id} 
                                            className={`flex items-center px-4 py-3 rounded-xl cursor-pointer transition select-none ${
                                                isSelected ? 'bg-brand-50/60' : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 mr-3.5"
                                                checked={isSelected}
                                                onChange={() => toggleMemberSelection(m._id)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-slate-800 text-xs truncate">
                                                    {m.userId?.firstName} {m.userId?.lastName || ''}
                                                </div>
                                                <div className="text-[11px] text-slate-400 truncate">
                                                    {m.userId?.email}
                                                </div>
                                            </div>
                                            {studentIdVal && (
                                                <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded ml-2">
                                                    {studentIdVal}
                                                </span>
                                            )}
                                        </label>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2.5 bg-slate-50/50">
                            <button 
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
                                onClick={() => { setShowEnrollModal(false); setEnrollSearch(''); }}
                                disabled={enrolling}
                            >
                                Cancel
                            </button>
                            <button 
                                className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition disabled:opacity-50"
                                onClick={handleEnroll}
                                disabled={enrolling || selectedMemberIds.length === 0}
                            >
                                {enrolling ? 'Enrolling...' : `Enroll (${selectedMemberIds.length}) Students`}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Student Attendance Detailed Breakdown & PDF Export Modal */}
            <StudentAttendanceModal 
                isOpen={attendanceModalConfig.isOpen}
                onClose={() => setAttendanceModalConfig({ isOpen: false, studentOrgMemberId: null, studentName: '' })}
                organizationId={activeOrganization?._id}
                courseId={courseId}
                studentOrgMemberId={attendanceModalConfig.studentOrgMemberId}
            />

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={confirmModalConfig.isOpen}
                onClose={() => setConfirmModalConfig({ ...confirmModalConfig, isOpen: false })}
                onConfirm={confirmModalConfig.action === 'delete_course' ? executeDelete : confirmModalConfig.action === 'remove_member' ? executeRemoveMember : () => {}}
                title={confirmModalConfig.action === 'delete_course' ? "Delete Course" : confirmModalConfig.action === 'remove_member' ? "Remove Member" : "Confirm"}
                message={confirmModalConfig.message}
                type={confirmModalConfig.type}
                confirmText={confirmModalConfig.action === 'delete_course' ? "Delete Course" : confirmModalConfig.action === 'remove_member' ? "Remove" : "Confirm"}
            />
        </div>
    );
};

export default CourseDetails;
