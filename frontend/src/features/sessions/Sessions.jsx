import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext';
import { CalendarClock, PlusCircle, Search, Clock, ArrowRight, Filter, ChevronDown, BookOpen } from 'lucide-react';
import api from '../../services/api';
import CreateSessionModal from './CreateSessionModal';
import QRCodeModal from './QRCodeModal';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 20;

const Sessions = () => {
    const { activeOrganization } = useOrganization();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const tabFromParam = searchParams.get('tab');
    const tabFromState = location.state?.tab || location.state?.fromTab;
    const initialTab = (tabFromParam === 'past' || tabFromState === 'past') ? 'past' : 'active';
    
    const [sessions, setSessions] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createdQrToken, setCreatedQrToken] = useState(null);
    const [createdSession, setCreatedSession] = useState(null);
    const [activeTab, setActiveTab] = useState(initialTab); // 'active' | 'past'
    const [sessionSearch, setSessionSearch] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('ALL');
    const [selectedLectureType, setSelectedLectureType] = useState('ALL');
    const [sessionPage, setSessionPage] = useState(1);
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
    const [isLectureTypeDropdownOpen, setIsLectureTypeDropdownOpen] = useState(false);

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        const tabState = location.state?.tab || location.state?.fromTab;
        if (tabParam === 'past' || tabState === 'past') {
            setActiveTab('past');
        } else if (tabParam === 'active' || tabState === 'active') {
            setActiveTab('active');
        }
    }, [searchParams, location.state]);

    useEffect(() => {
        if (location.state?.openCreate) {
            setShowCreateModal(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    useEffect(() => {
        const fetchSessionsData = async () => {
            if (!activeOrganization) {
                setSessions([]);
                setCourses([]);
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setSessions([]);
                const [sessionsRes, coursesRes] = await Promise.all([
                    api.get(`/organizations/${activeOrganization._id}/sessions`),
                    api.get(`/organizations/${activeOrganization._id}/courses`).catch(() => ({ data: [] }))
                ]);
                setSessions(sessionsRes.data || []);
                setCourses(coursesRes.data || []);
            } catch (error) {
                console.error("Failed to fetch sessions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSessionsData();
    }, [activeOrganization]);

    const handleSessionCreated = (data) => {
        setSessions(prev => [data.session, ...prev]);
        setCreatedQrToken(data.qrToken);
        setCreatedSession(data.session);
    };

    // Dynamic list of unique courses
    const allCoursesList = useMemo(() => {
        const map = new Map();
        (courses || []).forEach(c => {
            if (c?._id) map.set(c._id.toString(), c);
        });
        (sessions || []).forEach(s => {
            if (s.courseId?._id && !map.has(s.courseId._id.toString())) {
                map.set(s.courseId._id.toString(), s.courseId);
            }
        });
        return Array.from(map.values()).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    }, [courses, sessions]);

    const selectedCourse = allCoursesList.find(c => c._id === selectedCourseId);

    if (loading) {
        return (
            <div className="animate-fade-in space-y-6">
                {/* Top Bar Skeleton */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex space-x-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
                        <div className="skeleton w-28 h-8 rounded-xl"></div>
                        <div className="skeleton w-28 h-8 rounded-xl"></div>
                    </div>
                    <div className="skeleton w-32 h-8 rounded-xl"></div>
                </div>

                {/* Sessions Table Card Container Skeleton */}
                <div className="bg-white rounded-3xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden">
                    {/* Header bar / Search Skeleton */}
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                        <div className="skeleton w-48 h-8 rounded-xl"></div>
                        <div className="skeleton w-64 h-8 rounded-xl"></div>
                    </div>

                    {/* Table Skeleton */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 border-b border-slate-100">
                                <tr>
                                    <th className="py-3.5 px-6"><div className="skeleton w-16 h-4"></div></th>
                                    <th className="py-3.5 px-6"><div className="skeleton w-24 h-4"></div></th>
                                    <th className="py-3.5 px-6"><div className="skeleton w-24 h-4"></div></th>
                                    <th className="py-3.5 px-6"><div className="skeleton w-28 h-4"></div></th>
                                    <th className="py-3.5 px-6"><div className="skeleton w-16 h-4"></div></th>
                                    <th className="py-3.5 px-6 text-right"><div className="skeleton w-16 h-4 ml-auto"></div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <tr key={i}>
                                        <td className="py-4 px-6">
                                            <div className="skeleton w-20 h-6 rounded-full"></div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="skeleton w-36 h-4 mb-1.5"></div>
                                            <div className="skeleton w-20 h-3"></div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="skeleton w-24 h-4"></div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="skeleton w-32 h-4 mb-1"></div>
                                            <div className="skeleton w-20 h-3"></div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center space-x-2">
                                                <div className="skeleton w-7 h-7 rounded-full"></div>
                                                <div className="skeleton w-20 h-4"></div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="skeleton w-24 h-7 rounded-xl ml-auto"></div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // Dynamic list of unique lecture types
    const availableLectureTypes = Array.from(
        new Set(sessions.map(s => s.lectureType).filter(Boolean))
    ).sort();
    const standardTypes = ['Lecture', 'Practical', 'Tutorial', 'Lab', 'Workshop', 'Seminar', 'Exam'];
    const allLectureTypeOptions = Array.from(new Set([...standardTypes, ...availableLectureTypes]));

    // Filter by Active vs Past tabs
    const tabSessions = sessions
        .filter(session => {
            if (activeTab === 'active') {
                return session.status === 'SCHEDULED' || session.status === 'ACTIVE' || session.status === 'PENDING_CONFIRMATION';
            } else {
                return session.status === 'CONFIRMED' || session.status === 'CANCELLED';
            }
        })
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)); // Descending order: newest first

    // Filter by live search query, course, and lecture type
    const filteredSessions = tabSessions.filter(session => {
        // Course filter
        if (selectedCourseId !== 'ALL') {
            const courseId = session.courseId?._id || session.courseId;
            if (courseId !== selectedCourseId) {
                return false;
            }
        }

        // Lecture Type filter
        if (selectedLectureType !== 'ALL' && (session.lectureType || 'Lecture') !== selectedLectureType) {
            return false;
        }

        if (!sessionSearch.trim()) return true;
        const q = sessionSearch.toLowerCase();
        const courseName = (session.courseId?.name || '').toLowerCase();
        const courseCode = (session.courseId?.code || '').toLowerCase();
        const type = (session.lectureType || '').toLowerCase();
        const status = (session.status || '').toLowerCase();
        const instructor = `${session.instructorId?.userId?.firstName || ''} ${session.instructorId?.userId?.lastName || ''}`.toLowerCase();
        return courseName.includes(q) || courseCode.includes(q) || type.includes(q) || status.includes(q) || instructor.includes(q);
    });

    const paginatedSessions = filteredSessions.slice((sessionPage - 1) * PAGE_SIZE, sessionPage * PAGE_SIZE);

    const isOwnerOrInstructor = activeOrganization?.userRole === 'OWNER' || activeOrganization?.userRole === 'INSTRUCTOR';

    return (
        <>
        <div className="animate-fade-in space-y-6">
            {/* Top Bar: Tabs & Create Action */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {/* Modern Pill Tabs */}
                <div className="flex space-x-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
                    <button 
                        className={`py-2 px-4 font-bold text-xs rounded-xl transition-all ${
                            activeTab === 'active' 
                                ? 'bg-white text-brand-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                        onClick={() => {
                            setActiveTab('active');
                            setSessionPage(1);
                            setSearchParams({}, { replace: true });
                        }}
                    >
                        Active Sessions
                    </button>
                    <button 
                        className={`py-2 px-4 font-bold text-xs rounded-xl transition-all ${
                            activeTab === 'past' 
                                ? 'bg-white text-brand-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                        onClick={() => {
                            setActiveTab('past');
                            setSessionPage(1);
                            setSearchParams({ tab: 'past' }, { replace: true });
                        }}
                    >
                        Past Sessions
                    </button>
                </div>

                {isOwnerOrInstructor && (
                    <button 
                        className="btn btn-primary text-xs py-2 px-3.5 shadow-sm shadow-brand-500/20" 
                        onClick={() => setShowCreateModal(true)}
                    >
                        <PlusCircle size={14} className="mr-1.5" />
                        Create Session
                    </button>
                )}
            </div>

            {/* Sessions Table Card Container */}
            <div className="bg-white rounded-3xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden">
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 flex items-center">
                            <CalendarClock size={18} className="mr-2 text-brand-600" />
                            {activeTab === 'active' ? 'Active Sessions' : 'Past Sessions'} ({tabSessions.length})
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {activeTab === 'active' 
                                ? 'Monitor live attendance and verify scheduled class sessions' 
                                : 'Historical record of completed and concluded attendance sessions'}
                        </p>
                    </div>
                </div>

                {/* Search Bar, Course Filter & Lecture Type Filter */}
                <div className="px-5 py-3.5 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search sessions by course, code, lecturer, type..."
                            value={sessionSearch}
                            onChange={(e) => {
                                setSessionSearch(e.target.value);
                                setSessionPage(1);
                            }}
                            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                        />
                    </div>

                    {/* Filter Dropdowns container: in the same line as lecture type below search bar on mobile */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Course Filter Dropdown (to the left of lecture type) */}
                        <div className="relative flex-1 sm:flex-initial">
                            <div 
                                className="pl-8 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition cursor-pointer shadow-sm flex items-center justify-between min-w-[130px] sm:min-w-[170px] max-w-[180px] sm:max-w-[220px]"
                                onClick={() => {
                                    setIsCourseDropdownOpen(!isCourseDropdownOpen);
                                    setIsLectureTypeDropdownOpen(false);
                                }}
                            >
                                <BookOpen size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <span className="truncate">
                                    {selectedCourse ? `${selectedCourse.code} - ${selectedCourse.name}` : 'All Courses'}
                                </span>
                                <ChevronDown size={13} className={`text-slate-400 shrink-0 transition-transform ${isCourseDropdownOpen ? 'rotate-180' : ''} absolute right-2.5 top-1/2 -translate-y-1/2`} />
                            </div>
                            {isCourseDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsCourseDropdownOpen(false)}></div>
                                    <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 min-w-[220px] max-w-[280px] max-h-[220px] overflow-y-auto custom-scrollbar">
                                        <div 
                                            className={`px-3 py-2 text-xs cursor-pointer hover:bg-brand-50 ${selectedCourseId === 'ALL' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`}
                                            onClick={() => { setSelectedCourseId('ALL'); setSessionPage(1); setIsCourseDropdownOpen(false); }}
                                        >
                                            All Courses
                                        </div>
                                        {allCoursesList.map(c => (
                                            <div 
                                                key={c._id}
                                                className={`px-3 py-2 text-xs cursor-pointer hover:bg-brand-50 flex items-center justify-between gap-2 ${selectedCourseId === c._id ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-700'}`}
                                                onClick={() => { setSelectedCourseId(c._id); setSessionPage(1); setIsCourseDropdownOpen(false); }}
                                                title={`${c.code} - ${c.name}`}
                                            >
                                                <span className="font-mono font-bold shrink-0">{c.code}</span>
                                                <span className="truncate text-slate-500 text-[11px]">{c.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Lecture Type Filter dropdown */}
                        <div className="relative flex-1 sm:flex-initial">
                            <div 
                                className="pl-8 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition cursor-pointer shadow-sm flex items-center justify-between min-w-[125px] sm:min-w-[150px]"
                                onClick={() => {
                                    setIsLectureTypeDropdownOpen(!isLectureTypeDropdownOpen);
                                    setIsCourseDropdownOpen(false);
                                }}
                            >
                                <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <span className="truncate">{selectedLectureType === 'ALL' ? 'All Lecture Types' : selectedLectureType}</span>
                                <ChevronDown size={13} className={`text-slate-400 shrink-0 transition-transform ${isLectureTypeDropdownOpen ? 'rotate-180' : ''} absolute right-2.5 top-1/2 -translate-y-1/2`} />
                            </div>
                            {isLectureTypeDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsLectureTypeDropdownOpen(false)}></div>
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 min-w-[180px] max-h-[220px] overflow-y-auto custom-scrollbar">
                                        <div 
                                            className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-brand-50 ${selectedLectureType === 'ALL' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`}
                                            onClick={() => { setSelectedLectureType('ALL'); setSessionPage(1); setIsLectureTypeDropdownOpen(false); }}
                                        >
                                            All Lecture Types
                                        </div>
                                        {allLectureTypeOptions.map(type => (
                                            <div 
                                                key={type}
                                                className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-brand-50 ${selectedLectureType === type ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`}
                                                onClick={() => { setSelectedLectureType(type); setSessionPage(1); setIsLectureTypeDropdownOpen(false); }}
                                            >
                                                {type}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table / Empty State */}
                {tabSessions.length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mb-3">
                            <CalendarClock size={24} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 mb-1">
                            No {activeTab === 'active' ? 'Active' : 'Past'} Sessions found
                        </h4>
                        <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto">
                            {activeTab === 'active' 
                                ? 'No attendance sessions are currently running or scheduled.' 
                                : 'No completed attendance sessions have been recorded yet.'}
                        </p>
                        {activeTab === 'active' && isOwnerOrInstructor && (
                            <button className="btn btn-primary text-xs py-2 px-3.5 shadow-sm shadow-brand-500/20" onClick={() => setShowCreateModal(true)}>
                                <PlusCircle size={14} className="mr-1.5" /> Start Attendance Session
                            </button>
                        )}
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                        No {activeTab === 'active' ? 'active' : 'past'} sessions match your filters.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-3.5 sm:px-5">Course</th>
                                        <th className="py-3 px-4 hidden md:table-cell">Format</th>
                                        <th className="py-3 px-3.5 sm:px-4">Status</th>
                                        <th className="py-3 px-4 hidden lg:table-cell">Lecturer</th>
                                        <th className="py-3 px-4 hidden sm:table-cell">Start Time</th>
                                        <th className="py-3 px-4 hidden xl:table-cell">Expires</th>
                                        <th className="py-3 px-3.5 sm:px-5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {paginatedSessions.map(session => {
                                        const instructorName = `${session.instructorId?.userId?.firstName || ''} ${session.instructorId?.userId?.lastName || ''}`.trim() || 'Assigned Lecturer';

                                        return (
                                            <tr key={session._id} className="hover:bg-slate-50/60 transition group">
                                                <td className="py-3 sm:py-3.5 px-3.5 sm:px-5">
                                                    <div className="font-semibold text-slate-900 group-hover:text-brand-600 transition truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
                                                        {session.courseId?.name || 'Untitled Course'}
                                                    </div>
                                                    <div className="font-mono text-[11px] text-slate-400 font-normal mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                        <span>{session.courseId?.code || '-'}</span>
                                                        <span className="md:hidden font-sans font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                                                            {session.lectureType || 'Lecture'}
                                                        </span>
                                                        <span className="sm:hidden font-sans text-[10px] text-slate-400">
                                                            &bull; {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 hidden md:table-cell">
                                                    <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                                        {session.lectureType || 'Lecture'}
                                                    </span>
                                                </td>
                                                <td className="py-3 sm:py-3.5 px-3.5 sm:px-4">
                                                    {session.status === 'SCHEDULED' && (
                                                        <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                                                            Scheduled
                                                        </span>
                                                    )}
                                                    {session.status === 'ACTIVE' && (
                                                        <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap">
                                                            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 mr-1 sm:mr-1.5">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
                                                            </span>
                                                            Active
                                                        </span>
                                                    )}
                                                    {session.status === 'PENDING_CONFIRMATION' && (
                                                        <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 whitespace-nowrap">
                                                            Pending
                                                        </span>
                                                    )}
                                                    {session.status === 'CONFIRMED' && (
                                                        <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60 whitespace-nowrap">
                                                            Confirmed
                                                        </span>
                                                    )}
                                                    {session.status === 'CANCELLED' && (
                                                        <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100 whitespace-nowrap">
                                                            Cancelled
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-700 hidden lg:table-cell">
                                                    {instructorName}
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-500 hidden sm:table-cell">
                                                    {new Date(session.startTime).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-500 hidden xl:table-cell">
                                                    {session.expiresAt ? new Date(session.expiresAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                                                </td>
                                                <td className="py-3 sm:py-3.5 px-3.5 sm:px-5 text-right whitespace-nowrap">
                                                    <Link 
                                                        to={`/app/sessions/${session._id}`} 
                                                        state={{ fromTab: activeTab }}
                                                        className="inline-flex items-center px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:scale-95 shadow-sm rounded-xl transition border border-slate-200/80"
                                                    >
                                                        <span className="hidden sm:inline">Manage</span>
                                                        <span className="sm:hidden text-[11px]">View</span>
                                                        <ArrowRight size={13} className="ml-1 text-slate-400" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pagination 
                            currentPage={sessionPage}
                            totalItems={filteredSessions.length}
                            pageSize={PAGE_SIZE}
                            onPageChange={setSessionPage}
                            itemName="sessions"
                        />
                    </>
                )}
            </div>
        </div>
        
        {showCreateModal && (
            <CreateSessionModal 
                onClose={() => setShowCreateModal(false)} 
                onSessionCreated={handleSessionCreated} 
            />
        )}

        {createdQrToken && (
            <QRCodeModal 
                qrToken={createdQrToken} 
                session={createdSession} 
                onClose={() => {
                    setCreatedQrToken(null);
                    setCreatedSession(null);
                }} 
            />
        )}
        </>
    );
};

export default Sessions;
