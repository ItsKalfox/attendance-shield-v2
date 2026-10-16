import React from 'react';
import { createPortal } from 'react-dom';
import { usePwa } from '../context/PwaContext';
import { 
    Download, 
    Share, 
    PlusSquare, 
    X, 
    Check, 
    Smartphone, 
    Sparkles, 
    ArrowDown,
    ExternalLink
} from 'lucide-react';

/**
 * Visual iOS Safari "Add to Home Screen" Step-by-Step Guide
 */
export const IosInstallModal = () => {
    const { showIosModal, setShowIosModal } = usePwa();

    if (!showIosModal) return null;

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-3 sm:p-4 pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] pl-[max(0.75rem,calc(env(safe-area-inset-left,0px)+0.5rem))] pr-[max(0.75rem,calc(env(safe-area-inset-right,0px)+0.5rem))] bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto overscroll-contain">
            <div 
                className="fixed inset-0" 
                onClick={() => setShowIosModal(false)}
            />
            
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in slide-in-from-bottom-5 duration-300 max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2.5rem)] flex flex-col">
                {/* Header */}
                <div className="p-5 pb-3 flex items-start justify-between border-b border-slate-100 bg-slate-50/70">
                    <div className="flex items-center space-x-3.5">
                        <img 
                            src="/apple-touch-icon.png" 
                            alt="Attendance Shield Icon" 
                            className="w-13 h-13 rounded-2xl shadow-md border border-slate-200/80 object-cover"
                        />
                        <div>
                            <h3 className="text-base font-bold text-slate-900 leading-tight">Install Attendance Shield</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Add to your iPhone / iPad Home Screen</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowIosModal(false)}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200/60 transition"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Steps Content */}
                <div className="p-5 space-y-4 text-sm text-slate-700">
                    <div className="flex items-start space-x-3.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-blue-100">
                            1
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                                Tap the <span className="inline-flex items-center px-1.5 py-0.5 mx-1 rounded bg-slate-100 text-blue-600 font-bold text-xs border border-slate-200 align-middle"><Share size={12} className="mr-1 inline" /> Share</span> button
                            </p>
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                Located on the bottom bar in Safari (or top bar on iPad).
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-blue-100">
                            2
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                                Scroll down and tap <span className="inline-flex items-center px-1.5 py-0.5 mx-1 rounded bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 align-middle"><PlusSquare size={12} className="mr-1 inline text-slate-700" /> Add to Home Screen</span>
                            </p>
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                If you don't see it, tap "Edit Actions" to add it to favorites.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-blue-100">
                            3
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                                Tap <span className="font-bold text-blue-600">"Add"</span> in the top-right corner
                            </p>
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                Attendance Shield will launch fullscreen without browser bars.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar Pointer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center text-xs font-medium text-slate-500">
                        <ArrowDown size={14} className="mr-1.5 text-blue-600 animate-bounce" />
                        <span>Look for the Share icon below</span>
                    </div>
                    <button
                        onClick={() => setShowIosModal(false)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
                    >
                        Got It
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

/**
 * Mobile Bottom Floating Banner for Chrome & Safari
 */
export const FloatingInstallBanner = () => {
    const { showBanner, isIos, promptInstall, dismissBanner } = usePwa();

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-3 inset-x-3 z-[80] md:hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_12px_40px_rgb(0,0,0,0.18)] border border-slate-200/90 p-3 sm:p-3.5 flex items-center justify-between gap-3 text-slate-800">
                <div className="flex items-center space-x-3 min-w-0">
                    <img 
                        src="/pwa-192x192.png" 
                        alt="Attendance Shield" 
                        className="w-11 h-11 rounded-xl shadow-sm border border-slate-200/80 object-cover shrink-0"
                    />
                    <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">Attendance Shield</h4>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {isIos ? 'Add to Home Screen for fullscreen app' : 'Install for instant access & offline use'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={promptInstall}
                        className="inline-flex items-center px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm shadow-blue-500/20 active:scale-95 transition"
                    >
                        <Download size={13} className="mr-1.5 shrink-0" />
                        <span>Install</span>
                    </button>
                    <button
                        onClick={dismissBanner}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        title="Dismiss"
                        aria-label="Dismiss banner"
                    >
                        <X size={15} />
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Permanent Mobile-Only Install & Instructions Card for Settings Page
 */
export const MobileInstallAppCard = () => {
    const { isIos, isStandalone, promptInstall } = usePwa();

    return (
        <div className="card p-5 sm:p-6 bg-white border border-slate-200/80 shadow-sm rounded-2xl md:hidden">
            {/* Header */}
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 mb-4">
                <img 
                    src="/pwa-192x192.png" 
                    alt="Attendance Shield" 
                    className="w-10 h-10 rounded-xl shadow-sm border border-slate-200/80 object-cover shrink-0"
                />
                <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {isIos ? 'Add to Home Screen' : 'Install Mobile App'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {isIos ? 'Fullscreen app instructions for iOS Safari' : 'Install for instant access & offline use'}
                    </p>
                </div>
            </div>

            {/* Content */}
            {isStandalone ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check size={16} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-emerald-950">App Already Installed</p>
                        <p className="text-[11px] text-emerald-800/80 mt-0.5">
                            You are running Attendance Shield in standalone mobile mode.
                        </p>
                    </div>
                </div>
            ) : isIos ? (
                /* iOS Step-by-Step Instructions Menu */
                <div className="space-y-3.5">
                    <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-blue-100">
                            1
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800">
                                Tap the <span className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 text-blue-600 font-bold text-[11px] border border-slate-200 align-middle"><Share size={11} className="mr-1 inline" /> Share</span> button in Safari
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Found at the bottom bar of your iPhone screen.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-blue-100">
                            2
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800">
                                Scroll down and tap <span className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 align-middle"><PlusSquare size={11} className="mr-1 inline text-slate-700" /> Add to Home Screen</span>
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Creates an app icon directly on your home screen.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-blue-100">
                            3
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800">
                                Tap <span className="font-bold text-blue-600">"Add"</span> in the top-right corner
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Attendance Shield will launch fullscreen without browser address bars!
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                /* Android / Chrome Section with Install Button + Instructions */
                <div className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Install Attendance Shield on your device for instant 1-tap launching, faster offline performance, and no browser address bars.
                    </p>

                    <button
                        type="button"
                        onClick={promptInstall}
                        className="btn btn-primary w-full py-2.5 rounded-xl font-bold text-xs shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 active:scale-95 transition"
                    >
                        <Download size={15} />
                        Install App
                    </button>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs text-slate-600">
                        <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                            Alternative Manual Steps
                        </div>
                        <div className="flex items-start gap-2 text-[11px]">
                            <span className="font-bold text-brand-600">1.</span>
                            <span>Tap the <strong>three dots (⋮)</strong> in Chrome's top right corner.</span>
                        </div>
                        <div className="flex items-start gap-2 text-[11px]">
                            <span className="font-bold text-brand-600">2.</span>
                            <span>Select <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>).</span>
                        </div>
                        <div className="flex items-start gap-2 text-[11px]">
                            <span className="font-bold text-brand-600">3.</span>
                            <span>Confirm the installation when prompted.</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Button to embed in Header or Sidebar
 */
export const InstallAppButton = ({ className = '', variant = 'chip' }) => {
    const { isInstallable, isStandalone, isIos, promptInstall } = usePwa();

    if (!isInstallable || isStandalone) return null;

    if (variant === 'sidebar') {
        return (
            <button
                type="button"
                onClick={promptInstall}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/30 text-emerald-200 transition-all active:scale-98 shadow-sm group ${className}`}
            >
                <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                        <Smartphone size={15} />
                    </div>
                    <div className="text-left truncate">
                        <span className="block text-xs font-bold text-white group-hover:text-emerald-100">
                            {isIos ? 'Add to Home Screen' : 'Install Mobile App'}
                        </span>
                        <span className="block text-[10px] text-emerald-300/70">
                            Fullscreen & offline
                        </span>
                    </div>
                </div>
                <Download size={14} className="text-emerald-400 group-hover:translate-y-0.5 transition-transform shrink-0 ml-1" />
            </button>
        );
    }

    // Default 'chip' for header
    return (
        <button
            type="button"
            onClick={promptInstall}
            className={`inline-flex items-center px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/75 hover:bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] text-xs font-semibold text-slate-700 hover:text-blue-600 transition-all active:scale-95 shadow-sm group ${className}`}
            title={isIos ? "Add Attendance Shield to Home Screen" : "Install Attendance Shield on device"}
        >
            <Download size={13} className="text-blue-600 mr-1.5 group-hover:translate-y-0.5 transition-transform shrink-0" />
            <span className="hidden xs:inline">{isIos ? 'Add to Home' : 'Install App'}</span>
            <span className="xs:hidden">Install</span>
        </button>
    );
};
