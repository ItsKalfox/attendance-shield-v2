const AttendanceSession = require('../models/AttendanceSession');

/**
 * Sweeps and transitions session statuses based on the current time:
 * - SCHEDULED -> ACTIVE (when now >= startTime and now < expiresAt)
 * - ACTIVE -> PENDING_CONFIRMATION (when now >= expiresAt and now < confirmationDeadline)
 * - PENDING_CONFIRMATION / ACTIVE / SCHEDULED -> CONFIRMED (when now >= confirmationDeadline)
 * 
 * @param {string|mongoose.Types.ObjectId} [organizationId] Optional organization filter
 */
const syncSessionStatuses = async (organizationId = null) => {
    try {
        const now = new Date();
        const baseFilter = organizationId ? { organizationId } : {};

        // 1. SCHEDULED sessions whose startTime has arrived and not yet expired -> ACTIVE
        await AttendanceSession.updateMany(
            {
                ...baseFilter,
                status: 'SCHEDULED',
                startTime: { $lte: now },
                expiresAt: { $gt: now }
            },
            {
                $set: { status: 'ACTIVE' }
            }
        );

        // 2. ACTIVE sessions whose QR has expired but confirmation deadline has NOT passed -> PENDING_CONFIRMATION
        await AttendanceSession.updateMany(
            {
                ...baseFilter,
                status: 'ACTIVE',
                expiresAt: { $lte: now },
                confirmationDeadline: { $gt: now }
            },
            {
                $set: { status: 'PENDING_CONFIRMATION' }
            }
        );

        // 3. Any active, scheduled or pending confirmation session whose deadline has passed -> CONFIRMED
        const overdueSessions = await AttendanceSession.find({
            ...baseFilter,
            status: { $in: ['SCHEDULED', 'ACTIVE', 'PENDING_CONFIRMATION'] },
            confirmationDeadline: { $lte: now }
        });

        if (overdueSessions.length > 0) {
            for (const session of overdueSessions) {
                session.status = 'CONFIRMED';
                session.confirmedAt = session.confirmationDeadline || now;
                await session.save();
            }
        }
    } catch (error) {
        console.error('Error syncing session statuses:', error);
    }
};

/**
 * Initializes periodic background sweep for session status transitions
 * (Runs on boot, then every 60 seconds)
 */
let syncInterval = null;
const initSessionSyncJob = () => {
    // Run immediately on boot
    syncSessionStatuses().then(() => {
        console.log('Session status sync job initialized.');
    }).catch(err => {
        console.error('Initial session sync failed:', err);
    });

    // Run every 60 seconds
    if (!syncInterval) {
        syncInterval = setInterval(() => {
            syncSessionStatuses().catch(err => {
                console.error('Periodic session sync error:', err);
            });
        }, 60 * 1000);
    }
};

module.exports = {
    syncSessionStatuses,
    initSessionSyncJob
};
