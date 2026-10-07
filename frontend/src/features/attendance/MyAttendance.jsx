import React, { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import api from '../../services/api';
import { 
    CalendarClock, 
    BookOpen, 
    CheckCircle2, 
    XCircle, 
    TrendingUp, 
    AlertCircle, 
    Filter, 
    QrCode, 
    MapPin, 
    ShieldCheck 
} from 'lucide-react';

const MyAttendance = () => {
    const { activeOrganization } = useOrganization();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchMyAttendance = async () => {
        if (!activeOrganization) return;
        try {
            setLoading(true);
            const res = await api.get(`/organizations/${activeOrganization._id}/my-attendance`);
            setData(res.data);
        } catch (error) {
            console.error("Failed to fetch my attendance:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyAttendance();
    }, [activeOrganization]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-medium">Loading your attendance history...</p>
            </div>
        );
    }

    const summary = data?.summary || {
        enrolledCourses: 0,
        totalConducted: 0,
        totalAttended: 0,
        totalAbsent: 0,
        overallPercentage: 0
    };

    const courses = data?.courses || [];
    const rawRecords = data?.records || [];

    const filteredRecords = rawRecords.filter(record => {
        const matchesCourse = selectedCourse === 'all' || (record.courseId?._id === selectedCourse || record.courseId === selectedCourse);
        const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
        return matchesCourse && matchesStatus;
    });

    return (
        <div className="animate-fade-in space-y-8 pb-12">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="card p-6 bg-white border border-slate-200/80 shadow-sm rounded-2xl flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mr-4 shrink-0 border border-brand-100">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
                            {summary.overallPercentage}%
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            Overall Attendance
                        </div>
                    </div>
                </div>

                <div className="card p-6 bg-white border border-slate-200/80 shadow-sm rounded-2xl flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mr-4 shrink-0 border border-emerald-100">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
                            {summary.totalAttended}
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            Classes Attended
                        </div>
                    </div>
                </div>

                <div className="card p-6 bg-white border border-slate-200/80 shadow-sm rounded-2xl flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mr-4 shrink-0 border border-rose-100">
                        <XCircle size={24} />
                    </div>
                    <div>
                        <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
                            {summary.totalAbsent}
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            Classes Missed
                        </div>
                    </div>
                </div>

                <div className="card p-6 bg-white border border-slate-200/80 shadow-sm rounded-2xl flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4 shrink-0 border border-indigo-100">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
                            {summary.enrolledCourses}
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            Enrolled Courses
                        </div>
                    </div>
                </div>
            </div>

            {/* Course Breakdown Cards */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center">
                        <BookOpen size={20} className="mr-2.5 text-brand-600" />
                        Course Attendance Breakdown
                    </h2>
                    <span className="text-xs text-slate-500 font-medium">
                        Minimum 80% attendance required for exam eligibility
                    </span>
                </div>

                {courses.length === 0 ? (
                    <div className="card text-center py-12 bg-white border border-dashed border-slate-200 rounded-2xl">
                        <BookOpen size={32} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 font-medium text-sm">You are not enrolled in any courses in this organization.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {courses.map(({ course, conducted, attended, percentage, isEligible }) => (
                            <div key={course._id} className="card bg-white p-5 border border-slate-200/80 shadow-sm rounded-2xl flex flex-col justify-between hover:border-brand-300 transition">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-brand-50 text-brand-700 rounded-md border border-brand-100">
                                            {course.code}
                                        </span>
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                            isEligible ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                        }`}>
                                            {isEligible ? 'Eligible' : 'At Risk'}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-base mb-1 line-clamp-1">
                                        {course.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 mb-4">
                                        Lecturer: <span className="font-medium text-slate-700">{course.instructor?.name || 'Unassigned'}</span>
                                    </p>
                                </div>

                                <div className="space-y-2 pt-3 border-t border-slate-100">
                                    <div className="flex justify-between text-xs font-medium text-slate-600">
                                        <span>Attendance Progress</span>
                                        <span className="font-bold text-slate-800">{attended} / {conducted} sessions ({percentage}%)</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                percentage >= 80 ? 'bg-emerald-500' : percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                            }`} 
                                            style={{ width: `${Math.min(100, percentage)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Attendance History Log */}
            <div className="card bg-white p-0 overflow-hidden shadow-sm border border-slate-200 rounded-2xl">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                    <div>
                        <h3 className="text-base font-bold text-slate-800 flex items-center">
                            <CalendarClock size={18} className="mr-2 text-brand-600" />
                            Attendance History Log
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Complete record of your scanned sessions</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 shadow-sm">
                            <Filter size={14} className="text-slate-400" />
                            <select 
                                className="bg-transparent border-none outline-none text-slate-700 font-semibold cursor-pointer"
                                value={selectedCourse}
                                onChange={(e) => setSelectedCourse(e.target.value)}
                            >
                                <option value="all">All Courses</option>
                                {courses.map(c => (
                                    <option key={c.course._id} value={c.course._id}>{c.course.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 shadow-sm">
                            <select 
                                className="bg-transparent border-none outline-none text-slate-700 font-semibold cursor-pointer"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="PRESENT">Present</option>
                                <option value="REMOVED">Removed</option>
                            </select>
                        </div>
                    </div>
                </div>

                {filteredRecords.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center mx-auto mb-3 border border-slate-100">
                            <CalendarClock size={28} />
                        </div>
                        <h4 className="text-base font-bold text-slate-700 mb-1">No Attendance Records</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            You haven't scanned or been marked present for any sessions matching these filters yet.
                        </p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Course</th>
                                    <th>Session Name</th>
                                    <th>Date & Time</th>
                                    <th>Verification</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map(record => (
                                    <tr key={record._id} className="hover:bg-slate-50/60 transition">
                                        <td>
                                            <div className="font-bold text-slate-800 text-sm">
                                                {record.courseId?.name || 'Course'}
                                            </div>
                                            <div className="text-xs font-mono text-slate-400 mt-0.5">
                                                {record.courseId?.code || ''}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="font-medium text-slate-700 text-sm">
                                                {record.sessionId?.sessionName || 'Lecture Session'}
                                            </span>
                                        </td>
                                        <td className="text-slate-600 text-xs">
                                            <div>{new Date(record.markedAt || record.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            <div className="text-slate-400 mt-0.5">{new Date(record.markedAt || record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                {record.markedBy === 'SELF' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium text-[11px]">
                                                        <QrCode size={12} /> QR Scan
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                                                        <ShieldCheck size={12} /> Lecturer Marked
                                                    </span>
                                                )}
                                                {record.markedLocation && (
                                                    <span className="text-slate-400" title="Geofence verified">
                                                        <MapPin size={12} className="text-emerald-500 inline" />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {record.status === 'PRESENT' ? (
                                                <span className="badge badge-success text-xs font-semibold">
                                                    Present
                                                </span>
                                            ) : (
                                                <span className="badge badge-danger text-xs font-semibold">
                                                    {record.status}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyAttendance;
