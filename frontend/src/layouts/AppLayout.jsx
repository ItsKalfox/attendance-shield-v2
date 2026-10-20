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
    Calendar,
    Menu,
    X
} from 'lucide-react';
import api from '../services/api';
import CreateOrganizationModal from '../features/organizations/CreateOrganizationModal';
import PendingInvitationModal from '../features/organizations/PendingInvitationModal';
import ConfirmModal from '../components/ConfirmModal';


const AppLayout = () => {
    const { user, logout } = useAuth();
    const { organizations, activeOrganization, switchOrganization, loadingOrg } = useOrganization();
    const navigate = useNavigate();
    const location = useLocation();
    const [showOrgDropdown, setShowOrgDropdown] = useState(false);
    const [showCreateOrg, setShowCreateOrg] = useState(false);
    const [pendingInvitations, setPendingInvitations] = useState([]);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Close mobile drawer on route navigation
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

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
        setMobileMenuOpen(false);
        setShowLogoutConfirm(true);
    };

    const handleConfirmLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="app-container">
            {/* Floating Mobile Navigation Menu */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-start items-center p-3 sm:p-4 pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] animate-in fade-in duration-200">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Floating Navigation Card */}
                    <div className="relative w-full max-w-sm bg-[#0c2b27]/95 backdrop-blur-2xl rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] text-slate-200 flex flex-col max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2.5rem)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10">
                        {/* Card Header */}
                        <div className="flex items-center justify-between px-5 pt-4 pb-3.5 border-b border-brand-800/60 shrink-0">
                            <div className="flex items-center gap-2">
                                <img src="/logo.png" alt="Attendance Shield" className="w-32 h-auto object-contain" />
                                <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded-md bg-slate-800/90 border border-slate-700/80 text-slate-400 select-none">
                                    BETA
                                </span>
                            </div>
                            <button 
                                onClick={() => setMobileMenuOpen(false)} 
                                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-95"
                                aria-label="Close menu"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        
                        {/* Navigation Links */}
                        <div className="flex-1 px-3 py-3 overflow-y-auto space-y-2">
                            <div className="px-3.5 py-1 text-[11px] font-semibold text-brand-300/60 uppercase tracking-wider">
                                Navigation
                            </div>
                            <nav className="space-y-1">
                                {navItems.map((item) => (
                                    <NavLink 
                                        key={item.path}
                                        to={item.path} 
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={({ isActive }) => `flex items-center px-4 py-2.5 rounded-2xl font-medium transition-all ${
                                            isActive 
                                                ? 'bg-emerald-500/20 text-emerald-200 font-semibold shadow-sm' 
                                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        <item.icon size={19} className="mr-3.5 shrink-0 text-emerald-400" /> 
                                        <span>{item.label}</span>
                                    </NavLink>
                                ))}
                            </nav>
                        </div>

                        {/* User Account Footer */}
                        <div className="p-3 border-t border-brand-800/60 bg-black/20 shrink-0">
                            <div className="flex items-center justify-between px-2 py-1">
                                <div className="flex items-center truncate min-w-0">
                                    {user?.avatar ? (
                                        <img 
                                            src={user.avatar} 
                                            alt="Avatar" 
                                            referrerPolicy="no-referrer"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                            }}
                                            className="w-9 h-9 rounded-full object-cover mr-2.5 shrink-0 border border-brand-700 shadow-sm bg-white" 
                                        />
                                    ) : null}
                                    <div 
                                        className={`w-9 h-9 rounded-full bg-brand-800 flex items-center justify-center text-white font-bold text-sm mr-2.5 shrink-0 shadow-sm ${user?.avatar ? 'hidden' : ''}`}
                                    >
                                        {(user?.name || user?.firstName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="truncate min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}</p>
                                        <p className="text-[11px] text-brand-300/60 truncate">{user?.email}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleLogout} 
                                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition shrink-0 ml-1" 
                                    title="Log Out"
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Sidebar */}
            <div className="hidden lg:flex app-sidebar border-none text-slate-300">
                <div className="flex items-center gap-2.5 px-6 shrink-0 pt-8 pb-6">
                    <img src="/logo.png" alt="Attendance Shield" className="w-40 h-auto drop-shadow-md object-contain" />
                    <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md bg-slate-800/90 border border-slate-700/80 text-slate-400 select-none">
                        BETA
                    </span>
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
                                    {(user?.name || user?.firstName || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-bold text-white truncate">{user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}</p>
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
                <header className="app-header justify-between gap-2">
                    <div className="flex items-center min-w-0">
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition lg:hidden mr-2 shrink-0"
                            aria-label="Open navigation menu"
                        >
                            <Menu size={22} />
                        </button>
                        <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-slate-900 capitalize tracking-tight truncate">
                            {(() => {
                                const pathSegment = window.location.pathname.split('/').pop();
                                if (/^[0-9a-fA-F]{24}$/.test(pathSegment)) {
                                    return 'Details';
                                }
                                return pathSegment.replace('-', ' ') || 'Dashboard';
                            })()}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">

                        {/* Date Chip */}
                        <div className="hidden sm:flex items-center px-3.5 py-1.5 rounded-xl bg-white/75 backdrop-blur-md border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] text-xs font-semibold text-slate-600 transition-all duration-300 hover:shadow-md hover:bg-white/95 select-none">
                            <Calendar size={13} className="text-slate-600 shrink-0 mr-2" />
                            <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>

                        {/* Organization Switcher & Role Badge */}
                        <div className="flex items-center gap-2">
                            {activeOrganization?.userRole && !loadingOrg && (
                                <div className="hidden md:flex items-center px-3 py-1.5 rounded-xl bg-white/75 backdrop-blur-md border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] text-xs font-semibold text-slate-600 select-none">
                                    <span>
                                        {activeOrganization.userRole === 'OWNER' ? 'Owner' : activeOrganization.userRole === 'ADMIN' ? 'Admin' : activeOrganization.userRole === 'INSTRUCTOR' ? 'Instructor' : 'Attendee'}
                                    </span>
                                </div>
                            )}

                            <div className="relative">
                                <button
                                    className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition text-slate-800 p-1 sm:p-0 rounded-lg"
                                    onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                                >
                                    <div className="flex items-center min-w-0">
                                        {loadingOrg ? (
                                            <div className="flex items-center">
                                                <div className="skeleton w-7 h-7 sm:w-8 sm:h-8 rounded-md shrink-0"></div>
                                                <div className="skeleton w-20 sm:w-28 h-5 rounded ml-2 sm:ml-3"></div>
                                            </div>
                                        ) : (
                                            <>
                                                {activeOrganization?.avatarUrl ? (
                                                    <img src={activeOrganization.avatarUrl} alt={activeOrganization.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-md object-contain shrink-0 bg-slate-50 shadow-sm" />
                                                ) : activeOrganization ? (
                                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs shrink-0 shadow-sm">
                                                        {activeOrganization.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                ) : null}
                                                <span className="truncate font-bold text-xs sm:text-sm lg:text-base ml-2 sm:ml-3 max-w-[100px] sm:max-w-[160px] lg:max-w-[200px] text-left">
                                                    {activeOrganization?.name || 'No Org'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <ChevronDown size={14} className="text-slate-500 shrink-0" />
                                </button>

                                {showOrgDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowOrgDropdown(false)}></div>
                                        <div className="absolute top-full right-0 mt-2 w-56 sm:w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
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
                                                        <span className="w-4 mr-2 shrink-0"></span>
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

            {/* iOS Safari Bottom Bar Tint Anchor: forces Mobile Safari's bottom toolbar to sample slate-50 and eliminate the dark green bottom margin */}
            <div 
                aria-hidden="true" 
                className="fixed bottom-0 left-0 right-0 h-[max(env(safe-area-inset-bottom,0px),24px)] bg-slate-50 z-20 pointer-events-none lg:hidden" 
            />

            {showCreateOrg && <CreateOrganizationModal onClose={() => setShowCreateOrg(false)} />}
            {pendingInvitations.length > 0 && (
                <PendingInvitationModal 
                    invitation={pendingInvitations[0]} 
                    onResolved={handleInvitationResolved} 
                />
            )}
            <ConfirmModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleConfirmLogout}
                title="Log Out"
                message="Are you sure you want to log out of your session in Attendance Shield?"
                type="logout"
                confirmText="Log Out"
                cancelText="Cancel"
            />
        </div>
    );
};

export default AppLayout;
