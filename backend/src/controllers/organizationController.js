const Organization = require('../models/Organization');
const OrganizationMember = require('../models/OrganizationMember');

// @desc    Create a new organization
// @route   POST /api/organizations
// @access  Private
const createOrganization = async (req, res, next) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: 'Organization name is required' });
        }

        // Create the organization
        const organization = await Organization.create({
            name,
            createdBy: req.user._id
        });

        // Make the creator the OWNER
        await OrganizationMember.create({
            organizationId: organization._id,
            userId: req.user._id,
            role: 'OWNER',
            status: 'ACTIVE'
        });

        res.status(201).json(organization);
    } catch (error) {
        next(error);
    }
};

// @desc    Get user's organizations
// @route   GET /api/organizations
// @access  Private
const getOrganizations = async (req, res, next) => {
    try {
        // Find all memberships for this user
        const memberships = await OrganizationMember.find({
            userId: req.user._id,
            status: 'ACTIVE'
        }).populate('organizationId');

        // Extract organizations and attach the user's role
        const organizations = memberships.map(m => {
            const org = m.organizationId.toObject();
            org.userRole = m.role;
            return org;
        });

        res.status(200).json(organizations);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single organization
// @route   GET /api/organizations/:organizationId
// @access  Private
const getOrganizationById = async (req, res, next) => {
    try {
        // The middleware ensures the user is a member
        const organization = await Organization.findById(req.params.organizationId);
        
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        res.status(200).json(organization);
    } catch (error) {
        next(error);
    }
};

// @desc    Update organization
// @route   PATCH /api/organizations/:organizationId
// @access  Private (OWNER only)
const updateOrganization = async (req, res, next) => {
    try {
        const { name, avatarUrl } = req.body;
        
        const organization = await Organization.findById(req.params.organizationId);
        
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        if (name) organization.name = name;
        if (avatarUrl) organization.avatarUrl = avatarUrl;
        
        await organization.save();

        res.status(200).json(organization);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrganization,
    getOrganizations,
    getOrganizationById,
    updateOrganization
};
