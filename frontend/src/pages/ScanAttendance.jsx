import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { 
    CheckCircle, 
    XCircle, 
    Loader2, 
    ShieldCheck, 
    BookOpen, 
    User, 
    Clock, 
    ArrowRight,
    Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ScanAttendance = () => {
    const { token } = useParams();
    const { user, loading: authLoading } = useAuth();
    
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');
    const [sessionInfo, setSessionInfo] = useState(null);
    const [markedData, setMarkedData] = useState(null);

    useEffect(() => {
        if (authLoading) return;
        
        if (!user) {
            setStatus('error');
            setMessage('You must be logged in to record attendance. Please log in first, then scan the code again.');
            return;
        }

        const markAttendance = async () => {
            // Also try fetching session info in parallel for rich display
            api.get(`/attendance/session-info/${token}`)
                .then(res => setSessionInfo(res.data))
                .catch(() => {});

            setMessage('Acquiring location...');
            let locationData = { lat: null, lng: null };
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
                });
                locationData.lat = position.coords.latitude;
                locationData.lng = position.coords.longitude;
            } catch (err) {
                console.warn("Location access denied or failed:", err);
            }

            try {
                const res = await api.post('/attendance/scan', { 
                    qrToken: token,
                    lat: locationData.lat,
                    lng: locationData.lng 
                });
                setMarkedData(res.data);
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
            <div className="min-h-screen bg-[#061a17] flex items-center justify-center p-4 relative overflow-hidden font-sans">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-500/15 blur-[130px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-700/20 blur-[130px]"></div>
                </div>

                <div className="card max-w-md w-full bg-white rounded-[2rem] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.25)] border border-slate-100/80 relative z-10 text-center animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-5 text-brand-600">
                        <Loader2 size={36} className="animate-spin" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Verifying Attendance...</h2>
                    <p className="text-slate-500 text-sm mt-2">Checking session validity and cryptographic tokens.</p>
                </div>
            </div>
        );
    }

    const markedTime = markedData?.markedAt ? new Date(markedData.markedAt) : new Date();
    const formattedDate = markedTime.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    const formattedTime = markedTime.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    return (
        <div className="min-h-screen bg-[#061a17] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
            {/* Background glowing decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-500/15 blur-[130px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-700/20 blur-[130px]"></div>
            </div>

            <div className="card max-w-lg w-full bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.25)] border border-slate-100/80 relative z-10 animate-fade-in text-center">
                {/* Top header */}
                <div className="flex items-center justify-between mb-10 gap-3">
                    {sessionInfo?.organization ? (
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {sessionInfo.organization.logoUrl ? (
                                <img 
                                    src={sessionInfo.organization.logoUrl} 
                                    alt={sessionInfo.organization.name} 
                                    className="w-8 h-8 object-contain rounded-md shrink-0" 
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs shrink-0">
                                    {sessionInfo.organization.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <span className="font-bold text-slate-800 text-sm text-left line-clamp-2 leading-snug">
                                {sessionInfo.organization.name}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                            <Building2 size={16} />
                            <span>AttendanceShield</span>
                        </div>
                    )}
                    <img src="/logo-dark.png" alt="Attendance Shield" className="h-6 w-auto object-contain opacity-90 shrink-0" />
                </div>

                {status === 'success' ? (
                    <>
                        {/* Old Tick Mark Icon with Pulse Ring */}
                        <div className="relative flex items-center justify-center mx-auto mb-8">
                            <div className="absolute w-28 h-28 rounded-full bg-emerald-400/20 animate-pulse-ring pointer-events-none"></div>
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center relative z-10 shadow-sm">
                                <CheckCircle size={40} />
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">
                            Attendance Confirmed!
                        </h1>
                        <p className="text-slate-600 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                            {markedData?.flagged 
                                ? 'Attendance recorded and flagged for location verification. You can now safely close this browser tab or return to dashboard.' 
                                : 'Your presence has been recorded and verified for this session. You can now safely close this browser tab or return to dashboard.'}
                        </p>

                        <Link 
                            to="/app/dashboard" 
                            className="btn btn-primary btn-block py-3.5 text-base flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-brand-500/20 mb-2"
                        >
                            <span>Go to Dashboard</span>
                            <ArrowRight size={18} />
                        </Link>
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 rounded-3xl bg-red-50 border border-red-100 text-red-500 flex items-center justify-center mx-auto mb-5 shadow-inner">
                            <XCircle size={42} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Verification Failed</h2>
                        <p className="text-slate-500 text-sm mb-8 leading-relaxed">{message}</p>

                        <div className="space-y-3">
                            <button 
                                onClick={() => window.location.reload()} 
                                className="btn btn-secondary btn-block py-3"
                            >
                                Try Again
                            </button>
                            <Link to="/app/dashboard" className="btn btn-primary btn-block py-3">
                                Go to Dashboard
                            </Link>
                        </div>
                    </>
                )}

                {/* Security footer */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-6 font-medium">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span>Secured &amp; verified by AttendanceShield</span>
                </div>
            </div>
        </div>
    );
};

export default ScanAttendance;

