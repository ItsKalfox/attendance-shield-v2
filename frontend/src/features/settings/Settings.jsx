import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { User as UserIcon, Mail, KeyRound, Clock, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { MobileInstallAppCard } from '../../components/InstallPwaModal';
import ReleaseNotesModal from '../../components/ReleaseNotesModal';
import { APP_VERSION, RELEASE_CHANNEL } from '../../config/version';

const Settings = () => {
    const { user, setUser } = useAuth();
    
    // Profile state
    const initialName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    const [name, setName] = useState(initialName);
    const [savingProfile, setSavingProfile] = useState(false);
    const [showReleaseNotes, setShowReleaseNotes] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim());
        }
    }, [user]);

    // Email state
    const email = user?.email || '';
    
    // Password OTP state
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [otpExpiryTime, setOtpExpiryTime] = useState(0);

    // Timer effect for OTP countdown
    useEffect(() => {
        let interval = null;
        if (resendCooldown > 0 || otpExpiryTime > 0) {
            interval = setInterval(() => {
                setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
                setOtpExpiryTime(prev => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [resendCooldown, otpExpiryTime]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleSaveProfile = async () => {
        if (!name.trim()) {
            alert('Name cannot be empty');
            return;
        }
        try {
            setSavingProfile(true);
            const res = await api.patch('/auth/me', { name: name.trim() });
            setUser(res.data);
            alert('Profile updated successfully!');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSendOtp = async () => {
        if (!user?.email) return;
        try {
            setSendingOtp(true);
            setPasswordError('');
            setPasswordSuccess('');
            await api.post('/auth/forgot-password', { email: user.email });
            setOtpSent(true);
            setResendCooldown(60); // 60s cooldown
            setOtpExpiryTime(600); // 10 minutes expiry timer
            setPasswordSuccess(`A 6-digit verification code has been sent to ${user.email}.`);
        } catch (error) {
            setPasswordError(error.response?.data?.message || 'Failed to send verification code');
        } finally {
            setSendingOtp(false);
        }
    };

    const handleResetPassword = async (e) => {
        if (e) e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (!otp || otp.trim().length !== 6) {
            setPasswordError('Please enter the 6-digit verification code.');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match.');
            return;
        }

        if (otpExpiryTime === 0) {
            setPasswordError('Verification code has expired. Please request a new one.');
            return;
        }

        try {
            setSavingPassword(true);
            await api.post('/auth/reset-password', {
                email: user.email,
                otp: otp.trim(),
                newPassword
            });
            setPasswordSuccess('Password has been successfully updated!');
            setOtp('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                setShowPasswordFields(false);
                setOtpSent(false);
                setPasswordSuccess('');
            }, 2500);
        } catch (error) {
            setPasswordError(error.response?.data?.message || 'Failed to update password. Please check your verification code.');
        } finally {
            setSavingPassword(false);
        }
    };

    if (!user) {
        return (
            <div className="w-full animate-fade-in space-y-6">
                {/* Profile Picture Card Skeleton */}
                <div className="card p-6 sm:p-8 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl flex flex-col md:flex-row gap-6 items-center">
                    <div className="skeleton w-24 h-24 rounded-full shrink-0"></div>
                    <div className="flex-1 space-y-2.5 text-center md:text-left">
                        <div className="skeleton w-48 h-6 rounded-md"></div>
                        <div className="skeleton w-64 h-4 rounded"></div>
                        <div className="skeleton w-36 h-6 rounded-lg"></div>
                    </div>
                </div>

                {/* Profile Info Card Skeleton */}
                <div className="card p-6 sm:p-8 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl space-y-6">
                    <div className="space-y-1.5">
                        <div className="skeleton w-32 h-5 rounded"></div>
                        <div className="skeleton w-48 h-3.5 rounded"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <div className="skeleton w-20 h-3.5 rounded"></div>
                            <div className="skeleton w-full h-10 rounded-xl"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="skeleton w-20 h-3.5 rounded"></div>
                            <div className="skeleton w-full h-10 rounded-xl"></div>
                        </div>
                    </div>
                    <div className="skeleton w-28 h-9 rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full animate-fade-in space-y-6">
            
            {/* Profile Picture Card */}
            <div className="card p-6 sm:p-8 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl flex flex-col md:flex-row gap-6 items-center">
                <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-sm border-2 border-slate-100">
                    {user?.avatar ? (
                        <img 
                            src={user.avatar} 
                            alt="Profile" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                            }}
                            className="w-full h-full object-cover" 
                        />
                    ) : null}
                    <UserIcon size={40} className={`text-slate-400 ${user?.avatar ? 'hidden' : ''}`} />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-xl font-bold text-slate-800">{user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}</h2>
                    <p className="text-slate-500 font-medium mb-3">{user?.email}</p>
                    
                    {user?.authProvider === 'GOOGLE' && (
                        <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-slate-600 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 inline-flex">
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Logged in with Google
                        </div>
                    )}
                    
                    {user?.authProvider === 'MICROSOFT' && (
                        <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-slate-600 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 inline-flex">
                            <svg className="w-4 h-4" viewBox="0 0 21 21">
                                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                            </svg>
                            Logged in with Microsoft
                        </div>
                    )}

                    {(!user?.authProvider || user?.authProvider === 'LOCAL') && (
                        <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-slate-600 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 inline-flex">
                            Logged in with Email
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Info Card */}
            <div className="card p-6 sm:p-8 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-800">Profile</h2>
                    <p className="text-sm text-slate-500">Update your name</p>
                </div>
                
                <div className="max-w-md mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">Name</label>
                        <input 
                            type="text" 
                            className="form-input w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-2.5 focus:bg-white transition shadow-sm"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Your full name"
                        />
                    </div>
                </div>
                
                <div className="flex justify-end pt-4 border-t border-slate-200/50">
                    <button 
                        className="btn bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg font-medium text-sm transition shadow-md disabled:opacity-50"
                        onClick={handleSaveProfile}
                        disabled={savingProfile || !name.trim()}
                    >
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Email Card */}
            <div className="card p-6 sm:p-8 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-800">Email</h2>
                    <p className="text-sm text-slate-500">Used to log in to your account</p>
                </div>
                
                <div className="mb-2">
                    <label className="block text-xs font-bold text-slate-700 mb-2">Email Address</label>
                    <div className="flex gap-4">
                        <input 
                            type="email" 
                            className="form-input flex-1 bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-500 cursor-not-allowed shadow-inner"
                            value={email}
                            disabled
                        />
                    </div>
                </div>
            </div>

            {/* Password Reset via Email OTP Card */}
            <div className="card p-6 sm:p-8 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center">
                            <KeyRound size={20} className="mr-2 text-brand-600" />
                            Password & Security
                        </h2>
                        <p className="text-sm text-slate-500">
                            Set or reset your password securely via a 6-digit email verification code
                        </p>
                    </div>
                    {!showPasswordFields && (
                        <button 
                            className="btn bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg font-medium text-sm transition shadow-md shrink-0"
                            onClick={() => {
                                setShowPasswordFields(true);
                                setPasswordError('');
                                setPasswordSuccess('');
                            }}
                        >
                            Reset Password
                        </button>
                    )}
                </div>

                {showPasswordFields && (
                    <div className="mt-6 pt-6 border-t border-slate-100 space-y-6 animate-fade-in">
                        {/* Status Messages */}
                        {passwordError && (
                            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center">
                                <AlertCircle size={16} className="mr-2 shrink-0 text-rose-500" />
                                {passwordError}
                            </div>
                        )}
                        {passwordSuccess && (
                            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center">
                                <CheckCircle2 size={16} className="mr-2 shrink-0 text-emerald-600" />
                                {passwordSuccess}
                            </div>
                        )}

                        {!otpSent ? (
                            /* Step 1: Request OTP */
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="text-sm font-bold text-slate-800 flex items-center">
                                        <Mail size={16} className="mr-2 text-slate-500" />
                                        Send Verification Code
                                    </div>
                                    <p className="text-xs text-slate-500 max-w-md">
                                        We will send a 6-digit one-time password (OTP) to <strong className="text-slate-700">{user?.email}</strong>.
                                    </p>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button 
                                        type="button"
                                        className="btn btn-secondary text-xs py-2 px-3.5 rounded-xl"
                                        onClick={() => setShowPasswordFields(false)}
                                        disabled={sendingOtp}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="button"
                                        className="btn btn-primary text-xs py-2 px-4 rounded-xl shadow-sm shadow-brand-500/20 flex items-center justify-center shrink-0"
                                        onClick={handleSendOtp}
                                        disabled={sendingOtp}
                                    >
                                        {sendingOtp ? (
                                            <>
                                                <RefreshCw size={13} className="mr-1.5 animate-spin" />
                                                Sending OTP...
                                            </>
                                        ) : (
                                            <>
                                                <Mail size={13} className="mr-1.5" />
                                                Send Verification Code
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Step 2: Enter OTP + New Password with Timer */
                            <form onSubmit={handleResetPassword} className="space-y-5">
                                {/* Expiry Notice & Timer Banner */}
                                <div className="p-3.5 bg-brand-50/70 border border-brand-100 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center text-xs font-semibold text-brand-800">
                                        <Clock size={15} className="mr-2 text-brand-600" />
                                        Code expires in:
                                    </div>
                                    <span className="font-mono text-xs font-bold text-brand-700 bg-white px-2.5 py-1 rounded-lg border border-brand-200">
                                        {formatTime(otpExpiryTime)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* 6-Digit OTP */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">
                                            6-Digit OTP Code *
                                        </label>
                                        <input 
                                            type="text" 
                                            maxLength={6}
                                            placeholder="123456"
                                            className="form-input w-full text-center font-mono tracking-widest text-base font-bold bg-white border border-slate-200 rounded-xl py-2.5 focus:border-brand-500 transition shadow-sm"
                                            value={otp}
                                            onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                            required
                                        />
                                    </div>

                                    {/* New Password */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">
                                            New Password *
                                        </label>
                                        <input 
                                            type="password" 
                                            placeholder="Min. 6 characters"
                                            className="form-input w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:border-brand-500 transition shadow-sm"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            minLength={6}
                                            required
                                        />
                                    </div>

                                    {/* Confirm New Password */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">
                                            Confirm Password *
                                        </label>
                                        <input 
                                            type="password" 
                                            placeholder="Re-enter password"
                                            className="form-input w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:border-brand-500 transition shadow-sm"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            minLength={6}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Controls: Resend, Cancel, Save */}
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100">
                                    <button 
                                        type="button"
                                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:text-slate-400 flex items-center transition"
                                        onClick={handleSendOtp}
                                        disabled={resendCooldown > 0 || sendingOtp}
                                    >
                                        <RefreshCw size={13} className={`mr-1.5 ${sendingOtp ? 'animate-spin' : ''}`} />
                                        {resendCooldown > 0 
                                            ? `Resend code in ${resendCooldown}s` 
                                            : sendingOtp ? 'Sending...' : 'Resend Verification Code'
                                        }
                                    </button>

                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <button 
                                            type="button"
                                            className="btn btn-secondary text-xs py-2 px-4 rounded-xl flex-1 sm:flex-initial"
                                            onClick={() => {
                                                setShowPasswordFields(false);
                                                setOtp('');
                                                setNewPassword('');
                                                setConfirmPassword('');
                                                setPasswordError('');
                                                setPasswordSuccess('');
                                            }}
                                            disabled={savingPassword}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit"
                                            className="btn btn-primary text-xs py-2 px-5 rounded-xl shadow-sm shadow-brand-500/20 flex items-center justify-center flex-1 sm:flex-initial"
                                            disabled={savingPassword || !otp || !newPassword || !confirmPassword || otpExpiryTime === 0}
                                        >
                                            {savingPassword ? (
                                                <>
                                                    <RefreshCw size={13} className="mr-1.5 animate-spin" />
                                                    Updating...
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheck size={14} className="mr-1.5" />
                                                    Set New Password
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
            
            {/* Application & Version Information Card */}
            <div className="card p-6 sm:p-8 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <img 
                            src="/apple-touch-icon.png" 
                            alt="Attendance Shield" 
                            className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-slate-200/80 shrink-0" 
                        />
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h2 className="text-lg font-bold text-slate-800">Attendance Shield</h2>
                                <span className="px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase rounded-md bg-slate-100 border border-slate-200 text-slate-500 select-none">
                                    {RELEASE_CHANNEL}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Secure real-time classroom attendance verification platform
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-500">Version</span>
                            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80">
                                v{APP_VERSION}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowReleaseNotes(true)}
                            className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-500/20 hover:shadow-md cursor-pointer"
                        >
                            Release Notes
                        </button>
                    </div>
                </div>
            </div>

            {/* Permanent Mobile Install & Instructions Card (Mobile-only) */}
            <MobileInstallAppCard />

            {/* Release Notes Modal */}
            <ReleaseNotesModal 
                isOpen={showReleaseNotes} 
                onClose={() => setShowReleaseNotes(false)} 
            />

        </div>
    );
};

export default Settings;
