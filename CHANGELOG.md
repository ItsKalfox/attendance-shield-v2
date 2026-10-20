# Changelog

All notable changes to Attendance Shield will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Maximized Geofence Map & Live Place Search**: Added an expandable full-screen Leaflet map overlay to the session creation modal with real-time location search and autocomplete (OpenStreetMap & Photon geocoding). Includes automatic camera flying, draggable pin repositioning, live geofence radius boundary visualization (`<Circle>`), and a Google Maps-style one-click GPS recalibration aim button (`<LocateFixed>`).
- **Sleek Custom Scrollbar Styling**: Replaced default browser/OS scrollbars across the application with slim, rounded 6px scrollbars (`scrollbar-width: thin` & `::-webkit-scrollbar`) with inset padding to complement modern card and modal border radiuses.

### Changed
- **Simplified Session Duration & Expiration Workflow**: Streamlined the session creation modal by replacing the manual "Expires At" datetime picker and preset button clutter with an inline lecture duration control featuring discrete hours (`0`–`10`) and minutes (`0`, `15`, `30`, `45`) dropdowns. Session expiry (`expiresAt`) is now calculated automatically in the background (`startTime + duration`).
- **Expanded Desktop Session Creation Modal**: Increased the modal width on desktop screens (`md:max-w-xl lg:max-w-2xl`) while maintaining standard dimensions on mobile (`max-w-lg`), eliminating layout clutter and offering ample horizontal breathing room for scheduling and geofence controls.

### Fixed
- **Google & Microsoft OAuth Name Resolution (`ReferenceError` Fix)**: Fixed runtime reference errors in `googleAuth` (`payload` out of scope) and `microsoftAuth` (`displayName` undeclared identifier) within `backend/src/controllers/authController.js` introduced during unified name refactoring, resolving false "Invalid Google token" and "Invalid Microsoft token" errors upon authentication. Also broadened unified `name` field projection in user and member queries across course, session, and organization controllers.
- **Unified Name Handling & CSV Roster Import**: Standardized user profile settings, manual attendee creation, view/edit member modals, and bulk CSV uploads to a single unified `name` field (`studentId,name,email`), eliminating previous inconsistencies between signup, OAuth, and member rosters while retaining full backward compatibility for legacy records.

---

## [0.0.3-beta] - 2026-10-18

### Added
- **Social & Messaging Link Preview Meta Tags**: Configured Open Graph (`og:image`, `og:title`, `og:description`, `og:type`) and Twitter Card (`twitter:card`, `twitter:image`) metadata in `index.html` linked to `/og-image.png` (1733×908) to display rich visual preview cards when sharing links on WhatsApp, Twitter/X, Facebook, Discord, Slack, and LinkedIn.

### Changed
- **Official Brand Favicon Standardization**: Unlinked and removed placeholder `favicon.svg` from the frontend public assets to prioritize the official 32×32 `favicon.png` and `favicon.ico` brand icon across browser tabs.

### Fixed
- **Cloud SMTP IPv4 Resolution (`ENETUNREACH` Fix)**: Explicitly resolved `SMTP_HOST` to an IPv4 address before initializing the Nodemailer transport in `backend/src/utils/sendEmail.js` with SNI `servername` support and whitespace-safe password sanitization. Prevents `connect ENETUNREACH` and `ETIMEDOUT` connection errors on cloud environments (like Render) that lack outbound IPv6 routing.

---

## [0.0.2-beta] - 2026-10-18

### Changed
- **Streamlined Navigation for New Users**: Restricted sidebar and mobile navigation to only **Dashboard** and **Settings** when no active organization exists, hiding the Organization tab until a workspace is created or joined.
- **Empty State Desktop Layouts**: Re-architected the empty Dashboard view to render directly onto the page canvas without restrictive outer card boxing, eliminating awkward desktop whitespace.
- **Quiet Documentation Workflow**: Replaced individual feature cards in the Dashboard empty state with a single, full-width, understated documentation card with gray point-wise guidance and no icons.
- **Minimalist Organization Empty State**: Cleaned up `OrganizationDetails` to display a centered emblem, title, and action button without unnecessary description text or extra cards.

### Fixed
- **Timezone Synchronization across Global Regions**: Converted frontend datetime picker inputs to explicit UTC ISO 8601 strings (`.toISOString()`) accompanied by client timezone offsets. Prevents the 5.5-hour offset bug when cloud servers run in UTC and users schedule sessions in local timezones.
- **Immediate Session Auto-Activation**: Added a 60-second clock-drift grace window on session creation and on-the-fly status auto-transition upon the first student scan, eliminating false "Session not started yet" rejections caused by slight clock skew.
- **Render / Node 24 Build Resolution**: Created `.npmrc` with `legacy-peer-deps=true` at both repository root and backend to resolve the peer-dependency conflict between `multer-storage-cloudinary` and `cloudinary` v2.
- **CORS & WebSocket Origin Sanitization**: Implemented centralized URL normalization (`backend/src/config/client.js`) that automatically strips trailing slashes and supports comma-separated origins for production and local environments.
- **Route Access Protection**: Enforced `RoleRoute` protection on `/app/organization` to smoothly redirect unassigned users back to `/app/dashboard`.

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
