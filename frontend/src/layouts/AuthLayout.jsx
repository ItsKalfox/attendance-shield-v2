import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthLayout = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gradient"><div className="skeleton w-16 h-16 rounded-full"></div></div>;
    }

    if (user) {
        return <Navigate to="/app/dashboard" replace />;
    }

    return (
        <div className="bg-slate-50 min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/10 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px]"></div>
            </div>
            
            <div className="w-full max-w-[420px] relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm mb-6">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-blue-500"></div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-3">Attendance Platform</h1>
                    <p className="text-slate-500 font-medium">Manage your organization's attendance seamlessly.</p>
                </div>
                <div className="glass rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
