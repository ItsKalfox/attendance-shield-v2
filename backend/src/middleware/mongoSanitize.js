/**
 * Recursively strips keys starting with '$' or containing '.' to prevent NoSQL operator injection
 */
const clean = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            if (typeof obj[i] === 'object' && obj[i] !== null) {
                clean(obj[i]);
            }
        }
        return obj;
    }
    for (const key of Object.keys(obj)) {
        if (key.startsWith('$') || key.includes('.')) {
            delete obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            clean(obj[key]);
        }
    }
    return obj;
};

const mongoSanitizeMiddleware = (req, res, next) => {
    if (req.body) clean(req.body);
    if (req.query) clean(req.query);
    if (req.params) clean(req.params);
    next();
};

module.exports = mongoSanitizeMiddleware;
