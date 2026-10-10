import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { safeStorage } from '../utils/storage';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkLoggedIn = async () => {
            try {
                const token = safeStorage.getItem('token');
                if (token) {
                    try {
                        const res = await api.get('/auth/me');
                        if (res.data) {
                            setUser(res.data);
                        } else {
                            safeStorage.removeItem('token');
                            setUser(null);
                        }
                    } catch (error) {
                        console.error('Auth verification failed:', error);
                        // Only clear token if server explicitly returned 401 Unauthorized (token invalid/expired)
                        // If network failed or server was restarting, retain token so user is not logged out permanently
                        if (error.response && error.response.status === 401) {
                            safeStorage.removeItem('token');
                            setUser(null);
                        }
                    }
                }
            } catch (err) {
                console.warn('Initial auth check warning:', err);
            } finally {
                setLoading(false);
            }
        };
        checkLoggedIn();
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        safeStorage.setItem('token', res.data.token);
        setUser(res.data);
        return res.data;
    };

    const signup = async (userData) => {
        const res = await api.post('/auth/signup', userData);
        safeStorage.setItem('token', res.data.token);
        setUser(res.data);
        return res.data;
    };

    const loginWithGoogle = async (token) => {
        const res = await api.post('/auth/google', { token });
        safeStorage.setItem('token', res.data.token);
        setUser(res.data);
        return res.data;
    };

    const loginWithMicrosoft = async (token) => {
        const res = await api.post('/auth/microsoft', { token });
        safeStorage.setItem('token', res.data.token);
        setUser(res.data);
        return res.data;
    };

    const logout = () => {
        safeStorage.removeItem('token');
        setUser(null);
        // Also remove selected org on logout
        safeStorage.removeItem('activeOrganizationId');
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, loginWithGoogle, loginWithMicrosoft, logout, loading, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};
