import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
    Users, 
    BookOpen, 
    CalendarClock, 
    Activity, 
    ArrowRight, 
    PieChart, 
    PlusCircle, 
    CheckCircle2, 
    ChevronRight, 
    ChevronDown, 
    TrendingUp, 
    AlertTriangle, 
    Radio, 
    FileText, 
    Award,
    Check
} from 'lucide-react';
import CreateOrganizationModal from '../organizations/CreateOrganizationModal';

const Dashboard = () => {
    const { user } = useAuth();
    const { activeOrganization, loadingOrg } = useOrganization();
    const [stats, setStats] = useState(null);
    const [recentSessions, setRecentSessions] = useState([]);
    const [coursesList, setCoursesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
    
    const [courseId, setCourseId] = useState('all');
    const [timeRange, setTimeRange] = useState('month');
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
    const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

    const navigate = useNavigate();
    const isAttendee = activeOrganization?.userRole === 'ATTENDEE';

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!activeOrganization) {
                setStats(null);
                setRecentSessions([]);
                setLoading(false);
                return;
            }
            
            try {
                setLoading(true);
                const res = await api.get(`/organizations/${activeOrganization._id}/dashboard`, {
                    params: { courseId, timeRange }
                });
                setStats(res.data.stats);
                setRecentSessions(res.data.recentSessions || []);

                if (activeOrganization.userRole !== 'ATTENDEE') {
                    const coursesRes = await api.get(`/organizations/${activeOrganization._id}/courses`);
                    setCoursesList(coursesRes.data);
                } else {
                    setCoursesList([]);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [activeOrganization, courseId, timeRange]);

    // Empty state: no organization selected
    if (!activeOrganization && !loadingOrg) {
        const userName = user?.firstName ? `, ${user.firstName}` : '';

        return (
            <div className="animate-fade-in space-y-8 sm:space-y-10 pb-10">
                {/* Hero & Welcome Section directly on Dashboard canvas */}
                <div className="text-center flex flex-col items-center pt-2 sm:pt-4">
                    {/* Logo */}
                    <div className="mb-5">
                        <img 
                            src="/logo-dark.png" 
                            alt="Attendance Shield" 
                            className="w-48 sm:w-56 h-auto object-contain" 
                        />
                    </div>

                    {/* Headline */}
                    <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-3">
                        Welcome to Attendance Shield{userName}!
                    </h1>
                    
                    <p className="text-sm sm:text-base text-slate-500 leading-relaxed mb-6 max-w-2xl">
                        Let's get your organization's attendance workspace set up. Create an organization to start managing members, courses, and secure attendance sessions.
                    </p>

                    {/* Core Capability Badges */}
                    <div className="flex flex-wrap gap-2 mb-7 justify-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs text-slate-600 text-xs font-medium">
                            <Check size={12} className="text-brand-600 shrink-0" /> Anti-Spoofing QR
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs text-slate-600 text-xs font-medium">
                            <Check size={12} className="text-brand-600 shrink-0" /> Geofence Protection
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs text-slate-600 text-xs font-medium">
                            <Check size={12} className="text-brand-600 shrink-0" /> Projector Live Mode
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs text-slate-600 text-xs font-medium">
                            <Check size={12} className="text-brand-600 shrink-0" /> Audit PDF Exports
                        </span>
                    </div>

                    {/* Primary Action Button */}
                    <div className="flex flex-col items-center gap-3">
                        <button 
                            className="btn btn-primary px-8 py-3.5 shadow-lg shadow-brand-500/25 flex items-center justify-center font-bold text-sm rounded-xl transition hover:shadow-brand-500/40 active:scale-95"
                            onClick={() => setShowCreateOrgModal(true)}
                        >
                            <PlusCircle size={18} className="mr-2 text-white shrink-0" />
                            Create Organization to Get Started
                        </button>
                        <p className="text-xs text-slate-400">
                            Invited to an existing organization? Check your email or ask your organization administrator for an invite.
                        </p>
                    </div>
                </div>

                {/* Workflow / Documentation in a single, understated card */}
                <div className="card w-full bg-white p-6 sm:p-8 border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
                        How Attendance Shield Works
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                        {/* Point 1 */}
                        <div className="space-y-1.5">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-700">
                                1. Create Workspace
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Set up your organization profile, institutional branding, and default attendance parameters.
                            </p>
                        </div>

                        {/* Point 2 */}
                        <div className="space-y-1.5">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-700">
                                2. Add Members & Staff
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Invite lecturers with role-based access and batch-import attendees via CSV rosters.
                            </p>
                        </div>

                        {/* Point 3 */}
                        <div className="space-y-1.5">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-700">
                                3. Build Courses
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Structure courses by batch or term, assign instructors, and set attendance thresholds.
                            </p>
                        </div>

                        {/* Point 4 */}
                        <div className="space-y-1.5">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-700">
                                4. Run Sessions & Audits
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Launch rotating QR sessions with GPS boundaries and export verified, tamper-proof audit sheets.
                            </p>
                        </div>
                    </div>
                </div>

                {showCreateOrgModal && <CreateOrganizationModal onClose={() => setShowCreateOrgModal(false)} />}
            </div>
        );
    }

    // Skeleton loading state
    if (loading || loadingOrg || !stats) {
        if (isAttendee) {
            return (
                <div className="animate-fade-in space-y-6 pb-8">
                    {/* 3 Metric Cards Skeleton */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="card relative overflow-hidden flex items-center p-5 sm:p-6 bg-white border-0 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                                <div className="skeleton w-12 h-12 sm:w-14 sm:h-14 rounded-2xl mr-4 shrink-0"></div>
                                <div className="space-y-2 flex-1">
                                    <div className="skeleton w-16 h-7 rounded-md"></div>
                                    <div className="skeleton w-28 h-3 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Access Action Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {[1, 2].map(i => (
                            <div key={i} className="card p-5 sm:p-6 bg-white border-0 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="skeleton w-12 h-12 rounded-xl shrink-0"></div>
                                    <div className="space-y-1.5">
                                        <div className="skeleton w-40 h-5 rounded-md"></div>
                                        <div className="skeleton w-52 h-3 rounded"></div>
                                    </div>
                                </div>
                                <div className="skeleton w-5 h-5 rounded-full"></div>
                            </div>
                        ))}
                    </div>

                    {/* Table Skeleton */}
                    <div className="card bg-white p-0 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] border-0 rounded-2xl">
                        <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="space-y-1.5">
                                <div className="skeleton w-48 h-5 rounded-md"></div>
                                <div className="skeleton w-56 h-3 rounded"></div>
                            </div>
                            <div className="skeleton w-24 h-4 rounded"></div>
                        </div>
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex justify-between items-center py-2 px-3">
                                    <div className="space-y-1">
                                        <div className="skeleton w-36 h-4 rounded"></div>
                                        <div className="skeleton w-20 h-3 rounded"></div>
                                    </div>
                                    <div className="skeleton w-24 h-4 rounded"></div>
                                    <div className="skeleton w-16 h-6 rounded-full"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="animate-fade-in space-y-6 pb-8">
                {/* Top Row Skeleton: 4-Metric Grid (Left) + Create Session (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="card bg-white p-4 sm:p-5 lg:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border-0 rounded-2xl sm:rounded-3xl lg:min-h-[230px] flex flex-col justify-between">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="skeleton w-32 h-5 rounded-md"></div>
                            <div className="skeleton w-20 h-4 rounded-full"></div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 pt-3 flex-1 items-stretch">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="p-3 lg:p-3.5 bg-slate-50 rounded-xl flex flex-col justify-between">
                                    <div className="skeleton w-5 h-5 rounded-md"></div>
                                    <div className="skeleton w-16 h-7 rounded-md my-1"></div>
                                    <div className="skeleton w-16 h-2 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card p-5 sm:p-6 lg:p-7 bg-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border-0 rounded-2xl sm:rounded-3xl min-h-[165px] sm:min-h-[175px] lg:min-h-[230px] flex flex-col justify-end space-y-3">
                        <div className="skeleton w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-slate-800"></div>
                        <div className="skeleton w-52 h-6 lg:h-7 rounded-md bg-slate-800"></div>
                        <div className="skeleton w-full max-w-sm h-3.5 rounded bg-slate-800"></div>
                    </div>
                </div>

                {/* Bottom Row Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="card bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border-0 rounded-2xl sm:rounded-3xl min-h-[340px] flex flex-col justify-center items-center">
                        <div className="skeleton w-44 h-44 rounded-full mb-6"></div>
                        <div className="skeleton w-48 h-4 rounded"></div>
                    </div>
                    <div className="card bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border-0 rounded-2xl sm:rounded-3xl min-h-[340px] space-y-4">
                        <div className="skeleton w-40 h-5 rounded-md"></div>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="skeleton w-full h-14 rounded-2xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Calculations for staff overview
    const present = stats?.attendanceOverview?.present || 0;
    const absent = stats?.attendanceOverview?.absent || 0;
    const totalExpected = present + absent;
    const attendanceRate = totalExpected > 0 ? Math.round((present / totalExpected) * 100) : null;

    // Filter pending sessions needing confirmation
    const pendingConfirmationSessions = recentSessions.filter(s => s.status === 'PENDING_CONFIRMATION');

    // Circular progress dial renderer
    const renderAttendanceDial = () => {
        if (totalExpected === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-10 sm:py-12 text-slate-400">
                    <PieChart size={30} className="opacity-40 text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No session attendance recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">
                        Attendance metrics will update automatically once sessions are launched and students check in.
                    </p>
                </div>
            );
        }

        const size = 180;
        const strokeWidth = 18;
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const strokeDashoffset = circumference - ((attendanceRate || 0) / 100) * circumference;

        return (
            <div className="flex flex-row items-center justify-center gap-3 sm:gap-8 py-2 sm:py-4 w-full">
                {/* SVG Radial Meter (Scales responsively side-by-side) */}
                <div className="relative shrink-0 w-[125px] h-[125px] sm:w-[175px] sm:h-[175px]">
                    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90 drop-shadow-sm">
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="transparent"
                            stroke="#061a17"
                            strokeWidth={strokeWidth}
                        />
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="transparent"
                            stroke="#10b981"
                            strokeWidth={strokeWidth}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">{attendanceRate}%</span>
                        <span className="text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-100">
                            Present Rate
                        </span>
                    </div>
                </div>

                {/* Progress breakdown cards (Side by side with circle on all screens) */}
                <div className="flex flex-col gap-2 sm:gap-3 flex-1 min-w-0 max-w-[260px] sm:max-w-[280px]">
                    <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-brand-950 border border-brand-900/80 shadow-[0_4px_20px_rgba(0,0,0,0.12)] flex items-center justify-between gap-2 sm:gap-4 transition hover:-translate-y-0.5">
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] shrink-0"></span>
                            <div className="min-w-0">
                                <div className="text-[11px] sm:text-xs font-bold text-slate-200 uppercase tracking-wider truncate">Present</div>
                                <div className="text-[9px] sm:text-[11px] text-slate-400 hidden xs:block truncate">Verified scans</div>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="text-lg sm:text-2xl font-black text-white">{present}</span>
                            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block lowercase">students</span>
                        </div>
                    </div>

                    <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-brand-950 border border-brand-900/80 shadow-[0_4px_20px_rgba(0,0,0,0.12)] flex items-center justify-between gap-2 sm:gap-4 transition hover:-translate-y-0.5">
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-500 shadow-sm shrink-0"></span>
                            <div className="min-w-0">
                                <div className="text-[11px] sm:text-xs font-bold text-slate-200 uppercase tracking-wider truncate">Absent</div>
                                <div className="text-[9px] sm:text-[11px] text-slate-400 hidden xs:block truncate">Missed scans</div>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="text-lg sm:text-2xl font-black text-white">{absent}</span>
                            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block lowercase">students</span>
                        </div>
                    </div>

                    <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium text-center py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-100 truncate">
                        Out of <strong className="text-slate-800">{totalExpected}</strong> expected check-ins
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in space-y-6 pb-8">
            {/* Action Required Banner for Instructors */}
            {!isAttendee && pendingConfirmationSessions.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-amber-500/10 border border-amber-500/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/30">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                                Attendance Confirmation Required
                                <span className="bg-amber-200 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                    {pendingConfirmationSessions.length} {pendingConfirmationSessions.length === 1 ? 'Session' : 'Sessions'}
                                </span>
                            </h4>
                            <p className="text-xs text-amber-900/80 mt-0.5">
                                Live scan period has elapsed. Please review scans and confirm attendance records to finalize.
                            </p>
                        </div>
                    </div>
                    <Link
                        to={`/app/sessions/${pendingConfirmationSessions[0]._id}`}
                        className="btn bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition active:scale-95 shrink-0 w-full sm:w-auto text-center flex items-center justify-center gap-1.5"
                    >
                        Review & Conclude
                        <ChevronRight size={14} />
                    </Link>
                </div>
            )}

            {/* ATTENDEE / STUDENT DASHBOARD VIEW */}
            {isAttendee ? (
                <div className="space-y-6">
                    {/* Top Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        <div className="card relative overflow-hidden flex items-center p-5 sm:p-6 bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-lg transition">
                            <div className="bg-brand-50 p-3.5 sm:p-4 rounded-2xl mr-4 sm:mr-5 text-brand-600 border border-brand-100 shrink-0">
                                <Activity size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <div className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
                                    {stats?.attendedSessions || 0}
                                </div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                                    Attended Sessions
                                </div>
                            </div>
                        </div>

                        <div className="card relative overflow-hidden flex items-center p-5 sm:p-6 bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-lg transition">
                            <div className="bg-emerald-50 p-3.5 sm:p-4 rounded-2xl mr-4 sm:mr-5 text-emerald-600 border border-emerald-100 shrink-0">
                                <BookOpen size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <div className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
                                    {stats?.enrolledCourses || 0}
                                </div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                                    Enrolled Courses
                                </div>
                            </div>
                        </div>

                        <div className="card relative overflow-hidden flex items-center p-5 sm:p-6 bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-lg transition sm:col-span-2 lg:col-span-1">
                            <div className="bg-amber-50 p-3.5 sm:p-4 rounded-2xl mr-4 sm:mr-5 text-amber-600 border border-amber-100 shrink-0">
                                <TrendingUp size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <div className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
                                    {stats?.overallAttendance || '100%'}
                                </div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                                    Overall Attendance
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access Action Cards for Student */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <Link 
                            to="/app/courses"
                            className="card p-5 sm:p-6 bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-xl transition-all rounded-2xl flex items-center justify-between group active:scale-[0.99]"
                        >
                            <div className="flex items-center gap-4">
                                <BookOpen size={24} className="text-brand-600 group-hover:scale-110 transition-transform shrink-0" />
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-brand-600 transition">My Enrolled Courses</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">View courses, lecturers, and class schedules</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-1 group-hover:text-brand-600 transition shrink-0 ml-2" />
                        </Link>

                        <Link 
                            to="/app/attendance"
                            className="card p-5 sm:p-6 bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-xl transition-all rounded-2xl flex items-center justify-between group active:scale-[0.99]"
                        >
                            <div className="flex items-center gap-4">
                                <CalendarClock size={24} className="text-emerald-600 group-hover:scale-110 transition-transform shrink-0" />
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-emerald-600 transition">Attendance History & Eligibility</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Check eligibility percentages and scan records</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition shrink-0 ml-2" />
                        </Link>
                    </div>

                    {/* Recent Attended Sessions Log */}
                    <div className="card bg-white p-0 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 rounded-2xl sm:rounded-3xl">
                        <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 flex items-center">
                                    <CheckCircle2 size={18} className="mr-2 text-emerald-600" />
                                    Recent Attendance Activity
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Classes you recently scanned or attended</p>
                            </div>
                            <Link to="/app/attendance" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition">
                                View Full History <ChevronRight size={14} />
                            </Link>
                        </div>

                        {recentSessions.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 px-4">
                                <CalendarClock size={28} className="mx-auto mb-2 opacity-50 text-slate-300" />
                                <p className="text-xs font-medium text-slate-500">No attendance records found yet.</p>
                            </div>
                        ) : (
                            <>
                                {/* Mobile View: Cards */}
                                <div className="divide-y divide-slate-100 md:hidden">
                                    {recentSessions.map(record => (
                                        <div key={record._id} className="p-4 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-mono text-slate-400 font-semibold">{record.courseId?.code || 'COURSE'}</span>
                                                <span className="badge badge-success text-[10px] font-bold px-2 py-0.5">
                                                    {record.status}
                                                </span>
                                            </div>
                                            <div className="font-bold text-slate-800 text-sm">
                                                {record.courseId?.name || 'Course'}
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-slate-500">
                                                <span>{record.sessionId?.sessionName || 'Lecture Session'}</span>
                                                <span className="text-[11px] text-slate-400">
                                                    {new Date(record.markedAt || record.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop View: Table */}
                                <div className="table-container hidden md:block">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Course</th>
                                                <th>Session Name</th>
                                                <th>Marked Time</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentSessions.map(record => (
                                                <tr key={record._id} className="hover:bg-slate-50/50 transition">
                                                    <td>
                                                        <div className="font-bold text-slate-800 text-sm">{record.courseId?.name || 'Course'}</div>
                                                        <div className="text-xs font-mono text-slate-400">{record.courseId?.code || ''}</div>
                                                    </td>
                                                    <td className="text-slate-700 text-sm font-medium">
                                                        {record.sessionId?.sessionName || 'Lecture Session'}
                                                    </td>
                                                    <td className="text-slate-600 text-xs">
                                                        {new Date(record.markedAt || record.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-success text-xs font-semibold">
                                                            {record.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                /* INSTRUCTOR / ORGANIZER DASHBOARD VIEW */
                <>
                    {/* Top Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        
                        {/* LEFT: 4-Metric Command Center Grid */}
                        <div className="card bg-white p-4 sm:p-5 lg:p-6 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-100 rounded-2xl sm:rounded-3xl lg:min-h-[230px]">
                            {/* Card Header */}
                            <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100">
                                <h2 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight flex items-center">
                                    <Activity size={20} className="mr-2 text-brand-600 shrink-0" />
                                    Overview
                                </h2>
                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200/60 px-2.5 py-0.5 rounded-full truncate max-w-[150px] sm:max-w-[200px]">
                                    {activeOrganization?.name || 'Organization'}
                                </span>
                            </div>

                            {/* 4 Metrics Strip (2x2 on mobile, single row of 4 on desktop) */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 pt-2.5 sm:pt-3.5 flex-1 items-stretch">
                                {/* Total Students */}
                                <Link 
                                    to="/app/members"
                                    className="p-2.5 sm:p-3 lg:p-3.5 rounded-2xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100/90 transition group flex flex-col justify-between h-full"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                                            Students
                                        </span>
                                        <Users size={16} className="text-brand-600 group-hover:scale-110 transition-transform shrink-0" />
                                    </div>
                                    <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 tracking-tight my-1">
                                        {stats?.totalAttendees || 0}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium group-hover:text-brand-600 transition flex items-center gap-0.5 truncate">
                                        Enrolled <ChevronRight size={11} className="shrink-0" />
                                    </span>
                                </Link>

                                {/* Active Courses */}
                                <Link 
                                    to="/app/courses"
                                    className="p-2.5 sm:p-3 lg:p-3.5 rounded-2xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100/90 transition group flex flex-col justify-between h-full"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                                            Courses
                                        </span>
                                        <BookOpen size={16} className="text-indigo-600 group-hover:scale-110 transition-transform shrink-0" />
                                    </div>
                                    <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 tracking-tight my-1">
                                        {stats?.activeCourses || 0}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium group-hover:text-indigo-600 transition flex items-center gap-0.5 truncate">
                                        Active <ChevronRight size={11} className="shrink-0" />
                                    </span>
                                </Link>

                                {/* Live / Pending Sessions */}
                                <Link 
                                    to="/app/sessions"
                                    className="p-2.5 sm:p-3 lg:p-3.5 rounded-2xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100/90 transition group flex flex-col justify-between h-full"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                                            Active
                                        </span>
                                        <Radio size={16} className={recentSessions.length > 0 ? "text-emerald-600 animate-pulse shrink-0" : "text-slate-400 shrink-0"} />
                                    </div>
                                    <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 tracking-tight my-1 flex items-center gap-1.5">
                                        {stats?.activeSessions !== undefined ? stats.activeSessions : recentSessions.length}
                                        {recentSessions.length > 0 && (
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium group-hover:text-emerald-600 transition flex items-center gap-0.5 truncate">
                                        {recentSessions.length > 0 ? 'Live now' : 'No active'} <ChevronRight size={11} className="shrink-0" />
                                    </span>
                                </Link>

                                {/* Attendance Rate */}
                                <div className="p-2.5 sm:p-3 lg:p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100/90 flex flex-col justify-between h-full">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                                            Avg Rate
                                        </span>
                                        <TrendingUp size={16} className="text-emerald-600 shrink-0" />
                                    </div>
                                    <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 tracking-tight my-1">
                                        {attendanceRate !== null ? `${attendanceRate}%` : 'N/A'}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium truncate">
                                        {totalExpected > 0 ? `${present} present` : 'Awaiting data'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Start a New Session Card (Strictly preserved in its exact position) */}
                        <div 
                            onClick={() => navigate('/app/sessions', { state: { openCreate: true } })}
                            className="card p-0 overflow-hidden relative group cursor-pointer border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl min-h-[165px] sm:min-h-[175px] lg:min-h-[230px]"
                        >
                            <img src="/images/dashboard-create.jpg" alt="Create Session" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#061a17]/95 via-[#061a17]/50 to-transparent"></div>
                            <div className="absolute inset-0 p-5 sm:p-6 lg:p-7 flex flex-col justify-end">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 lg:mb-4 text-white group-hover:bg-white group-hover:text-brand-900 transition-all duration-300 shadow-lg shrink-0">
                                    <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mb-1.5 lg:mb-2 tracking-tight">Start a New Session</h2>
                                <p className="text-white/70 text-xs sm:text-sm max-w-sm font-medium leading-relaxed line-clamp-2">
                                    Create an attendance session instantly. Generate QR codes, use geofencing, and track attendance in real-time.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Operations Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <Link
                            to="/app/courses"
                            className="p-3 sm:p-3.5 bg-white border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-brand-200 transition rounded-2xl flex items-center gap-3 group active:scale-[0.99]"
                        >
                            <FileText size={20} className="text-brand-600 shrink-0 group-hover:scale-110 transition-transform" />
                            <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-brand-600 transition">
                                    PDF Reports
                                </div>
                                <div className="text-[10px] text-slate-400 truncate hidden xs:block">
                                    Export course summaries
                                </div>
                            </div>
                        </Link>

                        <Link
                            to="/app/members"
                            className="p-3 sm:p-3.5 bg-white border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-brand-200 transition rounded-2xl flex items-center gap-3 group active:scale-[0.99]"
                        >
                            <Users size={20} className="text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                            <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-emerald-600 transition">
                                    Manage Roster
                                </div>
                                <div className="text-[10px] text-slate-400 truncate hidden xs:block">
                                    Students & instructors
                                </div>
                            </div>
                        </Link>

                        <Link
                            to="/app/sessions"
                            className="col-span-2 sm:col-span-1 p-3 sm:p-3.5 bg-white border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-brand-200 transition rounded-2xl flex items-center gap-3 group active:scale-[0.99]"
                        >
                            <CalendarClock size={20} className="text-indigo-600 shrink-0 group-hover:scale-110 transition-transform" />
                            <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition">
                                    Session Archive
                                </div>
                                <div className="text-[10px] text-slate-400 truncate hidden xs:block">
                                    Past logs & analytics
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Active & Pending Sessions (Hybrid Table / Mobile Cards) */}
                    {recentSessions.length > 0 && (
                        <div className="card bg-white p-0 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-100 rounded-2xl sm:rounded-3xl">
                            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50/50">
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold flex items-center text-slate-800">
                                        <CalendarClock size={20} className="mr-2.5 text-brand-500 shrink-0" />
                                        Active & Pending Sessions
                                        <span className="ml-2.5 bg-brand-50 text-brand-700 text-xs font-extrabold px-2 py-0.5 rounded-full border border-brand-100">
                                            {recentSessions.length}
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Live sessions currently accepting check-ins or awaiting final confirmation
                                    </p>
                                </div>
                                <Link to="/app/sessions" className="text-xs font-bold text-brand-600 hover:text-brand-700 transition flex items-center shrink-0">
                                    View All Sessions <ChevronRight size={14} className="ml-1" />
                                </Link>
                            </div>

                            {/* MOBILE VIEW: Cards (< 768px) */}
                            <div className="divide-y divide-slate-100 md:hidden">
                                {recentSessions.map(session => {
                                    const isPending = session.status === 'PENDING_CONFIRMATION';
                                    const instructorName = `${session.instructorId?.userId?.firstName || ''} ${session.instructorId?.userId?.lastName || ''}`.trim() || 'Assigned Lecturer';

                                    return (
                                        <div key={session._id} className="p-4 space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                        {session.courseId?.code || 'COURSE'}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                                        {session.lectureType || 'Lecture'}
                                                    </span>
                                                </div>
                                                {isPending ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 animate-pulse"></span>
                                                        Needs Confirm
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-ping"></span>
                                                        Active Now
                                                    </span>
                                                )}
                                            </div>

                                            <div>
                                                <Link to={`/app/sessions/${session._id}`} className="font-bold text-slate-900 text-sm hover:text-brand-600 transition block">
                                                    {session.courseId?.name || 'Untitled Course'}
                                                </Link>
                                                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                                    <span>{instructorName}</span>
                                                    <span>&bull;</span>
                                                    <span>Started {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>

                                            <Link 
                                                to={`/app/sessions/${session._id}`} 
                                                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                                    isPending 
                                                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-500/20 active:scale-95' 
                                                        : 'bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 active:scale-95'
                                                }`}
                                            >
                                                {isPending ? 'Review & Conclude Attendance' : 'Manage Session & QR Code'}
                                                <ArrowRight size={13} />
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* DESKTOP VIEW: Table (>= 768px) */}
                            <div className="table-container max-h-[380px] overflow-y-auto hidden md:block">
                                <table className="table">
                                    <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm shadow-sm z-10 border-b border-slate-100 text-xs text-slate-500">
                                        <tr>
                                            <th className="py-3 px-4 sm:px-6">Course</th>
                                            <th className="py-3 px-4">Format</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4">Instructor</th>
                                            <th className="py-3 px-4">Starts</th>
                                            <th className="py-3 px-4">QR Expires</th>
                                            <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {recentSessions.map(session => {
                                            const isPending = session.status === 'PENDING_CONFIRMATION';
                                            const instructorName = `${session.instructorId?.userId?.firstName || ''} ${session.instructorId?.userId?.lastName || ''}`.trim() || 'Assigned Lecturer';

                                            return (
                                                <tr key={session._id} className="hover:bg-slate-50/60 transition group">
                                                    <td className="py-3 sm:py-4 px-4 sm:px-6">
                                                        <Link to={`/app/sessions/${session._id}`} className="block">
                                                            <div className="font-bold text-slate-900 group-hover:text-brand-600 transition truncate max-w-[200px]">
                                                                {session.courseId?.name || 'Untitled Course'}
                                                            </div>
                                                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                                                {session.courseId?.code || '-'}
                                                            </div>
                                                        </Link>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                                            {session.lectureType || 'Lecture'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 sm:py-4 px-4">
                                                        {isPending ? (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
                                                                Needs Confirm
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>
                                                                Active Now
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="text-slate-700 font-medium py-3.5 px-4">
                                                        {instructorName}
                                                    </td>
                                                    <td className="text-slate-600 font-medium py-3.5 px-4">
                                                        {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="text-slate-600 font-medium py-3.5 px-4">
                                                        {new Date(session.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                                                        <Link 
                                                            to={`/app/sessions/${session._id}`} 
                                                            className={`inline-flex items-center text-xs font-semibold py-1.5 px-3.5 rounded-xl transition shadow-sm ${
                                                                isPending 
                                                                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20 active:scale-95' 
                                                                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 active:scale-95'
                                                            }`}
                                                        >
                                                            <span>{isPending ? 'Review & Conclude' : 'Manage Session'}</span>
                                                            <ArrowRight size={13} className="ml-1 opacity-80" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Attendance Analytics & Top Engaged Attendees */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

                        {/* LEFT: Attendance Overview Dial */}
                        <div className="card bg-white p-5 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-100 flex flex-col rounded-2xl sm:rounded-3xl">
                            {/* Card Header & Filters */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3 pb-4 border-b border-slate-100">
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center">
                                        <PieChart size={20} className="mr-2 text-emerald-500 shrink-0" />
                                        Attendance Distribution
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Filter by course and time period</p>
                                </div>
                                
                                <div className="flex gap-2 w-full sm:w-auto">
                                    {/* Course Selector Dropdown */}
                                    <div className="relative flex-1 sm:flex-none">
                                        <div 
                                            className="form-input bg-slate-50 hover:bg-slate-100/70 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer py-1.5 px-3 rounded-xl flex items-center justify-between min-w-[130px] transition"
                                            onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                                        >
                                            <span className="truncate pr-2">
                                                {courseId === 'all' ? 'All Courses' : (coursesList.find(c => c._id === courseId)?.name || 'All Courses')}
                                            </span>
                                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isCourseDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                        {isCourseDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsCourseDropdownOpen(false)}></div>
                                                <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 min-w-[200px] max-h-[220px] overflow-y-auto">
                                                    <div 
                                                        className={`px-3 py-2 text-xs cursor-pointer hover:bg-brand-50 ${courseId === 'all' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`}
                                                        onClick={() => { setCourseId('all'); setIsCourseDropdownOpen(false); }}
                                                    >
                                                        All Courses
                                                    </div>
                                                    {coursesList.map(c => (
                                                        <div 
                                                            key={c._id}
                                                            className={`px-3 py-2 text-xs cursor-pointer hover:bg-brand-50 truncate ${courseId === c._id ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`}
                                                            onClick={() => { setCourseId(c._id); setIsCourseDropdownOpen(false); }}
                                                        >
                                                            {c.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Time Range Dropdown */}
                                    <div className="relative flex-1 sm:flex-none">
                                        <div 
                                            className="form-input bg-slate-50 hover:bg-slate-100/70 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer py-1.5 px-3 rounded-xl flex items-center justify-between min-w-[110px] transition"
                                            onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                                        >
                                            <span className="truncate pr-2">
                                                {timeRange === 'all' ? 'All Time' : timeRange === 'month' ? 'Past Month' : 'Past Week'}
                                            </span>
                                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isTimeDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                        {isTimeDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsTimeDropdownOpen(false)}></div>
                                                <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 min-w-[140px]">
                                                    <div className={`px-3 py-2 text-xs cursor-pointer hover:bg-brand-50 ${timeRange === 'all' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`} onClick={() => { setTimeRange('all'); setIsTimeDropdownOpen(false); }}>All Time</div>
                                                    <div className={`px-3 py-2 text-xs cursor-pointer hover:bg-brand-50 ${timeRange === 'month' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`} onClick={() => { setTimeRange('month'); setIsTimeDropdownOpen(false); }}>Past Month</div>
                                                    <div className={`px-3 py-2 text-xs cursor-pointer hover:bg-brand-50 ${timeRange === 'week' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`} onClick={() => { setTimeRange('week'); setIsTimeDropdownOpen(false); }}>Past Week</div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Circular Dial & Stat summary */}
                            <div className="flex-1 flex items-center justify-center">
                                {renderAttendanceDial()}
                            </div>
                        </div>

                        {/* RIGHT: Top Performers / Engaged Students */}
                        <div className="card bg-white p-5 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-100 flex flex-col rounded-2xl sm:rounded-3xl">
                            <div className="mb-5 pb-4 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center">
                                        <Award size={20} className="mr-2 text-amber-500 shrink-0" />
                                        Top Engaged Students
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Highest verified session check-ins</p>
                                </div>
                                <Link to="/app/members" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition">
                                    All Students <ChevronRight size={14} />
                                </Link>
                            </div>
                            
                            <div className="flex-1">
                                {!stats?.topAttendees || stats.topAttendees.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                        <Users size={28} className="opacity-40 text-slate-400 mb-2" />
                                        <p className="text-xs font-semibold text-slate-600">No student records yet</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Scanned attendances will populate the leaderboard.</p>
                                    </div>
                                ) : (
                                    <div className="max-h-[210px] overflow-y-auto pr-1 space-y-2.5">
                                        {stats.topAttendees.map((attendee, index) => {
                                            const rankNumColor = 
                                                index === 0 ? 'text-amber-500' :
                                                index === 1 ? 'text-slate-600' :
                                                index === 2 ? 'text-amber-700' :
                                                'text-slate-400';

                                            return (
                                                <div 
                                                    key={attendee._id} 
                                                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-100/70 transition"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                                        <span className={`text-sm font-black w-5 shrink-0 text-center ${rankNumColor}`}>
                                                            {index + 1}.
                                                        </span>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-800 text-sm truncate">
                                                                {attendee.user?.firstName} {attendee.user?.lastName}
                                                            </div>
                                                            <div className="text-[11px] text-slate-400 truncate">
                                                                {attendee.user?.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="text-base font-black text-emerald-600">
                                                            {attendee.attendanceCount}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                            Sessions
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
