import React, { useState, useEffect, useRef } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import api from '../../services/api';
import { 
    Building2, Users, Shield, Upload, Activity, 
    ChevronDown, ChevronUp, PlusCircle, Download, 
    FileSpreadsheet, FileJson, Archive, CheckCircle2, Loader2, HardDriveDownload 
} from 'lucide-react';
import CreateOrganizationModal from '../organizations/CreateOrganizationModal';
import JSZip from 'jszip';
import toast from 'react-hot-toast';

// CSV helper utilities
const escapeCSV = (value) => {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
};

const arrayToCSV = (headers, rows) => {
    const headerRow = headers.map(h => escapeCSV(h.label)).join(',');
    const dataRows = rows.map(row => 
        headers.map(h => escapeCSV(row[h.key] ?? '')).join(',')
    );
    return [headerRow, ...dataRows].join('\r\n');
};

const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

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
    
    // Export state
    const [exportingType, setExportingType] = useState(null); // 'zip' | 'json' | 'members' | 'courses' | 'attendance' | null
    
    // UI state
    const [showInstructors, setShowInstructors] = useState(false);
    
    const fileInputRef = useRef(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!activeOrganization) {
                setOrganization(null);
                setMembers([]);
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setOrganization(null);
                setMembers([]);
                const isAttendee = activeOrganization.userRole === 'ATTENDEE';
                
                const orgRes = await api.get(`/organizations/${activeOrganization._id}`);
                setOrganization(orgRes.data);
                setEditName(orgRes.data.name);
                setEditDescription(orgRes.data.description || '');
                setAvatarPreview(orgRes.data.avatarUrl || '');

                if (!isAttendee) {
                    const membersRes = await api.get(`/organizations/${activeOrganization._id}/members`);
                    setMembers(membersRes.data);
                } else {
                    setMembers([]);
                }
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
                window.location.reload(); 
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update organization');
        } finally {
            setIsSaving(false);
        }
    };

    // Export Handlers
    const fetchFullExportData = async () => {
        const res = await api.get(`/organizations/${activeOrganization._id}/export`);
        return res.data;
    };

    const getCleanOrgSlug = () => {
        return (organization?.name || 'organization')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_');
    };

    const getDateStamp = () => {
        return new Date().toISOString().split('T')[0];
    };

    const handleExportFullZip = async () => {
        try {
            setExportingType('zip');
            toast.loading('Preparing complete data archive...', { id: 'export-progress' });
            
            const data = await fetchFullExportData();
            const zip = new JSZip();
            const slug = getCleanOrgSlug();
            const dateStr = getDateStamp();

            // 1. Metadata JSON
            zip.file('organization_overview.json', JSON.stringify({
                exportedAt: data.exportedAt,
                organization: data.organization,
                summary: {
                    totalMembers: data.members?.length || 0,
                    totalCourses: data.courses?.length || 0,
                    totalEnrollments: data.enrollments?.length || 0,
                    totalSessions: data.sessions?.length || 0,
                    totalAttendanceRecords: data.attendanceRecords?.length || 0
                }
            }, null, 2));

            // 2. Members CSV
            const memberHeaders = [
                { label: 'Member ID', key: 'id' },
                { label: 'Role', key: 'role' },
                { label: 'Student / Staff ID', key: 'studentId' },
                { label: 'First Name', key: 'firstName' },
                { label: 'Last Name', key: 'lastName' },
                { label: 'Email', key: 'email' },
                { label: 'Status', key: 'status' },
                { label: 'Joined At', key: 'joinedAt' }
            ];
            zip.file('Members_Roster.csv', arrayToCSV(memberHeaders, data.members || []));

            // 3. Courses CSV
            const courseHeaders = [
                { label: 'Course ID', key: 'id' },
                { label: 'Course Code', key: 'code' },
                { label: 'Course Name', key: 'name' },
                { label: 'Description', key: 'description' },
                { label: 'Batch', key: 'batch' },
                { label: 'Semester', key: 'semester' },
                { label: 'Min Attendance %', key: 'minAttendancePercentage' },
                { label: 'Status', key: 'status' },
                { label: 'Created At', key: 'createdAt' }
            ];
            zip.file('Courses.csv', arrayToCSV(courseHeaders, data.courses || []));

            // 4. Enrollments CSV
            const enrollmentHeaders = [
                { label: 'Enrollment ID', key: 'id' },
                { label: 'Course Code', key: 'courseCode' },
                { label: 'Course Name', key: 'courseName' },
                { label: 'Student ID', key: 'studentId' },
                { label: 'Student Name', key: 'studentName' },
                { label: 'Student Email', key: 'studentEmail' },
                { label: 'Enrolled At', key: 'enrolledAt' }
            ];
            zip.file('Course_Enrollments.csv', arrayToCSV(enrollmentHeaders, data.enrollments || []));

            // 5. Sessions CSV
            const sessionHeaders = [
                { label: 'Session ID', key: 'id' },
                { label: 'Course Code', key: 'courseCode' },
                { label: 'Course Name', key: 'courseName' },
                { label: 'Lecture Type', key: 'lectureType' },
                { label: 'Status', key: 'status' },
                { label: 'Start Time', key: 'startTime' },
                { label: 'Expires At', key: 'expiresAt' },
                { label: 'Geofence Enabled', key: 'isGeofenceEnabled' },
                { label: 'Geofence Radius (m)', key: 'geofenceRadius' },
                { label: 'Created At', key: 'createdAt' }
            ];
            zip.file('Attendance_Sessions.csv', arrayToCSV(sessionHeaders, data.sessions || []));

            // 6. Attendance Records CSV
            const recordHeaders = [
                { label: 'Record ID', key: 'id' },
                { label: 'Course Code', key: 'courseCode' },
                { label: 'Course Name', key: 'courseName' },
                { label: 'Session Type', key: 'sessionType' },
                { label: 'Session Start Time', key: 'sessionStartTime' },
                { label: 'Student ID', key: 'studentId' },
                { label: 'Student Name', key: 'studentName' },
                { label: 'Student Email', key: 'studentEmail' },
                { label: 'Attendance Status', key: 'status' },
                { label: 'Marked At', key: 'markedAt' },
                { label: 'Verification Method', key: 'verificationMethod' },
                { label: 'Flagged', key: 'isFlagged' }
            ];
            zip.file('Detailed_Attendance_Records.csv', arrayToCSV(recordHeaders, data.attendanceRecords || []));

            const content = await zip.generateAsync({ type: 'blob' });
            downloadBlob(content, `${slug}_full_backup_${dateStr}.zip`);

            toast.success('Complete organization archive downloaded!', { id: 'export-progress' });
        } catch (error) {
            console.error('ZIP export error:', error);
            toast.error('Failed to generate full archive. Please try again.', { id: 'export-progress' });
        } finally {
            setExportingType(null);
        }
    };

    const handleExportJson = async () => {
        try {
            setExportingType('json');
            toast.loading('Generating raw JSON backup...', { id: 'export-progress' });
            
            const data = await fetchFullExportData();
            const slug = getCleanOrgSlug();
            const dateStr = getDateStamp();

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            downloadBlob(blob, `${slug}_raw_backup_${dateStr}.json`);

            toast.success('Raw JSON backup downloaded!', { id: 'export-progress' });
        } catch (error) {
            console.error('JSON export error:', error);
            toast.error('Failed to export JSON backup.', { id: 'export-progress' });
        } finally {
            setExportingType(null);
        }
    };

    const handleExportSpecificCsv = async (type) => {
        try {
            setExportingType(type);
            toast.loading(`Exporting ${type} data...`, { id: 'export-progress' });
            
            const data = await fetchFullExportData();
            const slug = getCleanOrgSlug();
            const dateStr = getDateStamp();

            let csvContent = '';
            let filename = '';

            if (type === 'members') {
                const headers = [
                    { label: 'Member ID', key: 'id' },
                    { label: 'Role', key: 'role' },
                    { label: 'Student / Staff ID', key: 'studentId' },
                    { label: 'First Name', key: 'firstName' },
                    { label: 'Last Name', key: 'lastName' },
                    { label: 'Email', key: 'email' },
                    { label: 'Status', key: 'status' },
                    { label: 'Joined At', key: 'joinedAt' }
                ];
                csvContent = arrayToCSV(headers, data.members || []);
                filename = `${slug}_members_${dateStr}.csv`;
            } else if (type === 'courses') {
                const headers = [
                    { label: 'Course Code', key: 'code' },
                    { label: 'Course Name', key: 'name' },
                    { label: 'Description', key: 'description' },
                    { label: 'Batch', key: 'batch' },
                    { label: 'Semester', key: 'semester' },
                    { label: 'Min Attendance %', key: 'minAttendancePercentage' },
                    { label: 'Status', key: 'status' },
                    { label: 'Created At', key: 'createdAt' }
                ];
                csvContent = arrayToCSV(headers, data.courses || []);
                filename = `${slug}_courses_${dateStr}.csv`;
            } else if (type === 'attendance') {
                const headers = [
                    { label: 'Course Code', key: 'courseCode' },
                    { label: 'Course Name', key: 'courseName' },
                    { label: 'Session Type', key: 'sessionType' },
                    { label: 'Session Start Time', key: 'sessionStartTime' },
                    { label: 'Student ID', key: 'studentId' },
                    { label: 'Student Name', key: 'studentName' },
                    { label: 'Student Email', key: 'studentEmail' },
                    { label: 'Attendance Status', key: 'status' },
                    { label: 'Marked At', key: 'markedAt' },
                    { label: 'Verification Method', key: 'verificationMethod' },
                    { label: 'Flagged', key: 'isFlagged' }
                ];
                csvContent = arrayToCSV(headers, data.attendanceRecords || []);
                filename = `${slug}_attendance_records_${dateStr}.csv`;
            }

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            downloadBlob(blob, filename);

            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} CSV downloaded!`, { id: 'export-progress' });
        } catch (error) {
            console.error(`${type} export error:`, error);
            toast.error(`Failed to export ${type} CSV.`, { id: 'export-progress' });
        } finally {
            setExportingType(null);
        }
    };

    if (loading || (activeOrganization && (!organization || organization._id !== activeOrganization._id))) {
        return (
            <div className="w-full animate-fade-in space-y-6">
                {/* Logo Card Skeleton */}
                <div className="card p-6 sm:p-8 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl flex flex-col md:flex-row gap-6 items-center">
                    <div className="skeleton w-24 h-24 rounded-full shrink-0"></div>
                    <div className="flex-1 space-y-2.5 text-center md:text-left">
                        <div className="skeleton w-40 h-5 rounded-md"></div>
                        <div className="skeleton w-32 h-8 rounded-lg"></div>
                        <div className="skeleton w-48 h-3 rounded"></div>
                    </div>
                    <div className="skeleton w-20 h-6 rounded-full self-start ml-auto"></div>
                </div>

                {/* Info Card Skeleton */}
                <div className="card p-6 sm:p-8 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl space-y-6">
                    <div className="space-y-1.5">
                        <div className="skeleton w-44 h-5 rounded-md"></div>
                        <div className="skeleton w-64 h-3.5 rounded"></div>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="skeleton w-28 h-3.5 rounded"></div>
                            <div className="skeleton w-full h-10 rounded-xl"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="skeleton w-20 h-3.5 rounded"></div>
                            <div className="skeleton w-full h-24 rounded-xl"></div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <div className="skeleton w-32 h-9 rounded-lg"></div>
                    </div>
                </div>

                {/* Statistics Cards Skeleton */}
                <div className="space-y-4 pt-2">
                    <div className="skeleton w-48 h-6 rounded-md"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="card p-6 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl space-y-3">
                                <div className="skeleton w-10 h-10 rounded-xl"></div>
                                <div className="skeleton w-16 h-7 rounded-md"></div>
                                <div className="skeleton w-28 h-3 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    
    if (!activeOrganization || !organization) {
        return (
            <div className="w-full animate-fade-in flex flex-col items-center justify-center py-16">
                <div className="card max-w-md w-full text-center p-8 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl">
                    <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-100">
                        <Building2 size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">No Organization Selected</h3>
                    <p className="text-xs text-slate-500 mb-6">Create an organization to begin managing courses, sessions, and attendance.</p>
                    <button className="btn btn-primary w-full py-2.5 font-bold text-xs" onClick={() => setShowCreateModal(true)}>
                        <PlusCircle size={15} className="mr-2" />
                        Create Organization
                    </button>
                </div>
                {showCreateModal && <CreateOrganizationModal onClose={() => setShowCreateModal(false)} />}
            </div>
        );
    }

    const userRole = activeOrganization?.userRole;
    const canEdit = userRole === 'OWNER' || userRole === 'ADMIN';
    const canSeeStats = userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'INSTRUCTOR';

    const owner = members.find(m => m.role === 'OWNER');
    const instructors = members.filter(m => m.role === 'INSTRUCTOR');
    const attendeesCount = members.filter(m => m.role === 'ATTENDEE').length;

    return (
        <div className="w-full animate-fade-in space-y-6">
            
            {/* Profile Picture Card */}
            <div className="card p-6 sm:p-8 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl flex flex-col md:flex-row gap-6 items-center">
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
            <div className="card p-6 sm:p-8 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl">
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
                        
                        <div className="card p-5 bg-white border-0 flex items-center shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl">
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

                        <div className="card p-5 bg-white border-0 flex items-center shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl">
                            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mr-4">
                                <Users size={24} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Attendees</p>
                                <p className="text-2xl font-black text-slate-800">{attendeesCount}</p>
                            </div>
                        </div>

                        <div className="card p-5 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl flex flex-col justify-center">
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
                        <div className="card p-0 border-0 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl animate-fade-in mt-[-10px]">
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

            {/* Divider between Organization Statistics and Data & Backups */}
            {canEdit && (
                <hr className="border-slate-200/80 my-6" />
            )}

            {/* In-App Data Export & Backups Section */}
            {canEdit && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                Data & Backups
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Export full institutional datasets, rosters, attendance logs, and archives for compliance or backup.
                            </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <CheckCircle2 size={13} />
                            Ready for Export
                        </span>
                    </div>

                    <div className="card p-6 sm:p-8 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-3xl space-y-6">
                        {/* Primary Full Archive Box */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2 max-w-xl">
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium backdrop-blur-sm">
                                    <Archive size={14} className="text-indigo-300" />
                                    <span>All-In-One Institutional Archive</span>
                                </div>
                                <h3 className="text-lg font-bold text-white tracking-tight">
                                    Download Complete Organization ZIP Archive
                                </h3>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    Generates a packaged ZIP containing formatted CSV spreadsheets for Members, Courses, Course Enrollments, Attendance Sessions, and Detailed Attendance Logs, plus full JSON metadata.
                                </p>
                            </div>

                            <div className="shrink-0">
                                <button
                                    onClick={handleExportFullZip}
                                    disabled={exportingType !== null}
                                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs tracking-wide shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 cursor-pointer"
                                >
                                    {exportingType === 'zip' ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin text-indigo-600" />
                                            <span>Building ZIP Archive...</span>
                                        </>
                                    ) : (
                                        <>
                                            <HardDriveDownload size={16} className="text-indigo-600" />
                                            <span>Export Full Archive (.ZIP)</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Granular / Individual Export Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                            {/* Raw JSON */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all flex flex-col justify-between space-y-4 group">
                                <div className="space-y-1.5">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                                        <FileJson size={20} />
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-800">Raw JSON Dump</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Complete raw database export for system migrations and custom integrations.
                                    </p>
                                </div>
                                <button
                                    onClick={handleExportJson}
                                    disabled={exportingType !== null}
                                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white hover:bg-amber-500 hover:text-white text-slate-700 text-xs font-semibold border border-slate-200 hover:border-amber-500 transition shadow-sm disabled:opacity-50 cursor-pointer"
                                >
                                    {exportingType === 'json' ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Download size={14} />
                                    )}
                                    <span>Download .JSON</span>
                                </button>
                            </div>

                            {/* Members CSV */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all flex flex-col justify-between space-y-4 group">
                                <div className="space-y-1.5">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                                        <FileSpreadsheet size={20} />
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-800">Members Roster</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        All registered members, student/staff IDs, roles, and status in CSV.
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleExportSpecificCsv('members')}
                                    disabled={exportingType !== null}
                                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-semibold border border-slate-200 hover:border-blue-600 transition shadow-sm disabled:opacity-50 cursor-pointer"
                                >
                                    {exportingType === 'members' ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Download size={14} />
                                    )}
                                    <span>Members (.CSV)</span>
                                </button>
                            </div>

                            {/* Courses CSV */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all flex flex-col justify-between space-y-4 group">
                                <div className="space-y-1.5">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                                        <FileSpreadsheet size={20} />
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-800">Courses & Curricula</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Course codes, batch, semester, min attendance requirements, and status.
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleExportSpecificCsv('courses')}
                                    disabled={exportingType !== null}
                                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white hover:bg-emerald-600 hover:text-white text-slate-700 text-xs font-semibold border border-slate-200 hover:border-emerald-600 transition shadow-sm disabled:opacity-50 cursor-pointer"
                                >
                                    {exportingType === 'courses' ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Download size={14} />
                                    )}
                                    <span>Courses (.CSV)</span>
                                </button>
                            </div>

                            {/* Attendance Records CSV */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all flex flex-col justify-between space-y-4 group">
                                <div className="space-y-1.5">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
                                        <FileSpreadsheet size={20} />
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-800">Attendance Records</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        All historical marked attendance logs, method, flags, and student data.
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleExportSpecificCsv('attendance')}
                                    disabled={exportingType !== null}
                                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white hover:bg-purple-600 hover:text-white text-slate-700 text-xs font-semibold border border-slate-200 hover:border-purple-600 transition shadow-sm disabled:opacity-50 cursor-pointer"
                                >
                                    {exportingType === 'attendance' ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Download size={14} />
                                    )}
                                    <span>Attendance (.CSV)</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Divider between Data & Backups and Activity Log */}
            {canEdit && (
                <hr className="border-slate-200/80 my-6" />
            )}

            {/* Admin Activity Log Section */}
            {canEdit && (
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center">
                        <Activity size={20} className="mr-2 text-indigo-500" /> 
                        Activity Log
                    </h2>
                    <div className="card p-8 bg-white border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl text-center">
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
