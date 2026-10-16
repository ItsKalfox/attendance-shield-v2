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

    const fetchOrganizations = async (preferredOrgId) => {
        if (authLoading) return null;

        if (!user) {
            setOrganizations([]);
            setActiveOrganization(null);
            setLoadingOrg(false);
            return null;
        }

        try {
            setLoadingOrg(true);
            const res = await api.get('/organizations');
            setOrganizations(res.data);
            
            if (res.data.length > 0) {
                // Prioritize preferredOrgId passed explicitly, then savedOrgId in storage
                const targetOrgId = preferredOrgId || safeStorage.getItem('activeOrganizationId');
                const matchedOrg = res.data.find(org => String(org._id) === String(targetOrgId));
                
                if (matchedOrg) {
                    setActiveOrganization(matchedOrg);
                    safeStorage.setItem('activeOrganizationId', matchedOrg._id);
                    return matchedOrg;
                } else {
                    setActiveOrganization(res.data[0]);
                    safeStorage.setItem('activeOrganizationId', res.data[0]._id);
                    return res.data[0];
                }
            } else {
                setActiveOrganization(null);
                return null;
            }
        } catch (error) {
            console.error('Failed to fetch organizations:', error);
            return null;
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
        const org = organizations.find(o => String(o._id) === String(orgId));
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
