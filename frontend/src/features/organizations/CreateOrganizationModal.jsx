import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { safeStorage } from '../../utils/storage';
import { X, Upload, Building2, Shield, Trash2, Camera } from 'lucide-react';

const CreateOrganizationModal = ({ onClose }) => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const fileInputRef = useRef(null);
    const { refreshOrganizations } = useOrganization();

    // Revoke object URL on unmount or logo change
    useEffect(() => {
        return () => {
            if (logoPreview) {
                URL.revokeObjectURL(logoPreview);
            }
        };
    }, [logoPreview]);

    const isDirty = Boolean(name.trim() || description.trim() || logoFile);

    const { isShaking, handleBackdropClick } = useModalDismiss({
        onClose,
        isDirty
    });

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file type
        if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/i)) {
            setError('Please select a valid image file (PNG, JPG, or WEBP)');
            return;
        }

        // Limit file size to 5MB
        if (file.size > 5 * 1024 * 1024) {
            setError('Image file size must be less than 5MB');
            return;
        }

        setError('');
        if (logoPreview) {
            URL.revokeObjectURL(logoPreview);
        }
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
    };

    const handleRemoveLogo = () => {
        if (logoPreview) {
            URL.revokeObjectURL(logoPreview);
        }
        setLogoFile(null);
        setLogoPreview('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!name.trim()) {
            setError('Organization name is required');
            return;
        }

        if (!description.trim()) {
            setError('Organization description is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('name', name.trim());
            formData.append('description', description.trim());
            if (logoFile) {
                formData.append('avatar', logoFile);
            }

            const res = await api.post('/organizations', formData);

            const newOrgId = res.data?._id;
            // Automatically set the newly created organization as the active workspace
            if (newOrgId) {
                safeStorage.setItem('activeOrganizationId', newOrgId);
            }

            await refreshOrganizations(newOrgId);
            onClose();
            navigate('/app/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create organization');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div onClick={handleBackdropClick} className="modal-overlay z-[100] cursor-default">
            <div onClick={handleBackdropClick} className="modal-container p-4">
                <div className={`modal-content max-w-lg w-full max-h-[90vh] overflow-y-auto ${isShaking ? 'animate-modal-shake' : ''}`}>
                    {/* Close button */}
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>
                    
                    {/* Header */}
                    <div className="mb-5 pr-8">
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Create Organization</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Set up a new workspace for tracking attendance, courses, and members.
                        </p>
                    </div>

                    {/* Workspace Structure & Roles Guide (Document-style box) */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 mb-5 text-left">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Shield size={14} className="text-brand-600 shrink-0" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Workspace Structure & Roles
                            </span>
                        </div>
                        <ul className="text-xs text-slate-500 space-y-1.5 pl-4 list-disc leading-relaxed">
                            <li>
                                <strong className="text-slate-700">Owner Access:</strong> As the creator, you will automatically be assigned the <strong>Owner</strong> role with complete workspace administration rights.
                            </li>
                            <li>
                                <strong className="text-slate-700">Faculty & Staff:</strong> You can invite instructors via email to create courses, schedule lectures, and manage attendance sessions.
                            </li>
                            <li>
                                <strong className="text-slate-700">Attendees & Students:</strong> Add students manually or import via CSV to participate in anti-spoofing QR attendance check-ins.
                            </li>
                        </ul>
                    </div>
                    
                    {/* Error Notice */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-4 text-xs font-medium">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-4 text-left">
                        {/* Organization Logo Upload (Optional) */}
                        <div className="form-group mb-4">
                            <label className="form-label block mb-1.5 text-xs font-semibold text-slate-700">
                                Organization Logo <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Building2 size={26} className="text-slate-400" />
                                    )}
                                </div>

                                <div className="flex-1">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange} 
                                        accept="image/png, image/jpeg, image/webp" 
                                        className="hidden" 
                                        disabled={loading}
                                    />
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={loading}
                                            className="btn btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 text-slate-700 hover:bg-slate-50"
                                        >
                                            <Camera size={13} />
                                            <span>{logoFile ? 'Change Logo' : 'Upload Logo'}</span>
                                        </button>
                                        
                                        {logoFile && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveLogo}
                                                disabled={loading}
                                                className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1.5 flex items-center gap-1 transition"
                                            >
                                                <Trash2 size={13} />
                                                <span>Remove</span>
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">PNG, JPG or WEBP under 5MB</p>
                                </div>
                            </div>
                        </div>

                        {/* Organization Name (Required) */}
                        <div className="form-group mb-4">
                            <label className="form-label block mb-1 text-xs font-semibold text-slate-700">
                                Organization Name <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                className="form-input text-sm" 
                                placeholder="e.g. Faculty of Computing & Informatics"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>

                        {/* Organization Description (Required) */}
                        <div className="form-group mb-5">
                            <label className="form-label block mb-1 text-xs font-semibold text-slate-700">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea 
                                rows={3}
                                className="form-input text-sm leading-relaxed" 
                                placeholder="Provide a brief description of your organization, academic department, or institution..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                A brief description visible to invited faculty and enrolled students.
                            </p>
                        </div>
                        
                        {/* Footer Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button type="button" className="btn btn-outline text-xs py-2 px-4" onClick={onClose} disabled={loading}>
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="btn btn-primary text-xs py-2 px-5 font-bold shadow-md shadow-brand-500/20" 
                                disabled={loading || !name.trim() || !description.trim()}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-1.5 py-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '200ms' }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '400ms' }} />
                                    </div>
                                ) : (
                                    'Create Organization'
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

export default CreateOrganizationModal;
