import React, { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import { Users, PlusCircle, Upload, Trash2, Mail } from 'lucide-react';
import api from '../../services/api';
import AddMemberModal from './AddMemberModal';
import ImportMembersModal from './ImportMembersModal';
import InviteOrganizerModal from './InviteOrganizerModal';

const Members = () => {
    const { activeOrganization } = useOrganization();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ATTENDEES'); // 'ORGANIZERS' or 'ATTENDEES'
    
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);

    const fetchMembers = async () => {
        if (!activeOrganization) return;
        try {
            setLoading(true);
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

    const handleRemove = async (memberId) => {
        if (!window.confirm("Are you sure you want to remove this member?")) return;
        try {
            await api.delete(`/organizations/${activeOrganization._id}/members/${memberId}`);
            setMembers(prev => prev.filter(m => m._id !== memberId));
        } catch (error) {
            alert(error.response?.data?.message || "Failed to remove member");
        }
    };

    if (loading && members.length === 0) {
        return <div className="p-4">Loading members...</div>;
    }

    const organizers = members.filter(m => m.role === 'OWNER' || m.role === 'INSTRUCTOR');
    const attendees = members.filter(m => m.role === 'ATTENDEE');

    return (
        <>
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Organization Members</h2>
                    <p className="text-slate-500 text-sm">Manage users and their roles in your organization.</p>
                </div>
                <div className="flex gap-3">
                    {activeTab === 'ATTENDEES' ? (
                        <>
                            <button className="btn btn-outline" onClick={() => setShowImportModal(true)}>
                                <Upload size={18} className="mr-2" />
                                Import CSV
                            </button>
                            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                                <PlusCircle size={18} className="mr-2" />
                                Add Attendee
                            </button>
                        </>
                    ) : (
                        <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
                            <Mail size={18} className="mr-2" />
                            Invite Instructor
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-slate-200">
                <button 
                    className={`py-3 px-6 font-medium text-sm border-b-2 transition ${activeTab === 'ATTENDEES' ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    onClick={() => setActiveTab('ATTENDEES')}
                >
                    Attendees ({attendees.length})
                </button>
                <button 
                    className={`py-3 px-6 font-medium text-sm border-b-2 transition ${activeTab === 'ORGANIZERS' ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    onClick={() => setActiveTab('ORGANIZERS')}
                >
                    Organizing Committee ({organizers.length})
                </button>
            </div>

            {/* Content */}
            {activeTab === 'ATTENDEES' && (
                attendees.length === 0 ? (
                    <div className="card">
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                                <Users size={24} className="text-slate-400" />
                            </div>
                            <h4 className="text-lg font-medium text-slate-800 mb-1">No Attendees found</h4>
                            <p className="text-slate-500 mb-6 max-w-md mx-auto">No attendees have been added. Add attendees so they can scan QR codes and track their attendance.</p>
                            <div className="flex justify-center gap-4">
                                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                                    Add Attendee
                                </button>
                                <button className="btn btn-outline" onClick={() => setShowImportModal(true)}>
                                    Import CSV
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Attendee ID</th>
                                    <th>Joined</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendees.map(member => (
                                    <tr key={member._id}>
                                        <td>
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold mr-3 shrink-0">
                                                    {member.userId?.firstName?.charAt(0) || 'U'}
                                                </div>
                                                <span className="font-semibold text-slate-800">
                                                    {member.userId?.firstName} {member.userId?.lastName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-slate-600">{member.userId?.email}</td>
                                        <td className="text-slate-600 font-mono text-sm">{member.studentId || '-'}</td>
                                        <td className="text-slate-600">{new Date(member.joinedAt).toLocaleDateString()}</td>
                                        <td className="text-right">
                                            <button 
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" 
                                                onClick={() => handleRemove(member._id)}
                                                title="Remove Attendee"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {activeTab === 'ORGANIZERS' && (
                organizers.length === 0 ? (
                    <div className="card">
                        <div className="text-center py-12">
                            <h4 className="text-lg font-medium text-slate-800 mb-1">No Instructors found</h4>
                            <p className="text-slate-500 mb-6 max-w-md mx-auto">Invite instructors to help you manage courses and sessions.</p>
                            <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
                                Invite Instructor
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Joined</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {organizers.map(member => (
                                    <tr key={member._id}>
                                        <td>
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold mr-3 shrink-0">
                                                    {member.userId?.firstName?.charAt(0) || 'U'}
                                                </div>
                                                <span className="font-semibold text-slate-800">
                                                    {member.userId?.firstName} {member.userId?.lastName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-slate-600">{member.userId?.email}</td>
                                        <td>
                                            <span className={`badge ${member.role === 'OWNER' ? 'badge-primary' : 'badge-success'}`}>
                                                {member.role === 'INSTRUCTOR' ? 'Instructor' : 'Owner'}
                                            </span>
                                        </td>
                                        <td className="text-slate-600">{new Date(member.joinedAt).toLocaleDateString()}</td>
                                        <td className="text-right">
                                            {member.role !== 'OWNER' && (
                                                <button 
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" 
                                                    onClick={() => handleRemove(member._id)}
                                                    title="Remove Instructor"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
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
                onInvited={() => {
                    alert('Invitation sent successfully!');
                }}
            />
        )}
        </>
    );
};

export default Members;
