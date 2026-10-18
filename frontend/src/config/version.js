import packageJson from '../../package.json' with { type: 'json' };

// Single source of truth for application versioning
export const APP_VERSION = packageJson.version || (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.2-beta');
export const RELEASE_CHANNEL = 'BETA';
