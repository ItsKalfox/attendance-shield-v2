import React, { useState, useEffect, useRef } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import api from '../../services/api';
import { Building2, Users, Shield, Save, Upload, Activity, ChevronDown, ChevronUp } from 'lucide-react';

const OrganizationDetails = () => {
    const { activeOrganization, switchOrganization } = useOrganization();
    
    const [organization, setOrganization] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // UI state
    const [showInstructors, setShowInstructors] = useState(false);
    
    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!activeOrganization) return;
            try {
                setLoading(true);
                const [orgRes, membersRes] = await Promise.all([
                    api.get(`/organizations/${activeOrganization._id}`),
                    api.get(`/organizations/${activeOrganization._id}/members`)
                ]);
                
                setOrganization(orgRes.data);
                setEditName(orgRes.data.name);
                setEditDescription(orgRes.data.description || '');
                setAvatarPreview(orgRes.data.avatarUrl || '');
                setMembers(membersRes.data);
            } catch (error) {
                console.error("Failed to fetch organization details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [activeOrganization]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
            
            // Auto-upload
            try {
                setIsSaving(true);
                const formData = new FormData();
                formData.append('avatar', file);
                
                const res = await api.patch(`/organizations/${activeOrganization._id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                setOrganization(res.data);
                setAvatarFile(null);
            } catch (error) {
                alert('Failed to upload image');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const formData = new FormData();
            formData.append('name', editName);
            formData.append('description', editDescription);
            if (avatarFile) {
                formData.append('avatar', avatarFile);
            }
            
            const res = await api.patch(`/organizations/${activeOrganization._id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            setOrganization(res.data);
            setAvatarFile(null);
            setIsEditing(false);
            
            // To update the sidebar organization name if it changed
            if (editName !== activeOrganization.name) {
                // Not ideal, but will trigger a reload of orgs on next full page refresh or context update
                window.location.reload(); 
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update organization');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-6">Loading organization details...</div>;
    if (!organization) return <div className="p-6">Organization not found.</div>;

    const userRole = activeOrganization.userRole;
    const canEdit = userRole === 'OWNER' || userRole === 'ADMIN';
    const canSeeStats = userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'INSTRUCTOR';

    const owner = members.find(m => m.role === 'OWNER');
    const instructors = members.filter(m => m.role === 'INSTRUCTOR');
    const attendeesCount = members.filter(m => m.role === 'ATTENDEE').length;

    return (
        <div className="p-6 w-full animate-fade-in space-y-6">
            
            {/* Profile Picture Card */}
            <div className="card p-8 bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl flex flex-col md:flex-row gap-6 items-center">
                <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-sm border-2 border-white">
                    {avatarPreview ? (
                        <img src={avatarPreview} alt="Organization Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <Building2 size={40} className="text-slate-400" />
                    )}
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-lg font-bold text-slate-800 mb-3">Organization Logo</h2>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/png, image/jpeg, image/gif" 
                            className="hidden" 
                            disabled={!canEdit || isSaving}
                        />
                        {canEdit && (
                            <>
                                <button 
                                    className="btn btn-primary flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition shadow-sm disabled:opacity-50"
                                    onClick={() => fileInputRef.current.click()}
                                    disabled={isSaving}
                                >
                                    <Upload size={16} className="mr-2" /> 
                                    Change Image
                                </button>
                                <button 
                                    className="btn bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition"
                                    onClick={async () => {
                                        if(window.confirm('Remove organization logo?')) {
                                            setIsSaving(true);
                                            try {
                                                const res = await api.patch(`/organizations/${activeOrganization._id}`, { avatar: '' });
                                                setOrganization(res.data);
                                                setAvatarPreview('');
                                                setAvatarFile(null);
                                            } catch(e) {} finally { setIsSaving(false); }
                                        }
                                    }}
                                    disabled={!avatarPreview || isSaving}
                                >
                                    Remove
                                </button>
                            </>
                        )}
                    </div>
                    {canEdit && <p className="text-xs text-slate-500 font-medium">We support PNGs, JPEGs and GIFs under 10MB</p>}
                </div>
                <div className="badge bg-brand-100 text-brand-700 font-semibold text-xs ml-auto self-start">
                    {userRole}
                </div>
            </div>

            {/* Profile Info Card */}
            <div className="card p-8 bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-800">Organization Details</h2>
                    <p className="text-sm text-slate-500">Update organization name and description</p>
                </div>
                
                <div className="space-y-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">Organization Name</label>
                        <input 
                            type="text" 
                            className="form-input w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:bg-white transition shadow-sm"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            disabled={!canEdit}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">Description</label>
                        <textarea 
                            className="form-input w-full min-h-[100px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white transition shadow-sm"
                            value={editDescription}
                            onChange={e => setEditDescription(e.target.value)}
                            placeholder={canEdit ? "Add a description for your organization..." : "No description provided."}
                            maxLength={500}
                            disabled={!canEdit}
                        />
                    </div>
                </div>
                
                {canEdit && (
                    <div className="flex justify-end pt-4 border-t border-slate-200/50">
                        <button 
                            className="btn bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg font-medium text-sm transition shadow-md disabled:opacity-50"
                            onClick={handleSave}
                            disabled={isSaving || !editName}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {/* Statistics Section */}
            {canSeeStats && (
                <>
                    <h2 className="text-xl font-bold mt-8 mb-4">Organization Statistics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        <div className="card p-5 bg-white border border-slate-200 flex items-center shadow-sm">
                            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mr-4">
                                <Shield size={24} className="text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Organization Owner</p>
                                <p className="text-lg font-bold text-slate-800 truncate w-48" title={`${owner?.userId?.firstName} ${owner?.userId?.lastName}`}>
                                    {owner ? `${owner.userId?.firstName} ${owner.userId?.lastName}` : 'N/A'}
                                </p>
                            </div>
                        </div>

                        <div className="card p-5 bg-white border border-slate-200 flex items-center shadow-sm">
                            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mr-4">
                                <Users size={24} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Attendees</p>
                                <p className="text-2xl font-black text-slate-800">{attendeesCount}</p>
                            </div>
                        </div>

                        <div className="card p-5 bg-white border border-slate-200 shadow-sm flex flex-col justify-center">
                            <div 
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => setShowInstructors(!showInstructors)}
                            >
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mr-4">
                                        <Users size={24} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Instructors</p>
                                        <p className="text-2xl font-black text-slate-800">{instructors.length}</p>
                                    </div>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition">
                                    {showInstructors ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                                </div>
                            </div>
                        </div>
                    </div>

                    {showInstructors && (
                        <div className="card p-0 border border-slate-200 overflow-hidden shadow-sm animate-fade-in mt-[-10px]">
                            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                                <h3 className="font-bold text-slate-700 text-sm">Instructor List</h3>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {instructors.length > 0 ? (
                                    <ul className="divide-y divide-slate-100">
                                        {instructors.map(instructor => (
                                            <li key={instructor._id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold shadow-sm">
                                                        {instructor.userId?.firstName?.charAt(0) || 'I'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{instructor.userId?.firstName} {instructor.userId?.lastName}</p>
                                                        <p className="text-sm text-slate-500">{instructor.userId?.email}</p>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="p-6 text-center text-slate-400">
                                        No instructors found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Admin Activity Log Section */}
            {canEdit && (
                <div className="mt-10">
                    <h2 className="text-xl font-bold mb-4 flex items-center">
                        <Activity size={20} className="mr-2 text-indigo-500" /> 
                        Activity Log
                    </h2>
                    <div className="card p-8 bg-white border border-slate-200 shadow-sm text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 text-slate-300">
                            <Activity size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">No Recent Activity</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                            Activity tracking is currently empty. Future organization events (like settings changes or new roles) will appear here.
                        </p>
                    </div>
                </div>
            )}
            
        </div>
    );
};

export default OrganizationDetails;
