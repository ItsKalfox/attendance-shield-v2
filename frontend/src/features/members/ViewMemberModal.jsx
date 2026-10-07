import React, { useState } from 'react';
import { X, Save, KeyRound, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import ConfirmModal from '../../components/ConfirmModal';

const ViewMemberModal = ({ member, onClose, onUpdated, onDelete }) => {
    const { activeOrganization } = useOrganization();
    const [loading, setLoading] = useState(false);
    const [resetting, setResetting] = useState(false);
    
    const [formData, setFormData] = useState({
        firstName: member.userId?.firstName || '',
        lastName: member.userId?.lastName || '',
        email: member.userId?.email || '',
        studentId: member.studentId || ''
    });

    const [confirmModalConfig, setConfirmModalConfig] = useState({ isOpen: false, type: '', message: '' });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const response = await api.patch(`/organizations/${activeOrganization._id}/members/${member._id}`, formData);
            onUpdated(response.data);
            onClose();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update member details');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setConfirmModalConfig({
            isOpen: true,
            type: 'confirm',
            message: `Are you sure you want to reset the password for ${member.userId?.firstName}? They will receive an email with their new temporary password.`
        });
    };

    const executeResetPassword = async () => {
        try {
            setResetting(true);
            await api.post(`/organizations/${activeOrganization._id}/members/${member._id}/reset-password`);
            alert('Password has been reset. An email has been sent to the user.');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to reset password');
        } finally {
            setResetting(false);
        }
    };

    const handleDelete = () => {
        setConfirmModalConfig({
            isOpen: true,
            type: 'delete',
            message: `Are you sure you want to remove ${member.userId?.firstName} from the organization? Their account will not be deleted.`
        });
    };

    const executeDelete = async () => {
        try {
            setLoading(true);
            await onDelete(member);
            onClose();
        } catch (error) {
            console.error('Delete failed', error);
        } finally {
            setLoading(false);
        }
    };

    const isOwner = activeOrganization?.userRole === 'OWNER';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-md relative bg-white shadow-xl">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
                >
                    <X size={20} />
                </button>
                
                <h2 className="text-xl font-bold mb-6 text-slate-800">
                    {isOwner ? 'Member Details' : 'View Member Details'}
                </h2>
                
                <form onSubmit={handleSave}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                <input 
                                    type="text" 
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    disabled={!isOwner}
                                    className={`input w-full ${!isOwner ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : ''}`}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                <input 
                                    type="text" 
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    disabled={!isOwner}
                                    className={`input w-full ${!isOwner ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : ''}`}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input 
                                type="email" 
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={!isOwner}
                                className={`input w-full ${!isOwner ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : ''}`}
                                required
                            />
                        </div>

                        {member.role === 'ATTENDEE' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Attendee ID</label>
                                <input 
                                    type="text" 
                                    name="studentId"
                                    value={formData.studentId}
                                    onChange={handleChange}
                                    disabled={!isOwner}
                                    className={`input w-full ${!isOwner ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : ''}`}
                                    placeholder="Optional"
                                />
                            </div>
                        )}

                        <div className="pt-2">
                            <p className="text-xs text-slate-500 mb-2">
                                Joined: {new Date(member.joinedAt).toLocaleDateString()}
                            </p>
                            
                            {isOwner && (
                                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100">
                                    <button 
                                        type="button"
                                        onClick={handleResetPassword}
                                        disabled={resetting}
                                        className="flex items-center justify-center w-full py-2 px-4 border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition text-sm font-medium"
                                    >
                                        <KeyRound size={16} className="mr-2" />
                                        {resetting ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                    
                                    <button 
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={loading}
                                        className="flex items-center justify-center w-full py-2 px-4 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition text-sm font-medium"
                                    >
                                        <Trash2 size={16} className="mr-2" />
                                        Delete Member
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                        {isOwner ? (
                            <>
                                <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    <Save size={18} className="mr-2" />
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </>
                        ) : (
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Close
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <ConfirmModal
                isOpen={confirmModalConfig.isOpen}
                onClose={() => setConfirmModalConfig({ ...confirmModalConfig, isOpen: false })}
                onConfirm={confirmModalConfig.type === 'delete' ? executeDelete : executeResetPassword}
                title={confirmModalConfig.type === 'delete' ? "Remove Member" : "Reset Password"}
                message={confirmModalConfig.message}
                type={confirmModalConfig.type}
                confirmText={confirmModalConfig.type === 'delete' ? "Remove" : "Reset Password"}
            />
        </div>
    );
};

export default ViewMemberModal;
