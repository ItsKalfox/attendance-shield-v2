import React, { createContext, useContext, useState, useEffect } from 'react';

const PwaContext = createContext();

export const PwaProvider = ({ children }) => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const [showIosModal, setShowIosModal] = useState(false);
    const [bannerDismissed, setBannerDismissed] = useState(false);

    useEffect(() => {
        // 1. Detect if currently running in Standalone Mode
        const checkStandalone = () => {
            const isStand = 
                window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone === true ||
                document.referrer.includes('android-app://');
            setIsStandalone(isStand);
        };

        checkStandalone();

        // 2. Detect iOS Device
        const userAgent = window.navigator.userAgent || '';
        const isIosDevice = (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) || 
            (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        setIsIos(isIosDevice);

        // 3. Check dismissal memory (snooze banner for 7 days)
        const dismissedTimestamp = localStorage.getItem('pwa_banner_dismissed_until');
        if (dismissedTimestamp && Date.now() < parseInt(dismissedTimestamp, 10)) {
            setBannerDismissed(true);
        }

        // 4. Capture Chrome / Android `beforeinstallprompt` event
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        // 5. App installed listener
        const handleAppInstalled = () => {
            setDeferredPrompt(null);
            setIsStandalone(true);
            localStorage.removeItem('pwa_banner_dismissed_until');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // Listen for display-mode changes
        const mediaQuery = window.matchMedia('(display-mode: standalone)');
        const handleModeChange = (e) => setIsStandalone(e.matches);
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleModeChange);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleModeChange);
            }
        };
    }, []);

    // Trigger install flow
    const promptInstall = async () => {
        if (isStandalone) return;

        if (deferredPrompt) {
            // Android / Chrome native prompt
            try {
                await deferredPrompt.prompt();
                const choiceResult = await deferredPrompt.userChoice;
                if (choiceResult.outcome === 'accepted') {
                    setDeferredPrompt(null);
                }
            } catch (err) {
                console.warn('Install prompt error:', err);
            }
        } else if (isIos) {
            // iOS Safari guide
            setShowIosModal(true);
        }
    };

    // Dismiss floating banner for 7 days
    const dismissBanner = () => {
        setBannerDismissed(true);
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        localStorage.setItem('pwa_banner_dismissed_until', (Date.now() + sevenDaysMs).toString());
    };

    const isInstallable = !isStandalone && (!!deferredPrompt || isIos);
    const showBanner = isInstallable && !bannerDismissed;

    return (
        <PwaContext.Provider
            value={{
                isStandalone,
                isIos,
                isInstallable,
                canInstallPrompt: !!deferredPrompt,
                showBanner,
                showIosModal,
                setShowIosModal,
                promptInstall,
                dismissBanner
            }}
        >
            {children}
        </PwaContext.Provider>
    );
};

export const usePwa = () => {
    const context = useContext(PwaContext);
    if (!context) {
        throw new Error('usePwa must be used within a PwaProvider');
    }
    return context;
};
