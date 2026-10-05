import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, MapPin, Loader2, Navigation, BookOpen } from 'lucide-react';
import api from '../services/api';

const PublicAttend = () => {
    const { qrToken } = useParams();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    
    const [status, setStatus] = useState('IDLE'); // IDLE, LOADING, SUCCESS, ERROR
    const [message, setMessage] = useState('');
    const [sessionInfo, setSessionInfo] = useState(null);
    const [locationData, setLocationData] = useState({ lat: null, lng: null });
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [showLocationSuccess, setShowLocationSuccess] = useState(false);

    useEffect(() => {
        const fetchSessionInfo = async () => {
            try {
                const res = await api.get(`/attendance/session-info/${qrToken}`);
                setSessionInfo(res.data);
                if (res.data.isGeofenceEnabled) {
                    fetchLocation();
                }
            } catch (err) {
                setStatus('ERROR');
                setMessage(err.response?.data?.message || 'Invalid or expired QR code.');
            }
        };
        fetchSessionInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qrToken]);

    const fetchLocation = async () => {
        setIsLocating(true);
        setLocationError('');
        setShowLocationSuccess(false);
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true });
            });
            setLocationData({ lat: position.coords.latitude, lng: position.coords.longitude });
            setShowLocationSuccess(true);
            setTimeout(() => setShowLocationSuccess(false), 3000);
        } catch (err) {
            console.warn("Location access denied or failed:", err);
            setLocationError('Failed to get precise location. Please ensure location services are enabled.');
        } finally {
            setIsLocating(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        setStatus('LOADING');
        setMessage('');

        // If geofence is enabled but we don't have location yet, try one more time
        let currentLoc = { ...locationData };
        if (sessionInfo?.isGeofenceEnabled && !currentLoc.lat && !currentLoc.lng) {
             setMessage('Acquiring location...');
             try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true });
                });
                currentLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
                setLocationData(currentLoc);
             } catch (err) {}
             setMessage('');
        }

        try {
            const res = await api.post('/attendance/scan', {
                email: formData.email,
                password: formData.password,
                qrToken,
                lat: currentLoc.lat,
                lng: currentLoc.lng
            });
            
            setStatus('SUCCESS');
            setMessage(res.data.message || 'Attendance marked successfully!');
        } catch (error) {
            setStatus('ERROR');
            setMessage(error.response?.data?.message || 'Failed to mark attendance.');
        }
    };

    if (status === 'SUCCESS') {
        return (
            <div className="min-h-screen bg-brand-950 flex items-center justify-center p-4 relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/20 blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-700/20 blur-[120px]"></div>
                </div>
                <div className="card max-w-md w-full text-center py-12 px-6 shadow-2xl border-emerald-200 bg-white relative z-10">
                    <div className="mx-auto w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Success!</h1>
                    <p className="text-slate-600 mb-8">{message}</p>
                    
                    <button onClick={() => navigate('/login')} className="text-brand-600 hover:underline text-sm font-medium">
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/20 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-700/20 blur-[120px]"></div>
            </div>
            
            <div className="card max-w-md w-full p-8 shadow-2xl bg-white border border-slate-100 relative z-10">
                <div className="mb-8 flex flex-col">
                    <div className="flex w-full items-center justify-between mb-8">
                        {sessionInfo && sessionInfo.organization ? (
                            <div className="flex items-center gap-3">
                                {sessionInfo.organization.logoUrl ? (
                                    <img src={sessionInfo.organization.logoUrl} alt={sessionInfo.organization.name} className="w-8 h-8 rounded-md object-contain" />
                                ) : (
                                    <div className="w-8 h-8 rounded-md bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs">
                                        {sessionInfo.organization.name.substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <span className="font-bold text-slate-700 text-sm truncate max-w-[150px]">{sessionInfo.organization.name}</span>
                            </div>
                        ) : (
                            <div></div>
                        )}
                        <img src="/logo-dark.png" alt="Attendance Shield" className="h-6 w-auto object-contain" />
                    </div>

                    <div className="text-center">
                        {sessionInfo && sessionInfo.course ? (
                            <>
                                <h1 className="text-2xl font-extrabold text-slate-800 leading-tight">
                                    {sessionInfo.course.code}
                                </h1>
                                <h2 className="text-xl font-bold text-slate-600 mt-1 mb-2">
                                    {sessionInfo.course.name}
                                </h2>
                            </>
                        ) : (
                            <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Mark Attendance</h1>
                        )}
                        <p className="text-slate-500 text-sm">Mark your attendance by entering your credentials below.</p>
                    </div>
                </div>

                {status === 'ERROR' && (
                    <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl mb-6 flex items-start gap-3 text-sm font-medium">
                        <XCircle size={18} className="shrink-0 mt-0.5" />
                        <span>{message}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                        <input 
                            type="email" 
                            name="email"
                            required
                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                            placeholder="student@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={!sessionInfo}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                        <input 
                            type="password" 
                            name="password"
                            required
                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={!sessionInfo}
                        />
                    </div>

                    {sessionInfo && sessionInfo.isGeofenceEnabled && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mt-2">
                            <div className="flex items-center text-sm font-semibold text-slate-700 mb-1">
                                <MapPin size={16} className="text-brand-500 mr-2" />
                                Geofence Active
                            </div>
                            <div className="text-xs text-slate-500 mb-3 ml-6">
                                {isLocating ? (
                                    <span>Locating...</span>
                                ) : showLocationSuccess ? (
                                    <span className="text-emerald-600 font-medium">Location acquired successfully.</span>
                                ) : locationError ? (
                                    <span className="text-red-500">{locationError}</span>
                                ) : (
                                    <span>Your location will be verified.</span>
                                )}
                            </div>
                            <button 
                                type="button" 
                                onClick={fetchLocation} 
                                disabled={isLocating}
                                className="w-full py-2 px-4 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition flex items-center justify-center disabled:opacity-50"
                            >
                                {isLocating ? (
                                    <><Loader2 size={14} className="animate-spin mr-2" /> Locating...</>
                                ) : (
                                    <><Navigation size={14} className="mr-2" /> Recalibrate GPS</>
                                )}
                            </button>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-brand-500/30 shadow-lg transition active:scale-[0.98] mt-4 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                        disabled={status === 'LOADING' || !sessionInfo}
                    >
                        {status === 'LOADING' && <Loader2 size={18} className="animate-spin mr-2" />}
                        {status === 'LOADING' ? 'Verifying...' : 'Mark Attendance'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PublicAttend;
