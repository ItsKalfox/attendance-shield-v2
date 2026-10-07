import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle, XCircle, Loader2, Building2, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';

const Invitation = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { refreshOrganizations, switchOrganization } = useOrganization();
    
    const [status, setStatus] = useState('loading'); // loading, form, success, error
    const [invitation, setInvitation] = useState(null);
    const [message, setMessage] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        
        const fetchInvitation = async () => {
            try {
                const res = await api.get(`/invitations/${token}`);
                const data = res.data;
                setInvitation(data);
                
                if (data.status && data.status !== 'PENDING') {
                    setStatus('error');
                    setMessage(`This invitation is already ${data.status.toLowerCase()}.`);
                    return;
                }
                
                if (user && user.email && data.email && user.email.toLowerCase() !== data.email.toLowerCase()) {
                    setStatus('error');
                    setMessage(`This invitation was sent to ${data.email}, but you are currently logged in as ${user.email}. Please log out or switch accounts to accept.`);
                    return;
                }
                
                setStatus('form');
            } catch (error) {
                console.error("Failed to fetch invitation details:", error);
                setStatus('error');
                setMessage(error.response?.data?.message || 'Invalid or expired invitation token.');
            }
        };

        fetchInvitation();
    }, [token, user, authLoading]);

    const handleAccept = async () => {
        if (!user) {
            navigate(`/signup?email=${encodeURIComponent(invitation?.email || '')}&redirect=${encodeURIComponent(`/invitation/${token}`)}`);
            return;
        }

        setActionLoading(true);
        try {
            await api.post(`/invitations/${token}/accept`);
            setStatus('success');
            setMessage(`You have successfully joined ${typeof invitation?.organization === 'object' ? invitation.organization.name : invitation?.organization || 'the organization'} as an Instructor!`);
            
            // Refresh organization context so newly joined org is immediately available
            if (refreshOrganizations) {
                await refreshOrganizations();
            }
            if (invitation?.organization?._id && switchOrganization) {
                switchOrganization(invitation.organization._id);
            }
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
                    <p className="text-sm text-slate-500 mt-1">Connecting to Attendance Shield...</p>
                </div>
            </div>
        );
    }

    const orgName = typeof invitation?.organization === 'object' ? invitation.organization.name : invitation?.organization || 'Organization';
    const orgAvatar = typeof invitation?.organization === 'object' ? invitation.organization.avatarUrl : null;
    const orgDescription = typeof invitation?.organization === 'object' ? invitation.organization.description : '';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/20 to-slate-100 flex items-center justify-center p-4">
            <div className="card w-full max-w-md text-center animate-fade-in p-8 bg-white shadow-2xl border border-slate-100 rounded-3xl relative overflow-hidden">
                {/* Decorative top accent */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-500 to-indigo-600"></div>

                {status === 'form' && (
                    <>
                        {/* Organization Logo / Badge */}
                        <div className="mx-auto mb-5 flex items-center justify-center">
                            {orgAvatar ? (
                                <img 
                                    src={orgAvatar} 
                                    alt={orgName} 
                                    className="w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-slate-100" 
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/25">
                                    <Building2 size={36} />
                                </div>
                            )}
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 font-semibold text-xs mb-3 border border-brand-100">
                            <ShieldCheck size={14} />
                            <span>Official Instructor Invitation</span>
                        </div>

                        <h2 className="text-2xl font-bold text-slate-800 mb-1 tracking-tight">{orgName}</h2>
                        {orgDescription && (
                            <p className="text-xs text-slate-500 mb-4 line-clamp-2">{orgDescription}</p>
                        )}
                        <p className="text-slate-600 text-sm mb-6 mt-2">
                            You've been invited to join as an <strong className="text-brand-600 font-bold uppercase tracking-wider">{invitation?.role || 'Instructor'}</strong>.
                        </p>

                        {!user ? (
                            <div className="bg-slate-50/80 p-5 rounded-2xl mb-2 border border-slate-200/80 text-left">
                                <div className="flex items-center gap-2 mb-3">
                                    <UserCheck size={16} className="text-slate-500" />
                                    <span className="text-xs font-semibold text-slate-700">Invited Email:</span>
                                    <span className="text-xs font-mono font-bold text-brand-700">{invitation?.email}</span>
                                </div>
                                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                    Sign up or log in with this email to confirm your role and start managing attendance sessions.
                                </p>
                                <div className="space-y-2.5">
                                    <button 
                                        className="btn btn-primary btn-block py-2.5 flex items-center justify-center gap-2 font-semibold shadow-md"
                                        onClick={() => navigate(`/signup?email=${encodeURIComponent(invitation?.email || '')}&redirect=${encodeURIComponent(`/invitation/${token}`)}`)}
                                    >
                                        <span>Create Account</span>
                                        <ArrowRight size={16} />
                                    </button>
                                    <button 
                                        className="btn btn-outline btn-block py-2.5 text-slate-700 font-medium"
                                        onClick={() => navigate(`/login?email=${encodeURIComponent(invitation?.email || '')}&redirect=${encodeURIComponent(`/invitation/${token}`)}`)}
                                    >
                                        Log In to Existing Account
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                                        {user.firstName?.charAt(0) || 'U'}
                                    </div>
                                    <div className="truncate text-xs">
                                        <p className="font-semibold text-slate-800 truncate">{user.firstName} {user.lastName}</p>
                                        <p className="text-slate-500 font-mono truncate">{user.email}</p>
                                    </div>
                                </div>

                                <button 
                                    className="btn btn-primary btn-block py-3.5 text-base font-bold shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2" 
                                    onClick={handleAccept}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Joining Organization...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Accept & Join Organization</span>
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {status === 'success' && (
                    <div className="py-4">
                        <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-200 shadow-sm">
                            <CheckCircle size={42} className="text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-slate-800">Welcome Aboard!</h2>
                        <p className="text-slate-600 text-sm mb-8 leading-relaxed">{message}</p>
                        <button 
                            className="btn btn-primary btn-block py-3 font-semibold shadow-md" 
                            onClick={() => navigate('/app/dashboard')}
                        >
                            Go to Instructor Dashboard
                        </button>
                    </div>
                )}
                
                {status === 'error' && (
                    <div className="py-4">
                        <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-200 shadow-sm">
                            <XCircle size={42} className="text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-slate-800">Invitation Notice</h2>
                        <p className="text-slate-600 text-sm mb-8 leading-relaxed">{message}</p>
                        <button 
                            className="btn btn-outline btn-block py-2.5 font-medium" 
                            onClick={() => navigate('/')}
                        >
                            Return to Home
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Invitation;
