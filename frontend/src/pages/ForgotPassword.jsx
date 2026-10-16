import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        
        try {
            await api.post('/auth/forgot-password', { email });
            setStatus('success');
            setMessage('If an account with that email exists, we have sent a password reset OTP.');
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.message || 'Failed to process request.');
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-2 text-center">Forgot Password</h2>
            <p className="text-slate-400 text-sm text-center mb-6">
                Enter your email address to receive a one-time password (OTP).
            </p>
            
            {status === 'error' && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md mb-4 text-sm">
                    {message}
                </div>
            )}
            
            {status === 'success' && (
                <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 p-3 rounded-md mb-4 text-sm">
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-group mb-6">
                    <label className="form-label">Email</label>
                    <input 
                        type="email" 
                        className="form-input" 
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={status === 'success'}
                    />
                </div>
                
                <button 
                    type="submit" 
                    className="btn btn-primary btn-block py-2.5 mb-4" 
                    disabled={status === 'loading' || status === 'success'}
                >
                    {status === 'loading' ? 'Sending...' : 'Send OTP'}
                </button>
                
                {status === 'success' && (
                    <Link to="/reset-password" state={{ email }} className="btn btn-outline btn-block py-2.5">
                        Proceed to Reset Password
                    </Link>
                )}
            </form>

            <div className="mt-6 text-center text-sm">
                <Link to="/login" className="text-slate-400 hover:text-slate-700 transition">Back to login</Link>
            </div>
        </div>
    );
};

export default ForgotPassword;
