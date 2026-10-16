import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { 
    X, 
    Maximize2, 
    Minimize2, 
    Copy, 
    Check, 
    Clock, 
    Users, 
    Radio, 
    Building2,
    Calendar,
    Tv
} from 'lucide-react';
import { io } from 'socket.io-client';

const ProjectorModal = ({ session, qrUrl, initialStats, onClose }) => {
    const [copied, setCopied] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [stats, setStats] = useState(initialStats || { totalMarked: 0, totalEnrolled: 0 });
    const [now, setNow] = useState(Date.now());
    const [justUpdated, setJustUpdated] = useState(false);

    // Keep internal clock ticking every second for countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Fullscreen change listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Keyboard ESC listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !document.fullscreenElement) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Socket.IO real-time attendee counter
    useEffect(() => {
        if (!session?._id) return;
        const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        const socket = io(socketUrl, { withCredentials: true });

        socket.on('connect', () => {
            socket.emit('join_session', session._id);
        });

        socket.on('attendance_updated', () => {
            setStats(prev => ({
                ...prev,
                totalMarked: (prev?.totalMarked || 0) + 1
            }));
            setJustUpdated(true);
            setTimeout(() => setJustUpdated(false), 2000);
        });

        socket.on('attendance_removed', () => {
            setStats(prev => ({
                ...prev,
                totalMarked: Math.max(0, (prev?.totalMarked || 1) - 1)
            }));
        });

        return () => socket.disconnect();
    }, [session?._id]);

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (err) {
            console.error('Fullscreen toggle error:', err);
        }
    };

    const handleCopy = () => {
        if (!qrUrl) return;
        navigator.clipboard.writeText(qrUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Calculate time remaining until session expires
    const expiryTime = session?.expiresAt ? new Date(session.expiresAt).getTime() : 0;
    const diffMs = Math.max(0, expiryTime - now);
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const isExpired = totalSeconds <= 0;
    const isUrgent = totalSeconds > 0 && totalSeconds < 300; // < 5 mins
    const isCritical = totalSeconds > 0 && totalSeconds < 60; // < 1 min

    const totalEnrolled = stats?.totalEnrolled || 0;
    const totalMarked = stats?.totalMarked || 0;
    const percentPresent = totalEnrolled > 0 ? Math.round((totalMarked / totalEnrolled) * 100) : 0;

    return createPortal(
        <div className="fixed inset-0 z-[250] bg-slate-950 text-white flex flex-col justify-between overflow-hidden animate-fade-in select-none">
            {/* Top Navigation Bar */}
            <header className="flex items-center justify-between px-8 py-5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400 font-bold shrink-0">
                        <Tv size={20} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-bold text-brand-400 uppercase tracking-wider bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                                {session?.courseId?.code || 'COURSE'}
                            </span>
                            <h1 className="text-lg font-bold text-white truncate tracking-tight">
                                {session?.courseId?.name || 'Classroom Session'}
                            </h1>
                            <span className="text-xs text-slate-400 font-medium px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/60">
                                {session?.lectureType || 'Lecture'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                            Instructor: {session?.instructorId?.userId?.firstName} {session?.instructorId?.userId?.lastName}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleFullscreen}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    >
                        {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                        <span className="hidden sm:inline">{isFullscreen ? 'Windowed' : 'Fullscreen'}</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 text-slate-300 transition active:scale-95 cursor-pointer"
                        title="Close Projector Mode (ESC)"
                    >
                        <X size={18} />
                    </button>
                </div>
            </header>

            {/* Main Stage: High-Contrast Giant QR Code */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="mb-4">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        Scan to Mark Attendance
                    </h2>
                    <p className="text-sm sm:text-base text-slate-400 mt-1">
                        Open your phone camera or QR scanner to check into this session
                    </p>
                </div>

                {/* Giant QR Canvas with crisp border glow */}
                <div className="relative p-5 sm:p-7 bg-white rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.2)] border-4 border-slate-100 flex items-center justify-center my-2">
                    <QRCodeCanvas
                        value={qrUrl}
                        size={280}
                        level="H"
                        includeMargin={false}
                    />
                </div>

                {/* Link fallback & copy */}
                <div className="mt-5 flex items-center gap-2 max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-2 px-3">
                    <span className="text-xs font-mono text-slate-400 truncate flex-1 text-left">
                        {qrUrl}
                    </span>
                    <button
                        onClick={handleCopy}
                        className="btn btn-outline text-xs py-1 px-2.5 flex items-center gap-1 text-brand-400 border-brand-500/30 hover:bg-brand-500/10 shrink-0"
                    >
                        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span>{copied ? 'Copied' : 'Copy Link'}</span>
                    </button>
                </div>
            </main>

            {/* Bottom Live Status Bar */}
            <footer className="px-8 py-5 border-t border-slate-800/80 bg-slate-900/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Live Check-in Counter */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>LIVE CHECK-IN</span>
                    </div>

                    <div className={`transition-transform duration-300 ${justUpdated ? 'scale-110 text-emerald-400' : 'text-white'}`}>
                        <span className="text-2xl font-black">{totalMarked}</span>
                        {totalEnrolled > 0 && (
                            <span className="text-slate-400 text-sm font-semibold ml-1.5">
                                / {totalEnrolled} Enrolled ({percentPresent}%)
                            </span>
                        )}
                    </div>
                </div>

                {/* Expiry Countdown Timer */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                        <Clock size={16} />
                        <span>TIME REMAINING:</span>
                    </div>

                    <div className={`px-4 py-1.5 rounded-xl font-mono text-lg font-black tracking-widest border transition-all ${
                        isExpired 
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' 
                            : isCritical 
                            ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 animate-pulse'
                            : isUrgent 
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-slate-800 border-slate-700 text-brand-300'
                    }`}>
                        {isExpired ? 'EXPIRED' : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
                    </div>
                </div>
            </footer>
        </div>,
        document.body
    );
};

export default ProjectorModal;
