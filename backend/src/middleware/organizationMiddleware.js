const OrganizationMember = require('../models/OrganizationMember');

const requireOrganizationRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            const organizationId = req.params.organizationId || req.body.organizationId || req.query.organizationId;
            
            if (!organizationId) {
                return res.status(400).json({ message: 'Organization ID is required' });
            }

            const member = await OrganizationMember.findOne({
                organizationId,
                userId: req.user._id,
                status: 'ACTIVE'
            });

            if (!member) {
                return res.status(403).json({ message: 'Not a member of this organization' });
            }

            if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
                return res.status(403).json({ message: 'Insufficient permissions within organization' });
            }

            // Attach member to request for downstream use
            req.member = member;
            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = { requireOrganizationRole };
