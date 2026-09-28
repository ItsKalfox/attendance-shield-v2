import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Invitation = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    
    const [status, setStatus] = useState('loading'); // loading, form, success, error
    const [invitation, setInvitation] = useState(null);
    const [message, setMessage] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        
        const fetchInvitation = async () => {
            try {
                const res = await api.get(`/invitations/${token}`);
                setInvitation(res.data);
                
                if (res.data.status !== 'PENDING') {
                    setStatus('error');
                    setMessage(`This invitation is already ${res.data.status.toLowerCase()}.`);
                    return;
                }
                
                if (user && user.email !== res.data.email) {
                    setStatus('error');
                    setMessage(`This invitation is for ${res.data.email}, but you are logged in as ${user.email}.`);
                    return;
                }
                
                setStatus('form');
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Invalid or expired invitation token.');
            }
        };

        fetchInvitation();
    }, [token, user, authLoading]);

    const handleAccept = async () => {
        if (!user) {
            // Usually we'd redirect to signup with email prefilled, but for simplicity:
            navigate('/signup');
            return;
        }

        setActionLoading(true);
        try {
            await api.post(`/invitations/${token}/accept`);
            setStatus('success');
            setMessage('You have successfully joined the organization!');
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.message || 'Failed to accept invitation.');
        } finally {
            setActionLoading(false);
        }
    };

    if (authLoading || status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center animate-fade-in">
                    <Loader2 size={48} className="text-brand-500 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800">Verifying Invitation...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="card w-full max-w-md text-center animate-fade-in p-8 bg-white shadow-xl border border-slate-100 rounded-2xl">
                {status === 'form' && (
                    <>
                        <h2 className="text-2xl font-bold mb-2 text-slate-800">Organization Invitation</h2>
                        <p className="text-slate-500 mb-6">
                            You have been invited to join <strong>{invitation.organization || 'an organization'}</strong> as an <strong>{invitation.role}</strong>.
                        </p>
                        
                        {!user ? (
                            <div className="bg-slate-50 p-6 rounded-xl mb-6 border border-slate-200">
                                <p className="text-sm mb-4 text-slate-600">You need an account to accept this invitation.</p>
                                <button className="btn btn-primary btn-block" onClick={() => navigate('/signup')}>
                                    Create Account
                                </button>
                                <button className="btn btn-outline btn-block mt-3" onClick={() => navigate('/login')}>
                                    Log In
                                </button>
                            </div>
                        ) : (
                            <button 
                                className="btn btn-primary btn-block py-3" 
                                onClick={handleAccept}
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Accepting...' : 'Accept Invitation'}
                            </button>
                        )}
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={40} className="text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-slate-800">Success!</h2>
                        <p className="text-slate-500 mb-8">{message}</p>
                        <button className="btn btn-primary btn-block py-3" onClick={() => navigate('/app/dashboard')}>
                            Go to Dashboard
                        </button>
                    </>
                )}
                
                {status === 'error' && (
                    <>
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle size={40} className="text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-slate-800">Invitation Error</h2>
                        <p className="text-slate-500 mb-8">{message}</p>
                        <button className="btn btn-outline btn-block" onClick={() => navigate('/')}>
                            Return Home
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default Invitation;
