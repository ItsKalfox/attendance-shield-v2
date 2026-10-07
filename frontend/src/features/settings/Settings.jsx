import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { CloudUpload, User as UserIcon } from 'lucide-react';

const Settings = () => {
    const { user, setUser } = useAuth();
    
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
        <div className="p-6 w-full animate-fade-in space-y-6">
            
            {/* Profile Picture Card */}
            <div className="card p-8 bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl flex flex-col md:flex-row gap-6 items-center">
                <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-sm border-2 border-slate-100">
                    {user?.avatar ? (
                        <img 
                            src={user.avatar} 
                            alt="Profile" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                            }}
                            className="w-full h-full object-cover" 
                        />
                    ) : null}
                    <UserIcon size={40} className={`text-slate-400 ${user?.avatar ? 'hidden' : ''}`} />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-xl font-bold text-slate-800">{user?.firstName} {user?.lastName}</h2>
                    <p className="text-slate-500 font-medium mb-3">{user?.email}</p>
                    
                    {user?.authProvider === 'GOOGLE' && (
                        <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-slate-600 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 inline-flex">
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Logged in with Google
                        </div>
                    )}
                    
                    {user?.authProvider === 'MICROSOFT' && (
                        <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-slate-600 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 inline-flex">
                            <svg className="w-4 h-4" viewBox="0 0 21 21">
                                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                            </svg>
                            Logged in with Microsoft
                        </div>
                    )}

                    {(!user?.authProvider || user?.authProvider === 'LOCAL') && (
                        <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-slate-600 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 inline-flex">
                            Logged in with Email
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Info Card */}
            <div className="card p-8 bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl">
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
            <div className="card p-8 bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl">
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
            <div className="card p-8 bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl">
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
