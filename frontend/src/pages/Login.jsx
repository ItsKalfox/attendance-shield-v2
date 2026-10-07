import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import { useMsal } from '@azure/msal-react';

const Login = () => {
    const [searchParams] = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/app/dashboard';
    const emailParam = searchParams.get('email') || '';

    const [email, setEmail] = useState(emailParam);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, loginWithGoogle, loginWithMicrosoft } = useAuth();
    const navigate = useNavigate();
    const { instance } = useMsal();

    const googleLogin = useGoogleLogin({
        scope: 'openid email profile',
        prompt: 'select_account',
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate(redirectUrl);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in w-full">
            <h2 className="text-2xl font-bold mb-2 text-center text-slate-800 tracking-tight -mt-4">Welcome Back!</h2>
            <p className="text-sm text-slate-500 text-center mb-12 font-medium">Please enter your details to sign in to your account.</p>
            
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl mb-6 text-sm flex items-center shadow-lg shadow-red-500/5">
                    <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="form-label">Email Address</label>
                    <input 
                        type="email" 
                        className="form-input" 
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                
                <div>
                    <div className="mb-2">
                        <label className="form-label !mb-0">Password</label>
                    </div>
                    <input 
                        type="password" 
                        className="form-input" 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <div className="pt-2 flex flex-col items-center">
                    <button type="submit" className="btn btn-primary btn-block py-3 text-base shadow-brand-500/30 shadow-lg" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                    <Link to="/forgot-password" className="text-sm text-brand-600 hover:text-brand-700 font-semibold transition-colors mt-4">
                        Forgot password?
                    </Link>
                </div>
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
                Don't have an account? <Link to={`/signup${searchParams.toString() ? `?${searchParams.toString()}` : ''}`} className="text-brand-600 font-bold hover:text-brand-700 ml-1 transition-colors">Create one</Link>
            </div>
        </div>
    );
};

export default Login;
