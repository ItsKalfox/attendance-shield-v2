import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext';
import { CalendarClock, PlusCircle } from 'lucide-react';
import api from '../../services/api';
import CreateSessionModal from './CreateSessionModal';
import QRCodeModal from './QRCodeModal';

const Sessions = () => {
    const { activeOrganization } = useOrganization();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createdQrToken, setCreatedQrToken] = useState(null);
    const [createdSession, setCreatedSession] = useState(null);
    const [activeTab, setActiveTab] = useState('active');

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
        setCreatedQrToken(data.qrToken);
        setCreatedSession(data.session);
    };

    if (loading) {
        return <div className="p-4">Loading sessions...</div>;
    }

    const filteredSessions = sessions.filter(session => {
        if (activeTab === 'active') {
            return session.status === 'SCHEDULED' || session.status === 'ACTIVE' || session.status === 'PENDING_CONFIRMATION';
        } else {
            return session.status === 'CONFIRMED';
        }
    });

    return (
        <>
        <div className="animate-fade-in">
            <div className="flex justify-end items-center mb-6">
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    <PlusCircle size={18} className="mr-2" />
                    Create Session
                </button>
            </div>

            <div className="flex gap-4 border-b border-slate-200 mb-6">
                <button 
                    className={`pb-3 px-2 font-medium transition-colors border-b-2 ${activeTab === 'active' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    onClick={() => setActiveTab('active')}
                >
                    Active Sessions
                </button>
                <button 
                    className={`pb-3 px-2 font-medium transition-colors border-b-2 ${activeTab === 'past' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    onClick={() => setActiveTab('past')}
                >
                    Past Sessions
                </button>
            </div>

            {filteredSessions.length === 0 ? (
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
                                <th>Type</th>
                                <th>Status</th>
                                <th>Instructor</th>
                                <th>Starts</th>
                                <th>Expires</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSessions.map(session => (
                                <tr key={session._id}>
                                    <td>
                                        <div className="font-medium">{session.courseId?.name}</div>
                                        <div className="text-xs text-slate-400">{session.courseId?.code}</div>
                                    </td>
                                    <td>
                                        <span className="font-medium text-slate-600">{session.lectureType}</span>
                                    </td>
                                    <td>
                                        {session.status === 'SCHEDULED' && <span className="badge bg-indigo-100 text-indigo-700 border border-indigo-200">Scheduled</span>}
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
