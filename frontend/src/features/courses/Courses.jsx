import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import { BookOpen, PlusCircle, Calendar, Users, GraduationCap, Clock, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import CreateCourseModal from './CreateCourseModal';

const Courses = () => {
    const { activeOrganization } = useOrganization();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTab, setActiveTab] = useState('ONGOING'); // 'ONGOING' | 'COMPLETED'

    const fetchCourses = async () => {
        if (!activeOrganization) return;
        try {
            setLoading(true);
            const res = await api.get(`/organizations/${activeOrganization._id}/courses`);
            setCourses(res.data);
        } catch (error) {
            console.error("Failed to fetch courses:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, [activeOrganization]);

    const handleCourseCreated = (newCourse) => {
        setCourses(prev => [newCourse, ...prev]);
    };

    const isOwnerOrAdmin = activeOrganization?.userRole === 'OWNER' || activeOrganization?.userRole === 'ADMIN';
    const isAttendee = activeOrganization?.userRole === 'ATTENDEE';

    // Normalize status: older records might have 'ACTIVE' or 'ARCHIVED'
    const normalizeStatus = (status) => {
        if (!status) return 'ONGOING';
        if (status === 'ACTIVE' || status === 'ONGOING') return 'ONGOING';
        if (status === 'COMPLETED' || status === 'ARCHIVED') return 'COMPLETED';
        return status;
    };

    const ongoingCourses = courses.filter(c => normalizeStatus(c.status) === 'ONGOING');
    const completedCourses = courses.filter(c => normalizeStatus(c.status) === 'COMPLETED');
    const currentList = activeTab === 'ONGOING' ? ongoingCourses : completedCourses;

    const formatDateRange = (start, end) => {
        if (!start && !end) return null;
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        if (start && end) {
            return `${new Date(start).toLocaleDateString(undefined, options)} - ${new Date(end).toLocaleDateString(undefined, options)}`;
        }
        if (start) return `From ${new Date(start).toLocaleDateString(undefined, options)}`;
        return `Until ${new Date(end).toLocaleDateString(undefined, options)}`;
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Top Bar: Tabs & Create Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
                {/* Tabs */}
                <div className="flex items-center space-x-2 bg-slate-100/80 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('ONGOING')}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition ${
                            activeTab === 'ONGOING'
                                ? 'bg-white text-brand-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Clock size={16} className="mr-2 text-emerald-600" />
                        Ongoing Courses
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                            activeTab === 'ONGOING' ? 'bg-brand-50 text-brand-700' : 'bg-slate-200/60 text-slate-600'
                        }`}>
                            {ongoingCourses.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('COMPLETED')}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition ${
                            activeTab === 'COMPLETED'
                                ? 'bg-white text-brand-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <CheckCircle2 size={16} className="mr-2 text-blue-600" />
                        Completed Courses
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                            activeTab === 'COMPLETED' ? 'bg-brand-50 text-brand-700' : 'bg-slate-200/60 text-slate-600'
                        }`}>
                            {completedCourses.length}
                        </span>
                    </button>
                </div>

                {/* Only Owner/Admin can create courses */}
                {isOwnerOrAdmin && (
                    <button 
                        className="btn btn-primary self-start sm:self-auto shadow-md shadow-brand-500/20"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <PlusCircle size={18} className="mr-2" />
                        Create Course
                    </button>
                )}
            </div>

            {/* Courses List */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400">
                    <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                    <span className="text-sm font-medium">Loading courses...</span>
                </div>
            ) : currentList.length === 0 ? (
                <div className="card text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
                    <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <BookOpen size={28} />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800 mb-1">
                        No {activeTab.toLowerCase()} courses found
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                        {isAttendee 
                            ? `You are not currently enrolled in any ${activeTab.toLowerCase()} courses.` 
                            : isOwnerOrAdmin 
                                ? activeTab === 'ONGOING' 
                                    ? "Get started by defining your first course offering for a batch and semester." 
                                    : "No courses have been marked as completed yet."
                                : `You do not have any assigned ${activeTab.toLowerCase()} courses.`
                        }
                    </p>
                    {isOwnerOrAdmin && activeTab === 'ONGOING' && (
                        <button className="btn btn-outline" onClick={() => setShowCreateModal(true)}>
                            <PlusCircle size={16} className="mr-1.5" />
                            Create First Course
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentList.map(course => {
                        const assignedInstructor = course.instructor || (course.instructors && course.instructors[0]);
                        const dateRangeText = formatDateRange(course.startDate, course.endDate);

                        return (
                            <Link 
                                to={`/app/courses/${course._id}`} 
                                key={course._id} 
                                className="group relative bg-white rounded-2xl border border-slate-200/80 hover:border-brand-400 hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-200 flex flex-col overflow-hidden"
                            >
                                {/* Top colored banner accent */}
                                <div className={`h-1.5 w-full ${
                                    normalizeStatus(course.status) === 'ONGOING' ? 'bg-emerald-500' : 'bg-slate-400'
                                }`} />

                                <div className="p-5 flex-1 flex flex-col">
                                    {/* Header: Code & Status */}
                                    <div className="flex justify-between items-start mb-2.5">
                                        <span className="font-mono text-xs font-bold px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg border border-brand-100/80">
                                            {course.code}
                                        </span>
                                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                            normalizeStatus(course.status) === 'ONGOING'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                                        }`}>
                                            {normalizeStatus(course.status)}
                                        </span>
                                    </div>

                                    {/* Course Title */}
                                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition mb-2 line-clamp-1">
                                        {course.name}
                                    </h3>

                                    {/* Badges: Batch & Semester */}
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {course.batch && (
                                            <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md">
                                                {course.batch}
                                            </span>
                                        )}
                                        {course.semester && (
                                            <span className="text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md border border-indigo-100">
                                                {course.semester}
                                            </span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">
                                        {course.description || "No description provided."}
                                    </p>

                                    {/* Details Grid */}
                                    <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                                        {/* Assigned Instructor */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400 flex items-center">
                                                <GraduationCap size={13} className="mr-1.5" /> Lecturer:
                                            </span>
                                            <span className="font-medium text-slate-800 truncate max-w-[170px]">
                                                {assignedInstructor?.userId?.firstName 
                                                    ? `${assignedInstructor.userId.firstName} ${assignedInstructor.userId.lastName || ''}`
                                                    : 'Unassigned'}
                                            </span>
                                        </div>

                                        {/* Date range if available */}
                                        {dateRangeText && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 flex items-center">
                                                    <Calendar size={13} className="mr-1.5" /> Term:
                                                </span>
                                                <span className="font-medium text-slate-700">
                                                    {dateRangeText}
                                                </span>
                                            </div>
                                        )}

                                        {/* Attendees Count */}
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-slate-400 flex items-center">
                                                <Users size={13} className="mr-1.5" /> Enrolled:
                                            </span>
                                            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                                {course.attendeesCount || 0} students
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && isOwnerOrAdmin && (
                <CreateCourseModal 
                    onClose={() => setShowCreateModal(false)} 
                    onCourseCreated={handleCourseCreated} 
                />
            )}
        </div>
    );
};

export default Courses;
