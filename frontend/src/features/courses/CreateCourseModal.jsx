import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { X, Calendar, BookOpen, Layers, Clock, UserCheck } from 'lucide-react';

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
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Create New Course</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Define course specifications and assign a dedicated instructor.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-200/60"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center">
                                <Calendar size={14} className="mr-1 text-slate-400" /> Start Date
                            </label>
                            <input 
                                type="date" 
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center">
                                <Calendar size={14} className="mr-1 text-slate-400" /> End Date
                            </label>
                            <input 
                                type="date" 
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800 transition"
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
                            <select 
                                name="instructor"
                                value={formData.instructor}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800 bg-white transition font-medium"
                                required
                            >
                                {instructorsList.map(inst => (
                                    <option key={inst._id} value={inst._id}>
                                        {inst.userId?.firstName} {inst.userId?.lastName} ({inst.userId?.email}) - {inst.role}
                                    </option>
                                ))}
                            </select>
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
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition disabled:opacity-50"
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
