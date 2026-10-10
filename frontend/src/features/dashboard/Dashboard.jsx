import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext';
import api from '../../services/api';
import { Users, BookOpen, CalendarClock, Activity, ArrowRight, PieChart, PlusCircle, CheckCircle2, ChevronRight, ChevronDown } from 'lucide-react';
import CreateOrganizationModal from '../organizations/CreateOrganizationModal';

const Dashboard = () => {
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
                setStats(null);
                setRecentSessions([]);
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

    if (!activeOrganization && !loadingOrg) {
        return (
            <div className="animate-fade-in flex flex-col items-center justify-center py-16 px-4">
                <div className="card max-w-lg w-full text-center p-10 bg-white border border-slate-200/80 shadow-xl rounded-3xl">
                    <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-brand-100">
                        <PlusCircle size={36} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Welcome to Attendance Shield</h2>
                    <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                        You do not have an active organization selected. Create a new organization to start managing courses, instructors, and secure attendance sessions.
                    </p>
                    <button 
                        className="btn btn-primary w-full py-3.5 shadow-lg shadow-brand-500/25 flex items-center justify-center font-bold text-sm"
                        onClick={() => setShowCreateOrgModal(true)}
                    >
                        <PlusCircle size={18} className="mr-2" />
                        Create Organization to Get Started
                    </button>
                </div>
                {showCreateOrgModal && <CreateOrganizationModal onClose={() => setShowCreateOrgModal(false)} />}
            </div>
        );
    }

    if (loading || loadingOrg || !stats) {
        if (isAttendee) {
            return (
                <div className="animate-fade-in space-y-8 pb-8">
                    {/* 3 Metric Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="card relative overflow-hidden flex items-center p-6 bg-white border-0 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                                <div className="skeleton w-14 h-14 rounded-2xl mr-5 shrink-0"></div>
                                <div className="space-y-2 flex-1">
                                    <div className="skeleton w-16 h-8 rounded-md"></div>
                                    <div className="skeleton w-28 h-3 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Access Action Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2].map(i => (
                            <div key={i} className="card p-6 bg-white border-0 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="skeleton w-12 h-12 rounded-xl shrink-0"></div>
                                    <div className="space-y-1.5">
                                        <div className="skeleton w-40 h-5 rounded-md"></div>
                                        <div className="skeleton w-60 h-3 rounded"></div>
                                    </div>
                                </div>
                                <div className="skeleton w-5 h-5 rounded-full"></div>
                            </div>
                        ))}
                    </div>

                    {/* Recent Attendance Activity Table Skeleton */}
                    <div className="card bg-white p-0 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-0 rounded-2xl">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="space-y-1">
                                <div className="skeleton w-48 h-5 rounded-md"></div>
                                <div className="skeleton w-56 h-3 rounded"></div>
                            </div>
                            <div className="skeleton w-28 h-4 rounded"></div>
                        </div>
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex justify-between items-center py-2 px-3">
                                    <div className="space-y-1">
                                        <div className="skeleton w-36 h-4 rounded"></div>
                                        <div className="skeleton w-20 h-3 rounded"></div>
                                    </div>
                                    <div className="skeleton w-28 h-4 rounded"></div>
                                    <div className="skeleton w-24 h-3 rounded"></div>
                                    <div className="skeleton w-16 h-6 rounded-full"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="animate-fade-in space-y-8 pb-8">
                {/* Top Cards Grid (2 Columns, h-[220px]) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Stats Card Skeleton */}
                    <div className="card bg-white p-8 flex flex-col justify-center shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 rounded-3xl h-[220px]">
                        <div className="flex items-center mb-8">
                            <div className="skeleton w-6 h-6 rounded-md mr-3"></div>
                            <div className="skeleton w-48 h-6 rounded-md"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <div className="skeleton w-8 h-8 rounded-full mr-3 shrink-0"></div>
                                    <div className="skeleton w-28 h-3 rounded"></div>
                                </div>
                                <div className="skeleton w-20 h-10 rounded-md ml-11"></div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <div className="skeleton w-8 h-8 rounded-full mr-3 shrink-0"></div>
                                    <div className="skeleton w-28 h-3 rounded"></div>
                                </div>
                                <div className="skeleton w-20 h-10 rounded-md ml-11"></div>
                            </div>
                        </div>
                    </div>

                    {/* Right Create Session Card Skeleton */}
                    <div className="card p-8 bg-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 rounded-3xl h-[220px] flex flex-col justify-end space-y-3">
                        <div className="skeleton w-14 h-14 rounded-full bg-slate-800"></div>
                        <div className="skeleton w-56 h-7 rounded-md bg-slate-800"></div>
                        <div className="skeleton w-full max-w-sm h-4 rounded bg-slate-800"></div>
                    </div>
                </div>

                {/* Attendance Overview Section (2 Columns) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Doughnut Chart Card (Left) */}
                    <div className="card bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 flex flex-col rounded-3xl min-h-[380px]">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 pb-4 border-b border-slate-100">
                            <div className="flex items-center">
                                <div className="skeleton w-6 h-6 rounded-md mr-3"></div>
                                <div className="skeleton w-28 h-6 rounded-md"></div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <div className="skeleton w-28 h-8 rounded-lg"></div>
                                <div className="skeleton w-28 h-8 rounded-lg"></div>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 py-4">
                            <div className="skeleton w-44 h-44 rounded-full shrink-0"></div>
                            <div className="flex flex-col gap-4 min-w-[200px] w-full md:w-auto">
                                <div className="skeleton h-20 w-full rounded-2xl"></div>
                                <div className="skeleton h-20 w-full rounded-2xl"></div>
                            </div>
                        </div>
                    </div>

                    {/* Top Attendees Card (Right) */}
                    <div className="card bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 flex flex-col rounded-3xl min-h-[380px]">
                        <div className="mb-6 pb-4 border-b border-slate-100 space-y-1.5">
                            <div className="flex items-center">
                                <div className="skeleton w-6 h-6 rounded-md mr-3"></div>
                                <div className="skeleton w-36 h-6 rounded-md"></div>
                            </div>
                            <div className="skeleton w-56 h-3 rounded ml-9"></div>
                        </div>
                        <div className="space-y-3 flex-1">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="skeleton w-10 h-10 rounded-full shrink-0"></div>
                                        <div className="space-y-1.5">
                                            <div className="skeleton w-32 h-4 rounded"></div>
                                            <div className="skeleton w-40 h-3 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <div className="skeleton w-10 h-5 rounded ml-auto"></div>
                                        <div className="skeleton w-12 h-2.5 rounded ml-auto"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const renderDoughnutChart = () => {
        const present = stats?.attendanceOverview?.present || 0;
        const absent = stats?.attendanceOverview?.absent || 0;
        const total = present + absent;
        
        if (total === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <PieChart size={48} className="mb-4 opacity-50 text-slate-300" />
                    <p className="font-medium">No attendance data available for the selected filters.</p>
                </div>
            );
        }

        const presentPercentage = Math.round((present / total) * 100);
        
        const size = 200;
        const strokeWidth = 24;
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const strokeDashoffset = circumference - (presentPercentage / 100) * circumference;

        return (
            <div className="flex flex-col md:flex-row items-center justify-center gap-12 py-4">
                <div className="relative" style={{ width: size, height: size }}>
                    <svg width={size} height={size} className="transform -rotate-90 drop-shadow-sm">
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{presentPercentage}%</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Present</span>
                    </div>
                </div>

                <div className="flex flex-col gap-4 min-w-[200px]">
                    <div className="p-4 rounded-2xl bg-brand-950 shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:-translate-y-1 transition-transform">
                        <div className="flex items-center mb-1">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2 shadow-sm"></div>
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Present</span>
                        </div>
                        <div className="text-3xl font-extrabold text-white">{present} <span className="text-sm font-semibold text-slate-500 lowercase">students</span></div>
                    </div>
                    <div className="p-4 rounded-2xl bg-brand-950 shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:-translate-y-1 transition-transform">
                        <div className="flex items-center mb-1">
                            <div className="w-3 h-3 rounded-full bg-slate-600 mr-2 shadow-sm"></div>
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Absent</span>
                        </div>
                        <div className="text-3xl font-extrabold text-white">{absent} <span className="text-sm font-semibold text-slate-500 lowercase">students</span></div>
                    </div>
                    <div className="text-sm text-slate-500 text-center mt-2 font-medium bg-slate-50 py-2 rounded-xl border border-slate-100">
                        Out of <strong className="text-slate-800">{total}</strong> expected attendees
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in space-y-8 pb-8">
            {isAttendee ? (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="card relative overflow-hidden flex items-center p-6 bg-white border-0 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                            <div className="bg-brand-50 p-4 rounded-2xl mr-5 text-brand-600 border border-brand-100">
                                <Activity size={26} strokeWidth={2.5} />
                            </div>
                            <div>
                                <div className="text-4xl font-extrabold text-slate-800 tracking-tight">
                                    {stats?.attendedSessions || 0}
                                </div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                                    Attended Sessions
                                </div>
                            </div>
                        </div>
                        <div className="card relative overflow-hidden flex items-center p-6 bg-white border-0 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                            <div className="bg-emerald-50 p-4 rounded-2xl mr-5 text-emerald-600 border border-emerald-100">
                                <BookOpen size={26} strokeWidth={2.5} />
                            </div>
                            <div>
                                <div className="text-4xl font-extrabold text-slate-800 tracking-tight">
                                    {stats?.enrolledCourses || 0}
                                </div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                                    Enrolled Courses
                                </div>
                            </div>
                        </div>
                        <div className="card relative overflow-hidden flex items-center p-6 bg-white border-0 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                            <div className="bg-amber-50 p-4 rounded-2xl mr-5 text-amber-600 border border-amber-100">
                                <Users size={26} strokeWidth={2.5} />
                            </div>
                            <div>
                                <div className="text-4xl font-extrabold text-slate-800 tracking-tight">
                                    {stats?.overallAttendance || '100%'}
                                </div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                                    Overall Attendance
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access Action Cards for Student */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Link 
                            to="/app/courses"
                            className="card p-6 bg-white border-0 shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:shadow-xl transition-all rounded-2xl flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <BookOpen size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base group-hover:text-brand-600 transition">My Enrolled Courses</h3>
                                    <p className="text-xs text-slate-500">View course syllabus, lecturers, and class schedules</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-slate-400 group-hover:translate-x-1 group-hover:text-brand-600 transition" />
                        </Link>

                        <Link 
                            to="/app/attendance"
                            className="card p-6 bg-white border-0 shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:shadow-xl transition-all rounded-2xl flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <CalendarClock size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base group-hover:text-emerald-600 transition">Attendance History & Eligibility</h3>
                                    <p className="text-xs text-slate-500">Check eligibility percentages and detailed scan records</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition" />
                        </Link>
                    </div>

                    {/* Recent Attended Sessions Log */}
                    <div className="card bg-white p-0 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-0 rounded-2xl">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 flex items-center">
                                    <CheckCircle2 size={18} className="mr-2 text-emerald-600" />
                                    Recent Attendance Activity
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Classes you recently scanned or attended</p>
                            </div>
                            <Link to="/app/attendance" className="text-xs font-bold text-brand-600 hover:text-brand-700">
                                View Full History →
                            </Link>
                        </div>

                        {recentSessions.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <CalendarClock size={28} className="mx-auto mb-2 opacity-50 text-slate-300" />
                                <p className="text-xs font-medium text-slate-500">No attendance records found yet.</p>
                            </div>
                        ) : (
                            <div className="table-container">
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
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* Top Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Stats Card */}
                        <div className="card bg-white p-6 sm:p-8 flex flex-col justify-center relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 rounded-2xl sm:rounded-3xl min-h-[200px] sm:min-h-[220px]">
                            <div className="absolute -right-12 -top-12 w-48 h-48 bg-brand-50 rounded-full opacity-60 blur-2xl pointer-events-none"></div>
                            <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-emerald-50 rounded-full opacity-60 blur-2xl pointer-events-none"></div>
                            
                            <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-6 sm:mb-8 relative z-10 flex items-center">
                                <Activity className="mr-2.5 sm:mr-3 text-brand-500" size={22} />
                                Organization Overview
                            </h2>
                            
                            <div className="grid grid-cols-2 gap-4 sm:gap-8 relative z-10">
                                <div>
                                    <div className="flex items-center text-slate-500 mb-1.5 sm:mb-2">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 flex items-center justify-center mr-2 sm:mr-3 border border-slate-100 shadow-sm shrink-0">
                                            <Users size={15} className="text-slate-600" />
                                        </div>
                                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest text-slate-500 truncate">Total Attendees</span>
                                    </div>
                                    <div className="text-3xl sm:text-5xl font-extrabold text-slate-800 tracking-tight pl-0 sm:pl-11">
                                        {stats?.totalAttendees || 0}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center text-slate-500 mb-1.5 sm:mb-2">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 flex items-center justify-center mr-2 sm:mr-3 border border-slate-100 shadow-sm shrink-0">
                                            <BookOpen size={15} className="text-slate-600" />
                                        </div>
                                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest text-slate-500 truncate">Active Courses</span>
                                    </div>
                                    <div className="text-3xl sm:text-5xl font-extrabold text-slate-800 tracking-tight pl-0 sm:pl-11">
                                        {stats?.activeCourses || 0}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Create Session Card */}
                        <div 
                            onClick={() => navigate('/app/sessions', { state: { openCreate: true } })}
                            className="card p-0 overflow-hidden relative group cursor-pointer border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl min-h-[200px] sm:min-h-[220px]"
                        >
                            <img src="/images/dashboard-create.jpg" alt="Create Session" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#061a17]/95 via-[#061a17]/50 to-transparent"></div>
                            <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 sm:mb-5 text-white group-hover:bg-white group-hover:text-brand-900 transition-all duration-300 shadow-lg">
                                    <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5 sm:mb-2 tracking-tight">Start a New Session</h2>
                                <p className="text-white/70 text-xs sm:text-sm max-w-sm font-medium leading-relaxed">
                                    Create an attendance session instantly. Generate QR codes, use geofencing, and track attendance in real-time.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Active & Pending Sessions (Only shown when there are active/pending sessions) */}
                    {recentSessions.length > 0 && (
                        <div className="card bg-white p-0 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 rounded-3xl">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-lg font-bold flex items-center text-slate-800">
                                        <CalendarClock size={20} className="mr-3 text-brand-500" />
                                        Active & Pending Sessions ({recentSessions.length})
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Live attendance sessions requiring monitoring or lecturer confirmation
                                    </p>
                                </div>
                                <Link to="/app/sessions" className="text-xs font-bold text-brand-600 hover:text-brand-700 transition flex items-center">
                                    View All Sessions <ChevronRight size={14} className="ml-1" />
                                </Link>
                            </div>

                            <div className="table-container max-h-[380px] overflow-y-auto">
                                <table className="table">
                                    <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm shadow-sm z-10 border-b border-slate-100 text-xs text-slate-500">
                                        <tr>
                                            <th className="py-3 px-3.5 sm:px-6">Course</th>
                                            <th className="py-3 px-4 hidden md:table-cell">Format</th>
                                            <th className="py-3 px-3.5 sm:px-6">Status</th>
                                            <th className="py-3 px-4 hidden lg:table-cell">Instructor</th>
                                            <th className="py-3 px-4 hidden sm:table-cell">Starts</th>
                                            <th className="py-3 px-4 hidden xl:table-cell">QR Expiration</th>
                                            <th className="py-3 px-3.5 sm:px-6 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {recentSessions.map(session => {
                                            const isPending = session.status === 'PENDING_CONFIRMATION';
                                            const instructorName = `${session.instructorId?.userId?.firstName || ''} ${session.instructorId?.userId?.lastName || ''}`.trim() || 'Assigned Lecturer';

                                            return (
                                                <tr key={session._id} className="hover:bg-slate-50/60 transition group">
                                                    <td className="py-3 sm:py-4 px-3.5 sm:px-6">
                                                        <Link to={`/app/sessions/${session._id}`} className="block">
                                                            <div className="font-bold text-slate-900 group-hover:text-brand-600 transition truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
                                                                {session.courseId?.name || 'Untitled Course'}
                                                            </div>
                                                            <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                                <span>{session.courseId?.code || '-'}</span>
                                                                <span className="md:hidden font-sans font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                                                                    {session.lectureType || 'Lecture'}
                                                                </span>
                                                                <span className="sm:hidden font-sans text-[10px] text-slate-400">
                                                                    &bull; {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </Link>
                                                    </td>
                                                    <td className="py-3.5 px-4 hidden md:table-cell">
                                                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                                            {session.lectureType || 'Lecture'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 sm:py-4 px-3.5 sm:px-6">
                                                        {isPending ? (
                                                            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm whitespace-nowrap">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 sm:mr-1.5 animate-pulse"></span>
                                                                <span className="hidden xs:inline">Needs </span>Confirm
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm whitespace-nowrap">
                                                                <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 mr-1 sm:mr-1.5">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
                                                                </span>
                                                                Active<span className="hidden xs:inline"> Now</span>
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="text-slate-700 font-medium py-3.5 px-4 hidden lg:table-cell">
                                                        {instructorName}
                                                    </td>
                                                    <td className="text-slate-600 font-medium py-3.5 px-4 hidden sm:table-cell">
                                                        {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="text-slate-600 font-medium py-3.5 px-4 hidden xl:table-cell">
                                                        {new Date(session.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="py-3 sm:py-4 px-3.5 sm:px-6 text-right whitespace-nowrap">
                                                        <Link 
                                                            to={`/app/sessions/${session._id}`} 
                                                            className={`inline-flex items-center text-xs font-semibold py-1.5 px-2.5 sm:px-3.5 rounded-xl transition shadow-sm ${
                                                                isPending 
                                                                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20 active:scale-95' 
                                                                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 active:scale-95'
                                                            }`}
                                                            title={isPending ? "Review and conclude session attendance" : "View live session & QR code"}
                                                        >
                                                            <span className="hidden sm:inline">{isPending ? 'Review & Conclude' : 'Manage Session'}</span>
                                                            <span className="sm:hidden text-[11px]">{isPending ? 'Review' : 'Manage'}</span>
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

                    {/* Attendance Overview Section (Two Columns) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Doughnut Chart Card (Left) */}
                        <div className="card bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 flex flex-col rounded-3xl">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 pb-4 border-b border-slate-100">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center mb-1">
                                        <PieChart size={24} className="mr-3 text-emerald-500" />
                                        Overview
                                    </h2>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    <div className="relative">
                                        <div 
                                            className="form-input bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer py-1.5 px-3 rounded-lg flex items-center justify-between min-w-[120px]"
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
                                                <div className="absolute right-0 sm:left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-1 min-w-[200px] max-h-[200px] overflow-y-auto custom-scrollbar">
                                                    <div 
                                                        className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-brand-50 ${courseId === 'all' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`}
                                                        onClick={() => { setCourseId('all'); setIsCourseDropdownOpen(false); }}
                                                    >
                                                        All Courses
                                                    </div>
                                                    {coursesList.map(c => (
                                                        <div 
                                                            key={c._id}
                                                            className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-brand-50 truncate ${courseId === c._id ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`}
                                                            onClick={() => { setCourseId(c._id); setIsCourseDropdownOpen(false); }}
                                                        >
                                                            {c.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <div 
                                            className="form-input bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer py-1.5 px-3 rounded-lg flex items-center justify-between min-w-[110px]"
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
                                                <div className="absolute right-0 sm:left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-1 min-w-[150px]">
                                                    <div className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-brand-50 ${timeRange === 'all' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`} onClick={() => { setTimeRange('all'); setIsTimeDropdownOpen(false); }}>All Time</div>
                                                    <div className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-brand-50 ${timeRange === 'month' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`} onClick={() => { setTimeRange('month'); setIsTimeDropdownOpen(false); }}>Past Month</div>
                                                    <div className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-brand-50 ${timeRange === 'week' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`} onClick={() => { setTimeRange('week'); setIsTimeDropdownOpen(false); }}>Past Week</div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex items-center justify-center">
                                {renderDoughnutChart()}
                            </div>
                        </div>

                        {/* Top Attendees Card (Right) */}
                        <div className="card bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 flex flex-col rounded-3xl">
                            <div className="mb-6 pb-4 border-b border-slate-100">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center mb-1">
                                    <Users size={24} className="mr-3 text-brand-500" />
                                    Top Attendees
                                </h2>
                                <p className="text-sm text-slate-500 ml-9">Students with the highest attendance records.</p>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto">
                                {!stats?.topAttendees || stats.topAttendees.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                        <Users size={32} className="mb-3 opacity-50 text-slate-300" />
                                        <p className="text-sm font-medium">No attendance data yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {stats.topAttendees.map((attendee, index) => (
                                            <div key={attendee._id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-white border border-brand-100 text-brand-700 flex items-center justify-center font-bold shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{attendee.user?.firstName} {attendee.user?.lastName}</div>
                                                        <div className="text-xs font-semibold text-slate-400 mt-0.5">{attendee.user?.email}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right pr-2">
                                                    <div className="text-lg font-black text-emerald-600">{attendee.attendanceCount}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sessions</div>
                                                </div>
                                            </div>
                                        ))}
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
