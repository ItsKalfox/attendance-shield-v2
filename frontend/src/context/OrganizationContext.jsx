import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { safeStorage } from '../utils/storage';

const OrganizationContext = createContext(null);

export const useOrganization = () => useContext(OrganizationContext) || {};

export const OrganizationProvider = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [organizations, setOrganizations] = useState([]);
    const [activeOrganization, setActiveOrganization] = useState(null);
    const [loadingOrg, setLoadingOrg] = useState(true);

    const fetchOrganizations = async () => {
        if (authLoading) return;

        if (!user) {
            setOrganizations([]);
            setActiveOrganization(null);
            setLoadingOrg(false);
            return;
        }

        try {
            setLoadingOrg(true);
            const res = await api.get('/organizations');
            setOrganizations(res.data);
            
            if (res.data.length > 0) {
                const savedOrgId = safeStorage.getItem('activeOrganizationId');
                const savedOrg = res.data.find(org => org._id === savedOrgId);
                
                if (savedOrg) {
                    setActiveOrganization(savedOrg);
                } else {
                    setActiveOrganization(res.data[0]);
                    safeStorage.setItem('activeOrganizationId', res.data[0]._id);
                }
            } else {
                setActiveOrganization(null);
            }
        } catch (error) {
            console.error('Failed to fetch organizations:', error);
        } finally {
            setLoadingOrg(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            fetchOrganizations();
        }
    }, [user, authLoading]);

    const switchOrganization = (orgId) => {
        const org = organizations.find(o => o._id === orgId);
        if (org) {
            setActiveOrganization(org);
            safeStorage.setItem('activeOrganizationId', org._id);
        }
    };

    return (
        <OrganizationContext.Provider value={{ 
            organizations, 
            activeOrganization, 
            loadingOrg,
            switchOrganization,
            refreshOrganizations: fetchOrganizations
        }}>
            {children}
        </OrganizationContext.Provider>
    );
};
