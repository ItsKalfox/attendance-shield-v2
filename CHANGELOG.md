# Changelog

All notable changes to Attendance Shield will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Fixed
- **Timezone Synchronization across Global Regions**: Converted frontend datetime picker inputs to explicit UTC ISO 8601 strings (`.toISOString()`) accompanied by client timezone offsets. Prevents the 5.5-hour offset bug when cloud servers run in UTC and users schedule sessions in local timezones.
- **Immediate Session Auto-Activation**: Added a 60-second clock-drift grace window on session creation and on-the-fly status auto-transition upon the first student scan, eliminating false "Session not started yet" rejections caused by slight clock skew.
- **Render / Node 24 Build Resolution**: Created `.npmrc` with `legacy-peer-deps=true` at both repository root and backend to resolve the peer-dependency conflict between `multer-storage-cloudinary` and `cloudinary` v2.
- **CORS & WebSocket Origin Sanitization**: Implemented centralized URL normalization (`backend/src/config/client.js`) that automatically strips trailing slashes and supports comma-separated origins for production and local environments.

### Added
- **Unified WebSocket Connection Utility**: Created `frontend/src/utils/socket.js` to centrally derive the WebSocket connection origin from `VITE_API_URL` and ensure consistent credentials across `ProjectorModal` and `SessionDetails`.
- **Configurable Frontend API Base URL**: Updated `frontend/src/services/api.js` to dynamically consume `VITE_API_URL` for separate frontend/backend subdomain deployments while retaining local development proxying.
- **Official App Branding in Settings**: Replaced placeholder icons in the Settings version card with the high-resolution official Attendance Shield brand asset (`/apple-touch-icon.png`).
- **Refined Beta Badge UI**: Updated navigation and settings beta chips to a sleek, rounded-corner gray box aesthetic.

---

## [0.0.1-beta] - 2026-10-18

### Added
- Initial public beta deployment on Render (Backend Web Service + Frontend Static Site).
- Dynamic attendance verification with expiring QR codes and token hashing.
- Geofencing and device location verification for classroom check-ins.
- Projector Display Mode with real-time attendee counter via WebSockets.
- Google OAuth & Microsoft Entra ID integration.
- Offline-ready Progressive Web App (PWA) installation prompts and service worker.
- PDF attendance report generation and export customization modal.
- Single source of truth versioning system (`package.json` $\rightarrow$ `vite.config.js` $\rightarrow$ `src/config/version.js`).
