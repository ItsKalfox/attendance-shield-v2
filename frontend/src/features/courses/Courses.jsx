import { Link, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import { BookOpen, PlusCircle, Calendar, Users, GraduationCap, Search, Upload, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import CreateCourseModal from './CreateCourseModal';
import ImportCoursesModal from './ImportCoursesModal';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 8;

const Courses = () => {
    const { activeOrganization } = useOrganization();
    const location = useLocation();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [activeTab, setActiveTab] = useState('ONGOING'); // 'ONGOING' | 'COMPLETED'
    const [searchQuery, setSearchQuery] = useState('');
    const [coursePage, setCoursePage] = useState(1);

    useEffect(() => {
        if (location.state?.openCreate) {
            setShowCreateModal(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const fetchCourses = async () => {
        if (!activeOrganization) {
            setCourses([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setCourses([]);
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
    const tabList = activeTab === 'ONGOING' ? ongoingCourses : completedCourses;

    const filteredCourses = tabList.filter(course => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const name = (course.name || '').toLowerCase();
        const code = (course.code || '').toLowerCase();
        const batch = (course.batch || '').toLowerCase();
        const semester = (course.semester || '').toLowerCase();
        const instructor = course.instructor || (course.instructors && course.instructors[0]);
        const instructorName = `${instructor?.userId?.firstName || ''} ${instructor?.userId?.lastName || ''}`.toLowerCase();
        const coInstructorNames = (course.instructors || []).map(i => `${i?.userId?.firstName || ''} ${i?.userId?.lastName || ''}`.toLowerCase()).join(' ');
        return name.includes(q) || code.includes(q) || batch.includes(q) || semester.includes(q) || instructorName.includes(q) || coInstructorNames.includes(q);
    });

    const paginatedCourses = filteredCourses.slice((coursePage - 1) * PAGE_SIZE, coursePage * PAGE_SIZE);

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
            {/* Top Bar: Tabs, Search & Create Action */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                {/* Modern Pill Tabs */}
                <div className="flex space-x-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60 shadow-inner self-start">
                    <button
                        onClick={() => {
                            setActiveTab('ONGOING');
                            setCoursePage(1);
                        }}
                        className={`py-2 px-4 font-bold text-xs rounded-xl transition-all ${
                            activeTab === 'ONGOING'
                                ? 'bg-white text-brand-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Ongoing Courses
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('COMPLETED');
                            setCoursePage(1);
                        }}
                        className={`py-2 px-4 font-bold text-xs rounded-xl transition-all ${
                            activeTab === 'COMPLETED'
                                ? 'bg-white text-brand-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Completed Courses
                    </button>
                </div>

                {/* Search & Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:max-w-2xl justify-end">
                    <div className="relative flex-1 min-w-[240px] sm:min-w-[280px]">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search courses by name, code, batch..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCoursePage(1);
                            }}
                            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                        />
                    </div>

                    {/* Only Owner/Admin can create / bulk import courses */}
                    {isOwnerOrAdmin && (
                        <div className="flex items-center gap-2 shrink-0">
                            <button 
                                className="btn btn-secondary text-xs py-2 px-3.5 shadow-sm whitespace-nowrap"
                                onClick={() => setShowImportModal(true)}
                                title="Bulk Import Courses from CSV"
                            >
                                <Upload size={14} className="mr-1.5 text-brand-600" />
                                Bulk Import
                            </button>
                            <button 
                                className="btn btn-primary text-xs py-2 px-3.5 shadow-sm shadow-brand-500/20 whitespace-nowrap"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <PlusCircle size={14} className="mr-1.5" />
                                Create Course
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Courses List Skeleton / Content */}
            {loading ? (
                <div className="space-y-3.5">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="bg-white rounded-2xl md:rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-100">
                            <div className="flex-1 space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="skeleton w-16 h-5 rounded-lg"></div>
                                    <div className="skeleton w-14 h-5 rounded-md"></div>
                                    <div className="skeleton w-20 h-5 rounded-lg"></div>
                                </div>
                                <div className="skeleton w-2/3 h-5 rounded-md"></div>
                                <div className="skeleton w-1/2 h-3 rounded"></div>
                            </div>
                            <div className="flex items-center gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                                <div className="space-y-1 w-28">
                                    <div className="skeleton w-12 h-3 rounded"></div>
                                    <div className="skeleton w-24 h-4 rounded"></div>
                                </div>
                                <div className="space-y-1 w-20">
                                    <div className="skeleton w-12 h-3 rounded"></div>
                                    <div className="skeleton w-16 h-5 rounded"></div>
                                </div>
                                <div className="skeleton w-9 h-9 rounded-2xl"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : tabList.length === 0 ? (
                <div className="card text-center py-16 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 rounded-3xl">
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
            ) : filteredCourses.length === 0 ? (
                <div className="card text-center py-12 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 rounded-3xl text-slate-400 text-xs">
                    No {activeTab.toLowerCase()} courses match "{searchQuery}".
                </div>
            ) : (
                /* Full-width Horizontal Rectangular Cards List with Pagination */
                <div className="space-y-4">
                    <div className="space-y-3.5">
                        {paginatedCourses.map(course => {
                            const assignedInstructor = course.instructor || (course.instructors && course.instructors[0]);
                            const coordIdStr = (course.instructor?._id || course.instructor || '').toString();
                            const coInstructors = (course.instructors || []).filter(inst => {
                                const id = (inst?._id || inst || '').toString();
                                return id && id !== coordIdStr;
                            });
                            const dateRangeText = formatDateRange(course.startDate, course.endDate);

                            return (
                                <Link 
                                    to={`/app/courses/${course._id}`} 
                                    key={course._id} 
                                    className="group relative bg-white rounded-2xl md:rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] transition-all duration-200 border border-slate-100 hover:border-brand-200/80 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5"
                                >
                                    {/* Left section: Badges, Title, Description */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {course.batch && (
                                                <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md">
                                                    {course.batch}
                                                </span>
                                            )}
                                            {course.semester && (
                                                <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md">
                                                    {course.semester}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] font-semibold text-slate-600 select-none">
                                                {normalizeStatus(course.status) === 'ONGOING' ? (
                                                    <>
                                                        <span className="relative flex h-2 w-2 mr-0.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                        </span>
                                                        <span>Ongoing</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="inline-flex rounded-full h-2 w-2 bg-slate-400 mr-0.5"></span>
                                                        <span>Completed</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-base md:text-lg font-bold text-slate-900 group-hover:text-brand-600 transition flex items-center flex-wrap gap-2">
                                                <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md shrink-0 select-none">
                                                    {course.code}
                                                </span>
                                                <span className="truncate">{course.name}</span>
                                            </h3>
                                            {course.description && (
                                                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                                    {course.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right section: Lecturer, Term, Enrolled, Action Arrow */}
                                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                                        {/* Coordinator & Co-Instructors */}
                                        <div className="min-w-[120px] max-w-[170px]">
                                            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
                                                <GraduationCap size={12} /> Coordinator
                                            </div>
                                            <div className="text-xs font-semibold text-slate-800 truncate">
                                                {assignedInstructor?.userId?.firstName 
                                                    ? `${assignedInstructor.userId.firstName} ${assignedInstructor.userId.lastName || ''}`.trim()
                                                    : 'Unassigned'}
                                            </div>
                                            {coInstructors.length > 0 && (
                                                <div className="text-[10px] text-brand-600 font-medium">
                                                    +{coInstructors.length} additional
                                                </div>
                                            )}
                                        </div>

                                        {/* Term Date Range (visible on desktop) */}
                                        {dateRangeText && (
                                            <div className="hidden lg:block min-w-[130px]">
                                                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
                                                    <Calendar size={12} /> Term
                                                </div>
                                                <div className="text-xs font-semibold text-slate-700 truncate">
                                                    {dateRangeText}
                                                </div>
                                            </div>
                                        )}

                                        {/* Enrolled Students */}
                                        <div className="min-w-[90px]">
                                            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
                                                <Users size={12} /> Enrolled
                                            </div>
                                            <div className="text-xs font-bold text-slate-900 bg-slate-100/90 px-2.5 py-0.5 rounded-lg inline-block">
                                                {course.attendeesCount || 0} students
                                            </div>
                                        </div>

                                        {/* Action Arrow */}
                                        <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-2xl bg-slate-50 group-hover:bg-brand-50 group-hover:text-brand-600 text-slate-400 transition ml-2 border border-slate-200/60">
                                            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Pagination Footer */}
                    <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
                        <Pagination 
                            currentPage={coursePage}
                            totalItems={filteredCourses.length}
                            pageSize={PAGE_SIZE}
                            onPageChange={setCoursePage}
                            itemName="courses"
                        />
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && isOwnerOrAdmin && (
                <CreateCourseModal 
                    onClose={() => setShowCreateModal(false)} 
                    onCourseCreated={handleCourseCreated} 
                />
            )}

            {/* Bulk Import Courses Modal */}
            {showImportModal && isOwnerOrAdmin && (
                <ImportCoursesModal 
                    onClose={() => setShowImportModal(false)} 
                    onCoursesImported={fetchCourses} 
                />
            )}
        </div>
    );
};

export default Courses;
