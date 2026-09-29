import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ArrowLeft, Users, UserPlus, Trash2 } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

const CourseDetails = () => {
    const { courseId } = useParams();
    const { activeOrganization } = useOrganization();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [course, setCourse] = useState(null);
    const [members, setMembers] = useState([]);
    const [orgMembers, setOrgMembers] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    
    // Quick and dirty multi-select state
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    
    const [confirmModalConfig, setConfirmModalConfig] = useState({ isOpen: false, type: '', message: '', action: null, data: null });

    useEffect(() => {
        const fetchDetails = async () => {
            if (!activeOrganization) return;
            try {
                setLoading(true);
                const [courseRes, courseMembersRes, orgMembersRes, sessionsRes] = await Promise.all([
                    api.get(`/organizations/${activeOrganization._id}/courses/${courseId}`),
                    api.get(`/organizations/${activeOrganization._id}/courses/${courseId}/members`),
                    api.get(`/organizations/${activeOrganization._id}/members`),
                    api.get(`/organizations/${activeOrganization._id}/sessions?courseId=${courseId}`)
                ]);
                
                setCourse(courseRes.data);
                setMembers(courseMembersRes.data);
                setSessions(sessionsRes.data);
                
                // Filter out those already in the course
                const enrolledIds = courseMembersRes.data.map(m => m.userId?._id);
                setOrgMembers(orgMembersRes.data.filter(m => !enrolledIds.includes(m.userId?._id)));
            } catch (error) {
                console.error("Failed to load course details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [activeOrganization, courseId]);

    const handleEnroll = async () => {
        if (selectedMemberIds.length === 0) return;
        
        try {
            setEnrolling(true);
            await api.post(`/organizations/${activeOrganization._id}/courses/${courseId}/members`, {
                organizationMemberIds: selectedMemberIds
            });
            
            // Reload members
            const [courseMembersRes, orgMembersRes] = await Promise.all([
                api.get(`/organizations/${activeOrganization._id}/courses/${courseId}/members`),
                api.get(`/organizations/${activeOrganization._id}/members`)
            ]);
            setMembers(courseMembersRes.data);
            const enrolledIds = courseMembersRes.data.map(m => m.userId?._id);
            setOrgMembers(orgMembersRes.data.filter(m => !enrolledIds.includes(m.userId?._id)));
            
            setShowEnrollModal(false);
            setSelectedMemberIds([]);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to enroll members');
        } finally {
            setEnrolling(false);
        }
    };

    const toggleMemberSelection = (orgMemberId) => {
        setSelectedMemberIds(prev => 
            prev.includes(orgMemberId) 
                ? prev.filter(id => id !== orgMemberId)
                : [...prev, orgMemberId]
        );
    };

    const handleRemoveMemberClick = (memberId) => {
        setConfirmModalConfig({
            isOpen: true,
            type: 'delete',
            action: 'remove_member',
            message: "Are you sure you want to remove this member from this course?",
            data: { memberId }
        });
    };

    const executeRemoveMember = async () => {
        const memberId = confirmModalConfig.data?.memberId;
        if (!memberId) return;
        
        try {
            await api.delete(`/organizations/${activeOrganization._id}/courses/${courseId}/members/${memberId}`);
            setMembers(prev => prev.filter(m => m._id !== memberId));
            
            // Reload org members to add them back to the enroll list
            const orgMembersRes = await api.get(`/organizations/${activeOrganization._id}/members`);
            const enrolledIds = members.filter(m => m._id !== memberId).map(m => m.userId?._id);
            setOrgMembers(orgMembersRes.data.filter(m => !enrolledIds.includes(m.userId?._id)));
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleDeleteCourse = async () => {
        setConfirmModalConfig({
            isOpen: true,
            type: 'delete',
            action: 'delete_course',
            message: `Are you sure you want to delete ${course.code}? This will also delete all related course enrollments.`
        });
    };

    const executeDelete = async () => {
        try {
            await api.delete(`/organizations/${activeOrganization._id}/courses/${courseId}`);
            navigate('/app/courses');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete course');
        }
    };

    if (loading) return <div className="p-4">Loading course details...</div>;
    if (!course) return <div className="p-4">Course not found</div>;

    const isAttendee = activeOrganization?.userRole === 'ATTENDEE';
    
    const isOwner = activeOrganization?.userRole === 'OWNER';
    const isCourseInstructor = course.instructors?.some(inst => inst.userId?._id === user?._id);
    const canDelete = isOwner || isCourseInstructor;

    return (
        <>
        <div className="animate-fade-in">
            <Link to="/app/courses" className="text-brand-600 hover:text-brand-800 flex items-center mb-6 w-fit transition font-medium bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100">
                <ArrowLeft size={16} className="mr-2" /> Back to Courses
            </Link>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-slate-800">
                        {course.name}
                        <span className="badge badge-primary text-sm">{course.code}</span>
                    </h1>
                    <p className="text-slate-500 max-w-2xl">{course.description || 'No description'}</p>
                </div>
                {!isAttendee && (
                    <div className="flex gap-2">
                        <button className="btn btn-primary shadow-sm" onClick={() => setShowEnrollModal(true)}>
                            <UserPlus size={18} className="mr-2" /> Enroll Students
                        </button>
                        {canDelete && (
                            <button className="btn btn-danger shadow-sm" onClick={handleDeleteCourse}>
                                <Trash2 size={18} className="mr-2" /> Delete Course
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="card h-full">
                        <h2 className="text-xl font-bold mb-4 flex items-center">
                            <Users size={18} className="mr-2 text-indigo-400" /> 
                            Enrolled Members ({members.length})
                        </h2>
                        
                        {members.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                No students enrolled yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table w-full">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Student ID</th>
                                            <th>Status</th>
                                            {!isAttendee && canDelete && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {members.map(m => (
                                            <tr key={m._id}>
                                                <td>{m.userId?.firstName} {m.userId?.lastName}</td>
                                                <td className="text-slate-500">{m.userId?.email}</td>
                                                <td className="text-slate-500">{m.userId?.studentId || '-'}</td>
                                                <td>
                                                    <span className="badge badge-success">Active</span>
                                                </td>
                                                {!isAttendee && canDelete && (
                                                    <td>
                                                        <button 
                                                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                                            onClick={() => handleRemoveMemberClick(m._id)}
                                                            title="Remove from course"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <div className="card h-full">
                        <h2 className="text-xl font-bold mb-4">Course Details</h2>
                        <div className="space-y-4">
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Description</div>
                                <div className="text-sm text-slate-800">{course.description || 'No description provided.'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Created</div>
                                <div className="text-sm text-slate-800">{new Date(course.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Enrolled Attendees</div>
                                <div className="text-sm text-slate-800">{members.length}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Attendance Sessions</div>
                                <div className="text-sm text-slate-800">{sessions.length}</div>
                            </div>
                            
                            {course.instructors && course.instructors.length > 0 && (
                                <div className="pt-4 border-t border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-700 mb-3">Instructor</h3>
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold mr-3 border border-brand-200">
                                            {course.instructors[0].userId?.firstName?.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-800">{course.instructors[0].userId?.firstName} {course.instructors[0].userId?.lastName}</div>
                                            <div className="text-xs text-slate-500">{course.instructors[0].userId?.email}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

            {/* Enroll Modal */}
            {showEnrollModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-lg relative max-h-[90vh] flex flex-col bg-white">
                        <h2 className="text-xl font-bold mb-4 text-slate-800">Enroll Members in {course.code}</h2>
                        
                        <div className="flex-1 overflow-y-auto mb-4 border border-slate-200 rounded-md bg-slate-50">
                            {orgMembers.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    All organization members are already enrolled in this course!
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {orgMembers.map(m => (
                                        <label key={m._id} className="flex items-center p-3 hover:bg-white cursor-pointer transition">
                                            <input 
                                                type="checkbox" 
                                                className="mr-3 w-4 h-4 rounded border-slate-300 text-brand-600 bg-white focus:ring-brand-500/50"
                                                checked={selectedMemberIds.includes(m._id)}
                                                onChange={() => toggleMemberSelection(m._id)}
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium text-slate-800">{m.userId?.firstName} {m.userId?.lastName}</div>
                                                <div className="text-xs text-slate-500">
                                                    {m.userId?.email} {m.studentId ? `· ID: ${m.studentId}` : ''}
                                                </div>
                                            </div>
                                            <div className="text-xs badge bg-slate-100 text-slate-600 border border-slate-200">
                                                {m.role}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-slate-100">
                            <button className="btn btn-outline" onClick={() => setShowEnrollModal(false)} disabled={enrolling}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleEnroll} disabled={enrolling || selectedMemberIds.length === 0}>
                                {enrolling ? 'Enrolling...' : `Enroll ${selectedMemberIds.length} members`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModalConfig.isOpen}
                onClose={() => setConfirmModalConfig({ ...confirmModalConfig, isOpen: false })}
                onConfirm={confirmModalConfig.action === 'delete_course' ? executeDelete : confirmModalConfig.action === 'remove_member' ? executeRemoveMember : () => {}}
                title={confirmModalConfig.action === 'delete_course' ? "Delete Course" : confirmModalConfig.action === 'remove_member' ? "Remove Member" : "Confirm"}
                message={confirmModalConfig.message}
                type={confirmModalConfig.type}
                confirmText={confirmModalConfig.action === 'delete_course' ? "Delete" : confirmModalConfig.action === 'remove_member' ? "Remove" : "Confirm"}
            />
        </>
    );
};

export default CourseDetails;
