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
        <div className="bg-brand-950 min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/20 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-700/20 blur-[120px]"></div>
            </div>
            
            <div className="w-full max-w-[420px] relative z-10">
                <div className="text-center mb-10 flex flex-col items-center">
                    <img src="/logo.png" alt="Attendance Shield" className="w-52 h-auto mb-6 drop-shadow-xl object-contain" />
                    <p className="text-brand-300/70 font-medium">Manage your organization's attendance seamlessly.</p>
                </div>
                <div className="bg-white rounded-[2rem] p-8 sm:p-10 shadow-2xl">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
