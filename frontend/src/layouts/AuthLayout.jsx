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
        <div className="min-h-screen bg-gradient-to-br from-[#e0eafc] to-[#cfdef3] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans text-slate-800">
            {/* Ambient Background Blobs */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-200/50 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-200/50 blur-[120px] pointer-events-none"></div>
            
            {/* Main Container */}
            <div className="w-full max-w-6xl bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-white overflow-hidden flex flex-col lg:flex-row relative z-10 min-h-[700px]">
                
                {/* Left Side - Branding (Hidden on very small screens, visible on lg) */}
                <div className="w-full lg:w-[55%] p-10 lg:p-16 flex flex-col justify-between relative order-2 lg:order-1 hidden sm:flex">
                    
                    {/* Marketing Content */}
                    <div className="my-auto lg:my-0 lg:mt-32">
                        <img src="/logo-dark.png" alt="Attendance Shield" className="h-10 w-auto object-contain mb-10" />
                        <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 leading-[1.15] mb-6 tracking-tight">
                            Fast, Efficient <br className="hidden lg:block" /> and Productive
                        </h1>
                        <p className="text-slate-600 text-lg max-w-[400px] leading-relaxed font-medium">
                            Manage your organization's attendance seamlessly with geofencing and real-time tracking.
                        </p>
                    </div>

                    {/* Footer Links */}
                    <div className="flex items-center justify-between text-sm font-bold text-slate-500 mt-12 lg:mt-0">
                        <div className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition">
                            <span className="text-lg">🇺🇸</span>
                            <span>English</span>
                            <span className="text-[10px] ml-1">▼</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <Link to="#" className="hover:text-brand-600 transition">Terms</Link>
                            <Link to="#" className="hover:text-brand-600 transition">Plans</Link>
                            <Link to="#" className="hover:text-brand-600 transition">Contact Us</Link>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form Container */}
                <div className="w-full lg:w-[45%] p-4 sm:p-8 lg:p-10 flex items-center justify-center order-1 lg:order-2 bg-white/40 lg:bg-transparent">
                    <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 flex flex-col justify-center">
                        <div className="sm:hidden mb-8 text-center flex justify-center">
                            <img src="/logo-dark.png" alt="Attendance Shield" className="h-8 w-auto object-contain" />
                        </div>
                        <Outlet />
                    </div>
                </div>
                
            </div>
        </div>
    );
};

export default AuthLayout;
