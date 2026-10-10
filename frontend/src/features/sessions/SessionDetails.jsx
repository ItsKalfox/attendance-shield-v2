import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext';
import api from '../../services/api';
import { ArrowLeft, Users, CheckCircle, Clock, Copy, Check, Flag, Trash2, Download, RefreshCw, MoreVertical, Search, ArrowUp, Info } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { io } from 'socket.io-client';

const CircleChart = ({ percentage }) => {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
        <div className="relative flex items-center justify-center h-20 w-20">
            <svg className="transform -rotate-90 w-20 h-20">
                <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    className="text-slate-100"
                />
                <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="text-brand-500 transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-sm font-bold text-slate-800">{percentage}%</span>
            </div>
        </div>
    );
};

const SessionDetails = () => {
    const { sessionId } = useParams();
    const { activeOrganization } = useOrganization();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [session, setSession] = useState(null);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [manualUserId, setManualUserId] = useState('');
    const [manualLoading, setManualLoading] = useState(false);
    const [members, setMembers] = useState([]);
    const [copied, setCopied] = useState(false);
    const { user } = useAuth();
    const [confirmModalConfig, setConfirmModalConfig] = useState({ isOpen: false, type: '', message: '', recordId: null });
    const [includeFlagged, setIncludeFlagged] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // New states
    const [stats, setStats] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [totalMatchingRecords, setTotalMatchingRecords] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [showGoToTop, setShowGoToTop] = useState(false);
    const [manualSearch, setManualSearch] = useState('');
    const [isManualDropdownOpen, setIsManualDropdownOpen] = useState(false);
    const [activeInfoRecordId, setActiveInfoRecordId] = useState(null);
    const loaderRef = React.useRef(null);

    const fetchStats = async () => {
        if (!activeOrganization) return;
        try {
            const res = await api.get(`/organizations/${activeOrganization._id}/sessions/${sessionId}/attendance/stats?includeFlagged=${includeFlagged}`);
            setStats(res.data);
        } catch (error) { console.error("Failed to fetch stats", error); }
    };

    const fetchRecords = async (pageNum, search) => {
        if (!activeOrganization) return;
        try {
            const res = await api.get(`/organizations/${activeOrganization._id}/sessions/${sessionId}/attendance?page=${pageNum}&limit=50&search=${search}`);
            if (pageNum === 1) {
                setAttendanceRecords(res.data.records);
            } else {
                setAttendanceRecords(prev => [...prev, ...res.data.records]);
            }
            if (res.data.totalRecords !== undefined) {
                setTotalMatchingRecords(res.data.totalRecords);
            }
            setHasMore(res.data.currentPage < res.data.totalPages);
        } catch (error) { console.error("Failed to fetch records", error); }
    };

    const fetchDetails = async () => {
        if (!activeOrganization) return;
        try {
            setLoading(true);
            const sessionRes = await api.get(`/organizations/${activeOrganization._id}/sessions/${sessionId}`);
            setSession(sessionRes.data);
            
            const membersRes = await api.get(`/organizations/${activeOrganization._id}/courses/${sessionRes.data.courseId._id}/members`);
            setMembers(membersRes.data);

            await fetchStats();
        } catch (error) {
            console.error("Failed to load session details", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeOrganization) fetchDetails();
    }, [activeOrganization, sessionId]);

    useEffect(() => {
        if (activeOrganization) fetchStats();
    }, [includeFlagged]);

    useEffect(() => {
        if (!activeOrganization) return;
        const timer = setTimeout(() => {
            setPage(1);
            fetchRecords(1, searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, activeOrganization]);

    useEffect(() => {
        if (!activeOrganization || page === 1) return;
        fetchRecords(page, searchQuery);
    }, [page]);

    // Infinite Scroll Observer
    useEffect(() => {
        if (!loaderRef.current || !hasMore || loading) return;
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                setPage(p => p + 1);
            }
        }, { threshold: 0.1 });
        observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [hasMore, loading]);

    // Go to top listener
    useEffect(() => {
        const handleScroll = () => {
            setShowGoToTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // WebSockets
    useEffect(() => {
        const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        const socket = io(socketUrl, { withCredentials: true });

        socket.on('connect', () => socket.emit('join_session', sessionId));

        socket.on('attendance_updated', (newRecord) => {
            setAttendanceRecords(prev => {
                const exists = prev.some(r => r._id === newRecord._id);
                if (exists) return prev.map(r => r._id === newRecord._id ? newRecord : r);
                return [newRecord, ...prev];
            });
            fetchStats();
        });

        socket.on('attendance_removed', (recordId) => {
            setAttendanceRecords(prev => prev.filter(r => r._id !== recordId));
            fetchStats();
        });

        return () => socket.disconnect();
    }, [activeOrganization, sessionId]);

    const handleConfirmSession = () => {
        setConfirmModalConfig({
            isOpen: true,
            type: 'confirm',
            message: 'Are you sure you want to confirm this session? This will lock attendance and prevent further modifications.'
        });
    };

    const executeConfirmSession = async () => {
        try {
            await api.post(`/organizations/${activeOrganization._id}/sessions/${sessionId}/confirm`);
            const sessionRes = await api.get(`/organizations/${activeOrganization._id}/sessions/${sessionId}`);
            setSession(sessionRes.data);
            setConfirmModalConfig({ isOpen: false, type: '', message: '', recordId: null });
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to confirm session');
        }
    };

    const handleDeleteSession = async () => {
        setConfirmModalConfig({
            isOpen: true,
            type: 'delete',
            message: 'Are you sure you want to delete this session? This action cannot be undone.'
        });
    };

    const isPastSession = session && (session.status === 'CONFIRMED' || session.status === 'CANCELLED');
    const targetTab = location.state?.fromTab || (isPastSession ? 'past' : 'active');
    const backUrl = targetTab === 'past' ? '/app/sessions?tab=past' : '/app/sessions';

    const executeDelete = async () => {
        try {
            await api.delete(`/organizations/${activeOrganization._id}/sessions/${sessionId}`);
            navigate(backUrl, { state: { tab: targetTab } });
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete session');
        }
    };

    const handleRemoveAttendance = (recordId) => {
        setConfirmModalConfig({
            isOpen: true,
            type: 'remove_attendance',
            message: 'Are you sure you want to remove this attendance record?',
            recordId: recordId
        });
    };

    const executeRemoveAttendance = async () => {
        try {
            await api.delete(`/organizations/${activeOrganization._id}/sessions/${sessionId}/attendance/${confirmModalConfig.recordId}`);
            fetchStats();
            setAttendanceRecords(prev => prev.filter(r => r._id !== confirmModalConfig.recordId));
            setConfirmModalConfig({ isOpen: false, type: '', message: '', recordId: null });
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to remove attendance');
        }
    };

    const handleManualMark = async (e) => {
        e.preventDefault();
        if (!manualUserId) return;

        // Duplicate check on frontend
        const alreadyMarked = attendanceRecords.some(r => r.userId?._id === manualUserId && r.status === 'PRESENT');
        if (alreadyMarked) {
            alert('This student is already marked as PRESENT.');
            return;
        }

        setManualLoading(true);
        try {
            await api.post(`/organizations/${activeOrganization._id}/sessions/${sessionId}/attendance/manual`, {
                userId: manualUserId
            });
            setManualUserId('');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to mark attendance manually.');
        } finally {
            setManualLoading(false);
        }
    };

    if (loading) return (
        <div className="animate-fade-in space-y-6">
            {/* Top Back & Header Skeleton */}
            <div className="skeleton w-36 h-5 rounded-lg mb-6"></div>

            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <div className="w-full sm:w-auto space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="skeleton w-56 sm:w-72 h-8 rounded-xl"></div>
                        <div className="skeleton w-20 h-6 rounded-full"></div>
                    </div>
                    <div className="flex justify-between items-center w-full">
                        <div className="skeleton w-48 sm:w-64 h-4 rounded-md"></div>
                        <div className="skeleton w-7 h-7 rounded-full sm:hidden"></div>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <div className="skeleton w-36 h-9 rounded-xl"></div>
                    <div className="skeleton w-8 h-8 rounded-full"></div>
                </div>
            </div>

            {/* Main 2-Column Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left/Main Column: Order 2 on mobile, Order 1 on desktop */}
                <div className="lg:col-span-2 flex flex-col gap-6 order-2 lg:order-1">
                    {/* Stats Card Skeleton */}
                    <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 gap-6 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl">
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="skeleton w-20 h-20 rounded-full shrink-0"></div>
                            <div className="space-y-2">
                                <div className="skeleton w-36 h-5 rounded-md"></div>
                                <div className="flex items-center gap-3">
                                    <div className="skeleton w-24 h-4 rounded"></div>
                                    <div className="skeleton w-20 h-4 rounded"></div>
                                    <div className="skeleton w-20 h-4 rounded"></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <div className="skeleton w-28 h-5 rounded-md"></div>
                            <div className="skeleton w-28 h-8 rounded-xl"></div>
                        </div>
                    </div>

                    {/* Mobile Contextual Confirm Button Skeleton */}
                    <div className="sm:hidden w-full">
                        <div className="skeleton w-full h-11 rounded-xl"></div>
                    </div>

                    {/* Records Table Card Skeleton */}
                    <div className="card bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div className="skeleton w-48 h-6 rounded-md"></div>
                            <div className="skeleton w-full sm:w-64 h-9 rounded-xl"></div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-slate-100">
                                    <tr>
                                        <th className="py-3 px-2.5 sm:px-6"><div className="skeleton w-16 h-4 rounded"></div></th>
                                        <th className="py-3 px-4 hidden sm:table-cell"><div className="skeleton w-20 h-4 rounded"></div></th>
                                        <th className="py-3 px-2 sm:px-6"><div className="skeleton w-16 h-4 rounded"></div></th>
                                        <th className="py-3 px-4 hidden md:table-cell"><div className="skeleton w-20 h-4 rounded"></div></th>
                                        <th className="py-3 px-4 hidden sm:table-cell"><div className="skeleton w-14 h-4 rounded"></div></th>
                                        <th className="py-3 px-2 sm:px-6 text-right"><div className="skeleton w-10 h-4 rounded ml-auto"></div></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <tr key={i}>
                                            <td className="py-3.5 px-2.5 sm:px-6">
                                                <div className="skeleton w-28 sm:w-36 h-4 rounded mb-1"></div>
                                                <div className="skeleton w-16 h-3 rounded sm:hidden"></div>
                                            </td>
                                            <td className="py-3.5 px-4 hidden sm:table-cell">
                                                <div className="skeleton w-20 h-4 rounded"></div>
                                            </td>
                                            <td className="py-3.5 px-2 sm:px-6">
                                                <div className="skeleton w-16 h-5 rounded-full"></div>
                                            </td>
                                            <td className="py-3.5 px-4 hidden md:table-cell">
                                                <div className="skeleton w-14 h-4 rounded"></div>
                                            </td>
                                            <td className="py-3.5 px-4 hidden sm:table-cell">
                                                <div className="skeleton w-16 h-4 rounded"></div>
                                            </td>
                                            <td className="py-3.5 px-2 sm:px-6 text-right">
                                                <div className="skeleton w-6 h-6 rounded-lg ml-auto"></div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column: Order 1 on mobile, Order 2 on desktop */}
                <div className="order-1 lg:order-2">
                    <div className="card bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl p-6 flex flex-col">
                        {/* Session Details + QR section (Order 1 on mobile, Order 2 on desktop) */}
                        <div className="order-1 lg:order-2 flex flex-col lg:mt-6 lg:pt-6 lg:border-t lg:border-slate-100">
                            <div className="skeleton w-36 h-6 rounded-md mb-4"></div>
                            <div className="space-y-4 mb-6 lg:mb-0">
                                <div>
                                    <div className="skeleton w-20 h-3 rounded mb-1.5"></div>
                                    <div className="skeleton w-28 h-4 rounded"></div>
                                </div>
                                <div>
                                    <div className="skeleton w-20 h-3 rounded mb-1.5"></div>
                                    <div className="skeleton w-24 h-4 rounded"></div>
                                </div>
                                <div>
                                    <div className="skeleton w-16 h-3 rounded mb-1.5"></div>
                                    <div className="skeleton w-32 h-4 rounded"></div>
                                </div>
                                <div>
                                    <div className="skeleton w-36 h-3 rounded mb-1.5"></div>
                                    <div className="skeleton w-40 h-4 rounded"></div>
                                </div>

                                {/* QR Code section skeleton */}
                                <div className="mt-6 border-t border-slate-100 pt-6">
                                    <div className="skeleton w-36 h-4 rounded mb-3"></div>
                                    <div className="skeleton w-[150px] h-[150px] rounded-xl mb-4"></div>
                                    <div className="skeleton w-full h-9 rounded-lg mb-3"></div>
                                    <div className="skeleton w-full h-9 rounded-xl"></div>
                                </div>
                            </div>
                        </div>

                        {/* Manual Override section skeleton (Order 2 on mobile, Order 1 on desktop) */}
                        <div className="order-2 lg:order-1 border-t lg:border-t-0 border-slate-100 pt-6 lg:pt-0">
                            <div className="skeleton w-32 h-5 rounded-md mb-3"></div>
                            <div className="space-y-3">
                                <div className="skeleton w-full h-10 rounded-xl"></div>
                                <div className="skeleton w-full h-9 rounded-xl"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
    if (!session) return <div className="p-4">Session not found</div>;

    const qrUrl = `${window.location.origin}/attend/${session.qrToken || ''}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(qrUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const exportToPDF = async () => {
        if (!session) return;
        
        try {
            const allRecordsRes = await api.get(`/organizations/${activeOrganization._id}/sessions/${sessionId}/attendance?limit=10000`);
            const allRecords = allRecordsRes.data.records;
            
            const doc = new jsPDF();
            
            doc.setFontSize(18);
            doc.text('Attendance Report', 14, 22);
            
            const headerTableData = [
                ['Course Code', session.courseId?.code || '-', 'Session Type', session.lectureType || '-'],
                ['Course Title', session.courseId?.name || '-', 'Instructor', `${session.instructorId?.userId?.firstName || ''} ${session.instructorId?.userId?.lastName || ''}`.trim()],
                ['Date', new Date(session.startTime).toLocaleDateString(), 'Time', `${new Date(session.startTime).toLocaleTimeString()} - ${new Date(session.expiresAt).toLocaleTimeString()}`],
            ];

            autoTable(doc, {
                startY: 28,
                body: headerTableData,
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 3, textColor: 0, lineColor: 0, lineWidth: 0.1, fillColor: 255 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35 },
                    1: { cellWidth: 55 },
                    2: { fontStyle: 'bold', cellWidth: 35 },
                    3: { cellWidth: 55 }
                }
            });
            
            const filteredRecordsForPDF = includeFlagged ? allRecords : allRecords.filter(r => !r.isFlagged);
            const presentItems = members.map(m => {
                const record = filteredRecordsForPDF.find(r => r.userId?._id === m.userId?._id && r.status === 'PRESENT');
                return record ? { member: m, record } : null;
            }).filter(item => item !== null);

            const totalMarkedPDF = presentItems.length;
            const pdfPercentMarked = totalEnrolled > 0 ? Math.round((totalMarkedPDF / totalEnrolled) * 100) : 0;
        
        doc.setFontSize(11);
        doc.text(`Total Enrolled: ${totalEnrolled}`, 14, doc.lastAutoTable.finalY + 10);
        doc.text(`Total Present: ${totalMarkedPDF}`, 14, doc.lastAutoTable.finalY + 16);
        doc.text(`Attendance Rate: ${pdfPercentMarked}%`, 14, doc.lastAutoTable.finalY + 22);
        
        const tableData = presentItems.map(item => [
            item.record.organizationMemberId?.studentId || '-',
            `${item.member.userId?.firstName} ${item.member.userId?.lastName}`,
            new Date(item.record.markedAt).toLocaleTimeString()
        ]);

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 28,
                head: [['Student ID', 'Name', 'Mark Time']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: 255, textColor: 0, fontStyle: 'bold', lineWidth: 0.1, lineColor: 0 },
                bodyStyles: { fillColor: 255, textColor: 0, lineWidth: 0.1, lineColor: 0 },
            });
            
            doc.save(`Attendance_${session.courseId?.code}_${new Date(session.startTime).toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error("Failed to export PDF", error);
            alert("Failed to load full attendance data for PDF export.");
        }
    };

    const exportQRToPDF = () => {
        if (!session) return;
        
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Session Attendance QR', 14, 22);
        
        const tableData = [
            ['Module Code', session.courseId?.code || '-'],
            ['Module Name', session.courseId?.name || '-'],
            ['Instructor', `${session.instructorId?.userId?.firstName || ''} ${session.instructorId?.userId?.lastName || ''}`.trim()],
            ['Start Time', new Date(session.startTime).toLocaleString()],
            ['End Time', new Date(session.expiresAt).toLocaleString()],
        ];
        
        autoTable(doc, {
            startY: 30,
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 11, cellPadding: 5 },
            columnStyles: {
                0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 50, textColor: [30, 41, 59] },
                1: { cellWidth: 130, textColor: [71, 85, 105] }
            }
        });
        
        const canvas = document.getElementById('details-qr-canvas');
        if (canvas) {
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 14, doc.lastAutoTable.finalY + 15, 70, 70);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(qrUrl, 14, doc.lastAutoTable.finalY + 95);
        }
        
        doc.save(`QR_${session.courseId?.code || 'Session'}_${new Date(session.startTime).toISOString().split('T')[0]}.pdf`);
    };

    const totalEnrolled = stats?.totalEnrolled || 0;
    const totalMarked = stats?.totalMarked || 0;
    const selfMarkedCount = stats?.selfMarkedCount || 0;
    const adminMarkedCount = stats?.adminMarkedCount || 0;
    const percentMarked = totalEnrolled > 0 ? Math.round((totalMarked / totalEnrolled) * 100) : 0;
    const selfMarkedPercent = totalMarked > 0 ? Math.round((selfMarkedCount / totalMarked) * 100) : 0;
    const adminMarkedPercent = totalMarked > 0 ? Math.round((adminMarkedCount / totalMarked) * 100) : 0;
    const totalAttendanceRecordsCount = searchQuery.trim() 
        ? totalMatchingRecords 
        : (stats?.totalAttendanceCount ?? attendanceRecords.length);
    const unmarkedMembers = stats?.unmarkedMembers || [];

    const filteredUnmarkedMembers = unmarkedMembers.filter(m => {
        const term = manualSearch.toLowerCase();
        return (
            m.userId?.firstName?.toLowerCase().includes(term) ||
            m.userId?.lastName?.toLowerCase().includes(term) ||
            m.userId?.email?.toLowerCase().includes(term) ||
            m.studentId?.toLowerCase().includes(term)
        );
    });
    
    const selectedUser = unmarkedMembers.find(m => m.userId?._id === manualUserId);

    const canModifyAttendance = session && session.status !== 'CONFIRMED' && (
        activeOrganization?.userRole === 'ADMIN' || 
        activeOrganization?.userRole === 'OWNER' || 
        (activeOrganization?.userRole === 'INSTRUCTOR' && session.instructorId?.userId?._id === user?._id)
    );

    return (
        <div className="animate-fade-in">
            <Link 
                to={backUrl} 
                state={{ tab: targetTab }}
                className="text-slate-400 hover:text-slate-700 flex items-center mb-6 w-fit transition"
            >
                <ArrowLeft size={16} className="mr-2" /> Back to Sessions
            </Link>

            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <div className="w-full sm:w-auto">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                        <span>{session.courseId?.name} - {session.lectureType}</span>
                        {session.status === 'SCHEDULED' && <span className="badge bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs sm:text-sm">Scheduled</span>}
                        {session.status === 'ACTIVE' && <span className="badge badge-success text-xs sm:text-sm">Active</span>}
                        {session.status === 'PENDING_CONFIRMATION' && <span className="badge badge-warning text-xs sm:text-sm">Pending</span>}
                        {session.status === 'CONFIRMED' && <span className="badge badge-primary text-xs sm:text-sm">Confirmed</span>}
                    </h1>
                    <div className="flex justify-between items-center w-full">
                        <p className="text-slate-400 text-xs sm:text-sm flex items-center flex-wrap">
                            <Clock size={14} className="mr-1 shrink-0" />
                            <span>{new Date(session.startTime).toLocaleString()} - {new Date(session.expiresAt).toLocaleString()}</span>
                        </p>

                        {/* Mobile Menu */}
                        <div className="relative sm:hidden">
                            <button 
                                className="p-1.5 -mr-2 text-slate-400 hover:text-slate-700 rounded-full active:bg-slate-100 transition" 
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                            >
                                <MoreVertical size={20} />
                            </button>
                            
                            {showMobileMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowMobileMenu(false)}></div>
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-20 animate-fade-in">
                                        {session.status !== 'CONFIRMED' && (
                                            <button 
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center" 
                                                onClick={() => { setShowMobileMenu(false); handleConfirmSession(); }}
                                            >
                                                <CheckCircle size={16} className="mr-2 text-brand-600" /> Confirm Session
                                            </button>
                                        )}
                                        {activeOrganization?.userRole === 'OWNER' && (
                                            <button 
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center" 
                                                onClick={() => { setShowMobileMenu(false); handleDeleteSession(); }}
                                            >
                                                <Trash2 size={16} className="mr-2" /> Delete Session
                                            </button>
                                        )}
                                        {activeOrganization?.userRole !== 'OWNER' && session.status === 'CONFIRMED' && (
                                            <div className="px-4 py-2 text-xs text-slate-400">No actions available</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Desktop Buttons */}
                <div className="hidden sm:flex items-center gap-2 w-auto">
                    {session.status !== 'CONFIRMED' && (
                        <button className="btn btn-primary flex items-center text-sm justify-center" onClick={handleConfirmSession}>
                            <CheckCircle size={16} className="mr-1.5" /> 
                            <span>Confirm Session</span>
                        </button>
                    )}
                    
                    {/* Desktop Menu */}
                    <div className="relative">
                        <button 
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full active:bg-slate-100 transition" 
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                        >
                            <MoreVertical size={20} />
                        </button>
                        
                        {showMobileMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowMobileMenu(false)}></div>
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-20 animate-fade-in">
                                    {activeOrganization?.userRole === 'OWNER' && (
                                        <button 
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center" 
                                            onClick={() => { setShowMobileMenu(false); handleDeleteSession(); }}
                                        >
                                            <Trash2 size={16} className="mr-2" /> Delete Session
                                        </button>
                                    )}
                                    {activeOrganization?.userRole !== 'OWNER' && (
                                        <div className="px-4 py-2 text-xs text-slate-400">No actions available</div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6 order-2 lg:order-1">
                    {/* Attendance Info / Stats Card */}
                    <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 gap-6 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl">
                        <div className="flex items-center gap-4 sm:gap-6">
                            <CircleChart percentage={percentMarked} />
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">Attendance Rate</h3>
                                <div className="text-xs sm:text-sm text-slate-500 flex flex-wrap gap-2 sm:gap-4">
                                    <div>
                                        <span className="font-semibold text-slate-700">{totalMarked}</span> / {totalEnrolled} Enrolled
                                    </div>
                                    <div className="border-l border-slate-200 pl-2 sm:pl-4">
                                        <span className="font-semibold text-slate-700">{selfMarkedCount}</span> Self ({selfMarkedPercent}%)
                                    </div>
                                    <div className="border-l border-slate-200 pl-2 sm:pl-4">
                                        <span className="font-semibold text-slate-700">{adminMarkedCount}</span> Admin ({adminMarkedPercent}%)
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <span className="text-xs font-semibold text-slate-600">Include flagged</span>
                                <div className="relative inline-flex items-center">
                                    <input type="checkbox" className="sr-only peer" checked={includeFlagged} onChange={(e) => setIncludeFlagged(e.target.checked)} />
                                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                                </div>
                            </label>
                            <button className="btn btn-outline py-1.5 sm:py-2 text-xs sm:text-sm" onClick={exportToPDF}>
                                <Download size={14} className="mr-1.5 sm:mr-2" /> Export PDF
                            </button>
                        </div>
                    </div>

                    {/* Mobile Contextual Confirm Button */}
                    {session.status !== 'CONFIRMED' && (
                        <div className="sm:hidden w-full">
                            <button 
                                className="btn btn-primary w-full flex items-center justify-center shadow-md py-3 text-sm font-medium" 
                                onClick={handleConfirmSession}
                            >
                                <CheckCircle size={18} className="mr-2" /> 
                                Confirm Session
                            </button>
                        </div>
                    )}

                    <div className="card h-full bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <h2 className="text-xl font-bold flex items-center">
                                <Users size={18} className="mr-2 text-indigo-400" /> 
                                Attendance Records ({totalAttendanceRecordsCount})
                            </h2>
                            <div className="relative w-full sm:w-64">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search name, ID, email..." 
                                    className="form-input pl-9 py-2 text-sm w-full bg-slate-50 border-slate-200"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        {attendanceRecords.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                No attendance records found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto lg:max-h-[600px] lg:overflow-y-auto">
                                <table className="table w-full text-xs relative">
                                    <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                        <tr>
                                            <th className="py-3 px-2.5 sm:px-6">Name</th>
                                            <th className="py-3 px-4 hidden sm:table-cell">Student ID</th>
                                            <th className="py-3 px-2 sm:px-6">Status</th>
                                            <th className="py-3 px-4 hidden md:table-cell">Marked By</th>
                                            <th className="py-3 px-4 hidden sm:table-cell">Time</th>
                                            {canModifyAttendance && <th className="py-3 px-2 sm:px-6 text-right">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendanceRecords.map(r => (
                                             <tr key={r._id}>
                                                <td className="py-2.5 sm:py-4 px-2.5 sm:px-6">
                                                    <div className="font-semibold text-slate-900 truncate max-w-[105px] xs:max-w-[145px] sm:max-w-none">
                                                        {r.userId?.firstName} {r.userId?.lastName}
                                                    </div>
                                                    <div className="sm:hidden text-[11px] text-slate-400 font-normal mt-0.5 flex items-center gap-1.5">
                                                        {r.organizationMemberId?.studentId && (
                                                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                                                                {r.organizationMemberId.studentId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="text-slate-500 font-mono hidden sm:table-cell">{r.organizationMemberId?.studentId || '-'}</td>
                                                <td className="py-2.5 sm:py-4 px-2 sm:px-6">
                                                    <div className="flex items-center gap-1">
                                                        <span className={`badge text-[10px] sm:text-xs px-2 py-0.5 ${r.status === 'PRESENT' ? (r.isFlagged ? 'bg-red-50 text-red-600 border border-red-200' : 'badge-success') : 'badge-danger'}`}>
                                                            {r.status === 'PRESENT' && r.isFlagged ? 'FLAGGED' : r.status}
                                                        </span>
                                                        {r.isFlagged && r.status === 'PRESENT' && (
                                                            <Flag className="text-red-500 shrink-0" size={13} title="The student is flagged for marking outside the attendance area" />
                                                        )}
                                                        
                                                        {/* Mobile Info Popover Trigger */}
                                                        <div className="relative sm:hidden inline-flex ml-0.5">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveInfoRecordId(activeInfoRecordId === r._id ? null : r._id);
                                                                }}
                                                                className={`p-1 rounded-md transition ${activeInfoRecordId === r._id ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                                                title="View attendance details"
                                                                aria-label="View attendance details"
                                                            >
                                                                <Info size={13} />
                                                            </button>

                                                            {activeInfoRecordId === r._id && (
                                                                <>
                                                                    <div 
                                                                        className="fixed inset-0 z-30" 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveInfoRecordId(null);
                                                                        }} 
                                                                    />
                                                                    <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 z-40 w-52 bg-slate-900/95 backdrop-blur-md text-white text-xs rounded-xl shadow-2xl p-3 border border-slate-700/80 animate-in fade-in zoom-in-95 pointer-events-auto">
                                                                        <div className="font-semibold text-slate-200 border-b border-slate-700/60 pb-1.5 mb-2 flex items-center justify-between">
                                                                            <span>Attendance Info</span>
                                                                            {r.organizationMemberId?.studentId && (
                                                                                <span className="text-[10px] text-slate-400 font-mono">
                                                                                    {r.organizationMemberId.studentId}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <div className="flex items-center justify-between text-[11px]">
                                                                                <span className="text-slate-400 flex items-center gap-1">
                                                                                    <Clock size={11} className="text-slate-400" /> Time:
                                                                                </span>
                                                                                <span className="font-medium text-slate-200">
                                                                                    {new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center justify-between text-[11px]">
                                                                                <span className="text-slate-400 flex items-center gap-1">
                                                                                    <Users size={11} className="text-slate-400" /> Marked By:
                                                                                </span>
                                                                                <span className="font-medium text-slate-200 font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">
                                                                                    {r.markedBy || 'SELF'}
                                                                                </span>
                                                                            </div>
                                                                            {r.isFlagged && (
                                                                                <div className="mt-1.5 pt-1.5 border-t border-slate-700/50 text-[10px] text-rose-400 flex items-start gap-1">
                                                                                    <Flag size={10} className="shrink-0 mt-0.5" />
                                                                                    <span>Marked outside designated location</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {/* Top arrow pointer */}
                                                                        <div className="absolute right-2 sm:left-1/2 sm:-translate-x-1/2 bottom-full w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900" />
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-slate-500 hidden md:table-cell">{r.markedBy}</td>
                                                <td className="text-slate-500 hidden sm:table-cell">{new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                {canModifyAttendance && (
                                                    <td className="py-2.5 sm:py-4 px-2 sm:px-6 text-right">
                                                        {r.status === 'PRESENT' && (
                                                            <button 
                                                                onClick={() => handleRemoveAttendance(r._id)} 
                                                                className="p-1 sm:p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                                title="Remove Attendance"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                
                                {/* Infinite Scroll Loader */}
                                {hasMore && attendanceRecords.length > 0 && (
                                    <div ref={loaderRef} className="py-6 flex justify-center items-center">
                                        <RefreshCw size={20} className="animate-spin text-brand-600" />
                                    </div>
                                )}

                                {/* End of records footer with bottom breathing room for popovers */}
                                {!hasMore && attendanceRecords.length > 0 && (
                                    <div className="pt-4 pb-16 sm:pb-8 flex flex-col items-center justify-center text-center select-none space-y-0.5">
                                        <span className="text-[11px] font-medium text-slate-400">
                                            All {attendanceRecords.length} attendance {attendanceRecords.length === 1 ? 'record' : 'records'} loaded
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            Real-time session updates active
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="order-1 lg:order-2">
                    <div className="card h-full bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl p-6 flex flex-col">
                        <div className={`order-1 lg:order-2 flex flex-col ${canModifyAttendance ? 'lg:mt-6 lg:pt-6 lg:border-t lg:border-slate-100' : ''}`}>
                            <h2 className="text-xl font-bold mb-4">Session Details</h2>
                            <div className="space-y-4 mb-6 lg:mb-0">
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Course Code</div>
                                <div className="font-medium">{session.courseId?.code}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Session Type</div>
                                <div className="font-medium">{session.lectureType}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Instructor</div>
                                <div className="font-medium">{session.instructorId?.userId?.firstName} {session.instructorId?.userId?.lastName}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Confirmation Deadline</div>
                                <div className="font-medium">{new Date(session.confirmationDeadline).toLocaleString()}</div>
                            </div>
                            
                            {session.qrToken ? (
                                <div className="mt-6 border-t border-slate-100 pt-6">
                                    <h3 className="font-bold mb-3 text-sm">Attendance QR Code</h3>
                                    <div className="bg-white p-4 rounded-xl inline-block shadow-sm border border-slate-200 mb-4">
                                        <QRCodeCanvas 
                                            id="details-qr-canvas"
                                            value={qrUrl}
                                            size={150}
                                            level="H"
                                            includeMargin={false}
                                        />
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 flex items-center justify-between mb-3">
                                        <span className="text-xs text-slate-500 truncate mr-3 font-mono">
                                            {qrUrl}
                                        </span>
                                        <button 
                                            onClick={handleCopy}
                                            className="text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 p-1.5 rounded transition shrink-0"
                                            title="Copy link"
                                        >
                                            {copied ? <Check size={14} /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                    <button 
                                        className="btn btn-outline w-full text-sm flex items-center justify-center"
                                        onClick={exportQRToPDF}
                                    >
                                        <Download size={16} className="mr-2" />
                                        Export QR to PDF
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-6 border-t border-slate-100 pt-6">
                                    <h3 className="font-bold mb-3 text-sm">Attendance QR Code</h3>
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-slate-500 text-sm">
                                        QR Code is not available for this session (created before system update). Please create a new session.
                                    </div>
                                </div>
                            )}
                            </div>
                        </div>

                        {canModifyAttendance && (
                            <div className="order-2 lg:order-1 border-t lg:border-t-0 border-slate-100 pt-6 lg:pt-0">
                                <h3 className="font-bold mb-3">Manual Override</h3>
                                <form onSubmit={handleManualMark} className="flex flex-col gap-3 relative">
                                    <div className="relative">
                                        <div 
                                            className="form-input text-sm py-2 cursor-pointer flex justify-between items-center bg-white"
                                            onClick={() => setIsManualDropdownOpen(!isManualDropdownOpen)}
                                        >
                                            <span className={`truncate ${selectedUser ? 'text-slate-800' : 'text-slate-400'}`}>
                                                {selectedUser 
                                                    ? `${selectedUser.userId?.firstName} ${selectedUser.userId?.lastName} (${selectedUser.studentId || selectedUser.userId?.email})`
                                                    : 'Search member by name, ID, email...'
                                                }
                                            </span>
                                            <Search size={16} className="text-slate-400 shrink-0 ml-2" />
                                        </div>

                                        {isManualDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsManualDropdownOpen(false)}></div>
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden">
                                                    <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                                                        <div className="relative">
                                                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            <input 
                                                                type="text" 
                                                                placeholder="Search..." 
                                                                className="w-full text-sm py-1.5 pl-8 pr-3 border border-slate-200 rounded outline-none focus:border-brand-500 bg-white"
                                                                value={manualSearch}
                                                                onChange={(e) => setManualSearch(e.target.value)}
                                                                autoFocus
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-[260px] overflow-y-auto custom-scrollbar">
                                                        {filteredUnmarkedMembers.length === 0 ? (
                                                            <div className="px-3 py-4 text-sm text-center text-slate-400">No members found</div>
                                                        ) : (
                                                            filteredUnmarkedMembers.map(m => (
                                                                <div 
                                                                    key={m._id}
                                                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-brand-50 flex flex-col ${manualUserId === m.userId?._id ? 'bg-brand-50 text-brand-700' : 'text-slate-700'}`}
                                                                    onClick={() => {
                                                                        setManualUserId(m.userId?._id);
                                                                        setIsManualDropdownOpen(false);
                                                                        setManualSearch('');
                                                                    }}
                                                                >
                                                                    <div className="flex justify-between items-center w-full">
                                                                        <span className="font-medium truncate pr-2">{m.userId?.firstName} {m.userId?.lastName}</span>
                                                                        {m.studentId && (
                                                                            <span className="text-xs font-medium text-slate-400 shrink-0">{m.studentId}</span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-xs text-slate-500 truncate">
                                                                        {m.userId?.email}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <button 
                                        type="submit" 
                                        className="btn btn-outline py-2 w-full text-sm"
                                        disabled={manualLoading || !manualUserId}
                                    >
                                        {manualLoading ? 'Marking...' : 'Mark Present'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModalConfig.isOpen}
                onClose={() => setConfirmModalConfig({ ...confirmModalConfig, isOpen: false })}
                onConfirm={
                    confirmModalConfig.type === 'delete' ? executeDelete : 
                    confirmModalConfig.type === 'remove_attendance' ? executeRemoveAttendance : 
                    confirmModalConfig.type === 'confirm' ? executeConfirmSession : 
                    () => {}
                }
                title={
                    confirmModalConfig.type === 'delete' ? "Delete Session" : 
                    confirmModalConfig.type === 'confirm' ? "Confirm Session" : 
                    "Confirm Remove"
                }
                message={confirmModalConfig.message}
                type={confirmModalConfig.type === 'delete' || confirmModalConfig.type === 'remove_attendance' ? 'delete' : confirmModalConfig.type === 'confirm' ? 'confirm' : 'warning'}
                confirmText={confirmModalConfig.type === 'delete' ? "Delete" : confirmModalConfig.type === 'confirm' ? "Confirm" : "Remove"}
            />

            {/* Go to top button */}
            {showGoToTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white p-3 rounded-full shadow-xl hover:bg-slate-700 transition-all animate-fade-in sm:hidden"
                    title="Go to top"
                >
                    <ArrowUp size={20} />
                </button>
            )}
        </div>
    );
};

export default SessionDetails;
