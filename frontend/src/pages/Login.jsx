import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/app/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-8 text-center text-slate-800 tracking-tight">Welcome Back</h2>
            
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
                    <div className="flex justify-between items-center mb-2">
                        <label className="form-label !mb-0">Password</label>
                        <Link to="/forgot-password" className="text-sm text-brand-400 hover:text-brand-300 font-medium transition-colors">
                            Forgot password?
                        </Link>
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

                <div className="pt-2">
                    <button type="submit" className="btn btn-primary btn-block py-3 text-base" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </div>
            </form>

            <div className="mt-8 text-center text-sm text-slate-400">
                Don't have an account? <Link to="/signup" className="text-brand-400 font-semibold hover:text-brand-300 ml-1 transition-colors">Create one</Link>
            </div>
        </div>
    );
};

export default Login;
