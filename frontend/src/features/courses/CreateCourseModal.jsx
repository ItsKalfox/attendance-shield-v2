import React, { useState } from 'react';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { X } from 'lucide-react';

const CreateCourseModal = ({ onClose, onCourseCreated }) => {
    const { activeOrganization } = useOrganization();
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim() || !formData.code.trim()) {
            setError('Course name and code are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await api.post(`/organizations/${activeOrganization._id}/courses`, formData);
            onCourseCreated(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create course');
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
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-content max-w-md">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition bg-slate-100 hover:bg-slate-200 p-1 rounded-full"
                    >
                        <X size={20} />
                    </button>
                    
                    <h2 className="text-xl font-bold mb-6 text-slate-800">Create New Course</h2>
                    
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group mb-4">
                            <label className="form-label">Course Name</label>
                            <input 
                                type="text" 
                                name="name"
                                className="form-input" 
                                placeholder="e.g. Software Engineering"
                                value={formData.name}
                                onChange={handleChange}
                                autoFocus
                            />
                        </div>

                        <div className="form-group mb-4">
                            <label className="form-label">Course Code</label>
                            <input 
                                type="text" 
                                name="code"
                                className="form-input" 
                                placeholder="e.g. SE302"
                                value={formData.code}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group mb-6">
                            <label className="form-label">Description (Optional)</label>
                            <textarea 
                                name="description"
                                className="form-input" 
                                placeholder="Course description..."
                                rows="3"
                                value={formData.description}
                                onChange={handleChange}
                            ></textarea>
                        </div>
                        
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Course'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateCourseModal;
