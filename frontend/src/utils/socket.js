import { io } from 'socket.io-client';

/**
 * Returns the base origin URL for Socket.io based on VITE_API_URL or local fallbacks.
 * Handles trailing slashes and removes '/api' suffix so sockets connect cleanly to host root.
 */
export const getSocketUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL?.trim();
    if (apiUrl) {
        return apiUrl.replace(/\/+$/, '').replace(/\/api$/, '');
    }
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : window.location.origin;
};

/**
 * Creates and returns a configured Socket.io client instance.
 */
export const createSocketConnection = (options = {}) => {
    return io(getSocketUrl(), {
        withCredentials: true,
        ...options,
    });
};
