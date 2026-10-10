import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, ShieldCheck, CheckCircle2, X, ArrowRight, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import toast from 'react-hot-toast';

const PendingInvitationModal = ({ invitation, onResolved }) => {
    const { refreshOrganizations, switchOrganization } = useOrganization();
    const [loading, setLoading] = useState(false);
    const [actionType, setActionType] = useState(null); // 'accept' or 'decline'

    if (!invitation) return null;

    const org = invitation.organizationId || {};
    const orgName = org.name || 'Organization';
    const orgAvatar = org.avatarUrl;
    const inviterName = invitation.invitedBy 
        ? `${invitation.invitedBy.firstName || ''} ${invitation.invitedBy.lastName || ''}`.trim()
        : null;

    const handleAccept = async () => {
        setLoading(true);
        setActionType('accept');
        try {
            const res = await api.post(`/invitations/${invitation._id}/accept-id`);
            toast.success(`You joined ${orgName} as an Instructor!`);
            
            if (refreshOrganizations) {
                await refreshOrganizations();
            }
            if (org._id && switchOrganization) {
                switchOrganization(org._id);
            }
            onResolved(invitation._id);
        } catch (error) {
            console.error('Failed to accept invitation:', error);
            toast.error(error.response?.data?.message || 'Failed to accept invitation');
        } finally {
            setLoading(false);
            setActionType(null);
        }
    };

    const handleDecline = async () => {
        setLoading(true);
        setActionType('decline');
        try {
            await api.post(`/invitations/${invitation._id}/decline`);
            toast.success('Invitation declined');
            onResolved(invitation._id);
        } catch (error) {
            console.error('Failed to decline invitation:', error);
            toast.error(error.response?.data?.message || 'Failed to decline invitation');
        } finally {
            setLoading(false);
            setActionType(null);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-fade-in">
            <div className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[90dvh] flex flex-col">
                {/* Decorative Top Gradient Header */}
                <div className="h-2.5 bg-gradient-to-r from-brand-500 via-indigo-500 to-emerald-500 shrink-0"></div>

                <div className="p-5 sm:p-7 text-center overflow-y-auto min-h-0">
                    {/* Organization Logo / Badge */}
                    <div className="mx-auto mb-4 flex items-center justify-center">
                        {orgAvatar ? (
                            <img 
                                src={orgAvatar} 
                                alt={orgName} 
                                className="w-20 h-20 rounded-2xl object-cover shadow-lg border-2 border-white ring-2 ring-brand-100" 
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">
                                <Building2 size={38} />
                            </div>
                        )}
                    </div>

                    {/* Role Tag */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs mb-3 border border-emerald-200/80 shadow-xs">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        <span>Instructor Invitation</span>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">
                        {orgName}
                    </h2>

                    {org.description && (
                        <p className="text-xs text-slate-500 mb-3 line-clamp-2 px-4">{org.description}</p>
                    )}

                    <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 my-5 text-left">
                        <p className="text-xs text-slate-600 leading-relaxed">
                            {inviterName ? (
                                <><strong>{inviterName}</strong> has invited you to join this organization as a course <strong>Instructor</strong>.</>
                            ) : (
                                <>You have been invited to join this organization as a course <strong>Instructor</strong>.</>
                            )}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-2">
                            As an Instructor, you can create sessions, manage course enrollments, and track student attendance records.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2.5 pt-1">
                        <button 
                            type="button" 
                            className="btn btn-primary btn-block py-3.5 text-sm font-bold shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2"
                            onClick={handleAccept}
                            disabled={loading}
                        >
                            {loading && actionType === 'accept' ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Joining Organization...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={18} />
                                    <span>Accept Invitation & Join</span>
                                </>
                            )}
                        </button>

                        <button 
                            type="button" 
                            className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100/70 font-semibold rounded-xl transition"
                            onClick={handleDecline}
                            disabled={loading}
                        >
                            {loading && actionType === 'decline' ? 'Declining...' : 'Decline Invitation'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PendingInvitationModal;
