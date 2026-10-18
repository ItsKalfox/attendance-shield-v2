const rateLimit = require('express-rate-limit');

// Authentication endpoints: login, signup OTP, password reset OTP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 25, // limit each IP to 25 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many authentication attempts from this IP, please try again in 15 minutes.'
    }
});

// Scan rate limiter (allows high concurrency from shared organization network IP/NAT while preventing bot floods)
const scanLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 150, // 150 scans per minute per IP to accommodate classroom shared NAT/Wi-Fi
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many attendance submissions from this network. Please wait a moment and try again.'
    }
});

// General API protection
const generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1500, // 1500 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many requests from this IP, please try again later.'
    }
});

module.exports = {
    authLimiter,
    scanLimiter,
    generalApiLimiter
};
