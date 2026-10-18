import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { X, Calendar, UserCheck, ChevronDown } from 'lucide-react';

const CreateCourseModal = ({ onClose, onCourseCreated }) => {
    const { activeOrganization } = useOrganization();
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        batch: '',
        semester: '',
        startDate: '',
        endDate: '',
        instructor: '',
        description: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Member fetching
    const [instructorsList, setInstructorsList] = useState([]);
    const [fetchingInstructors, setFetchingInstructors] = useState(true);
    const [isInstructorDropdownOpen, setIsInstructorDropdownOpen] = useState(false);

    const isDirty = Boolean(
        formData.name.trim() ||
        formData.code.trim() ||
        formData.batch.trim() ||
        formData.semester.trim() ||
        formData.startDate ||
        formData.endDate ||
        formData.description.trim()
    );

    const { isShaking, handleBackdropClick } = useModalDismiss({
        onClose,
        isDirty
    });

    useEffect(() => {
        const fetchStaff = async () => {
            if (!activeOrganization) return;
            try {
                setFetchingInstructors(true);
                const res = await api.get(`/organizations/${activeOrganization._id}/members`);
                // Filter only OWNER and INSTRUCTOR members
                const staff = res.data.filter(m => m.role === 'OWNER' || m.role === 'INSTRUCTOR');
                setInstructorsList(staff);
                
                if (staff.length > 0) {
                    setFormData(prev => ({ ...prev, instructor: staff[0]._id }));
                }
            } catch (err) {
                console.error("Failed to fetch instructors:", err);
            } finally {
                setFetchingInstructors(false);
            }
        };

        fetchStaff();
    }, [activeOrganization]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim() || !formData.code.trim()) {
            setError('Course name and course code are required.');
            return;
        }

        if (!formData.batch.trim() || !formData.semester.trim()) {
            setError('Batch and semester are required.');
            return;
        }
        
        if (!formData.instructor) {
            setError('Please select an instructor for this course.');
            return;
        }

        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            if (end < start) {
                setError('Course end date cannot be earlier than start date.');
                return;
            }
        }

        setLoading(true);
        setError('');

        try {
            const payload = {
                name: formData.name.trim(),
                code: formData.code.trim().toUpperCase(),
                batch: formData.batch.trim(),
                semester: formData.semester.trim(),
                startDate: formData.startDate || null,
                endDate: formData.endDate || null,
                instructor: formData.instructor,
                description: formData.description.trim()
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
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'startDate' && value && next.endDate && new Date(next.endDate) < new Date(value)) {
                next.endDate = '';
            }
            if (name === 'endDate' && value && next.startDate && new Date(value) < new Date(next.startDate)) {
                setError('Course end date cannot be earlier than start date.');
            } else {
                setError('');
            }
            return next;
        });
    };

    return createPortal(
        <div 
            onClick={handleBackdropClick}
            className="modal-overlay z-[100] cursor-default"
        >
            <div className={`modal-flex-card max-w-2xl animate-in fade-in zoom-in-95 duration-200 ${isShaking ? 'animate-modal-shake' : ''}`}>
                {/* Header */}
                <div className="shrink-0 px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70 backdrop-blur-sm">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900">Create New Course</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Define course specifications and assign a dedicated instructor.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-200/60 ml-2"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="modal-scroll-body p-4 sm:p-6 space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center">
                            <span className="w-2 h-2 rounded-full bg-red-500 mr-2.5"></span>
                            {error}
                        </div>
                    )}

                    {/* Course Code & Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                Course Code *
                            </label>
                            <input 
                                type="text" 
                                name="code"
                                placeholder="e.g. CS2040"
                                value={formData.code}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-mono font-medium text-slate-800 transition uppercase"
                                required
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                Course Name *
                            </label>
                            <input 
                                type="text" 
                                name="name"
                                placeholder="e.g. Software Engineering"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-medium text-slate-800 transition"
                                required
                            />
                        </div>
                    </div>

                    {/* Batch & Semester */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                Batch / Cohort *
                            </label>
                            <input 
                                type="text" 
                                name="batch"
                                placeholder="e.g. Batch 22 / 2022-2023"
                                value={formData.batch}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800 transition"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                Semester / Term *
                            </label>
                            <input 
                                type="text" 
                                name="semester"
                                placeholder="e.g. Year 2 - Semester 1"
                                value={formData.semester}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800 transition"
                                required
                            />
                        </div>
                    </div>

                    {/* Timeline: Start Date & End Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                        <div className="min-w-0">
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center">
                                <Calendar size={14} className="mr-1 text-slate-400" /> Start Date
                            </label>
                            <input 
                                type="date" 
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                className="w-full min-w-0 max-w-full block px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800 transition"
                            />
                        </div>
                        <div className="min-w-0">
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center">
                                <Calendar size={14} className="mr-1 text-slate-400" /> End Date
                            </label>
                            <input 
                                type="date" 
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleChange}
                                min={formData.startDate || undefined}
                                className="w-full min-w-0 max-w-full block px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800 transition"
                            />
                        </div>
                    </div>

                    {/* Instructor Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center">
                            <UserCheck size={14} className="mr-1 text-slate-400" /> Assigned Instructor *
                        </label>
                        {fetchingInstructors ? (
                            <div className="text-xs text-slate-400 py-2">Loading instructors...</div>
                        ) : instructorsList.length === 0 ? (
                            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl text-xs">
                                No instructors found in this organization. Please invite or assign an instructor first.
                            </div>
                        ) : (
                            <div className="relative">
                                <div 
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800 bg-white transition font-medium cursor-pointer flex justify-between items-center"
                                    onClick={() => setIsInstructorDropdownOpen(!isInstructorDropdownOpen)}
                                >
                                    <span className="truncate pr-2">
                                        {(() => {
                                            const sel = instructorsList.find(i => i._id === formData.instructor);
                                            return sel ? `${sel.userId?.firstName} ${sel.userId?.lastName} (${sel.userId?.email})` : 'Select Instructor...';
                                        })()}
                                    </span>
                                    <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${isInstructorDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>
                                {isInstructorDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsInstructorDropdownOpen(false)}></div>
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden py-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                                            {instructorsList.map(inst => (
                                                <div 
                                                    key={inst._id}
                                                    className={`px-3.5 py-2.5 text-sm cursor-pointer flex justify-between items-center hover:bg-brand-50 ${formData.instructor === inst._id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700'}`}
                                                    onClick={() => {
                                                        handleChange({ target: { name: 'instructor', value: inst._id } });
                                                        setIsInstructorDropdownOpen(false);
                                                    }}
                                                >
                                                    <span className="truncate pr-2">{inst.userId?.firstName} {inst.userId?.lastName} <span className="text-xs text-slate-400">({inst.userId?.email})</span></span>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">{inst.role}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">
                            Student enrollment can be managed by this instructor or admin after course creation.
                        </p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                            Description (Optional)
                        </label>
                        <textarea 
                            name="description"
                            rows="2"
                            placeholder="Brief synopsis or lecture hall / lab notes..."
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800 transition resize-none"
                        ></textarea>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition w-full sm:w-auto"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition disabled:opacity-50 w-full sm:w-auto"
                            disabled={loading || fetchingInstructors || instructorsList.length === 0}
                        >
                            {loading ? 'Creating Course...' : 'Create Course'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default CreateCourseModal;
