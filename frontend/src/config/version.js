import packageJson from '../../package.json' with { type: 'json' };

// Single source of truth for application versioning
export const APP_VERSION = packageJson.version || (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0-beta');
export const RELEASE_CHANNEL = 'BETA';
