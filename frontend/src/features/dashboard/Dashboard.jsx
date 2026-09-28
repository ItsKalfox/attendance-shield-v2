import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext';
import api from '../../services/api';
import { Users, BookOpen, CalendarClock, Activity } from 'lucide-react';

const Dashboard = () => {
    const { activeOrganization } = useOrganization();
    const [stats, setStats] = useState(null);
    const [recentSessions, setRecentSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!activeOrganization) return;
            
            try {
                setLoading(true);
                const res = await api.get(`/organizations/${activeOrganization._id}/dashboard`);
                setStats(res.data.stats);
                setRecentSessions(res.data.recentSessions);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [activeOrganization]);

    if (!activeOrganization) return null; // handled by layout

    if (loading) {
        return (
            <div className="animate-fade-in">
                <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="card h-32 flex flex-col justify-center">
                            <div className="skeleton h-10 w-24 mb-4"></div>
                            <div className="skeleton h-4 w-16"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const isAttendee = activeOrganization?.userRole === 'ATTENDEE';

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
                    <p className="text-slate-500 text-sm">
                        {isAttendee ? "Track your personal attendance activity." : "Track your organization's attendance activity."}
                    </p>
                </div>
                {!isAttendee && (
                    <div className="flex gap-2">
                        <button className="btn btn-primary" onClick={() => alert('Create Session TBD')}>
                            + Create Session
                        </button>
                    </div>
                )}
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card relative overflow-hidden flex items-center p-6 hover:-translate-y-1 group bg-white">
                    <div className="bg-brand-50 p-4 rounded-2xl mr-5 text-brand-600 border border-brand-100 group-hover:bg-brand-100 transition-colors">
                        <Activity size={26} strokeWidth={2.5} />
                    </div>
                    <div className="relative z-10">
                        <div className="text-4xl font-extrabold text-slate-800 tracking-tight">
                            {isAttendee ? (stats?.attendedSessions || 0) : (stats?.activeSessions || 0)}
                        </div>
                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1">
                            {isAttendee ? "Attended Sessions" : "Active Sessions"}
                        </div>
                    </div>
                </div>
                
                <div className="card relative overflow-hidden flex items-center p-6 hover:-translate-y-1 group bg-white">
                    <div className="bg-emerald-50 p-4 rounded-2xl mr-5 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                        <BookOpen size={26} strokeWidth={2.5} />
                    </div>
                    <div className="relative z-10">
                        <div className="text-4xl font-extrabold text-slate-800 tracking-tight">
                            {isAttendee ? (stats?.enrolledCourses || 0) : (stats?.activeCourses || 0)}
                        </div>
                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1">
                            {isAttendee ? "Enrolled Courses" : "Active Courses"}
                        </div>
                    </div>
                </div>

                <div className="card relative overflow-hidden flex items-center p-6 hover:-translate-y-1 group bg-white">
                    <div className="bg-amber-50 p-4 rounded-2xl mr-5 text-amber-600 border border-amber-100 group-hover:bg-amber-100 transition-colors">
                        <Users size={26} strokeWidth={2.5} />
                    </div>
                    <div className="relative z-10">
                        <div className="text-4xl font-extrabold text-slate-800 tracking-tight">
                            {isAttendee ? (stats?.overallAttendance || 'N/A') : (stats?.totalMembers || 0)}
                        </div>
                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1">
                            {isAttendee ? "Overall Attendance" : "Total Members"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Sessions */}
            {!isAttendee && (
                <div className="card bg-white">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold flex items-center text-slate-800">
                            <CalendarClock size={18} className="mr-2 text-brand-500" />
                            Active & Pending Sessions
                        </h3>
                    </div>

                    {recentSessions.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white mb-4 shadow-sm">
                                <CalendarClock size={24} className="text-slate-400" />
                            </div>
                            <h4 className="text-lg font-medium mb-1 text-slate-800">No Active Sessions</h4>
                            <p className="text-slate-500 mb-4 text-sm max-w-md mx-auto">
                                There are currently no active or pending attendance sessions. Create one to start marking attendance.
                            </p>
                            <button className="btn btn-primary shadow-sm" onClick={() => alert('Create Session TBD')}>
                                Create Session
                            </button>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Course</th>
                                        <th>Status</th>
                                        <th>Instructor</th>
                                        <th>Starts</th>
                                        <th>Expires</th>
                                        <th className="text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentSessions.map(session => (
                                        <tr key={session._id}>
                                            <td>
                                                <div className="font-medium text-slate-800">{session.courseId?.name}</div>
                                                <div className="text-xs text-slate-500">{session.courseId?.code}</div>
                                            </td>
                                            <td>
                                                {session.status === 'ACTIVE' ? (
                                                    <span className="badge badge-success">Active</span>
                                                ) : (
                                                    <span className="badge badge-warning">Pending</span>
                                                )}
                                            </td>
                                            <td className="text-slate-600">{session.instructorId?.userId?.firstName} {session.instructorId?.userId?.lastName}</td>
                                            <td className="text-slate-600">{new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                            <td className="text-slate-600">{new Date(session.expiresAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                            <td className="text-right">
                                                <Link to={`/app/sessions/${session._id}`} className="btn btn-outline py-1 px-3">
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
            )}
        </div>
    );
};

export default Dashboard;
