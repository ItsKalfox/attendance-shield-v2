import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { X, Check } from 'lucide-react';

const CreateCourseModal = ({ onClose, onCourseCreated }) => {
    const { activeOrganization } = useOrganization();
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        instructor: '',
        attendees: []
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Member fetching
    const [members, setMembers] = useState([]);
    const [fetchingMembers, setFetchingMembers] = useState(true);

    useEffect(() => {
        const fetchMembers = async () => {
            if (!activeOrganization) return;
            try {
                setFetchingMembers(true);
                const res = await api.get(`/organizations/${activeOrganization._id}/members`);
                setMembers(res.data);
                
                // Pre-select the owner or current user if possible
                const owner = res.data.find(m => m.role === 'OWNER');
                if (owner) {
                    setFormData(prev => ({ ...prev, instructor: owner._id }));
                }
            } catch (error) {
                console.error("Failed to fetch members:", error);
            } finally {
                setFetchingMembers(false);
            }
        };

        fetchMembers();
    }, [activeOrganization]);

    const organizers = members.filter(m => m.role === 'OWNER' || m.role === 'INSTRUCTOR');
    const attendeesList = members.filter(m => m.role === 'ATTENDEE');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim() || !formData.code.trim()) {
            setError('Course name and code are required');
            return;
        }
        
        if (!formData.instructor) {
            setError('Please select a course instructor');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const payload = {
                name: formData.name,
                code: formData.code,
                description: formData.description,
                instructors: [formData.instructor], // Backend expects array
                ...(formData.attendees.length > 0 && { attendees: formData.attendees })
            };

            const res = await api.post(`/organizations/${activeOrganization._id}/courses`, payload);
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

    const toggleAttendeeSelection = (id) => {
        setFormData(prev => {
            const currentList = prev.attendees;
            if (currentList.includes(id)) {
                return { ...prev, attendees: currentList.filter(item => item !== id) };
            } else {
                return { ...prev, attendees: [...currentList, id] };
            }
        });
    };
    
    const selectInstructor = (id) => {
        setFormData(prev => ({ ...prev, instructor: id }));
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-content w-full max-w-4xl p-6 md:p-8">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition bg-slate-100 hover:bg-slate-200 p-1 rounded-full"
                    >
                        <X size={20} />
                    </button>
                    
                    <h2 className="text-2xl font-bold mb-6 text-slate-800">Create New Course</h2>
                    
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="flex flex-col">
                        <div className="flex flex-col md:flex-row gap-8 mb-8">
                            
                            {/* Left Column: Basic Details */}
                            <div className="flex-1 space-y-5">
                                <h3 className="font-semibold text-slate-700 border-b pb-2 border-slate-100">Course Details</h3>
                                
                                <div className="form-group mb-0">
                                    <label className="form-label">Course Name <span className="text-red-500">*</span></label>
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

                                <div className="form-group mb-0">
                                    <label className="form-label">Course Code <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        name="code"
                                        className="form-input" 
                                        placeholder="e.g. SE302"
                                        value={formData.code}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="form-group mb-0">
                                    <label className="form-label">Description (Optional)</label>
                                    <textarea 
                                        name="description"
                                        className="form-input" 
                                        placeholder="Course description..."
                                        rows="4"
                                        value={formData.description}
                                        onChange={handleChange}
                                    ></textarea>
                                </div>
                            </div>

                            {/* Right Column: People Selection */}
                            <div className="flex-1 space-y-6 flex flex-col h-[380px]">
                                
                                {/* Instructor (Single Select) */}
                                <div className="flex flex-col flex-1 min-h-0">
                                    <div className="flex justify-between items-center border-b pb-2 mb-3 border-slate-100">
                                        <h3 className="font-semibold text-slate-700">Course Instructor</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 shadow-inner">
                                        {fetchingMembers ? (
                                            <p className="text-sm text-slate-500 text-center p-4">Loading...</p>
                                        ) : organizers.length === 0 ? (
                                            <p className="text-sm text-slate-500 text-center p-4">No instructors found.</p>
                                        ) : (
                                            <div className="space-y-1">
                                                {organizers.map(org => (
                                                    <label key={org._id} className={`flex items-center p-2.5 rounded-lg cursor-pointer border transition-all ${formData.instructor === org._id ? 'bg-white border-brand-200 shadow-sm' : 'border-transparent hover:bg-white hover:border-slate-200'}`}>
                                                        <input 
                                                            type="radio" 
                                                            name="instructor"
                                                            className="hidden"
                                                            checked={formData.instructor === org._id}
                                                            onChange={() => selectInstructor(org._id)}
                                                        />
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-3 border transition-colors ${formData.instructor === org._id ? 'bg-brand-600 border-brand-600' : 'border-slate-300 bg-white'}`}>
                                                            {formData.instructor === org._id && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                                        </div>
                                                        <div className="flex-1 flex justify-between items-center">
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-800">{org.userId?.firstName} {org.userId?.lastName}</p>
                                                                <p className="text-xs text-slate-500">{org.userId?.email}</p>
                                                            </div>
                                                            <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                                {org.role === 'OWNER' ? 'Owner' : 'Instructor'}
                                                            </div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Attendees (Multi Select) */}
                                <div className="flex flex-col flex-1 min-h-0">
                                    <div className="flex justify-between items-center border-b pb-2 mb-3 border-slate-100">
                                        <h3 className="font-semibold text-slate-700">Enroll Attendees</h3>
                                        <span className="text-xs font-medium bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">{formData.attendees.length} selected</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 shadow-inner">
                                        {fetchingMembers ? (
                                            <p className="text-sm text-slate-500 text-center p-4">Loading...</p>
                                        ) : attendeesList.length === 0 ? (
                                            <p className="text-sm text-slate-500 text-center p-4">No attendees found in organization.</p>
                                        ) : (
                                            <div className="space-y-1">
                                                {attendeesList.map(att => (
                                                    <label key={att._id} className={`flex items-center p-2.5 rounded-lg cursor-pointer border transition-all ${formData.attendees.includes(att._id) ? 'bg-white border-brand-200 shadow-sm' : 'border-transparent hover:bg-white hover:border-slate-200'}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            className="hidden"
                                                            checked={formData.attendees.includes(att._id)}
                                                            onChange={() => toggleAttendeeSelection(att._id)}
                                                        />
                                                        <div className={`w-5 h-5 rounded flex items-center justify-center mr-3 border transition-colors ${formData.attendees.includes(att._id) ? 'bg-brand-600 border-brand-600' : 'border-slate-300 bg-white'}`}>
                                                            {formData.attendees.includes(att._id) && <Check size={14} className="text-white" />}
                                                        </div>
                                                        <div className="flex-1 flex justify-between items-center">
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-800">{att.userId?.firstName} {att.userId?.lastName}</p>
                                                                <p className="text-xs text-slate-500">{att.userId?.email}</p>
                                                            </div>
                                                            <div className="text-xs font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                                                {att.studentId || 'No ID'}
                                                            </div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-3 pt-5 border-t border-slate-100 w-full mt-auto">
                            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary px-6" disabled={loading}>
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
