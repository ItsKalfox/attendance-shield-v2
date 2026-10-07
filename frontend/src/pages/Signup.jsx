import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import { useMsal } from '@azure/msal-react';

const Signup = () => {
    const [searchParams] = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/app/dashboard';
    const emailParam = searchParams.get('email') || '';

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: emailParam,
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { signup, loginWithGoogle, loginWithMicrosoft } = useAuth();
    const navigate = useNavigate();
    const { instance } = useMsal();

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                setError('');
                setLoading(true);
                await loginWithGoogle(tokenResponse.access_token);
                navigate(redirectUrl);
            } catch (err) {
                setError(err.response?.data?.message || 'Google Login failed');
                setLoading(false);
            }
        },
        onError: () => setError('Google Login failed')
    });

    const microsoftLogin = async () => {
        try {
            setError('');
            setLoading(true);
            const loginResponse = await instance.loginPopup({
                scopes: ["user.read"]
            });
            await loginWithMicrosoft(loginResponse.accessToken);
            navigate(redirectUrl);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Microsoft Login failed');
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const nextStep = (e) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName || !formData.email) {
            setError('Please fill in all fields');
            return;
        }
        setError('');
        setStep(2);
    };

    const prevStep = () => {
        setStep(1);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await signup({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password
            });
            navigate(redirectUrl);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in w-full">
            <h2 className="text-2xl font-bold mb-2 text-center text-slate-800 tracking-tight -mt-4">Create Account</h2>
            <p className="text-slate-500 text-sm font-medium text-center mb-10">
                Step {step} of 2
            </p>
            
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-4 text-sm shadow-sm flex items-center">
                    <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}

            <form onSubmit={step === 1 ? nextStep : handleSubmit}>
                {step === 1 && (
                    <div className="animate-fade-in">
                        <div className="flex gap-4 mb-4">
                            <div className="form-group mb-0 w-1/2">
                                <label className="form-label">First Name</label>
                                <input 
                                    type="text" 
                                    name="firstName"
                                    className="form-input" 
                                    placeholder="John"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group mb-0 w-1/2">
                                <label className="form-label">Last Name</label>
                                <input 
                                    type="text" 
                                    name="lastName"
                                    className="form-input" 
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        
                        <div className="form-group mb-6">
                            <label className="form-label">Email</label>
                            <input 
                                type="email" 
                                name="email"
                                className="form-input" 
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-block py-3 text-base shadow-brand-500/30 shadow-lg">
                            Continue
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-fade-in">
                        <div className="form-group mb-4">
                            <label className="form-label">Password</label>
                            <input 
                                type="password" 
                                name="password"
                                className="form-input" 
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                        
                        <div className="form-group mb-6">
                            <label className="form-label">Confirm Password</label>
                            <input 
                                type="password" 
                                name="confirmPassword"
                                className="form-input" 
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="flex gap-4 pt-2">
                            <button type="button" onClick={prevStep} className="btn btn-outline w-1/3 py-3" disabled={loading}>
                                Back
                            </button>
                            <button type="submit" className="btn btn-primary flex-1 py-3 shadow-brand-500/30 shadow-lg" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Account'}
                            </button>
                        </div>
                    </div>
                )}
            </form>

            <div className="mt-8">
                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-3 bg-white text-slate-400 font-medium">Or continue with</span>
                    </div>
                </div>

                <button 
                    type="button" 
                    onClick={() => googleLogin()}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 rounded-xl py-2 text-sm text-slate-600 font-semibold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
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
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 rounded-xl py-2 text-sm text-slate-600 font-semibold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 mt-3"
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

            <div className="mt-8 text-center text-sm text-slate-500 font-medium">
                Already have an account? <Link to={`/login${searchParams.toString() ? `?${searchParams.toString()}` : ''}`} className="text-brand-600 font-bold hover:text-brand-700 ml-1 transition-colors">Log in</Link>
            </div>
        </div>
    );
};

export default Signup;
