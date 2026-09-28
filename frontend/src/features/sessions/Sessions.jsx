import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext';
import { CalendarClock, PlusCircle } from 'lucide-react';
import api from '../../services/api';
import CreateSessionModal from './CreateSessionModal';

const Sessions = () => {
    const { activeOrganization } = useOrganization();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        const fetchSessions = async () => {
            if (!activeOrganization) return;
            try {
                setLoading(true);
                const res = await api.get(`/organizations/${activeOrganization._id}/sessions`);
                setSessions(res.data);
            } catch (error) {
                console.error("Failed to fetch sessions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSessions();
    }, [activeOrganization]);

    const handleSessionCreated = (data) => {
        setSessions(prev => [data.session, ...prev]);
        // Ideally show the QR code in a separate modal right after creation
        alert(`Session Created! QR Token: ${data.qrToken}`);
    };

    if (loading) {
        return <div className="p-4">Loading sessions...</div>;
    }

    return (
        <>
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center">
                    <CalendarClock className="mr-3 text-indigo-400" /> 
                    Sessions
                </h1>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    <PlusCircle size={18} className="mr-2" />
                    Create Session
                </button>
            </div>

            {sessions.length === 0 ? (
                <div className="card">
                    <div className="text-center py-12">
                        <p className="text-slate-400 mb-4">No sessions have been created.</p>
                        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                            Start Attendance Session
                        </button>
                    </div>
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
                            {sessions.map(session => (
                                <tr key={session._id}>
                                    <td>
                                        <div className="font-medium">{session.courseId?.name}</div>
                                        <div className="text-xs text-slate-400">{session.courseId?.code}</div>
                                    </td>
                                    <td>
                                        {session.status === 'ACTIVE' && <span className="badge badge-success">Active</span>}
                                        {session.status === 'PENDING_CONFIRMATION' && <span className="badge badge-warning">Pending</span>}
                                        {session.status === 'CONFIRMED' && <span className="badge badge-primary">Confirmed</span>}
                                        {session.status === 'CANCELLED' && <span className="badge badge-danger">Cancelled</span>}
                                    </td>
                                    <td>{session.instructorId?.userId?.firstName} {session.instructorId?.userId?.lastName}</td>
                                    <td>{new Date(session.startTime).toLocaleString()}</td>
                                    <td>{new Date(session.expiresAt).toLocaleString()}</td>
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
        
        {showCreateModal && (
            <CreateSessionModal 
                onClose={() => setShowCreateModal(false)}
                onSessionCreated={handleSessionCreated}
            />
        )}
        </>
    );
};

export default Sessions;
