import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ScanAttendance = () => {
    const { token } = useParams();
    const { user, loading: authLoading } = useAuth();
    
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (authLoading) return;
        
        if (!user) {
            setStatus('error');
            setMessage('You must be logged in to record attendance. Please log in first, then scan the code again.');
            return;
        }

        const markAttendance = async () => {
            try {
                const res = await api.post('/attendance/scan', { qrToken: token });
                setStatus('success');
                setMessage(res.data.message || 'Attendance marked successfully!');
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Failed to mark attendance. The code might be expired or invalid.');
            }
        };

        markAttendance();
    }, [token, user, authLoading]);

    if (authLoading || status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center animate-fade-in">
                    <Loader2 size={48} className="text-indigo-500 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-bold">Recording Attendance...</h2>
                    <p className="text-slate-400 mt-2">Please wait while we verify the code.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="card w-full max-w-md text-center animate-fade-in">
                {status === 'success' ? (
                    <>
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={40} className="text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Success!</h2>
                        <p className="text-slate-400 mb-8">{message}</p>
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle size={40} className="text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Failed</h2>
                        <p className="text-slate-400 mb-8">{message}</p>
                    </>
                )}
                
                <Link to="/app/dashboard" className="btn btn-primary btn-block py-3">
                    Go to Dashboard
                </Link>
            </div>
        </div>
    );
};

export default ScanAttendance;
