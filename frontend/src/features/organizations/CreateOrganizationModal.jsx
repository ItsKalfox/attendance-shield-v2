import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { X } from 'lucide-react';

const CreateOrganizationModal = ({ onClose }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { refreshOrganizations } = useOrganization();

    const isDirty = Boolean(name.trim());

    const { isShaking, handleBackdropClick } = useModalDismiss({
        onClose,
        isDirty
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!name.trim()) {
            setError('Organization name is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await api.post('/organizations', { name });
            await refreshOrganizations();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create organization');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div onClick={handleBackdropClick} className="modal-overlay z-[100] cursor-default">
            <div onClick={handleBackdropClick} className="modal-container">
                <div className={`modal-content max-w-md ${isShaking ? 'animate-modal-shake' : ''}`}>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition bg-slate-100 hover:bg-slate-200 p-1 rounded-full"
                    >
                        <X size={20} />
                    </button>
                    
                    <h2 className="text-xl font-bold mb-6 text-slate-800">Create Organization</h2>
                    
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group mb-6">
                            <label className="form-label">Organization Name</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="e.g. Example University"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Organization'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CreateOrganizationModal;
