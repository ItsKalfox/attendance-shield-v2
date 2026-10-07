import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext';
import api from '../../services/api';
import { Users, BookOpen, CalendarClock, Activity, ArrowRight, PieChart, PlusCircle, CheckCircle2, ChevronRight } from 'lucide-react';
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

    const navigate = useNavigate();

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!activeOrganization) {
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

                if (activeOrganization.userRole !== 'ATTENDEE' && coursesList.length === 0) {
                    const coursesRes = await api.get(`/organizations/${activeOrganization._id}/courses`);
                    setCoursesList(coursesRes.data);
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

    if (loading && !stats) {
        return (
            <div className="animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {[1, 2].map(i => (
                        <div key={i} className="card h-48 flex flex-col justify-center">
                            <div className="skeleton h-10 w-32 mb-4"></div>
                            <div className="skeleton h-4 w-24"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const isAttendee = activeOrganization?.userRole === 'ATTENDEE';

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
                        <div className="card relative overflow-hidden flex items-center p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
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
                        <div className="card relative overflow-hidden flex items-center p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
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
                        <div className="card relative overflow-hidden flex items-center p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
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
                            className="card p-6 bg-white border border-slate-200/80 hover:border-brand-400 hover:shadow-lg transition-all rounded-2xl flex items-center justify-between group"
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
                            className="card p-6 bg-white border border-slate-200/80 hover:border-emerald-400 hover:shadow-lg transition-all rounded-2xl flex items-center justify-between group"
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
                    <div className="card bg-white p-0 overflow-hidden shadow-sm border border-slate-200 rounded-2xl">
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
                        <div className="card bg-white p-8 flex flex-col justify-center relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100/60 rounded-3xl h-[220px]">
                            <div className="absolute -right-12 -top-12 w-48 h-48 bg-brand-50 rounded-full opacity-60 blur-2xl pointer-events-none"></div>
                            <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-emerald-50 rounded-full opacity-60 blur-2xl pointer-events-none"></div>
                            
                            <h2 className="text-xl font-bold text-slate-800 mb-8 relative z-10 flex items-center">
                                <Activity className="mr-3 text-brand-500" size={24} />
                                Organization Overview
                            </h2>
                            
                            <div className="grid grid-cols-2 gap-8 relative z-10">
                                <div>
                                    <div className="flex items-center text-slate-500 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mr-3 border border-slate-100 shadow-sm">
                                            <Users size={16} className="text-slate-600" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Attendees</span>
                                    </div>
                                    <div className="text-5xl font-extrabold text-slate-800 tracking-tight pl-11">
                                        {stats?.totalAttendees || 0}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center text-slate-500 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mr-3 border border-slate-100 shadow-sm">
                                            <BookOpen size={16} className="text-slate-600" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Active Courses</span>
                                    </div>
                                    <div className="text-5xl font-extrabold text-slate-800 tracking-tight pl-11">
                                        {stats?.activeCourses || 0}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Create Session Card */}
                        <div 
                            onClick={() => navigate('/app/sessions', { state: { openCreate: true } })}
                            className="card p-0 overflow-hidden relative group cursor-pointer border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl h-[220px]"
                        >
                            <img src="/images/dashboard-create.jpg" alt="Create Session" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#061a17]/95 via-[#061a17]/50 to-transparent"></div>
                            <div className="absolute inset-0 p-8 flex flex-col justify-end">
                                <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-5 text-white group-hover:bg-white group-hover:text-brand-900 transition-all duration-300 shadow-lg">
                                    <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                                <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Start a New Session</h2>
                                <p className="text-white/70 text-sm max-w-sm font-medium leading-relaxed">
                                    Create an attendance session instantly. Generate QR codes, use geofencing, and track attendance in real-time.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Sessions */}
                    <div className="card bg-white p-0 overflow-hidden shadow-sm border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold flex items-center text-slate-800">
                                <CalendarClock size={20} className="mr-3 text-brand-500" />
                                Active & Pending Sessions
                            </h3>
                            {recentSessions.length > 0 && (
                                <Link to="/app/sessions" className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition">
                                    View All →
                                </Link>
                            )}
                        </div>

                        {recentSessions.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 mb-4 shadow-sm border border-slate-100">
                                    <CalendarClock size={32} className="text-slate-300" />
                                </div>
                                <h4 className="text-lg font-bold mb-2 text-slate-700">No Active Sessions</h4>
                                <p className="text-slate-500 mb-6 text-sm max-w-sm mx-auto">
                                    There are currently no active or pending attendance sessions. Create one to start marking attendance.
                                </p>
                                <button onClick={() => navigate('/app/sessions', { state: { openCreate: true } })} className="btn btn-primary shadow-sm px-6">
                                    Create Session
                                </button>
                            </div>
                        ) : (
                            <div className="table-container max-h-[350px] overflow-y-auto">
                                <table className="table">
                                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                                        <tr>
                                            <th className="bg-white">Course</th>
                                            <th className="bg-white">Status</th>
                                            <th className="bg-white">Instructor</th>
                                            <th className="bg-white">Starts</th>
                                            <th className="bg-white">Expires</th>
                                            <th className="text-right bg-white">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentSessions.map(session => (
                                            <tr key={session._id} className="hover:bg-slate-50/50 transition">
                                                <td>
                                                    <div className="font-bold text-slate-800">{session.courseId?.name}</div>
                                                    <div className="text-xs font-semibold text-slate-400 mt-0.5">{session.courseId?.code}</div>
                                                </td>
                                                <td>
                                                    {session.status === 'ACTIVE' ? (
                                                        <span className="badge badge-success shadow-sm">Active</span>
                                                    ) : (
                                                        <span className="badge badge-warning shadow-sm">Pending</span>
                                                    )}
                                                </td>
                                                <td className="text-slate-600 font-medium">{session.instructorId?.userId?.firstName} {session.instructorId?.userId?.lastName}</td>
                                                <td className="text-slate-600 font-medium">{new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                                <td className="text-slate-600 font-medium">{new Date(session.expiresAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                                <td className="text-right">
                                                    <Link to={`/app/sessions/${session._id}`} className="btn btn-outline py-1.5 px-4 bg-white shadow-sm hover:border-brand-300">
                                                        Manage
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Attendance Overview Section (Two Columns) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Doughnut Chart Card (Left) */}
                        <div className="card bg-white p-8 shadow-sm border border-slate-200 flex flex-col rounded-3xl">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 pb-4 border-b border-slate-100">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center mb-1">
                                        <PieChart size={24} className="mr-3 text-emerald-500" />
                                        Overview
                                    </h2>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    <select 
                                        className="form-input bg-slate-50 border-slate-200 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer py-1.5 px-3 rounded-lg"
                                        value={courseId}
                                        onChange={(e) => setCourseId(e.target.value)}
                                    >
                                        <option value="all">All Courses</option>
                                        {coursesList.map(c => (
                                            <option key={c._id} value={c._id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <select 
                                        className="form-input bg-slate-50 border-slate-200 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer py-1.5 px-3 rounded-lg"
                                        value={timeRange}
                                        onChange={(e) => setTimeRange(e.target.value)}
                                    >
                                        <option value="all">All Time</option>
                                        <option value="month">Past Month</option>
                                        <option value="week">Past Week</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex-1 flex items-center justify-center">
                                {renderDoughnutChart()}
                            </div>
                        </div>

                        {/* Top Attendees Card (Right) */}
                        <div className="card bg-white p-8 shadow-sm border border-slate-200 flex flex-col rounded-3xl">
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
