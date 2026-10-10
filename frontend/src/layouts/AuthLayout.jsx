import React from 'react';
import { Outlet, Navigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthLayout = () => {
    const { user, loading } = useAuth();
    const [searchParams] = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/app/dashboard';

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen min-h-[100dvh] bg-[#0c2b27] text-slate-200">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-semibold text-emerald-200/80 tracking-wide">Loading Attendance Shield...</p>
            </div>
        );
    }

    if (user) {
        return <Navigate to={redirectUrl} replace />;
    }

    return (
        <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-brand-900 to-brand-950 flex items-center justify-center p-3 sm:p-8 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] relative overflow-hidden font-sans text-slate-800">
            {/* Ambient Background Blobs */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-500/30 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/20 blur-[120px] pointer-events-none"></div>

            {/* Main Container */}
            <div className="w-full max-w-6xl bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row relative z-10 min-h-0 sm:min-h-[600px] lg:min-h-[750px]">

                {/* Left Side - Branding (Hidden on very small screens, visible on lg) */}
                <div className="w-full lg:w-[45%] p-8 lg:p-16 flex flex-col relative order-2 lg:order-1 hidden sm:flex">

                    {/* Header/Logo */}
                    <div className="mb-auto mt-8">
                        <img src="/logo.png" alt="Attendance Shield" className="h-10 w-auto object-contain drop-shadow-md" />
                    </div>

                    {/* Marketing Content */}
                    <div className="mt-auto">
                        <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-[1.15] mb-6 tracking-tight drop-shadow-sm">
                            Smart, Accurate <br className="hidden lg:block" /> and Secure
                        </h1>
                        <p className="text-white/60 text-base max-w-[400px] leading-relaxed font-medium">
                            Manage your organization's attendance seamlessly with geofencing and real-time tracking.
                        </p>
                    </div>
                </div>

                {/* Right Side - Form Container */}
                <div className="w-full lg:w-[55%] p-2 sm:p-6 lg:p-6 flex items-stretch order-1 lg:order-2 bg-white/40 lg:bg-transparent">
                    <div className="w-full h-full max-w-[580px] mx-auto bg-white rounded-2xl shadow-2xl border border-slate-100 px-5 sm:px-12 lg:px-20 py-8 sm:py-10 flex flex-col justify-center">
                        <div className="sm:hidden mb-6 text-center flex justify-center">
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
