import axios from 'axios';
import { safeStorage } from '../utils/storage';

const api = axios.create({
    baseURL: '/api',
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
    (config) => {
        const token = safeStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle 401 unauthorized / expired tokens
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const url = error.config?.url || '';
            const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/signup') || url.includes('/auth/verify-reset-otp');
            if (!isAuthAttempt) {
                safeStorage.removeItem('token');
                safeStorage.removeItem('activeOrganizationId');
                if (window.location.pathname !== '/login' && !window.location.pathname.startsWith('/attend') && !window.location.pathname.startsWith('/invitation') && !window.location.pathname.startsWith('/forgot-password') && !window.location.pathname.startsWith('/reset-password')) {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
