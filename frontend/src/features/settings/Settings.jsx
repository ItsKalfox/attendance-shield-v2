import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { CloudUpload, User as UserIcon } from 'lucide-react';

const Settings = () => {
    const { user, setUser } = useAuth();
    
    // Profile Picture state
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Profile state
    const [firstName, setFirstName] = useState(user?.firstName || '');
    const [lastName, setLastName] = useState(user?.lastName || '');
    const [savingProfile, setSavingProfile] = useState(false);

    // Email state
    const [email, setEmail] = useState(user?.email || '');
    
    // Password state
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);

    // Common function to update user context
    const refreshUser = async () => {
        try {
            const res = await api.get('/auth/me');
            setUser(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setAvatarPreview(reader.result);
            reader.readAsDataURL(file);
            uploadAvatar(file);
        }
    };

    const uploadAvatar = async (file) => {
        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('avatar', file);
            
            const res = await api.patch('/auth/me', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUser(res.data);
        } catch (error) {
            alert('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const removeAvatar = async () => {
        try {
            setUploading(true);
            const res = await api.patch('/auth/me', { avatar: '' });
            setUser(res.data);
            setAvatarPreview('');
            setAvatarFile(null);
        } catch (error) {
            alert('Failed to remove image');
        } finally {
            setUploading(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            setSavingProfile(true);
            const res = await api.patch('/auth/me', { firstName, lastName });
            setUser(res.data);
            alert('Profile updated successfully!');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSavePassword = async () => {
        try {
            setSavingPassword(true);
            await api.patch('/auth/me/password', { currentPassword, newPassword });
            alert('Password updated successfully!');
            setShowPasswordFields(false);
            setCurrentPassword('');
            setNewPassword('');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update password');
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto animate-fade-in space-y-6">
            
            {/* Background decorative elements for premium feel */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-400/20 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[120px]"></div>
            </div>

            {/* Profile Picture Card */}
            <div className="card p-8 bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl flex flex-col md:flex-row gap-6 items-center">
                <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-sm border-2 border-white">
                    {avatarPreview ? (
                        <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon size={40} className="text-slate-400" />
                    )}
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-lg font-bold text-slate-800 mb-3">Profile Picture</h2>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleAvatarChange} 
                            accept="image/png, image/jpeg, image/gif" 
                            className="hidden" 
                        />
                        <button 
                            className="btn btn-primary flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition shadow-sm disabled:opacity-50"
                            onClick={() => fileInputRef.current.click()}
                            disabled={uploading}
                        >
                            <CloudUpload size={16} className="mr-2" /> 
                            {uploading ? 'Uploading...' : 'Change Image'}
                        </button>
                        <button 
                            className="btn bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition"
                            onClick={removeAvatar}
                            disabled={!avatarPreview || uploading}
                        >
                            Remove
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">We support PNGs, JPEGs and GIFs under 10MB</p>
                </div>
            </div>

            {/* Profile Info Card */}
            <div className="card p-8 bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-800">Profile</h2>
                    <p className="text-sm text-slate-500">Update your first and last name</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">First Name</label>
                        <input 
                            type="text" 
                            className="form-input w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-2.5 focus:bg-white transition shadow-sm"
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">Last Name</label>
                        <input 
                            type="text" 
                            className="form-input w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-2.5 focus:bg-white transition shadow-sm"
                            value={lastName}
                            onChange={e => setLastName(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="flex justify-end pt-4 border-t border-slate-200/50">
                    <button 
                        className="btn bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg font-medium text-sm transition shadow-md disabled:opacity-50"
                        onClick={handleSaveProfile}
                        disabled={savingProfile || (!firstName || !lastName)}
                    >
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Email Card */}
            <div className="card p-8 bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-800">Email</h2>
                    <p className="text-sm text-slate-500">Used to log in to your account</p>
                </div>
                
                <div className="mb-2">
                    <label className="block text-xs font-bold text-slate-700 mb-2">Email Address</label>
                    <div className="flex gap-4">
                        <input 
                            type="email" 
                            className="form-input flex-1 bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-500 cursor-not-allowed shadow-inner"
                            value={email}
                            disabled
                        />
                        <button className="btn bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2.5 rounded-xl font-medium text-sm transition shrink-0">
                            Edit Email
                        </button>
                    </div>
                </div>
            </div>

            {/* Password Card */}
            <div className="card p-8 bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Password</h2>
                        <p className="text-sm text-slate-500">Log in with your password instead of using temporary login codes</p>
                    </div>
                    {!showPasswordFields && (
                        <button 
                            className="btn bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2.5 rounded-xl font-medium text-sm transition shrink-0"
                            onClick={() => setShowPasswordFields(true)}
                        >
                            Change Password
                        </button>
                    )}
                </div>

                {showPasswordFields && (
                    <div className="mt-6 pt-6 border-t border-slate-200/50 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">Current Password</label>
                                <input 
                                    type="password" 
                                    className="form-input w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-2.5 focus:bg-white transition shadow-sm"
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">New Password</label>
                                <input 
                                    type="password" 
                                    className="form-input w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-2.5 focus:bg-white transition shadow-sm"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button 
                                className="btn bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2 rounded-lg font-medium text-sm transition"
                                onClick={() => {
                                    setShowPasswordFields(false);
                                    setCurrentPassword('');
                                    setNewPassword('');
                                }}
                                disabled={savingPassword}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg font-medium text-sm transition shadow-md disabled:opacity-50"
                                onClick={handleSavePassword}
                                disabled={savingPassword || (!currentPassword || !newPassword)}
                            >
                                {savingPassword ? 'Saving...' : 'Update Password'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Settings;
