import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { X, Calendar, UserCheck, Users, ChevronDown, Plus } from 'lucide-react';

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
    const [allowAdditionalInstructors, setAllowAdditionalInstructors] = useState(false);
    const [additionalInstructors, setAdditionalInstructors] = useState([]);
    const [isCoInstructorDropdownOpen, setIsCoInstructorDropdownOpen] = useState(false);
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
        additionalInstructors.length > 0 ||
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
            setError('Please select a course coordinator.');
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
                instructors: allowAdditionalInstructors ? additionalInstructors.filter(id => id.toString() !== formData.instructor?.toString()) : [],
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
                        <p className="text-xs text-slate-500 mt-0.5">Define course specifications and assign course instructors.</p>
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

                    {/* Course Coordinator Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center">
                            <UserCheck size={14} className="mr-1 text-slate-400" /> Course Coordinator *
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
                                            return sel ? `${sel.userId?.firstName} ${sel.userId?.lastName} (${sel.userId?.email})` : 'Select Coordinator...';
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
                                                        setAdditionalInstructors(prev => prev.filter(id => id !== inst._id));
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
                            The course coordinator manages course settings, enrolls students, and can conduct attendance sessions.
                        </p>
                    </div>

                    {/* Allow Additional Instructors Toggle */}
                    <div className="pt-1">
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-100/60 transition">
                            <div className="pr-4">
                                <span className="text-xs font-semibold text-slate-800 block">Allow Additional Instructors</span>
                                <span className="text-[11px] text-slate-400 block mt-0.5">Assign co-instructors who can conduct and verify attendance sessions</span>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={allowAdditionalInstructors}
                                onClick={() => {
                                    const next = !allowAdditionalInstructors;
                                    setAllowAdditionalInstructors(next);
                                    if (!next) setAdditionalInstructors([]);
                                }}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${allowAdditionalInstructors ? 'bg-brand-600' : 'bg-slate-200'}`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${allowAdditionalInstructors ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                            </button>
                        </div>

                        {allowAdditionalInstructors && (
                            <div className="mt-3 p-3.5 rounded-2xl bg-brand-50/40 border border-brand-100/80 space-y-3 animate-in fade-in duration-150">
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center">
                                    <Users size={13} className="mr-1 text-slate-400" /> Additional Instructors
                                </label>

                                {/* Selected Co-Instructors Pills (NO counter badge) */}
                                {additionalInstructors.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {additionalInstructors.map(id => {
                                            const inst = instructorsList.find(i => i._id === id);
                                            if (!inst) return null;
                                            const name = `${inst.userId?.firstName || ''} ${inst.userId?.lastName || ''}`.trim() || inst.userId?.email;
                                            return (
                                                <span 
                                                    key={id}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-brand-200 shadow-sm text-xs font-medium text-slate-800"
                                                >
                                                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-bold text-[10px] flex items-center justify-center">
                                                        {inst.userId?.firstName?.charAt(0) || 'I'}
                                                    </span>
                                                    <span className="max-w-[150px] truncate">{name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAdditionalInstructors(prev => prev.filter(x => x !== id))}
                                                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition ml-0.5"
                                                        title="Remove instructor"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Add Instructor Selector */}
                                {additionalInstructors.length < 8 ? (
                                    (() => {
                                        const available = instructorsList.filter(inst => inst._id !== formData.instructor && !additionalInstructors.includes(inst._id));
                                        return available.length > 0 ? (
                                            <div className="relative">
                                                <div 
                                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white transition font-medium cursor-pointer flex justify-between items-center hover:border-brand-400"
                                                    onClick={() => setIsCoInstructorDropdownOpen(!isCoInstructorDropdownOpen)}
                                                >
                                                    <span className="text-slate-500 flex items-center gap-1">
                                                        <Plus size={13} /> Add another instructor...
                                                    </span>
                                                    <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${isCoInstructorDropdownOpen ? 'rotate-180' : ''}`} />
                                                </div>
                                                {isCoInstructorDropdownOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setIsCoInstructorDropdownOpen(false)}></div>
                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden py-1 max-h-[180px] overflow-y-auto custom-scrollbar">
                                                            {available.map(inst => (
                                                                <div 
                                                                    key={inst._id}
                                                                    className="px-3.5 py-2 text-xs cursor-pointer flex justify-between items-center hover:bg-brand-50 text-slate-700"
                                                                    onClick={() => {
                                                                        if (additionalInstructors.length < 8) {
                                                                            setAdditionalInstructors(prev => [...prev, inst._id]);
                                                                        }
                                                                        setIsCoInstructorDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    <span className="truncate pr-2">
                                                                        {inst.userId?.firstName} {inst.userId?.lastName} <span className="text-slate-400">({inst.userId?.email})</span>
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                        {inst.role}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-slate-400 italic">No other instructors available in this organization.</p>
                                        );
                                    })()
                                ) : (
                                    <p className="text-[11px] text-amber-600 font-medium">Maximum limit of 8 additional instructors reached.</p>
                                )}
                            </div>
                        )}
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
