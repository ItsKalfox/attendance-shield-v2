import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { X, Send } from 'lucide-react';

const InviteOrganizerModal = ({ onClose, onInvited }) => {
    const { activeOrganization } = useOrganization();
    const [formData, setFormData] = useState({
        email: '',
        role: 'INSTRUCTOR'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.email.trim()) {
            setError('Email is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await api.post(`/organizations/${activeOrganization._id}/invitations`, formData);
            if (onInvited) onInvited();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send invitation');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="modal-overlay z-[100]">
            <div className="modal-container">
                <div className="modal-content max-w-md">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition bg-slate-100 hover:bg-slate-200 p-1 rounded-full"
                    >
                        <X size={20} />
                    </button>
                    
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-800">Invite Instructor</h2>
                        <p className="text-sm text-slate-500 mt-1">Send an email invitation to join {activeOrganization?.name || 'this organization'} as an Instructor.</p>
                    </div>
                    
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group mb-6">
                            <label className="form-label">Instructor's Email Address</label>
                            <input 
                                type="email" 
                                name="email"
                                className="form-input" 
                                placeholder="instructor@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                autoFocus
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Sending...' : (
                                    <>
                                        <Send size={16} className="mr-2" />
                                        Send Invitation
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default InviteOrganizerModal;
