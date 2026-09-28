import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const OrganizationContext = createContext();

export const useOrganization = () => useContext(OrganizationContext);

export const OrganizationProvider = ({ children }) => {
    const { user } = useAuth();
    const [organizations, setOrganizations] = useState([]);
    const [activeOrganization, setActiveOrganization] = useState(null);
    const [loadingOrg, setLoadingOrg] = useState(true);

    const fetchOrganizations = async () => {
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
                const savedOrgId = localStorage.getItem('activeOrganizationId');
                const savedOrg = res.data.find(org => org._id === savedOrgId);
                
                if (savedOrg) {
                    setActiveOrganization(savedOrg);
                } else {
                    setActiveOrganization(res.data[0]);
                    localStorage.setItem('activeOrganizationId', res.data[0]._id);
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
        fetchOrganizations();
    }, [user]);

    const switchOrganization = (orgId) => {
        const org = organizations.find(o => o._id === orgId);
        if (org) {
            setActiveOrganization(org);
            localStorage.setItem('activeOrganizationId', org._id);
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
