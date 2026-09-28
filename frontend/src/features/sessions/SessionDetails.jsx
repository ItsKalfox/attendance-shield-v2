import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext';
import api from '../../services/api';
import { ArrowLeft, Users, CheckCircle, Clock } from 'lucide-react';

const SessionDetails = () => {
    const { sessionId } = useParams();
    const { activeOrganization } = useOrganization();
    
    const [session, setSession] = useState(null);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [manualUserId, setManualUserId] = useState('');
    const [manualLoading, setManualLoading] = useState(false);
    const [members, setMembers] = useState([]);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!activeOrganization) return;
            try {
                setLoading(true);
                const [sessionRes, recordsRes, membersRes] = await Promise.all([
                    api.get(`/organizations/${activeOrganization._id}/sessions/${sessionId}`),
                    api.get(`/organizations/${activeOrganization._id}/sessions/${sessionId}/attendance`),
                    api.get(`/organizations/${activeOrganization._id}/members`)
                ]);
                
                setSession(sessionRes.data);
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

    const handleManualMark = async (e) => {
        e.preventDefault();
        if (!manualUserId) return;

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

    const qrUrl = `${window.location.origin}/attendance/scan/${session.qrToken || ''}`; // Note: Backend doesn't return qrToken in GET requests for security, this is only known at creation.
    // If we wanted to display the QR code we'd need to have stored it or generate a temporary one that the backend can validate. 
    // Since the backend hashes it, it cannot be reversed. For production, the frontend would display it ONLY when creating the session.

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
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
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
                                                    <span className={`badge ${r.status === 'PRESENT' ? 'badge-success' : 'badge-danger'}`}>
                                                        {r.status}
                                                    </span>
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
                                <div className="text-sm text-slate-400 mb-1">Instructor</div>
                                <div className="font-medium">{session.instructorId?.userId?.firstName} {session.instructorId?.userId?.lastName}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Confirmation Deadline</div>
                                <div className="font-medium">{new Date(session.confirmationDeadline).toLocaleString()}</div>
                            </div>
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
        </div>
    );
};

export default SessionDetails;
