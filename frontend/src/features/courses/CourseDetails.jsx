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

    const [studentCourseStats, setStudentCourseStats] = useState(null);

    const fetchDetails = async () => {
        if (!activeOrganization) return;
        try {
            setLoading(true);
            const isStudent = activeOrganization.userRole === 'ATTENDEE';

            if (isStudent) {
                const [courseRes, myAttendanceRes] = await Promise.all([
                    api.get(`/organizations/${activeOrganization._id}/courses/${courseId}`),
                    api.get(`/organizations/${activeOrganization._id}/my-attendance`)
                ]);
                
                setCourse(courseRes.data);
                
                const currentCourseData = (myAttendanceRes.data.courses || []).find(c => c.course._id === courseId);
                const currentCourseRecords = (myAttendanceRes.data.records || []).filter(r => (r.courseId?._id === courseId || r.courseId === courseId));
                
                setStudentCourseStats({
                    summary: currentCourseData || {
                        conducted: 0,
                        attended: 0,
                        absent: 0,
                        percentage: 0,
                        isEligible: false
                    },
                    records: currentCourseRecords
                });
            } else {
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
            }
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
        <div className="animate-fade-in space-y-6">
            {/* Top Navigation Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="skeleton w-36 h-8 rounded-xl"></div>
                <div className="flex items-center gap-2">
                    <div className="skeleton w-28 h-8 rounded-xl"></div>
                    <div className="skeleton w-36 h-8 rounded-xl"></div>
                </div>
            </div>

            {/* Main Layout: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left/Main Column Skeleton */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-3xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden">
                        {/* Header bar / Search & Action */}
                        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                            <div>
                                <div className="skeleton w-40 h-5 mb-1.5 rounded-md"></div>
                                <div className="skeleton w-56 h-3 rounded"></div>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="skeleton w-44 h-8 rounded-xl"></div>
                                <div className="skeleton w-28 h-8 rounded-xl"></div>
                            </div>
                        </div>

                        {/* Table Skeleton */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/80 border-b border-slate-100">
                                    <tr>
                                        <th className="py-3 px-5"><div className="skeleton w-20 h-4"></div></th>
                                        <th className="py-3 px-4"><div className="skeleton w-20 h-4"></div></th>
                                        <th className="py-3 px-5 text-right"><div className="skeleton w-16 h-4 ml-auto"></div></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <tr key={i}>
                                            <td className="py-3.5 px-5">
                                                <div className="flex items-center space-x-3">
                                                    <div className="skeleton w-8 h-8 rounded-full"></div>
                                                    <div className="space-y-1">
                                                        <div className="skeleton w-32 h-4 rounded"></div>
                                                        <div className="skeleton w-44 h-3 rounded"></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="skeleton w-24 h-5 rounded"></div>
                                            </td>
                                            <td className="py-3.5 px-5 text-right">
                                                <div className="skeleton w-28 h-7 rounded-xl ml-auto"></div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column Skeleton */}
                <div className="space-y-4">
                    <div className="bg-white rounded-3xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-6 space-y-5">
                        <div className="border-b border-slate-100 pb-4 space-y-2">
                            <div className="skeleton w-20 h-6 rounded-lg"></div>
                            <div className="skeleton w-48 h-6 rounded-md"></div>
                            <div className="skeleton w-full h-3 rounded"></div>
                            <div className="skeleton w-3/4 h-3 rounded"></div>
                        </div>

                        <div className="space-y-3">
                            <div className="skeleton w-24 h-4 rounded"></div>
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80 flex items-center space-x-3">
                                <div className="skeleton w-10 h-10 rounded-full"></div>
                                <div className="space-y-1.5 flex-1">
                                    <div className="skeleton w-32 h-4 rounded"></div>
                                    <div className="skeleton w-40 h-3 rounded"></div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80 space-y-1.5">
                                <div className="skeleton w-14 h-3 rounded"></div>
                                <div className="skeleton w-20 h-5 rounded"></div>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80 space-y-1.5">
                                <div className="skeleton w-14 h-3 rounded"></div>
                                <div className="skeleton w-20 h-5 rounded"></div>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80 space-y-2">
                            <div className="flex justify-between">
                                <div className="skeleton w-24 h-3 rounded"></div>
                                <div className="skeleton w-10 h-3 rounded"></div>
                            </div>
                            <div className="skeleton w-full h-2 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>
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
        const fName = m.organizationMemberId?.firstName || m.userId?.firstName || '';
        const lName = m.organizationMemberId?.lastName || m.userId?.lastName || '';
        const fullName = `${fName} ${lName}`.toLowerCase();
        const email = (m.userId?.email || '').toLowerCase();
        const studentId = (m.organizationMemberId?.studentId || m.userId?.studentId || '').toLowerCase();
        return fullName.includes(query) || email.includes(query) || studentId.includes(query);
    });

    // Filter un-enrolled members in modal
    const filteredOrgMembers = orgMembers.filter(m => {
        const query = enrollSearch.toLowerCase();
        const fName = m.firstName || m.userId?.firstName || '';
        const lName = m.lastName || m.userId?.lastName || '';
        const fullName = `${fName} ${lName}`.toLowerCase();
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
                    className="text-slate-700 hover:text-brand-600 flex items-center w-fit text-xs font-semibold bg-white/80 px-3.5 py-1.5 rounded-xl border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] transition select-none"
                >
                    <ArrowLeft size={15} className="mr-2 text-slate-500" /> Back to Courses
                </Link>

                {/* Course Status & Admin Controls */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] text-xs font-semibold text-slate-700 select-none">
                        {isOngoing ? (
                            <>
                                <span className="relative flex h-2 w-2 mr-0.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span>Ongoing Course</span>
                            </>
                        ) : (
                            <>
                                <span className="inline-flex rounded-full h-2 w-2 bg-slate-400 mr-0.5"></span>
                                <span>Completed Course</span>
                            </>
                        )}
                    </div>

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
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-sm shadow-rose-600/20 rounded-xl transition flex items-center"
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
                
                {/* Left/Main Column */}
                <div className="lg:col-span-2 space-y-4">
                    {isAttendee ? (
                        <div className="space-y-6">
                            {/* Student Attendance Stats for this Course */}
                            <div className="bg-white rounded-3xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                            <CheckCircle2 size={20} className="mr-2 text-brand-600" />
                                            My Course Attendance
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Your personal participation record for {course.code}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                                        studentCourseStats?.summary?.isEligible 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                        {studentCourseStats?.summary?.isEligible ? 'Eligible for Exam' : 'Attendance At Risk'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                                        <div className="text-2xl font-black text-slate-800">
                                            {studentCourseStats?.summary?.conducted || 0}
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                            Total Classes
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">
                                        <div className="text-2xl font-black text-emerald-600">
                                            {studentCourseStats?.summary?.attended || 0}
                                        </div>
                                        <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mt-0.5">
                                            Attended
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100 text-center">
                                        <div className="text-2xl font-black text-rose-600">
                                            {studentCourseStats?.summary?.absent || 0}
                                        </div>
                                        <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider mt-0.5">
                                            Missed
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                                        <span>Course Attendance Rate</span>
                                        <span className="text-brand-700">{studentCourseStats?.summary?.percentage || 0}%</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                (studentCourseStats?.summary?.percentage || 0) >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                                            }`} 
                                            style={{ width: `${Math.min(100, studentCourseStats?.summary?.percentage || 0)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Student Session Attendance Log for this Course */}
                            <div className="bg-white rounded-3xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/40">
                                    <h3 className="text-base font-bold text-slate-900 flex items-center">
                                        <Calendar size={18} className="mr-2 text-brand-600" />
                                        Session Log & Records
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Recorded attendances for this course</p>
                                </div>

                                {(!studentCourseStats?.records || studentCourseStats.records.length === 0) ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <Clock size={28} className="mx-auto mb-2 opacity-50 text-slate-300" />
                                        <p className="text-xs font-medium text-slate-500">No session attendance recorded for this course yet.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                                                <tr>
                                                    <th className="py-3 px-3.5 sm:px-5">Session Name</th>
                                                    <th className="py-3 px-4 hidden sm:table-cell">Date & Time</th>
                                                    <th className="py-3 px-4 hidden md:table-cell">Verification</th>
                                                    <th className="py-3 px-3.5 sm:px-5 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium">
                                                {studentCourseStats.records.map(r => (
                                                    <tr key={r._id} className="hover:bg-slate-50/60 transition">
                                                        <td className="py-3 sm:py-3.5 px-3.5 sm:px-5 font-semibold text-slate-800">
                                                            <div className="truncate max-w-[160px] xs:max-w-[200px] sm:max-w-none">
                                                                {r.sessionId?.sessionName || 'Lecture Session'}
                                                            </div>
                                                            <div className="sm:hidden text-[11px] text-slate-400 font-normal mt-0.5 flex items-center gap-1.5">
                                                                <span>{new Date(r.markedAt || r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                                <span>&bull;</span>
                                                                <span>{r.markedBy === 'SELF' ? 'QR Code' : 'Verified'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-slate-600 hidden sm:table-cell">
                                                            {new Date(r.markedAt || r.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-slate-600 hidden md:table-cell">
                                                            {r.markedBy === 'SELF' ? 'QR Code' : 'Lecturer Verified'}
                                                        </td>
                                                        <td className="py-3 sm:py-3.5 px-3.5 sm:px-5 text-right whitespace-nowrap">
                                                            <span className="badge badge-success text-xs font-semibold">
                                                                 Present
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                    <div className="bg-white rounded-3xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
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
                                            <th className="py-3 px-3.5 sm:px-5">Student</th>
                                            <th className="py-3 px-4 hidden sm:table-cell">Student ID</th>
                                            <th className="py-3 px-3.5 sm:px-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {filteredMembers.map(m => {
                                            const studentIdVal = m.organizationMemberId?.studentId || m.userId?.studentId || '-';
                                            const fName = m.organizationMemberId?.firstName || m.userId?.firstName || '';
                                            const lName = m.organizationMemberId?.lastName || m.userId?.lastName || '';
                                            const studentName = `${fName} ${lName}`.trim() || 'Student';
                                            const initial = fName ? fName.charAt(0) : 'S';
                                            const studentOrgMemberId = m.organizationMemberId?._id || m._id;

                                            return (
                                                <tr key={m._id} className="hover:bg-slate-50/60 transition group">
                                                    <td className="py-3 sm:py-3.5 px-3.5 sm:px-5">
                                                        <div className="flex items-center space-x-2.5 sm:space-x-3">
                                                            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {initial}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-semibold text-slate-900 group-hover:text-brand-600 transition truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
                                                                    {studentName}
                                                                </div>
                                                                <div className="text-[11px] text-slate-400 font-normal truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
                                                                    {m.userId?.email}
                                                                </div>
                                                                {studentIdVal !== '-' && (
                                                                    <div className="sm:hidden mt-0.5">
                                                                        <span className="inline-block font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70">
                                                                            ID: {studentIdVal}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-slate-600 hidden sm:table-cell">
                                                        {studentIdVal !== '-' ? (
                                                             <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                                                {studentIdVal}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 sm:py-3.5 px-3.5 sm:px-5 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end space-x-1.5 sm:space-x-2">
                                                            {/* View Attendance Button */}
                                                            <button
                                                                onClick={() => setAttendanceModalConfig({
                                                                    isOpen: true,
                                                                    studentOrgMemberId: m.organizationMemberId?._id || m.organizationMemberId,
                                                                    studentName
                                                                })}
                                                                className="flex items-center px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:scale-95 shadow-sm rounded-xl transition border border-slate-200/80"
                                                                title="View attendance metrics and export PDF"
                                                            >
                                                                <Eye size={13} className="sm:mr-1.5 text-slate-500" />
                                                                <span className="hidden sm:inline">View Attendance</span>
                                                                <span className="sm:hidden text-[11px]">View</span>
                                                            </button>

                                                            {/* Remove Member Button */}
                                                            {canManageStudents && (
                                                                <button 
                                                                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                                                                    onClick={() => handleRemoveMemberClick(m._id)}
                                                                    title="Remove from course"
                                                                >
                                                                    <Trash2 size={14} className="sm:w-[15px] sm:h-[15px]" />
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
                    )}
                </div>

                {/* Right Column: Course Specifications & Lecturer Info */}
                <div className="space-y-4">
                    <div className="bg-white rounded-3xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-6 space-y-5">
                        <div className="border-b border-slate-100 pb-4">
                            <span className="font-mono text-xs font-semibold tracking-wide text-slate-500 bg-slate-100/90 px-2.5 py-1 rounded-lg">
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
                                <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                    {course.semester || 'Unspecified'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-400 font-medium flex items-center">
                                    <Calendar size={13} className="mr-1 text-slate-400" /> Start Date:
                                </span>
                                <span className="font-semibold text-slate-800">
                                    {course.startDate ? new Date(course.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unspecified'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-400 font-medium flex items-center">
                                    <Calendar size={13} className="mr-1 text-slate-400" /> End Date:
                                </span>
                                <span className="font-semibold text-slate-800">
                                    {course.endDate ? new Date(course.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unspecified'}
                                </span>
                            </div>

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
                <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
                    <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[85vh] my-auto">
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
                                                    {m.firstName ? `${m.firstName} ${m.lastName || ''}`.trim() : `${m.userId?.firstName || ''} ${m.userId?.lastName || ''}`.trim() || 'Attendee'}
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
