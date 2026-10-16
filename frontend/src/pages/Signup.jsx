import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import { useMsal } from '@azure/msal-react';
import api from '../services/api';
import { 
    Mail, 
    Lock, 
    User, 
    ArrowRight, 
    ArrowLeft, 
    CheckCircle2, 
    ShieldCheck, 
    Eye, 
    EyeOff 
} from 'lucide-react';

const STORAGE_KEY = 'attendance_shield_signup_flow';

// Retrieve cached signup progress to survive app-switching / page reloads
const getCachedSignupState = () => {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            // Restore only if saved within the last 15 minutes
            if (parsed.timestamp && Date.now() - parsed.timestamp < 15 * 60 * 1000) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Failed to parse cached signup state:', e);
    }
    return null;
};

// 3 Pulsing Dots Loader Component
const PulsingDots = () => (
    <div className="flex items-center justify-center gap-1.5 py-1">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: '200ms' }} />
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: '400ms' }} />
    </div>
);

const Signup = () => {
    const [searchParams] = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/app/dashboard';
    const emailParam = searchParams.get('email') || '';

    const cached = getCachedSignupState();

    // Step state: 1 = Details, 2 = Verify OTP, 3 = Password
    const [step, setStep] = useState(cached?.step || 1);

    // Form fields
    const [name, setName] = useState(cached?.name || '');
    const [email, setEmail] = useState(cached?.email || emailParam || '');
    const [otp, setOtp] = useState('');
    const [verificationToken, setVerificationToken] = useState(cached?.verificationToken || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState(
        cached?.step === 2 ? 'Verification code sent to your email.' : ''
    );
    const [loading, setLoading] = useState(false);

    // Initial resend cooldown calculation
    const getInitialCooldown = () => {
        if (cached?.cooldownUntil && cached.cooldownUntil > Date.now()) {
            return Math.ceil((cached.cooldownUntil - Date.now()) / 1000);
        }
        return 0;
    };
    const [resendCooldown, setResendCooldown] = useState(getInitialCooldown);

    const { signup, loginWithGoogle, loginWithMicrosoft } = useAuth();
    const navigate = useNavigate();
    const { instance } = useMsal();

    // Persist progress to sessionStorage so switching apps to check email never resets state
    useEffect(() => {
        try {
            const stateToSave = {
                step,
                name,
                email,
                verificationToken,
                cooldownUntil: resendCooldown > 0 ? Date.now() + resendCooldown * 1000 : null,
                timestamp: Date.now()
            };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.warn('Failed to save signup flow state:', e);
        }
    }, [step, name, email, verificationToken, resendCooldown]);

    // Timer effect for resend cooldown
    useEffect(() => {
        let timer;
        if (resendCooldown > 0) {
            timer = setInterval(() => {
                setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // Google OAuth
    const googleLogin = useGoogleLogin({
        scope: 'openid email profile',
        prompt: 'select_account',
        onSuccess: async (tokenResponse) => {
            try {
                setError('');
                setLoading(true);
                sessionStorage.removeItem(STORAGE_KEY);
                await loginWithGoogle(tokenResponse.access_token);
                navigate(redirectUrl);
            } catch (err) {
                setError(err.response?.data?.message || 'Google Login failed');
                setLoading(false);
            }
        },
        onError: () => setError('Google Login failed')
    });

    // Microsoft OAuth
    const microsoftLogin = async () => {
        try {
            setError('');
            setLoading(true);
            const loginResponse = await instance.loginPopup({
                scopes: ["user.read", "openid", "profile", "email"]
            });
            sessionStorage.removeItem(STORAGE_KEY);
            await loginWithMicrosoft(loginResponse.accessToken);
            navigate(redirectUrl);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Microsoft Login failed');
            setLoading(false);
        }
    };

    // Step 1: Send OTP to verify email
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }

        if (!email.trim()) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/send-signup-otp', {
                name: name.trim(),
                email: email.trim().toLowerCase()
            });

            setSuccessMessage(res.data.message || 'Verification code sent to your email.');
            setResendCooldown(60);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResendOtp = async () => {
        if (resendCooldown > 0 || loading) return;
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            const res = await api.post('/auth/send-signup-otp', {
                name: name.trim(),
                email: email.trim().toLowerCase()
            });

            setSuccessMessage(res.data.message || 'New verification code sent!');
            setResendCooldown(60);
            setOtp('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        const cleanOtp = otp.trim();
        if (!cleanOtp || cleanOtp.length !== 6) {
            setError('Please enter the 6-digit verification code');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/verify-signup-otp', {
                email: email.trim().toLowerCase(),
                otp: cleanOtp
            });

            if (res.data.verificationToken) {
                setVerificationToken(res.data.verificationToken);
                setSuccessMessage('Email verified successfully!');
                setStep(3);
            } else {
                setError('Verification succeeded but token was missing. Please try again.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired verification code.');
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Complete Sign Up with Password
    const handleCompleteSignup = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!verificationToken) {
            setError('Email verification expired. Please go back and verify your email again.');
            setStep(2);
            return;
        }

        setLoading(true);
        try {
            await signup({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password,
                verificationToken
            });

            // Clear stored signup progress on successful account creation
            sessionStorage.removeItem(STORAGE_KEY);

            // Automatically logged in via AuthContext! Navigate to dashboard
            navigate(redirectUrl);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to complete registration.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in w-full">
            {/* Header */}
            <div className="text-center mb-6">
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                    {step === 1 && 'Create Your Account'}
                    {step === 2 && 'Verify Your Email'}
                    {step === 3 && 'Set Your Password'}
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
                    {step === 1 && 'Enter your name and work email to get started'}
                    {step === 2 && 'Enter the 6-digit verification code sent to your inbox'}
                    {step === 3 && 'Choose a secure password to complete your account'}
                </p>

                {/* Sleek Step Progress Indicator */}
                <div className="flex items-center justify-center gap-2 mt-4">
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? 'w-8 bg-brand-600' : 'w-4 bg-slate-200'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? 'w-8 bg-brand-600' : 'w-4 bg-slate-200'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 3 ? 'w-8 bg-brand-600' : 'w-4 bg-slate-200'}`} />
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-4 text-xs sm:text-sm shadow-sm flex items-start">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {/* Subtle Success Message (Normal gray text, no green background box) */}
            {successMessage && !error && (
                <p className="text-xs text-slate-500 text-center mb-4 leading-normal">
                    {successMessage}
                </p>
            )}

            {/* STEP 1: Name and Email */}
            {step === 1 && (
                <form onSubmit={handleSendOtp} className="animate-fade-in">
                    {/* Name Input */}
                    <div className="form-group mb-4">
                        <label className="form-label flex items-center gap-1.5">
                            <User size={14} className="text-slate-400" />
                            <span>Name</span>
                        </label>
                        <input 
                            type="text" 
                            name="name"
                            className="form-input" 
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>

                    {/* Email Input */}
                    <div className="form-group mb-6">
                        <label className="form-label flex items-center gap-1.5">
                            <Mail size={14} className="text-slate-400" />
                            <span>Email</span>
                        </label>
                        <input 
                            type="email" 
                            name="email"
                            className="form-input" 
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {/* Submit Button with 3 Pulsing Dots on Loading */}
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="btn btn-primary btn-block py-3 text-sm font-bold shadow-brand-500/30 shadow-lg flex items-center justify-center gap-2 transition"
                    >
                        {loading ? (
                            <PulsingDots />
                        ) : (
                            <>
                                <span>Continue</span>
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>

                    {/* Social Logins */}
                    <div className="mt-8">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-3 bg-white text-slate-400 font-medium uppercase tracking-wider">Or continue with</span>
                            </div>
                        </div>

                        <button 
                            type="button" 
                            onClick={() => googleLogin()}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 rounded-xl py-2.5 text-sm text-slate-700 font-semibold hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 rounded-xl py-2.5 text-sm text-slate-700 font-semibold hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50 mt-3"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 21 21">
                                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                            </svg>
                            Continue with Microsoft
                        </button>
                    </div>
                </form>
            )}

            {/* STEP 2: Verify Email OTP */}
            {step === 2 && (
                <form onSubmit={handleVerifyOtp} className="animate-fade-in">
                    {/* Active Email Notice (No edit button) */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-5 flex items-center justify-center text-xs text-slate-500">
                        <Mail size={14} className="text-slate-400 mr-2 shrink-0" />
                        <span className="truncate">
                            Verification code sent to <strong className="text-slate-700">{email}</strong>
                        </span>
                    </div>

                    {/* 6-digit Code input */}
                    <div className="form-group mb-5">
                        <label className="form-label text-center block mb-2 font-semibold text-slate-700">
                            Enter 6-Digit Code
                        </label>
                        <input 
                            type="text" 
                            name="otp"
                            maxLength={6}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            className="form-input text-center font-mono text-2xl font-bold tracking-[0.4em] sm:tracking-[0.6em] py-3.5 bg-slate-50/50" 
                            placeholder="••••••"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                            autoFocus
                            required
                        />
                    </div>

                    {/* Submit OTP */}
                    <button 
                        type="submit" 
                        disabled={loading || otp.length !== 6}
                        className="btn btn-primary btn-block py-3 text-sm font-bold shadow-brand-500/30 shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                        {loading ? (
                            <PulsingDots />
                        ) : (
                            <>
                                <ShieldCheck size={17} />
                                <span>Verify Code</span>
                            </>
                        )}
                    </button>

                    {/* Resend and Navigation */}
                    <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                        <button
                            type="button"
                            onClick={() => {
                                setStep(1);
                                setError('');
                                setSuccessMessage('');
                            }}
                            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition"
                        >
                            <ArrowLeft size={13} />
                            <span>Back to Details</span>
                        </button>

                        <div>
                            {resendCooldown > 0 ? (
                                <span className="text-slate-400 font-mono">
                                    Resend code in {resendCooldown}s
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={loading}
                                    className="text-brand-600 hover:text-brand-700 font-semibold transition"
                                >
                                    Resend Code
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            )}

            {/* STEP 3: Password Setup & Final Sign Up */}
            {step === 3 && (
                <form onSubmit={handleCompleteSignup} className="animate-fade-in">
                    {/* Verified Email Banner */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 mb-5 flex items-center gap-2 text-xs text-slate-600">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span className="truncate">
                            Verified: <strong className="text-slate-800">{email}</strong>
                        </span>
                    </div>

                    {/* Password */}
                    <div className="form-group mb-4">
                        <label className="form-label flex items-center gap-1.5">
                            <Lock size={14} className="text-slate-400" />
                            <span>Password</span>
                        </label>
                        <div className="relative">
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                name="password"
                                className="form-input pr-10" 
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Must be at least 6 characters</p>
                    </div>

                    {/* Confirm Password */}
                    <div className="form-group mb-6">
                        <label className="form-label flex items-center gap-1.5">
                            <Lock size={14} className="text-slate-400" />
                            <span>Confirm Password</span>
                        </label>
                        <div className="relative">
                            <input 
                                type={showConfirmPassword ? 'text' : 'password'} 
                                name="confirmPassword"
                                className="form-input pr-10" 
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                            >
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="btn btn-primary btn-block py-3 text-sm font-bold shadow-brand-500/30 shadow-lg flex items-center justify-center gap-2 transition"
                    >
                        {loading ? (
                            <PulsingDots />
                        ) : (
                            <>
                                <CheckCircle2 size={17} />
                                <span>Create Account & Sign In</span>
                            </>
                        )}
                    </button>
                </form>
            )}

            {/* Bottom Footer */}
            <div className="mt-8 text-center text-xs sm:text-sm text-slate-500 font-medium">
                Already have an account?{' '}
                <Link 
                    to={`/login${searchParams.toString() ? `?${searchParams.toString()}` : ''}`} 
                    className="text-brand-600 font-bold hover:text-brand-700 ml-1 transition-colors"
                >
                    Log in
                </Link>
            </div>
        </div>
    );
};

export default Signup;
