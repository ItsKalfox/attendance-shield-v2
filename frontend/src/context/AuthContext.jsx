import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkLoggedIn = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await api.get('/auth/me');
                    setUser(res.data);
                } catch (error) {
                    console.error('Auth verification failed:', error);
                    localStorage.removeItem('token');
                    setUser(null);
                }
            }
            setLoading(false);
        };
        checkLoggedIn();
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        setUser(res.data);
        return res.data;
    };

    const signup = async (userData) => {
        const res = await api.post('/auth/signup', userData);
        localStorage.setItem('token', res.data.token);
        setUser(res.data);
        return res.data;
    };

    const loginWithGoogle = async (token) => {
        const res = await api.post('/auth/google', { token });
        localStorage.setItem('token', res.data.token);
        setUser(res.data);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        // Also remove selected org on logout
        localStorage.removeItem('activeOrganizationId');
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, loginWithGoogle, logout, loading, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};
