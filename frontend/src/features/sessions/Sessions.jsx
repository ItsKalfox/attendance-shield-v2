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

            {/* Past Sessions Summary Metrics */}
            {activeTab === 'past' && sessions.some(s => s.status === 'CONFIRMED') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <div className="card bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 flex items-center">
                        <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mr-4 shrink-0 border border-brand-100">
                            <CalendarClock size={24} />
                        </div>
                        <div>
                            <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                {sessions.filter(s => s.status === 'CONFIRMED').length}
                            </div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                Total Concluded Sessions
                            </div>
                        </div>
                    </div>

                    <div className="card bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 flex items-center">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mr-4 shrink-0 border border-emerald-100">
                            <CalendarClock size={24} />
                        </div>
                        <div>
                            <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                {new Set(sessions.filter(s => s.status === 'CONFIRMED').map(s => s.courseId?._id || s.courseId)).size}
                            </div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                Unique Courses Held
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {filteredSessions.length === 0 ? (
                <div className="card text-center py-16 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 rounded-3xl">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 shadow-sm border border-slate-100">
                        <CalendarClock size={28} className="text-slate-300" />
                    </div>
                    <h4 className="text-lg font-bold mb-1 text-slate-700">No {activeTab === 'active' ? 'Active' : 'Past'} Sessions</h4>
                    <p className="text-slate-400 mb-6 text-sm max-w-sm mx-auto">
                        {activeTab === 'active' ? 'No attendance sessions are currently running or scheduled.' : 'No completed attendance sessions recorded yet.'}
                    </p>
                    {activeTab === 'active' && (
                        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                            Start Attendance Session
                        </button>
                    )}
                </div>
            ) : (
                <div className="card p-0 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 rounded-3xl bg-white">
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
