import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthLayout = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-blue-50"><div className="skeleton w-16 h-16 rounded-full"></div></div>;
    }

    if (user) {
        return <Navigate to="/app/dashboard" replace />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-950 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans text-slate-800">
            {/* Ambient Background Blobs */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-500/30 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/20 blur-[120px] pointer-events-none"></div>
            
            {/* Main Container */}
            <div className="w-full max-w-6xl bg-white/10 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col lg:flex-row relative z-10 min-h-[700px]">
                
                {/* Left Side - Branding (Hidden on very small screens, visible on lg) */}
                <div className="w-full lg:w-[55%] p-10 lg:p-16 flex flex-col relative order-2 lg:order-1 hidden sm:flex">
                    
                    {/* Header/Logo */}
                    <div className="mb-auto">
                        <img src="/logo.png" alt="Attendance Shield" className="h-10 w-auto object-contain drop-shadow-md" />
                    </div>

                    {/* Marketing Content */}
                    <div className="mt-auto">
                        <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-[1.15] mb-6 tracking-tight drop-shadow-sm">
                            Fast, Efficient <br className="hidden lg:block" /> and Productive
                        </h1>
                        <p className="text-slate-200 text-lg max-w-[400px] leading-relaxed font-medium">
                            Manage your organization's attendance seamlessly with geofencing and real-time tracking.
                        </p>
                    </div>
                </div>

                {/* Right Side - Form Container */}
                <div className="w-full lg:w-[45%] p-4 sm:p-6 lg:p-6 xl:p-8 flex items-stretch order-1 lg:order-2 bg-white/40 lg:bg-transparent">
                    <div className="w-full h-full max-w-md mx-auto bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 sm:p-10 flex flex-col justify-center">
                        <div className="sm:hidden mb-8 text-center flex justify-center">
                            <img src="/logo-dark.png" alt="Attendance Shield" className="h-8 w-auto object-contain" />
                        </div>
                        <div className="w-full">
                            <Outlet />
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    );
};

export default AuthLayout;
