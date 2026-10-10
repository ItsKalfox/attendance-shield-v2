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
    ShieldCheck,
    ChevronDown
} from 'lucide-react';

const MyAttendance = () => {
    const { activeOrganization } = useOrganization();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    const fetchMyAttendance = async () => {
        if (!activeOrganization) {
            setData(null);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setData(null);
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

    if (loading || !data) {
        return (
            <div className="animate-fade-in space-y-8">
                {/* 4 Summary Stat Cards Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="card p-6 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl flex items-center">
                            <div className="skeleton w-12 h-12 rounded-2xl mr-4 shrink-0"></div>
                            <div className="space-y-1.5 flex-1">
                                <div className="skeleton w-16 h-7 rounded-md"></div>
                                <div className="skeleton w-24 h-3 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Course Breakdown Skeleton */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="skeleton w-56 h-6 rounded-md"></div>
                        <div className="skeleton w-64 h-4 rounded"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="card bg-white p-6 border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="skeleton w-16 h-5 rounded-lg"></div>
                                    <div className="skeleton w-20 h-5 rounded-xl"></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="skeleton w-3/4 h-5 rounded-md"></div>
                                    <div className="skeleton w-1/2 h-3.5 rounded"></div>
                                </div>
                                <div className="space-y-2 pt-3 border-t border-slate-100">
                                    <div className="skeleton w-full h-3 rounded"></div>
                                    <div className="skeleton w-full h-2 rounded-full"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timeline Table Card Skeleton */}
                <div className="card p-6 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                        <div className="skeleton w-44 h-6 rounded-md"></div>
                        <div className="flex gap-2">
                            <div className="skeleton w-36 h-8 rounded-xl"></div>
                            <div className="skeleton w-28 h-8 rounded-xl"></div>
                        </div>
                    </div>
                    <div className="space-y-3 pt-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                                <div className="space-y-1.5">
                                    <div className="skeleton w-40 h-4 rounded"></div>
                                    <div className="skeleton w-56 h-3 rounded"></div>
                                </div>
                                <div className="skeleton w-20 h-6 rounded-full"></div>
                            </div>
                        ))}
                    </div>
                </div>
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
                <div className="card p-6 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl flex items-center">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mr-4 shrink-0 border border-brand-100">
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

                <div className="card p-6 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl flex items-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mr-4 shrink-0 border border-emerald-100">
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

                <div className="card p-6 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl flex items-center">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mr-4 shrink-0 border border-rose-100">
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

                <div className="card p-6 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl flex items-center">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4 shrink-0 border border-indigo-100">
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center">
                        <BookOpen size={20} className="mr-2.5 text-brand-600" />
                        Course Attendance Breakdown
                    </h2>
                    <span className="text-xs text-slate-500 font-medium">
                        Minimum 80% attendance required for exam eligibility
                    </span>
                </div>

                {courses.length === 0 ? (
                    <div className="card text-center py-12 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl">
                        <BookOpen size={32} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 font-medium text-sm">You are not enrolled in any courses in this organization.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {courses.map(({ course, conducted, attended, percentage, isEligible }) => (
                            <div key={course._id} className="card bg-white p-6 border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl flex flex-col justify-between hover:shadow-[0_12px_35px_rgba(0,0,0,0.12)] transition duration-300">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-mono text-xs font-semibold tracking-wide text-slate-500 bg-slate-100/90 px-2.5 py-1 rounded-lg">
                                            {course.code}
                                        </span>
                                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-semibold select-none shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] ${
                                            isEligible 
                                                ? 'bg-white text-slate-700 border-slate-200/80' 
                                                : 'bg-rose-50/80 text-rose-700 border-rose-200/80'
                                        }`}>
                                            <span className={`inline-flex rounded-full h-2 w-2 ${isEligible ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                            <span>{isEligible ? 'Eligible' : 'At Risk'}</span>
                                        </div>
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
            <div className="card bg-white p-0 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 rounded-3xl">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                    <div>
                        <h3 className="text-base font-bold text-slate-800 flex items-center">
                            <CalendarClock size={18} className="mr-2 text-brand-600" />
                            Attendance History Log
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Complete record of your scanned sessions</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <div className="relative">
                            <div 
                                className="flex items-center justify-between gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer min-w-[140px]"
                                onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                            >
                                <div className="flex items-center">
                                    <Filter size={14} className="text-slate-400 mr-1.5" />
                                    <span className="truncate pr-2">
                                        {selectedCourse === 'all' ? 'All Courses' : (courses.find(c => c.course._id === selectedCourse)?.course.name || 'All Courses')}
                                    </span>
                                </div>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isCourseDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {isCourseDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsCourseDropdownOpen(false)}></div>
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-1 min-w-[180px] max-h-[200px] overflow-y-auto custom-scrollbar">
                                        <div 
                                            className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-brand-50 ${selectedCourse === 'all' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`}
                                            onClick={() => { setSelectedCourse('all'); setIsCourseDropdownOpen(false); }}
                                        >
                                            All Courses
                                        </div>
                                        {courses.map(c => (
                                            <div 
                                                key={c.course._id}
                                                className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-brand-50 truncate ${selectedCourse === c.course._id ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`}
                                                onClick={() => { setSelectedCourse(c.course._id); setIsCourseDropdownOpen(false); }}
                                            >
                                                {c.course.name}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="relative">
                            <div 
                                className="flex items-center justify-between gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer min-w-[120px]"
                                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                            >
                                <span className="truncate pr-2">
                                    {statusFilter === 'all' ? 'All Statuses' : statusFilter === 'PRESENT' ? 'Present' : 'Removed'}
                                </span>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {isStatusDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsStatusDropdownOpen(false)}></div>
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-1 min-w-[120px]">
                                        <div className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-brand-50 ${statusFilter === 'all' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`} onClick={() => { setStatusFilter('all'); setIsStatusDropdownOpen(false); }}>All Statuses</div>
                                        <div className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-brand-50 ${statusFilter === 'PRESENT' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`} onClick={() => { setStatusFilter('PRESENT'); setIsStatusDropdownOpen(false); }}>Present</div>
                                        <div className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-brand-50 ${statusFilter === 'REMOVED' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`} onClick={() => { setStatusFilter('REMOVED'); setIsStatusDropdownOpen(false); }}>Removed</div>
                                    </div>
                                </>
                            )}
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
                        <table className="table w-full text-xs">
                            <thead>
                                <tr>
                                    <th className="py-3 px-3.5 sm:px-6">Course</th>
                                    <th className="py-3 px-4 hidden sm:table-cell">Session Name</th>
                                    <th className="py-3 px-4 hidden md:table-cell">Date & Time</th>
                                    <th className="py-3 px-4 hidden sm:table-cell">Verification</th>
                                    <th className="py-3 px-3.5 sm:px-6 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map(record => (
                                    <tr key={record._id} className="hover:bg-slate-50/60 transition">
                                        <td className="py-3 sm:py-4 px-3.5 sm:px-6">
                                            <div className="font-bold text-slate-800 text-sm truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
                                                {record.courseId?.name || 'Course'}
                                            </div>
                                            <div className="text-xs font-mono text-slate-400 mt-0.5">
                                                {record.courseId?.code || ''}
                                            </div>
                                            <div className="sm:hidden text-[11px] text-slate-500 font-normal mt-1 flex items-center gap-1.5 flex-wrap">
                                                <span className="font-semibold text-slate-700">{record.sessionId?.sessionName || 'Lecture'}</span>
                                                <span>&bull;</span>
                                                <span>{new Date(record.markedAt || record.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                        </td>
                                        <td className="hidden sm:table-cell">
                                            <span className="font-medium text-slate-700 text-sm">
                                                {record.sessionId?.sessionName || 'Lecture Session'}
                                            </span>
                                        </td>
                                        <td className="text-slate-600 text-xs hidden md:table-cell">
                                            <div>{new Date(record.markedAt || record.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            <div className="text-slate-400 mt-0.5">{new Date(record.markedAt || record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td className="hidden sm:table-cell">
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
                                        <td className="py-3 sm:py-4 px-3.5 sm:px-6 text-right whitespace-nowrap">
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
