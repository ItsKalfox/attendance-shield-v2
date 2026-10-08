import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
    PlusCircle,
    Building2,
    Calendar
} from 'lucide-react';
import api from '../services/api';
import CreateOrganizationModal from '../features/organizations/CreateOrganizationModal';
import PendingInvitationModal from '../features/organizations/PendingInvitationModal';

const AppLayout = () => {
    const { user, logout } = useAuth();
    const { organizations, activeOrganization, switchOrganization, loadingOrg } = useOrganization();
    const navigate = useNavigate();
    const location = useLocation();
    const [showOrgDropdown, setShowOrgDropdown] = useState(false);
    const [showCreateOrg, setShowCreateOrg] = useState(false);
    const [pendingInvitations, setPendingInvitations] = useState([]);

    // Check for pending invitations on mount or when user changes
    useEffect(() => {
        const checkPendingInvitations = async () => {
            if (!user) return;
            try {
                const res = await api.get('/invitations/me/pending');
                if (Array.isArray(res.data) && res.data.length > 0) {
                    setPendingInvitations(res.data);
                }
            } catch (err) {
                console.error("Could not check pending invitations:", err);
            }
        };

        checkPendingInvitations();
    }, [user]);

    const handleInvitationResolved = (invitationId) => {
        setPendingInvitations(prev => prev.filter(inv => inv._id !== invitationId));
    };

    // Dynamic Navigation Items
    const navItems = !activeOrganization ? [
        { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/app/organization', label: 'Organization', icon: Building2 },
        { path: '/app/settings', label: 'Settings', icon: Settings },
    ] : activeOrganization.userRole === 'ATTENDEE' ? [
        { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/app/courses', label: 'My Courses', icon: BookOpen },
        { path: '/app/attendance', label: 'My Attendance', icon: CalendarClock },
        { path: '/app/organization', label: 'Organization', icon: Building2 },
        { path: '/app/settings', label: 'Settings', icon: Settings },
    ] : [
        { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/app/sessions', label: 'Sessions', icon: CalendarClock },
        { path: '/app/courses', label: 'Courses', icon: BookOpen },
        { path: '/app/members', label: 'Members', icon: Users },
        { path: '/app/organization', label: 'Organization', icon: Building2 },
        { path: '/app/settings', label: 'Settings', icon: Settings },
    ];

    const activeIndex = navItems.findIndex(item => location.pathname.startsWith(item.path));

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // If no orgs and not loading, show empty state or create org modal
    // (We will handle this better in the dashboard or via a modal)

    return (
        <div className="app-container">
            {/* Sidebar */}
            <div className="app-sidebar border-none text-slate-300">
                <div className="flex items-center px-6 shrink-0 pt-8 pb-6">
                    <img src="/logo.png" alt="Attendance Shield" className="w-44 h-auto drop-shadow-md object-contain" />
                </div>
                
                <div className="px-6 mb-4">
                    <div className="border-b border-brand-800/50"></div>
                </div>

                <div className="flex-1 pb-6 overflow-y-auto">
                    <div className="px-6 mb-3 text-xs font-semibold text-brand-300/50 uppercase tracking-wider">Navigation</div>
                    <nav className="px-4 space-y-1.5 relative">
                        {/* Floating glass background */}
                        {activeIndex !== -1 && (
                            <div 
                                className="absolute left-4 right-4 h-[48px] rounded-full bg-white/10 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none" 
                                style={{ transform: `translateY(${activeIndex * (48 + 6)}px)` }} 
                            />
                        )}

                        {navItems.map((item) => (
                            <NavLink 
                                key={item.path}
                                to={item.path} 
                                className={({ isActive }) => `flex items-center px-4 py-3 rounded-full font-medium transition-colors relative z-10 ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                            >
                                <item.icon size={20} className="mr-3" /> {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto px-6 pb-6">
                    <div className="border-t border-brand-800/50 pt-5">
                        <div className="px-2 mb-3 text-xs font-semibold text-brand-300/50 uppercase tracking-wider">User Account</div>
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center truncate">
                                {user?.avatar ? (
                                    <img 
                                        src={user.avatar} 
                                        alt="Avatar" 
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                        }}
                                        className="w-10 h-10 rounded-full object-cover mr-3 flex-shrink-0 border border-brand-700 shadow-sm bg-white" 
                                    />
                                ) : null}
                                <div 
                                    className={`w-10 h-10 rounded-full bg-brand-800 flex items-center justify-center text-white font-bold mr-3 flex-shrink-0 shadow-sm ${user?.avatar ? 'hidden' : ''}`}
                                >
                                    {user?.firstName?.charAt(0) || 'U'}
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-bold text-white truncate">{user?.firstName} {user?.lastName}</p>
                                    <p className="text-xs text-brand-300/60 truncate">{user?.email}</p>
                                </div>
                            </div>
                            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition" title="Log Out">
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="app-main">
                <header className="app-header justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 capitalize tracking-tight">
                            {(() => {
                                const pathSegment = window.location.pathname.split('/').pop();
                                // Check if the segment is a 24-char hex string (MongoDB ID)
                                if (/^[0-9a-fA-F]{24}$/.test(pathSegment)) {
                                    return 'Details';
                                }
                                return pathSegment.replace('-', ' ') || 'Dashboard';
                            })()}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Date Chip */}
                        <div className="hidden sm:flex items-center px-3.5 py-1.5 rounded-xl bg-white/75 backdrop-blur-md border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] text-xs font-semibold text-slate-600 transition-all duration-300 hover:shadow-md hover:bg-white/95 select-none">
                            <Calendar size={13} className="text-slate-600 shrink-0 mr-2" />
                            <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </div>

                        {/* Organization Switcher & Role Badge */}
                        <div className="flex items-center gap-2.5">
                            {activeOrganization?.userRole && !loadingOrg && (
                                <div className="flex items-center px-3.5 py-1.5 rounded-xl bg-white/75 backdrop-blur-md border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] text-xs font-semibold text-slate-600 transition-all duration-300 hover:shadow-md hover:bg-white/95 select-none">
                                    <span>
                                        {activeOrganization.userRole === 'OWNER' ? 'Owner' : activeOrganization.userRole === 'ADMIN' ? 'Admin' : activeOrganization.userRole === 'INSTRUCTOR' ? 'Instructor' : 'Attendee'}
                                    </span>
                                </div>
                            )}

                            <div className="relative">
                                <button
                                    className="flex items-center gap-2 hover:opacity-80 transition text-slate-800"
                                    onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                                >
                                    <div className="flex items-center">
                                        {activeOrganization?.avatarUrl && !loadingOrg ? (
                                            <img src={activeOrganization.avatarUrl} alt={activeOrganization.name} className="w-8 h-8 rounded-md object-contain shrink-0 bg-slate-50 shadow-sm" />
                                        ) : activeOrganization && !loadingOrg ? (
                                            <div className="w-8 h-8 rounded-md bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs shrink-0 shadow-sm">
                                                {activeOrganization.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        ) : null}
                                        <span className="truncate font-bold text-base ml-3 max-w-[200px] text-left">
                                            {loadingOrg ? 'Loading...' : (activeOrganization?.name || 'No Organization')}
                                        </span>
                                    </div>
                                    <ChevronDown size={16} className="text-slate-500 shrink-0 ml-1" />
                                </button>

                                {showOrgDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowOrgDropdown(false)}></div>
                                        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                                            {organizations.map(org => (
                                                <button
                                                    key={org._id}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition flex items-center text-slate-700 hover:text-slate-900 text-sm"
                                                    onClick={() => {
                                                        switchOrganization(org._id);
                                                        setShowOrgDropdown(false);
                                                    }}
                                                >
                                                    {org._id === activeOrganization?._id ? (
                                                        <span className="text-brand-600 mr-2 font-bold shrink-0">✓</span>
                                                    ) : (
                                                        <span className="w-4 mr-2 shrink-0"></span> // Placeholder for alignment
                                                    )}
                                                    {org.avatarUrl ? (
                                                        <img src={org.avatarUrl} alt={org.name} className="w-5 h-5 rounded-md object-contain mr-2 shrink-0 bg-slate-50" />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-md bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-[10px] mr-2 shrink-0">
                                                            {org.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className={`truncate ${org._id === activeOrganization?._id ? 'font-medium' : ''}`}>
                                                        {org.name}
                                                    </span>
                                                </button>
                                            ))}
                                            <div className="border-t border-slate-100"></div>
                                            <button
                                                className="w-full text-left px-4 py-2.5 text-brand-600 hover:bg-brand-50 transition flex items-center font-medium text-sm"
                                                onClick={() => {
                                                    setShowOrgDropdown(false);
                                                    setShowCreateOrg(true);
                                                }}
                                            >
                                                <PlusCircle size={14} className="mr-2 shrink-0" />
                                                Create Organization
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                    </div>
                </header>

                <main className="app-content relative">
                    <Outlet />
                </main>
            </div>
            {showCreateOrg && <CreateOrganizationModal onClose={() => setShowCreateOrg(false)} />}
            {pendingInvitations.length > 0 && (
                <PendingInvitationModal 
                    invitation={pendingInvitations[0]} 
                    onResolved={handleInvitationResolved} 
                />
            )}
        </div>
    );
};

export default AppLayout;
