import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

// Reference counter for nested modals to safely lock/unlock body scroll
let openModalsCount = 0;
let originalOverflow = '';
let originalTouchAction = '';

/**
 * Hook for intelligent modal dismissal via backdrop click and Escape key.
 * 
 * - If isDirty === false (pristine/view modal): Closes immediately.
 * - If isDirty === true (user filled fields): Prevents closing, triggers shake animation, and displays a warning toast.
 */
export function useModalDismiss({
    onClose,
    isDirty = false,
    toastMessage = 'You have unsaved changes. Click Cancel or ✕ to close.'
}) {
    const [isShaking, setIsShaking] = useState(false);
    const shakeTimeoutRef = useRef(null);

    // Lock body scroll and prevent touch gesture competition on iOS WebKit
    useEffect(() => {
        if (openModalsCount === 0) {
            originalOverflow = document.body.style.overflow;
            originalTouchAction = document.body.style.touchAction;
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
        }
        openModalsCount++;

        return () => {
            openModalsCount--;
            if (openModalsCount <= 0) {
                openModalsCount = 0;
                document.body.style.overflow = originalOverflow;
                document.body.style.touchAction = originalTouchAction;
            }
        };
    }, []);

    const triggerShake = useCallback(() => {
        setIsShaking(true);
        if (toastMessage) {
            toast(toastMessage, {
                id: 'modal-dismiss-warning',
                duration: 2500,
                icon: '⚠️',
                style: {
                    borderRadius: '12px',
                    background: '#1e293b',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: '500',
                }
            });
        }
        if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
        shakeTimeoutRef.current = setTimeout(() => {
            setIsShaking(false);
        }, 350);
    }, [toastMessage]);

    const handleDismissAttempt = useCallback(() => {
        if (isDirty) {
            triggerShake();
        } else if (onClose) {
            onClose();
        }
    }, [isDirty, onClose, triggerShake]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleDismissAttempt();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
        };
    }, [handleDismissAttempt]);

    // Backdrop click handler for overlay container
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleDismissAttempt();
        }
    };

    return {
        isShaking,
        handleBackdropClick,
        triggerShake
    };
}

export default useModalDismiss;
