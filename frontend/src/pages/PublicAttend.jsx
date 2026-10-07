import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, MapPin, Loader2, Navigation, BookOpen } from 'lucide-react';
import api from '../services/api';
import { useGoogleLogin } from '@react-oauth/google';
import { useMsal } from '@azure/msal-react';

const PublicAttend = () => {
    const { qrToken } = useParams();
    const navigate = useNavigate();
    
    const [status, setStatus] = useState('IDLE'); // IDLE, LOADING, SUCCESS, ERROR
    const [message, setMessage] = useState('');
    const [sessionInfo, setSessionInfo] = useState(null);
    const [locationData, setLocationData] = useState({ lat: null, lng: null });
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [showLocationSuccess, setShowLocationSuccess] = useState(false);
    
    const { instance } = useMsal();

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

    const handleAttendanceSubmit = async (provider, token) => {
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
             
             if (!currentLoc.lat || !currentLoc.lng) {
                 setStatus('ERROR');
                 setMessage('You must allow location services to mark your attendance for this session. If you cannot enable location services, please talk to your lecturer.');
                 return;
             }
        }

        try {
            const payload = {
                qrToken,
                lat: currentLoc.lat,
                lng: currentLoc.lng
            };
            
            if (provider === 'google') {
                payload.googleToken = token;
            } else if (provider === 'microsoft') {
                payload.microsoftToken = token;
            }

            const res = await api.post('/attendance/scan', payload);
            
            setStatus('SUCCESS');
            setMessage(res.data.message || 'Attendance marked successfully!');
        } catch (error) {
            setStatus('ERROR');
            setMessage(error.response?.data?.message || 'Failed to mark attendance.');
        }
    };

    const googleLogin = useGoogleLogin({
        onSuccess: (tokenResponse) => handleAttendanceSubmit('google', tokenResponse.access_token),
        onError: () => {
            setStatus('ERROR');
            setMessage('Google Authentication failed');
        }
    });

    const microsoftLogin = async () => {
        try {
            const loginResponse = await instance.loginPopup({
                scopes: ["user.read", "openid", "profile", "email"]
            });
            await handleAttendanceSubmit('microsoft', loginResponse.accessToken);
        } catch (err) {
            console.error(err);
            setStatus('ERROR');
            setMessage('Microsoft Authentication failed');
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
                        <p className="text-slate-500 text-sm">Mark your attendance by entering your credentials below. Ensure your location services are enabled if required.</p>
                    </div>
                </div>

                {status === 'ERROR' && (
                    <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl mb-6 flex items-start gap-3 text-sm font-medium">
                        <XCircle size={18} className="shrink-0 mt-0.5" />
                        <span>{message}</span>
                    </div>
                )}

                <div className="space-y-4">
                    {sessionInfo && sessionInfo.isGeofenceEnabled && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6">
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

                    {status === 'LOADING' ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 size={40} className="animate-spin text-brand-500 mb-4" />
                            <p className="text-slate-600 font-medium">Verifying and marking attendance...</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <button 
                                type="button" 
                                onClick={() => googleLogin()}
                                disabled={!sessionInfo}
                                className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 rounded-xl py-3.5 text-[15px] text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Continue with Google
                            </button>

                            <button 
                                type="button" 
                                onClick={microsoftLogin}
                                disabled={!sessionInfo}
                                className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 rounded-xl py-3.5 text-[15px] text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 21 21">
                                    <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                                    <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                                    <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                                </svg>
                                Continue with Microsoft
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicAttend;
