import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ResetPassword = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        
        try {
            await api.post('/auth/reset-password', { email, otp, newPassword });
            setStatus('success');
            setMessage('Password reset successful. You can now log in.');
            setTimeout(() => navigate('/login'), 2000);
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.message || 'Failed to reset password.');
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-2 text-center">Reset Password</h2>
            <p className="text-slate-400 text-sm text-center mb-6">
                Enter the OTP sent to your email and your new password.
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
                <div className="form-group mb-4">
                    <label className="form-label">Email</label>
                    <input 
                        type="email" 
                        className="form-input" 
                        placeholder="john@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                
                <div className="form-group mb-4">
                    <label className="form-label">OTP Code</label>
                    <input 
                        type="text" 
                        className="form-input text-center tracking-widest font-mono" 
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        required
                    />
                </div>
                
                <div className="form-group mb-6">
                    <label className="form-label">New Password</label>
                    <input 
                        type="password" 
                        className="form-input" 
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                    />
                </div>
                
                <button 
                    type="submit" 
                    className="btn btn-primary btn-block py-2.5" 
                    disabled={status === 'loading' || status === 'success'}
                >
                    {status === 'loading' ? 'Resetting...' : 'Reset Password'}
                </button>
            </form>

            <div className="mt-6 text-center text-sm">
                <Link to="/login" className="text-slate-400 hover:text-white transition">Back to login</Link>
            </div>
        </div>
    );
};

export default ResetPassword;
