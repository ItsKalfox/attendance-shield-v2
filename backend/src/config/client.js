/**
 * Client URL and Origin Configuration
 * Centralizes CLIENT_URL parsing, sanitization, and CORS origin generation.
 */

/**
 * Resolves the primary client URL (stripped of trailing slashes) for email links, redirects, etc.
 * Supports comma-separated CLIENT_URL strings (e.g. for multiple environments) by picking the primary one.
 */
const getPrimaryClientUrl = () => {
    const raw = process.env.CLIENT_URL || 'https://localhost:5173';
    return raw.split(',')[0].trim().replace(/\/+$/, '');
};

/**
 * Returns an array of sanitized allowed origins for CORS and Socket.io.
 */
const getAllowedOrigins = () => {
    const raw = process.env.CLIENT_URL || 'http://localhost:5173,https://localhost:5173';
    return raw
        .split(',')
        .map(url => url.trim().replace(/\/+$/, ''))
        .filter(Boolean);
};

module.exports = {
    getPrimaryClientUrl,
    getAllowedOrigins,
};
