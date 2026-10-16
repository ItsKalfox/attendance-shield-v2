import api from '../services/api';

const DEFAULT_SETTINGS = {
    showLogo: true,
    showOrgName: true,
    showCourseDetails: true,
    showPercentages: true,
    showStatus: true,
    showSignature: true,
    threshold: 80,
    visibleLectureTypes: [
        'Lecture',
        'Tutorial',
        'Practical',
        'Workshop',
        'Lab',
        'Field Visit',
        'Field Work',
        'Presentation'
    ],
    typeRequirements: [] // e.g. [{ lectureType: 'Lab', minSessions: 2 }]
};

/**
 * Get merged PDF export settings for a specific scope (course, student, session)
 * Priority: localStorage > user.preferences > course.attendanceSettings > default
 */
export const getPdfExportSettings = ({ mode = 'course', course = null, user = null }) => {
    const storageKey = `attshield_pdf_settings_${mode}_${course?._id || course?.id || 'default'}`;
    
    let localData = null;
    try {
        const item = localStorage.getItem(storageKey);
        if (item) localData = JSON.parse(item);
    } catch {
        // ignore storage parse error
    }

    const userPrefs = user?.preferences?.pdfExportSettings?.[mode] || {};
    const courseSettings = course?.attendanceSettings || {};

    return {
        ...DEFAULT_SETTINGS,
        threshold: courseSettings.minOverallPercentage ?? DEFAULT_SETTINGS.threshold,
        typeRequirements: courseSettings.typeRequirements ?? DEFAULT_SETTINGS.typeRequirements,
        ...userPrefs,
        ...(localData || {})
    };
};

/**
 * Save settings to localStorage and asynchronously sync to User preferences in DB
 */
export const savePdfExportSettings = async ({ mode = 'course', courseId = 'default', settings }) => {
    const storageKey = `attshield_pdf_settings_${mode}_${courseId}`;
    
    // 1. Save to local storage for instant access
    try {
        localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch {
        // ignore quota error
    }

    // 2. Asynchronously sync to User database preferences so it travels across devices
    try {
        await api.patch('/auth/me/preferences', {
            pdfExportSettings: {
                [mode]: settings
            }
        });
    } catch {
        // Silently handle if user is offline or endpoint temporarily fails
    }
};
