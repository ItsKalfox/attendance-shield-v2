import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModalDismiss } from '../hooks/useModalDismiss';
import { 
    X, 
    RotateCcw, 
    Download, 
    Check, 
    Building2, 
    BookmarkCheck,
    Layers,
    Save,
    Loader2,
    Settings
} from 'lucide-react';

const STANDARD_LECTURE_TYPES = [
    'Lecture',
    'Tutorial',
    'Practical',
    'Workshop',
    'Lab',
    'Field Visit',
    'Field Work',
    'Presentation'
];

const PRESET_THRESHOLDS = [75, 80, 85, 90];

const PdfExportSettingsModal = ({
    isOpen,
    onClose,
    mode = 'course', // 'course' | 'student' | 'session'
    initialSettings,
    onApplyAndExport,
    onSaveOnly,
    canSaveCourseDefault = false,
    onSaveCourseDefault = null
}) => {
    const { handleBackdropClick } = useModalDismiss({
        onClose,
        isDirty: false
    });

    const [settings, setSettings] = useState(() => ({
        showLogo: true,
        showOrgName: true,
        showCourseDetails: true,
        showPercentages: true,
        showStatus: true,
        showSignature: true,
        threshold: 80,
        visibleLectureTypes: [...STANDARD_LECTURE_TYPES],
        typeRequirements: [],
        ...(initialSettings || {})
    }));

    useEffect(() => {
        if (isOpen) {
            setSettings({
                showLogo: true,
                showOrgName: true,
                showCourseDetails: true,
                showPercentages: true,
                showStatus: true,
                showSignature: true,
                threshold: 80,
                visibleLectureTypes: [...STANDARD_LECTURE_TYPES],
                typeRequirements: [],
                ...(initialSettings || {})
            });
        }
    }, [isOpen, initialSettings]);

    const [savingDefault, setSavingDefault] = useState(false);
    const [savedSuccessMsg, setSavedSuccessMsg] = useState('');

    if (!isOpen) return null;

    const handleToggle = (key) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleToggleLectureType = (type) => {
        setSettings(prev => {
            const current = prev.visibleLectureTypes || [];
            const exists = current.includes(type);
            const updated = exists 
                ? current.filter(t => t !== type)
                : [...current, type];
            return {
                ...prev,
                visibleLectureTypes: updated
            };
        });
    };

    const handleSelectAllTypes = () => {
        setSettings(prev => ({
            ...prev,
            visibleLectureTypes: [...STANDARD_LECTURE_TYPES]
        }));
    };

    const handleDeselectAllTypes = () => {
        setSettings(prev => ({
            ...prev,
            visibleLectureTypes: []
        }));
    };

    const handleTypeQuotaChange = (type, val) => {
        const num = Math.max(0, parseInt(val, 10) || 0);
        setSettings(prev => {
            const currentReqs = prev.typeRequirements || [];
            const filtered = currentReqs.filter(r => r.lectureType !== type);
            if (num > 0) {
                filtered.push({ lectureType: type, minSessions: num });
            }
            return {
                ...prev,
                typeRequirements: filtered
            };
        });
    };

    const getTypeQuotaValue = (type) => {
        const item = (settings.typeRequirements || []).find(r => r.lectureType === type);
        return item ? item.minSessions : '';
    };

    const handleResetDefaults = () => {
        setSettings({
            showLogo: true,
            showOrgName: true,
            showCourseDetails: true,
            showPercentages: true,
            showStatus: true,
            showSignature: true,
            threshold: 80,
            visibleLectureTypes: [...STANDARD_LECTURE_TYPES],
            typeRequirements: []
        });
        setSavedSuccessMsg('Reset to platform defaults');
        setTimeout(() => setSavedSuccessMsg(''), 2500);
    };

    const handleSaveCourseDefaultClick = async () => {
        if (!onSaveCourseDefault) return;
        try {
            setSavingDefault(true);
            await onSaveCourseDefault(settings);
            setSavedSuccessMsg('Saved as course default settings in database!');
            setTimeout(() => setSavedSuccessMsg(''), 3000);
        } catch {
            alert('Failed to save default course settings');
        } finally {
            setSavingDefault(false);
        }
    };

    const handleApplyAndExportClick = () => {
        if (onApplyAndExport) {
            onApplyAndExport(settings);
        }
        onClose();
    };

    return createPortal(
        <div 
            onClick={handleBackdropClick} 
            className="modal-overlay z-[110] cursor-default"
        >
            <div className="modal-flex-card max-w-2xl">
                
                {/* Header */}
                <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm">
                    <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200/80 shrink-0">
                            <Settings size={18} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">PDF Export Settings</h2>
                            <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                                Customize headers, columns, lecture types, and eligibility criteria
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="modal-scroll-body p-4 sm:p-6 space-y-6 text-sm">
                    
                    {savedSuccessMsg && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center animate-in fade-in duration-200">
                            <Check size={14} className="mr-1.5 shrink-0 text-emerald-600" />
                            {savedSuccessMsg}
                        </div>
                    )}

                    {/* Section 1: Branding & Layout */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Building2 size={13} className="text-slate-500" /> Branding & Header Elements
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            
                            {/* University Logo */}
                            <label className="flex items-center justify-between p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-xl cursor-pointer transition select-none">
                                <span className="font-medium text-slate-700">Organization Logo</span>
                                <input
                                    type="checkbox"
                                    checked={settings.showLogo}
                                    onChange={() => handleToggle('showLogo')}
                                    className="toggle-checkbox w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                                />
                            </label>

                            {/* University Name */}
                            <label className="flex items-center justify-between p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-xl cursor-pointer transition select-none">
                                <span className="font-medium text-slate-700">Organization Name</span>
                                <input
                                    type="checkbox"
                                    checked={settings.showOrgName}
                                    onChange={() => handleToggle('showOrgName')}
                                    className="toggle-checkbox w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                                />
                            </label>

                            {/* Course / Session Details Box */}
                            <label className="flex items-center justify-between p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-xl cursor-pointer transition select-none">
                                <span className="font-medium text-slate-700">Specifications Box</span>
                                <input
                                    type="checkbox"
                                    checked={settings.showCourseDetails}
                                    onChange={() => handleToggle('showCourseDetails')}
                                    className="toggle-checkbox w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                                />
                            </label>

                            {/* Course Lecturer Signature */}
                            <label className="flex items-center justify-between p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-xl cursor-pointer transition select-none">
                                <span className="font-medium text-slate-700">Lecturer Signature Line</span>
                                <input
                                    type="checkbox"
                                    checked={settings.showSignature}
                                    onChange={() => handleToggle('showSignature')}
                                    className="toggle-checkbox w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                                />
                            </label>

                        </div>
                    </div>

                    {/* Section 2: Table Columns & Metrics */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Layers size={13} className="text-slate-500" /> Table Columns & Metrics
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            
                            {/* Attendance Percentage */}
                            <label className="flex items-center justify-between p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-xl cursor-pointer transition select-none">
                                <span className="font-medium text-slate-700">Display Percentages (%)</span>
                                <input
                                    type="checkbox"
                                    checked={settings.showPercentages}
                                    onChange={() => handleToggle('showPercentages')}
                                    className="toggle-checkbox w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                                />
                            </label>

                            {/* Status Indicator */}
                            <label className="flex items-center justify-between p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-xl cursor-pointer transition select-none">
                                <span className="font-medium text-slate-700">Display Status (Eligible/Short)</span>
                                <input
                                    type="checkbox"
                                    checked={settings.showStatus}
                                    onChange={() => handleToggle('showStatus')}
                                    className="toggle-checkbox w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                                />
                            </label>

                        </div>

                        {/* Visible Lecture Types (Course mode only) */}
                        {mode === 'course' && (
                            <div className="p-3.5 bg-slate-50/60 border border-slate-200/80 rounded-2xl space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700">Included Lecture Formats</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllTypes}
                                            className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                                        >
                                            Select All
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                            type="button"
                                            onClick={handleDeselectAllTypes}
                                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {STANDARD_LECTURE_TYPES.map(type => {
                                        const isChecked = (settings.visibleLectureTypes || []).includes(type);
                                        return (
                                            <button
                                                type="button"
                                                key={type}
                                                onClick={() => handleToggleLectureType(type)}
                                                className={`py-1.5 px-2.5 rounded-lg text-xs font-medium border text-left flex items-center justify-between transition ${
                                                    isChecked 
                                                        ? 'bg-brand-50 border-brand-200 text-brand-800'
                                                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                                                }`}
                                            >
                                                <span className="truncate">{type}</span>
                                                {isChecked && <Check size={12} className="text-brand-600 shrink-0 ml-1" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 3: Academic Eligibility Threshold & Requirements */}
                    {(mode === 'course' || mode === 'student') && (
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <BookmarkCheck size={13} className="text-slate-500" /> Academic Eligibility Criteria
                            </h3>
                            
                            <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-4">
                                {/* Overall Percentage Threshold */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="font-semibold text-slate-800 text-xs">
                                            Minimum Overall Attendance Threshold
                                        </label>
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-base text-brand-700">{settings.threshold}%</span>
                                        </div>
                                    </div>

                                    {/* Slider and quick buttons */}
                                    <div className="space-y-2">
                                        <input
                                            type="range"
                                            min="40"
                                            max="100"
                                            step="1"
                                            value={settings.threshold}
                                            onChange={(e) => setSettings(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                                        />
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
                                            {PRESET_THRESHOLDS.map(pct => (
                                                <button
                                                    type="button"
                                                    key={pct}
                                                    onClick={() => setSettings(prev => ({ ...prev, threshold: pct }))}
                                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                                        settings.threshold === pct 
                                                            ? 'bg-brand-600 text-white' 
                                                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {pct}%
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1.5">
                                        Students with an overall attendance percentage below {settings.threshold}% will be flagged with 
                                        <span className="font-bold text-rose-600 ml-1">SHORT</span> status.
                                    </p>
                                </div>

                                {/* Per-Lecture Format Minimum Session Quotas */}
                                {mode === 'course' && (
                                    <div className="pt-3 border-t border-slate-200/70">
                                        <div className="mb-2">
                                            <span className="font-semibold text-slate-800 text-xs block">
                                                Minimum Sessions Required per Format (Optional)
                                            </span>
                                            <span className="text-[11px] text-slate-500">
                                                Set mandatory attendance minimums (e.g. must attend at least 3 Labs). Leave 0 or blank for no restriction.
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                            {STANDARD_LECTURE_TYPES.map(type => (
                                                <div key={type} className="p-2 bg-white rounded-xl border border-slate-200">
                                                    <span className="text-[11px] font-semibold text-slate-700 block truncate">{type}</span>
                                                    <div className="mt-1 flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            placeholder="0"
                                                            value={getTypeQuotaValue(type)}
                                                            onChange={(e) => handleTypeQuotaChange(type, e.target.value)}
                                                            className="w-full text-xs font-mono py-1 px-1.5 rounded border border-slate-200 text-center focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                        />
                                                        <span className="text-[10px] text-slate-400">min</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="shrink-0 px-4 sm:px-6 py-3.5 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 bg-slate-50/90">
                    <button
                        type="button"
                        onClick={handleResetDefaults}
                        className="inline-flex items-center justify-center py-2 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition w-full sm:w-auto"
                    >
                        <RotateCcw size={13} className="mr-1.5" /> Reset Defaults
                    </button>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto justify-end">
                        {canSaveCourseDefault && onSaveCourseDefault && (
                            <button
                                type="button"
                                onClick={handleSaveCourseDefaultClick}
                                disabled={savingDefault}
                                className="w-full sm:w-auto inline-flex items-center justify-center py-2.5 sm:py-2 px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl active:scale-98 transition shadow-sm disabled:opacity-60"
                                title="Persist these eligibility and display settings as the default for this course in database"
                            >
                                {savingDefault ? (
                                    <Loader2 size={13} className="mr-1.5 animate-spin text-slate-500" />
                                ) : (
                                    <Save size={13} className="mr-1.5 text-slate-500" />
                                )}
                                <span>Save as Course Default</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleApplyAndExportClick}
                            className="w-full sm:w-auto inline-flex items-center justify-center py-2.5 sm:py-2 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl active:scale-98 shadow-sm shadow-blue-500/20 transition"
                        >
                            <Download size={14} className="mr-1.5" />
                            <span>Apply & Export PDF</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default PdfExportSettingsModal;
