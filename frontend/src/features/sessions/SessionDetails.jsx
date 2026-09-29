import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext';
import api from '../../services/api';
import { ArrowLeft, Users, CheckCircle, Clock, Copy, Check, Flag } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import ConfirmModal from '../../components/ConfirmModal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Download } from 'lucide-react';

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
    
    const [session, setSession] = useState(null);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [manualUserId, setManualUserId] = useState('');
    const [manualLoading, setManualLoading] = useState(false);
    const [members, setMembers] = useState([]);
    const [copied, setCopied] = useState(false);
    const [confirmModalConfig, setConfirmModalConfig] = useState({ isOpen: false, type: '', message: '' });
    const [includeFlagged, setIncludeFlagged] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!activeOrganization) return;
            try {
                setLoading(true);
                const sessionRes = await api.get(`/organizations/${activeOrganization._id}/sessions/${sessionId}`);
                setSession(sessionRes.data);

                const [recordsRes, membersRes] = await Promise.all([
                    api.get(`/organizations/${activeOrganization._id}/sessions/${sessionId}/attendance`),
                    api.get(`/organizations/${activeOrganization._id}/courses/${sessionRes.data.courseId._id}/members`)
                ]);
                
                setAttendanceRecords(recordsRes.data);
                setMembers(membersRes.data);
            } catch (error) {
                console.error("Failed to load session details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [activeOrganization, sessionId]);

    const handleConfirmSession = async () => {
        try {
            await api.post(`/organizations/${activeOrganization._id}/sessions/${sessionId}/confirm`);
            const sessionRes = await api.get(`/organizations/${activeOrganization._id}/sessions/${sessionId}`);
            setSession(sessionRes.data);
            alert('Session confirmed successfully!');
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

    const executeDelete = async () => {
        try {
            await api.delete(`/organizations/${activeOrganization._id}/sessions/${sessionId}`);
            navigate('/app/sessions');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete session');
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
            const recordsRes = await api.get(`/organizations/${activeOrganization._id}/sessions/${sessionId}/attendance`);
            setAttendanceRecords(recordsRes.data);
            setManualUserId('');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to mark attendance manually.');
        } finally {
            setManualLoading(false);
        }
    };

    if (loading) return <div className="p-4">Loading session details...</div>;
    if (!session) return <div className="p-4">Session not found</div>;

    const qrUrl = `${window.location.origin}/attend/${session.qrToken || ''}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(qrUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const exportToPDF = () => {
        if (!session) return;
        
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Attendance Report', 14, 22);
        
        doc.setFontSize(11);
        doc.text(`Course: ${session.courseId?.name} (${session.courseId?.code})`, 14, 32);
        doc.text(`Session: ${session.lectureType}`, 14, 38);
        doc.text(`Instructor: ${session.instructorId?.userId?.firstName} ${session.instructorId?.userId?.lastName}`, 14, 44);
        doc.text(`Date & Time: ${new Date(session.startTime).toLocaleString()} - ${new Date(session.expiresAt).toLocaleString()}`, 14, 50);
        
        const filteredRecordsForPDF = includeFlagged ? attendanceRecords : attendanceRecords.filter(r => !r.isFlagged);
        const totalMarkedPDF = filteredRecordsForPDF.length;
        doc.text(`Total Enrolled: ${totalEnrolled}`, 14, 60);
        doc.text(`Total Present: ${totalMarkedPDF}`, 14, 66);
        doc.text(`Total Absent: ${totalEnrolled - totalMarkedPDF}`, 14, 72);
        
        const tableData = members.map(m => {
            const record = filteredRecordsForPDF.find(r => r.userId?._id === m.userId?._id);
            return [
                `${m.userId?.firstName} ${m.userId?.lastName}`,
                m.studentId || '-',
                record ? 'PRESENT' : 'ABSENT',
                record ? record.markedBy : '-',
                record ? new Date(record.markedAt).toLocaleTimeString() : '-'
            ];
        });

        doc.autoTable({
            startY: 80,
            head: [['Name', 'Student ID', 'Status', 'Marked By', 'Time']],
            body: tableData,
        });
        
        doc.save(`Attendance_${session.courseId?.code}_${new Date(session.startTime).toISOString().split('T')[0]}.pdf`);
    };

    const totalEnrolled = members.length;
    const filteredRecords = includeFlagged ? attendanceRecords : attendanceRecords.filter(r => !r.isFlagged);
    const totalMarked = filteredRecords.length;
    const percentMarked = totalEnrolled > 0 ? Math.round((totalMarked / totalEnrolled) * 100) : 0;
    
    const selfMarkedCount = filteredRecords.filter(r => r.markedBy === 'SELF').length;
    const adminMarkedCount = filteredRecords.filter(r => r.markedBy !== 'SELF').length;
    const selfMarkedPercent = totalMarked > 0 ? Math.round((selfMarkedCount / totalMarked) * 100) : 0;
    const adminMarkedPercent = totalMarked > 0 ? Math.round((adminMarkedCount / totalMarked) * 100) : 0;

    return (
        <div className="animate-fade-in">
            <Link to="/app/sessions" className="text-slate-400 hover:text-white flex items-center mb-6 w-fit transition">
                <ArrowLeft size={16} className="mr-2" /> Back to Sessions
            </Link>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        {session.courseId?.name} - {session.lectureType}
                        {session.status === 'ACTIVE' && <span className="badge badge-success text-sm">Active</span>}
                        {session.status === 'PENDING_CONFIRMATION' && <span className="badge badge-warning text-sm">Pending</span>}
                        {session.status === 'CONFIRMED' && <span className="badge badge-primary text-sm">Confirmed</span>}
                    </h1>
                    <p className="text-slate-400 flex items-center">
                        <Clock size={14} className="mr-1" />
                        {new Date(session.startTime).toLocaleString()} - {new Date(session.expiresAt).toLocaleString()}
                    </p>
                </div>
                
                <div className="flex gap-2">
                    {session.status !== 'CONFIRMED' && (
                        <button className="btn btn-primary" onClick={handleConfirmSession}>
                            <CheckCircle size={18} className="mr-2" /> Confirm Session
                        </button>
                    )}
                    {activeOrganization?.userRole === 'OWNER' && (
                        <button className="btn btn-danger" onClick={handleDeleteSession}>
                            Delete Session
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Attendance Info / Stats Card */}
                    <div className="card flex items-center justify-between p-5">
                        <div className="flex items-center gap-6">
                            <CircleChart percentage={percentMarked} />
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">Attendance Rate</h3>
                                <div className="text-sm text-slate-500 flex gap-4">
                                    <div>
                                        <span className="font-semibold text-slate-700">{totalMarked}</span> / {totalEnrolled} Enrolled
                                    </div>
                                    <div className="border-l border-slate-200 pl-4">
                                        <span className="font-semibold text-slate-700">{selfMarkedCount}</span> Self ({selfMarkedPercent}%)
                                    </div>
                                    <div className="border-l border-slate-200 pl-4">
                                        <span className="font-semibold text-slate-700">{adminMarkedCount}</span> Admin ({adminMarkedPercent}%)
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <span className="text-xs font-semibold text-slate-600">Include flagged</span>
                                <div className="relative inline-flex items-center">
                                    <input type="checkbox" className="sr-only peer" checked={includeFlagged} onChange={(e) => setIncludeFlagged(e.target.checked)} />
                                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-600"></div>
                                </div>
                            </label>
                            <button className="btn btn-outline py-2 text-sm" onClick={exportToPDF}>
                                <Download size={16} className="mr-2" /> Export PDF
                            </button>
                        </div>
                    </div>

                    <div className="card h-full">
                        <h2 className="text-xl font-bold mb-4 flex items-center">
                            <Users size={18} className="mr-2 text-indigo-400" /> 
                            Attendance Records ({attendanceRecords.length})
                        </h2>
                        
                        {attendanceRecords.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                No attendance records found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table w-full">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Student ID</th>
                                            <th>Status</th>
                                            <th>Marked By</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendanceRecords.map(r => (
                                            <tr key={r._id}>
                                                <td>{r.userId?.firstName} {r.userId?.lastName}</td>
                                                <td className="text-slate-400">{r.organizationMemberId?.studentId || '-'}</td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`badge ${r.status === 'PRESENT' ? 'badge-success' : 'badge-danger'}`}>
                                                            {r.status}
                                                        </span>
                                                        {r.isFlagged && (
                                                            <Flag className="text-red-500" size={16} title="The student is flagged for marking outside the attendance area" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="text-slate-400">{r.markedBy}</td>
                                                <td className="text-slate-400">{new Date(r.markedAt).toLocaleTimeString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <div className="card h-full">
                        <h2 className="text-xl font-bold mb-4">Session Details</h2>
                        <div className="space-y-4 mb-6">
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
                                        <QRCodeSVG 
                                            value={qrUrl}
                                            size={150}
                                            level="H"
                                            includeMargin={false}
                                        />
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 flex items-center justify-between">
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

                        {session.status !== 'CONFIRMED' && (
                            <div className="border-t border-slate-700 pt-6">
                                <h3 className="font-bold mb-3">Manual Override</h3>
                                <form onSubmit={handleManualMark} className="flex flex-col gap-2">
                                    <select 
                                        className="form-input text-sm py-2"
                                        value={manualUserId}
                                        onChange={(e) => setManualUserId(e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>Select a member...</option>
                                        {members.map(m => (
                                            <option key={m._id} value={m.userId?._id}>
                                                {m.userId?.firstName} {m.userId?.lastName} ({m.userId?.email})
                                            </option>
                                        ))}
                                    </select>
                                    <button 
                                        type="submit" 
                                        className="btn btn-outline py-2 w-full text-sm"
                                        disabled={manualLoading}
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
                onConfirm={confirmModalConfig.type === 'delete' ? executeDelete : () => {}}
                title={confirmModalConfig.type === 'delete' ? "Delete Session" : "Confirm"}
                message={confirmModalConfig.message}
                type={confirmModalConfig.type}
                confirmText={confirmModalConfig.type === 'delete' ? "Delete" : "Confirm"}
            />
        </div>
    );
};

export default SessionDetails;
