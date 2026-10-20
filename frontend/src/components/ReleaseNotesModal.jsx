import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, PlusCircle, CheckCircle2, ArrowUpRight, Calendar, Tag } from 'lucide-react';
import { useModalDismiss } from '../hooks/useModalDismiss';
import { RELEASE_NOTES } from '../data/releaseNotes';

const ReleaseNotesModal = ({ isOpen, onClose, initialVersion }) => {
    const [selectedVersion, setSelectedVersion] = useState(initialVersion || RELEASE_NOTES[0].version);

    const { isShaking, handleBackdropClick } = useModalDismiss({
        onClose,
        isDirty: false
    });

    if (!isOpen) return null;

    const currentRelease = RELEASE_NOTES.find(r => r.version === selectedVersion) || RELEASE_NOTES[0];

    return createPortal(
        <div onClick={handleBackdropClick} className="modal-overlay z-[100] cursor-default p-4 sm:p-6">
            <div className={`modal-content max-w-xl md:max-w-2xl w-full max-h-[88vh] flex flex-col p-0 overflow-hidden shadow-2xl border-0 ${isShaking ? 'animate-modal-shake' : ''}`}>
                
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <Sparkles size={20} className="text-slate-400 shrink-0" />
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-slate-900">Release Notes</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Discover what's new, changed, and improved in Attendance Shield
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
                        title="Close modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Version Selector Tabs */}
                <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
                    {RELEASE_NOTES.map(release => {
                        const isSelected = release.version === currentRelease.version;
                        return (
                            <button
                                key={release.version}
                                type="button"
                                onClick={() => setSelectedVersion(release.version)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                    isSelected 
                                        ? 'bg-slate-900 text-white shadow-sm' 
                                        : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
                                }`}
                            >
                                <span className="font-mono">v{release.version}</span>
                                {release.isLatest && (
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                                        isSelected ? 'bg-emerald-400 text-slate-900' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        Latest
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Release Details Body */}
                <div className="modal-scroll-body p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Release Meta Banner */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-brand-50/30 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-bold text-slate-900 font-mono">
                                    v{currentRelease.version}
                                </h3>
                                {currentRelease.isLatest && (
                                    <span className="badge badge-success text-[10px] py-0.5">
                                        Current Release
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-600 mt-1 font-medium">
                                {currentRelease.highlights}
                            </p>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium shrink-0">
                            <Calendar size={13} className="text-slate-400" />
                            <span>{currentRelease.date}</span>
                        </div>
                    </div>

                    {/* Added / New Features Section */}
                    {currentRelease.added && currentRelease.added.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                                <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                    <PlusCircle size={12} strokeWidth={2.5} />
                                </span>
                                <span>What's New</span>
                            </div>

                            <div className="space-y-2">
                                {currentRelease.added.map((item, idx) => (
                                    <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-slate-200 transition">
                                        <div className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                            <span>{item.title}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed pl-3.5">
                                            {item.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Changed / Improvements Section */}
                    {currentRelease.changed && currentRelease.changed.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
                                <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                                    <ArrowUpRight size={12} strokeWidth={2.5} />
                                </span>
                                <span>Improvements & Changes</span>
                            </div>

                            <div className="space-y-2">
                                {currentRelease.changed.map((item, idx) => (
                                    <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-slate-200 transition">
                                        <div className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                                            <span>{item.title}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed pl-3.5">
                                            {item.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Fixed / Bug Fixes Section */}
                    {currentRelease.fixed && currentRelease.fixed.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                                <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                                    <CheckCircle2 size={12} strokeWidth={2.5} />
                                </span>
                                <span>Bug Fixes & Stability</span>
                            </div>

                            <div className="space-y-2">
                                {currentRelease.fixed.map((item, idx) => (
                                    <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-slate-200 transition">
                                        <div className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                            <span>{item.title}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed pl-3.5">
                                            {item.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Tag size={12} />
                        <span>Semantic versioning</span>
                    </span>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ReleaseNotesModal;
