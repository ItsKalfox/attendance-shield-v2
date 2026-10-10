import React, { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import { Users, PlusCircle, Upload, Trash2, Mail, Eye, Search, Shield } from 'lucide-react';
import api from '../../services/api';
import AddMemberModal from './AddMemberModal';
import ImportMembersModal from './ImportMembersModal';
import InviteOrganizerModal from './InviteOrganizerModal';
import ViewMemberModal from './ViewMemberModal';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 10;

const Members = () => {
    const { activeOrganization } = useOrganization();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ATTENDEES'); // 'ORGANIZERS' or 'ATTENDEES'
    
    // Search states
    const [attendeeSearch, setAttendeeSearch] = useState('');
    const [organizerSearch, setOrganizerSearch] = useState('');
    
    // Pagination states
    const [attendeePage, setAttendeePage] = useState(1);
    const [organizerPage, setOrganizerPage] = useState(1);
    
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [viewingMember, setViewingMember] = useState(null);
    const [confirmModalConfig, setConfirmModalConfig] = useState({ isOpen: false, memberId: null, message: '' });

    const fetchMembers = async () => {
        if (!activeOrganization) {
            setMembers([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setMembers([]);
            const res = await api.get(`/organizations/${activeOrganization._id}/members`);
            setMembers(res.data);
        } catch (error) {
            console.error("Failed to fetch members:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [activeOrganization]);

    const handleRemoveRequest = (member) => {
        setConfirmModalConfig({
            isOpen: true,
            memberId: member._id,
            message: `Are you sure you want to remove ${member.userId?.firstName} from the organization? Their account will not be deleted.`
        });
    };

    const executeRemove = async (memberIdOverride) => {
        const memberId = memberIdOverride || confirmModalConfig.memberId;
        if (!memberId) return;
        
        try {
            await api.delete(`/organizations/${activeOrganization._id}/members/${memberId}`);
            setMembers(prev => prev.filter(m => m._id !== memberId));
        } catch (error) {
            alert(error.response?.data?.message || "Failed to remove member");
            throw error;
        }
    };

    if (loading) {
        return (
            <div className="animate-fade-in space-y-6">
                {/* Top Bar Skeleton */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex space-x-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
                        <div className="skeleton w-28 h-8 rounded-xl"></div>
                        <div className="skeleton w-28 h-8 rounded-xl"></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="skeleton w-32 h-8 rounded-xl"></div>
                    </div>
                </div>

                {/* Card Container Skeleton */}
                <div className="bg-white rounded-3xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden">
                    {/* Header / Search Skeleton */}
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                        <div className="skeleton w-44 h-8 rounded-xl"></div>
                        <div className="skeleton w-64 h-8 rounded-xl"></div>
                    </div>

                    {/* Table Skeleton */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 border-b border-slate-100">
                                <tr>
                                    <th className="py-3.5 px-6"><div className="skeleton w-16 h-4"></div></th>
                                    <th className="py-3.5 px-6"><div className="skeleton w-20 h-4"></div></th>
                                    <th className="py-3.5 px-6"><div className="skeleton w-24 h-4"></div></th>
                                    <th className="py-3.5 px-6 text-right"><div className="skeleton w-16 h-4 ml-auto"></div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <tr key={i}>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center space-x-3">
                                                <div className="skeleton w-8 h-8 rounded-full"></div>
                                                <div className="space-y-1">
                                                    <div className="skeleton w-32 h-4 rounded"></div>
                                                    <div className="skeleton w-40 h-3 rounded"></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="skeleton w-24 h-5 rounded"></div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="skeleton w-28 h-4 rounded"></div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="skeleton w-20 h-7 rounded-xl ml-auto"></div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    const organizers = members.filter(m => m.role === 'OWNER' || m.role === 'INSTRUCTOR');
    const attendees = members.filter(m => m.role === 'ATTENDEE');

    const filteredAttendees = attendees.filter(m => {
        const q = attendeeSearch.toLowerCase();
        const fName = m.firstName || m.userId?.firstName || '';
        const lName = m.lastName || m.userId?.lastName || '';
        const name = `${fName} ${lName}`.toLowerCase();
        const email = (m.userId?.email || '').toLowerCase();
        const studentId = (m.studentId || '').toLowerCase();
        return name.includes(q) || email.includes(q) || studentId.includes(q);
    });

    const filteredOrganizers = organizers.filter(m => {
        const q = organizerSearch.toLowerCase();
        const name = `${m.userId?.firstName || ''} ${m.userId?.lastName || ''}`.toLowerCase();
        const email = (m.userId?.email || '').toLowerCase();
        const role = (m.role || '').toLowerCase();
        return name.includes(q) || email.includes(q) || role.includes(q);
    });

    const paginatedAttendees = filteredAttendees.slice((attendeePage - 1) * PAGE_SIZE, attendeePage * PAGE_SIZE);
    const paginatedOrganizers = filteredOrganizers.slice((organizerPage - 1) * PAGE_SIZE, organizerPage * PAGE_SIZE);

    return (
        <>
        <div className="animate-fade-in space-y-6">
            {/* Top Bar: Tabs & Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {/* Modern Pill Tabs */}
                <div className="flex space-x-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
                    <button 
                        className={`py-2 px-4 font-bold text-xs rounded-xl transition-all ${
                            activeTab === 'ATTENDEES' 
                                ? 'bg-white text-brand-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                        onClick={() => {
                            setActiveTab('ATTENDEES');
                            setAttendeePage(1);
                        }}
                    >
                        Attendees
                    </button>
                    <button 
                        className={`py-2 px-4 font-bold text-xs rounded-xl transition-all ${
                            activeTab === 'ORGANIZERS' 
                                ? 'bg-white text-brand-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                        onClick={() => {
                            setActiveTab('ORGANIZERS');
                            setOrganizerPage(1);
                        }}
                    >
                        Organizing Committee
                    </button>
                </div>

                {/* Actions */}
                {activeOrganization?.userRole === 'OWNER' && (
                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                        {activeTab === 'ATTENDEES' ? (
                            <>
                                <button className="btn btn-outline text-xs py-2 px-3.5 flex-1 sm:flex-initial justify-center" onClick={() => setShowImportModal(true)}>
                                    <Upload size={14} className="mr-1.5" />
                                    Import CSV
                                </button>
                                <button className="btn btn-primary text-xs py-2 px-3.5 shadow-sm shadow-brand-500/20 flex-1 sm:flex-initial justify-center" onClick={() => setShowAddModal(true)}>
                                    <PlusCircle size={14} className="mr-1.5" />
                                    Add Attendee
                                </button>
                            </>
                        ) : (
                            <button className="btn btn-primary text-xs py-2 px-3.5 shadow-sm shadow-brand-500/20 flex-1 sm:flex-initial justify-center" onClick={() => setShowInviteModal(true)}>
                                <Mail size={14} className="mr-1.5" />
                                Invite Instructor
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Attendees Tab Card */}
            {activeTab === 'ATTENDEES' && (
                <div className="bg-white rounded-3xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden">
                    {/* Card Header */}
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 flex items-center">
                                <Users size={18} className="mr-2 text-brand-600" />
                                Organization Attendees ({attendees.length})
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">Manage attendees enrolled in your organization</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="px-5 py-3 border-b border-slate-100 bg-white">
                        <div className="relative">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search attendee by name, email, or Attendee ID..."
                                value={attendeeSearch}
                                onChange={(e) => {
                                    setAttendeeSearch(e.target.value);
                                    setAttendeePage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                            />
                        </div>
                    </div>

                    {/* Table / Empty State */}
                    {attendees.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mb-3">
                                <Users size={24} />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 mb-1">No Attendees found</h4>
                            <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto">
                                {activeOrganization?.userRole === 'OWNER' 
                                    ? "No attendees have been added yet. Add attendees so they can scan QR codes and track their attendance."
                                    : "No attendees have been added to this organization yet."}
                            </p>
                            {activeOrganization?.userRole === 'OWNER' && (
                                <div className="flex justify-center gap-3">
                                    <button className="btn btn-primary text-xs py-2 px-3.5" onClick={() => setShowAddModal(true)}>
                                        <PlusCircle size={14} className="mr-1.5" /> Add Attendee
                                    </button>
                                    <button className="btn btn-outline text-xs py-2 px-3.5" onClick={() => setShowImportModal(true)}>
                                        <Upload size={14} className="mr-1.5" /> Import CSV
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : filteredAttendees.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs">
                            No attendees match "{attendeeSearch}".
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="py-3 px-3.5 sm:px-5">Attendee</th>
                                            <th className="py-3 px-4 hidden sm:table-cell">Attendee ID</th>
                                            <th className="py-3 px-4 hidden md:table-cell">Joined</th>
                                            <th className="py-3 px-3.5 sm:px-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {paginatedAttendees.map(member => {
                                            const fName = member.firstName || member.userId?.firstName || '';
                                            const lName = member.lastName || member.userId?.lastName || '';
                                            const fullName = `${fName} ${lName}`.trim() || 'Attendee';
                                            const initial = fName ? fName.charAt(0) : 'A';

                                            return (
                                                <tr key={member._id} className="hover:bg-slate-50/60 transition group">
                                                    <td className="py-3 sm:py-3.5 px-3.5 sm:px-5">
                                                        <div className="flex items-center space-x-2.5 sm:space-x-3">
                                                            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {initial}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-semibold text-slate-900 group-hover:text-brand-600 transition truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
                                                                    {fullName}
                                                                </div>
                                                                <div className="text-[11px] text-slate-400 font-normal truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
                                                                    {member.userId?.email}
                                                                </div>
                                                                {member.studentId && (
                                                                    <div className="sm:hidden mt-0.5">
                                                                        <span className="inline-block font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70">
                                                                            ID: {member.studentId}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                <td className="py-3.5 px-4 font-mono text-slate-600 hidden sm:table-cell">
                                                    {member.studentId ? (
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                                            {member.studentId}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-500 hidden md:table-cell">
                                                    {new Date(member.joinedAt).toLocaleDateString()}
                                                </td>
                                                <td className="py-3 sm:py-3.5 px-3.5 sm:px-5 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end space-x-1.5 sm:space-x-2">
                                                        <button 
                                                            className="flex items-center px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:scale-95 shadow-sm rounded-xl transition border border-slate-200/80"
                                                            onClick={() => setViewingMember(member)}
                                                            title="View Details"
                                                        >
                                                            <Eye size={13} className="sm:mr-1.5 text-slate-500" />
                                                            <span className="hidden sm:inline">View</span>
                                                        </button>
                                                        {activeOrganization?.userRole === 'OWNER' && (
                                                            <button 
                                                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition" 
                                                                onClick={() => handleRemoveRequest(member)}
                                                                title="Remove Attendee"
                                                            >
                                                                <Trash2 size={14} className="sm:w-[15px] sm:h-[15px]" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination 
                                currentPage={attendeePage}
                                totalItems={filteredAttendees.length}
                                pageSize={PAGE_SIZE}
                                onPageChange={setAttendeePage}
                                itemName="attendees"
                            />
                        </>
                    )}
                </div>
            )}

            {/* Organizing Committee Tab Card */}
            {activeTab === 'ORGANIZERS' && (
                <div className="bg-white rounded-3xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden">
                    {/* Card Header */}
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 flex items-center">
                                <Shield size={18} className="mr-2 text-brand-600" />
                                Organizing Committee ({organizers.length})
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">Manage administrators and instructors in your organization</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="px-5 py-3 border-b border-slate-100 bg-white">
                        <div className="relative">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search instructor by name or email..."
                                value={organizerSearch}
                                onChange={(e) => {
                                    setOrganizerSearch(e.target.value);
                                    setOrganizerPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                            />
                        </div>
                    </div>

                    {/* Table / Empty State */}
                    {organizers.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mb-3">
                                <Shield size={24} />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 mb-1">No Instructors found</h4>
                            <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto">
                                {activeOrganization?.userRole === 'OWNER'
                                    ? "Invite instructors to help you manage courses and take attendance."
                                    : "No instructors have been added to this organization."}
                            </p>
                            {activeOrganization?.userRole === 'OWNER' && (
                                <button className="btn btn-primary text-xs py-2 px-3.5 shadow-sm shadow-brand-500/20" onClick={() => setShowInviteModal(true)}>
                                    <Mail size={14} className="mr-1.5" /> Invite Instructor
                                </button>
                            )}
                        </div>
                    ) : filteredOrganizers.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs">
                            No instructors match "{organizerSearch}".
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="py-3 px-3.5 sm:px-5">Member</th>
                                            <th className="py-3 px-4 hidden md:table-cell">Email</th>
                                            <th className="py-3 px-4">Role</th>
                                            <th className="py-3 px-4 hidden sm:table-cell">Joined</th>
                                            <th className="py-3 px-3.5 sm:px-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {paginatedOrganizers.map(member => (
                                            <tr key={member._id} className="hover:bg-slate-50/60 transition group">
                                                <td className="py-3 sm:py-3.5 px-3.5 sm:px-5">
                                                    <div className="flex items-center space-x-2.5 sm:space-x-3">
                                                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center font-bold text-xs shrink-0">
                                                            {member.userId?.firstName?.charAt(0) || 'U'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-slate-900 group-hover:text-brand-600 transition truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
                                                                {member.userId?.firstName} {member.userId?.lastName}
                                                            </div>
                                                            <div className="text-[11px] text-slate-400 font-normal truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
                                                                {member.userId?.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-600 hidden md:table-cell">
                                                    {member.userId?.email}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                                        member.role === 'OWNER' 
                                                            ? 'bg-brand-50 text-brand-700 border border-brand-200/60' 
                                                            : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                                    }`}>
                                                        {member.role === 'INSTRUCTOR' ? 'Instructor' : 'Owner'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-500 hidden sm:table-cell">
                                                    {new Date(member.joinedAt).toLocaleDateString()}
                                                </td>
                                                <td className="py-3 sm:py-3.5 px-3.5 sm:px-5 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end space-x-1.5 sm:space-x-2">
                                                        {activeOrganization?.userRole === 'OWNER' && (
                                                            <>
                                                                <button 
                                                                    className="flex items-center px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:scale-95 shadow-sm rounded-xl transition border border-slate-200/80"
                                                                    onClick={() => setViewingMember(member)}
                                                                    title="View Details"
                                                                >
                                                                    <Eye size={13} className="sm:mr-1.5 text-slate-500" />
                                                                    <span className="hidden sm:inline">View</span>
                                                                </button>
                                                                {member.role !== 'OWNER' && (
                                                                    <button 
                                                                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition" 
                                                                        onClick={() => handleRemoveRequest(member)}
                                                                        title="Remove Instructor"
                                                                    >
                                                                        <Trash2 size={14} className="sm:w-[15px] sm:h-[15px]" />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination 
                                currentPage={organizerPage}
                                totalItems={filteredOrganizers.length}
                                pageSize={PAGE_SIZE}
                                onPageChange={setOrganizerPage}
                                itemName="instructors"
                            />
                        </>
                    )}
                </div>
            )}
        </div>
        
        {showAddModal && (
            <AddMemberModal 
                onClose={() => setShowAddModal(false)}
                onMemberAdded={fetchMembers}
            />
        )}

        {showImportModal && (
            <ImportMembersModal 
                onClose={() => setShowImportModal(false)}
                onMembersImported={fetchMembers}
            />
        )}

        {showInviteModal && (
            <InviteOrganizerModal 
                onClose={() => setShowInviteModal(false)}
            />
        )}

        {viewingMember && (
            <ViewMemberModal 
                member={viewingMember}
                onClose={() => setViewingMember(null)}
                onUpdated={(updatedMember) => {
                    setMembers(prev => prev.map(m => m._id === updatedMember._id ? updatedMember : m));
                }}
                onDelete={async (member) => {
                    await executeRemove(member._id);
                }}
            />
        )}

        <ConfirmModal
            isOpen={confirmModalConfig.isOpen}
            onClose={() => setConfirmModalConfig({ ...confirmModalConfig, isOpen: false })}
            onConfirm={executeRemove}
            title="Remove Member"
            message={confirmModalConfig.message}
            type="delete"
            confirmText="Remove"
        />
        </>
    );
};

export default Members;
