import React, { useState } from 'react';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { X } from 'lucide-react';

const AddMemberModal = ({ onClose, onMemberAdded }) => {
    const { activeOrganization } = useOrganization();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'ATTENDEE',
        studentId: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isDirty = Boolean(
        formData.name.trim() || 
        formData.email.trim() || 
        formData.studentId.trim()
    );

    const { isShaking, handleBackdropClick } = useModalDismiss({
        onClose,
        isDirty
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim() || !formData.email.trim()) {
            setError('Name and email are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await api.post(`/organizations/${activeOrganization._id}/members`, formData);
            onMemberAdded(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add member');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div onClick={handleBackdropClick} className="modal-overlay cursor-default">
            <div onClick={handleBackdropClick} className="modal-container">
                <div className={`modal-content max-w-md ${isShaking ? 'animate-modal-shake' : ''}`}>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition bg-slate-100 hover:bg-slate-200 p-1 rounded-full"
                    >
                        <X size={20} />
                    </button>
                    
                    <h2 className="text-xl font-bold mb-6 text-slate-800">Add New Attendee</h2>
                    
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group mb-4">
                            <label className="form-label">Name</label>
                            <input 
                                type="text" 
                                name="name"
                                className="form-input" 
                                placeholder="e.g. John Doe"
                                value={formData.name}
                                onChange={handleChange}
                                autoFocus
                            />
                        </div>

                        <div className="form-group mb-4">
                            <label className="form-label">Email</label>
                            <input 
                                type="email" 
                                name="email"
                                className="form-input" 
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group mb-4">
                            <label className="form-label">Role</label>
                            <div className="form-input bg-slate-50 text-slate-500 cursor-not-allowed py-2.5 font-medium">
                                Attendee
                            </div>
                        </div>

                        <div className="form-group mb-6">
                            <label className="form-label">Attendee ID (Optional)</label>
                            <input 
                                type="text" 
                                name="studentId"
                                className="form-input" 
                                placeholder="e.g. EMP-001 or SE001"
                                value={formData.studentId}
                                onChange={handleChange}
                            />
                        </div>
                        
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-8 pt-4 border-t border-slate-100">
                            <button type="button" className="btn btn-outline w-full sm:w-auto" onClick={onClose} disabled={loading}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={loading}>
                                {loading ? 'Adding...' : 'Add Attendee'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddMemberModal;
