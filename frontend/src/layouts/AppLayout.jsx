import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';
import { 
    LayoutDashboard, 
    CalendarClock, 
    BookOpen, 
    Users, 
    Settings, 
    LogOut, 
    ChevronDown,
    PlusCircle
} from 'lucide-react';
import CreateOrganizationModal from '../features/organizations/CreateOrganizationModal';

const AppLayout = () => {
    const { user, logout } = useAuth();
    const { organizations, activeOrganization, switchOrganization, loadingOrg } = useOrganization();
    const navigate = useNavigate();
    const [showOrgDropdown, setShowOrgDropdown] = useState(false);
    const [showCreateOrg, setShowCreateOrg] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // If no orgs and not loading, show empty state or create org modal
    // (We will handle this better in the dashboard or via a modal)
    
    return (
        <div className="app-container">
            {/* Sidebar */}
            <div className="app-sidebar">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Attendance</h2>
                    
                    {/* Organization Switcher */}
                    <div className="relative">
                        <button 
                            className="w-full flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-brand-300 hover:bg-slate-50 transition text-slate-800"
                            onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                        >
                            <span className="truncate mr-2 font-semibold">
                                {loadingOrg ? 'Loading...' : (activeOrganization?.name || 'No Organization')}
                            </span>
                            <ChevronDown size={16} className="text-slate-400" />
                        </button>
                        
                        {showOrgDropdown && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowOrgDropdown(false)}></div>
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                                    {organizations.map(org => (
                                        <button 
                                            key={org._id}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition flex items-center text-slate-700 hover:text-slate-900"
                                            onClick={() => {
                                                switchOrganization(org._id);
                                                setShowOrgDropdown(false);
                                            }}
                                        >
                                            {org._id === activeOrganization?._id && <span className="text-brand-600 mr-2 font-bold">✓</span>}
                                            <span className={`truncate ${org._id !== activeOrganization?._id ? 'ml-5' : 'font-medium'}`}>
                                                {org.name}
                                            </span>
                                        </button>
                                    ))}
                                    <div className="border-t border-slate-100"></div>
                                    <button 
                                        className="w-full text-left px-4 py-3 text-brand-600 hover:bg-brand-50 transition flex items-center font-medium"
                                        onClick={() => {
                                            setShowOrgDropdown(false);
                                            setShowCreateOrg(true);
                                        }}
                                    >
                                        <PlusCircle size={16} className="mr-2" />
                                        Create Organization
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                
                <div className="flex-1 py-6 overflow-y-auto">
                    <nav className="px-4 space-y-2">
                        <NavLink to="/app/dashboard" className={({isActive}) => `flex items-center px-4 py-3 rounded-xl font-medium transition border ${isActive ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                            <LayoutDashboard size={20} className="mr-3" /> Dashboard
                        </NavLink>
                        
                        {activeOrganization?.userRole === 'ATTENDEE' ? (
                            <>
                                <NavLink to="/app/courses" className={({isActive}) => `flex items-center px-4 py-3 rounded-xl font-medium transition border ${isActive ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                    <BookOpen size={20} className="mr-3" /> My Courses
                                </NavLink>
                            </>
                        ) : (
                            <>
                                <NavLink to="/app/sessions" className={({isActive}) => `flex items-center px-4 py-3 rounded-xl font-medium transition border ${isActive ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                    <CalendarClock size={20} className="mr-3" /> Sessions
                                </NavLink>
                                <NavLink to="/app/courses" className={({isActive}) => `flex items-center px-4 py-3 rounded-xl font-medium transition border ${isActive ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                    <BookOpen size={20} className="mr-3" /> Courses
                                </NavLink>
                                <NavLink to="/app/members" className={({isActive}) => `flex items-center px-4 py-3 rounded-xl font-medium transition border ${isActive ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                    <Users size={20} className="mr-3" /> Members
                                </NavLink>
                                <NavLink to="/app/settings" className={({isActive}) => `flex items-center px-4 py-3 rounded-xl font-medium transition border ${isActive ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                    <Settings size={20} className="mr-3" /> Settings
                                </NavLink>
                            </>
                        )}
                    </nav>
                </div>
                
                <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center truncate">
                            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold mr-3 flex-shrink-0 shadow-sm border border-brand-200">
                                {user?.firstName?.charAt(0) || 'U'}
                            </div>
                            <div className="truncate">
                                <p className="text-sm font-bold text-slate-800 truncate">{user?.firstName} {user?.lastName}</p>
                                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Log Out">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="app-main">
                <header className="app-header justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 capitalize">
                            {window.location.pathname.split('/').pop().replace('-', ' ') || 'Dashboard'}
                        </h1>
                    </div>
                    <div className="flex items-center">
                        <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </header>
                
                <main className="app-content relative bg-slate-50/50">
                    {!activeOrganization && !loadingOrg ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-700">
                                <PlusCircle size={40} className="text-indigo-400" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Welcome to Attendance Platform!</h2>
                            <p className="text-slate-400 max-w-md mx-auto mb-8">
                                You don't belong to any organization yet. Create one to start managing courses, sessions, and attendance.
                            </p>
                            <button className="btn btn-primary" onClick={() => setShowCreateOrg(true)}>
                                <PlusCircle size={18} className="mr-2" />
                                Create Organization
                            </button>
                        </div>
                    ) : (
                        <Outlet />
                    )}
                </main>
            </div>
            {showCreateOrg && <CreateOrganizationModal onClose={() => setShowCreateOrg(false)} />}
        </div>
    );
};

export default AppLayout;
