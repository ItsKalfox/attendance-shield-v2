import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Edit3 } from 'lucide-react';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import ConfirmModal from '../../components/ConfirmModal';

const ViewMemberModal = ({ member, onClose, onUpdated, onDelete }) => {
    const { activeOrganization } = useOrganization();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [currentMember, setCurrentMember] = useState(member);

    useEffect(() => {
        setCurrentMember(member);
    }, [member]);

    // Organization-scoped roster values (fallback to userId attributes)
    const initialName = (currentMember?.name !== undefined && currentMember?.name !== '')
        ? currentMember.name 
        : (currentMember?.userId?.name || `${currentMember?.firstName || currentMember?.userId?.firstName || ''} ${currentMember?.lastName || currentMember?.userId?.lastName || ''}`.trim());
    const initialStudentId = currentMember?.studentId || '';

    const [formData, setFormData] = useState({
        name: initialName,
        studentId: initialStudentId
    });

    useEffect(() => {
        setFormData({
            name: initialName,
            studentId: initialStudentId
        });
    }, [initialName, initialStudentId]);

    const isOwner = activeOrganization?.userRole === 'OWNER';
    const isAttendee = currentMember?.role === 'ATTENDEE';

    const isDirty = Boolean(isEditing && isOwner && isAttendee && (
        formData.name !== initialName ||
        formData.studentId !== initialStudentId
    ));

    const { isShaking, handleBackdropClick } = useModalDismiss({
        onClose,
        isDirty
    });

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        try {
            setLoading(true);
            const response = await api.patch(`/organizations/${activeOrganization._id}/members/${currentMember._id}`, {
                name: formData.name.trim(),
                studentId: formData.studentId.trim()
            });
            setCurrentMember(response.data);
            setFormData({
                name: response.data.name !== undefined ? response.data.name : formData.name.trim(),
                studentId: response.data.studentId !== undefined ? response.data.studentId : formData.studentId.trim()
            });
            onUpdated(response.data);
            setIsEditing(false);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update member roster details');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setFormData({
            name: initialName,
            studentId: initialStudentId
        });
        setIsEditing(false);
    };

    const executeDelete = async () => {
        try {
            setLoading(true);
            await onDelete(currentMember);
            onClose();
        } catch (error) {
            console.error('Delete failed', error);
        } finally {
            setLoading(false);
        }
    };

    const memberName = initialName || (currentMember?.userId?.name || `${currentMember?.userId?.firstName || ''} ${currentMember?.userId?.lastName || ''}`.trim());
    const displayName = memberName || (isAttendee ? 'Attendee' : 'Instructor');

    return (
        <div onClick={handleBackdropClick} className="modal-overlay z-50 cursor-default">
            <div className={`modal-content max-w-md ${isShaking ? 'animate-modal-shake' : ''}`}>
                
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Member Details
                        </h2>
                        <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            currentMember?.role === 'OWNER' 
                                ? 'bg-brand-50 text-brand-700 border border-brand-200/60' 
                                : currentMember?.role === 'INSTRUCTOR'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                        }`}>
                            {currentMember?.role === 'OWNER' ? 'Owner' : currentMember?.role === 'INSTRUCTOR' ? 'Instructor' : 'Attendee'}
                        </span>
                    </div>

                    {/* Top Action Controls */}
                    <div className="flex items-center gap-2">
                        {isOwner && isAttendee && !isEditing && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl transition shadow-sm"
                                title="Edit Roster Information"
                            >
                                <Edit3 size={13} className="mr-1.5 text-slate-500" />
                                Edit
                            </button>
                        )}

                        {isOwner && isAttendee && isEditing && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    disabled={loading}
                                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:scale-95 shadow-sm shadow-brand-500/20 rounded-xl transition"
                                >
                                    <Save size={13} className="mr-1.5" />
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            </>
                        )}

                        <button 
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition ml-1"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Form / Content */}
                <form id="member-edit-form" onSubmit={handleSave}>
                    <div className="space-y-4">
                        {isEditing && isAttendee ? (
                            /* EDIT MODE FOR ATTENDEE */
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                        Name
                                    </label>
                                    <input 
                                        type="text" 
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition font-medium"
                                        placeholder="Full Name"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                        Attendee ID
                                    </label>
                                    <input 
                                        type="text" 
                                        name="studentId"
                                        value={formData.studentId}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition font-mono"
                                        placeholder="e.g. STU-2024-001"
                                    />
                                </div>

                                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                        Email Address
                                    </div>
                                    <div className="text-sm font-semibold text-slate-700 mt-1 break-all">
                                        {currentMember?.userId?.email || '-'}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between px-3 py-2.5 text-xs text-slate-500 bg-slate-50/50 rounded-xl">
                                    <span className="text-slate-400 font-medium">Joined Organization:</span>
                                    <span className="font-semibold text-slate-700">
                                        {new Date(currentMember?.joinedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            /* VIEW MODE */
                            <div className="space-y-3">
                                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                        Name
                                    </div>
                                    <div className="text-sm font-semibold text-slate-900 mt-1">
                                        {memberName || '-'}
                                    </div>
                                </div>

                                {isAttendee && (
                                    <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                            Attendee ID
                                        </div>
                                        <div className="text-sm font-mono font-semibold text-slate-900 mt-1">
                                            {initialStudentId || '-'}
                                        </div>
                                    </div>
                                )}

                                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                        Email Address
                                    </div>
                                    <div className="text-sm font-semibold text-slate-900 mt-1 break-all">
                                        {currentMember?.userId?.email || '-'}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between px-3 py-2.5 text-xs text-slate-500 bg-slate-50/50 rounded-xl">
                                    <span className="text-slate-400 font-medium">Joined Organization:</span>
                                    <span className="font-semibold text-slate-700">
                                        {new Date(currentMember?.joinedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Solid Red Delete from Organization Action Button */}
                        {isOwner && currentMember?.role !== 'OWNER' && (
                            <div className="pt-4 border-t border-slate-100">
                                <button 
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={loading}
                                    className="flex items-center justify-center w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-sm shadow-rose-500/20 text-white rounded-xl transition text-xs font-semibold"
                                    title="Remove member from organization"
                                >
                                    <Trash2 size={14} className="mr-1.5 shrink-0" />
                                    <span>Delete</span>
                                </button>
                            </div>
                        )}
                    </div>
                </form>
            </div>

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={executeDelete}
                title="Remove Member"
                message={`Are you sure you want to remove ${displayName} from the organization? Their user account will not be deleted.`}
                type="delete"
                confirmText="Delete"
            />
        </div>
    );
};

export default ViewMemberModal;
