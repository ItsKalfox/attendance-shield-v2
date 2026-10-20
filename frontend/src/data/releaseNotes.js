export const RELEASE_NOTES = [
  {
    version: '0.1.0-beta',
    date: 'October 20, 2026',
    isLatest: true,
    highlights: 'Course Coordinator & Multi-Instructor System, interactive Geofence Map search, and duration controls.',
    added: [
      {
        title: 'Course Coordinator & Multi-Instructor System',
        description: 'Designate a primary Course Coordinator alongside up to 8 additional co-instructors with a granular role and permission matrix.'
      },
      {
        title: 'Confirmation Modals for Instructor Management',
        description: 'Safety dialogs before removing an additional instructor or appointing a new Course Coordinator to prevent accidental reassignments.'
      },
      {
        title: 'Maximized Geofence Map & Live Place Search',
        description: 'Expandable full-screen Leaflet map overlay with autocomplete location search, live geofence radius boundary, and GPS recalibration.'
      },
      {
        title: 'Sleek Custom Scrollbar Styling',
        description: 'Slim, rounded 6px scrollbars across the entire application with inset padding matching card curves.'
      }
    ],
    changed: [
      {
        title: 'Course Card Header Redesign',
        description: 'Relocated the course code badge from the green chip into a clean gray chip placed inline beside the course name.'
      },
      {
        title: 'Simplified Session Duration & Expiry',
        description: 'Replaced manual expiration datetime pickers with discrete hours and minutes dropdowns that auto-calculate session expiry.'
      },
      {
        title: 'Expanded Desktop Session Creation Modal',
        description: 'Wider desktop layout with ample horizontal breathing room for scheduling and geofence controls.'
      }
    ]
  },
  {
    version: '0.0.4-beta',
    date: 'October 20, 2026',
    highlights: 'Member details modal fixes, coordinator deduplication, and active coordinator deletion guards.',
    fixed: [
      {
        title: 'Instant Member Details Modal State Refresh',
        description: 'Saving member roster changes now immediately updates the modal view mode without requiring a page reload.'
      },
      {
        title: 'Unified Member Name Display in Modal',
        description: 'Replaced split First Name and Last Name fields with a single unified Name card matching the application-wide schema.'
      },
      {
        title: 'Course Details React Hook Order Fix',
        description: 'Resolved a React hook rules violation in Course Details that caused a blank dark green screen on load.'
      },
      {
        title: 'Course Coordinator Deduplication',
        description: 'Filtered out the Course Coordinator from additional instructor counts and lists, eliminating phantom "+1 additional" tags.'
      },
      {
        title: 'Active Course Coordinator Deletion Guard',
        description: 'Prevents deleting an instructor who is currently coordinating active courses, prompting reassignment first.'
      },
      {
        title: 'OAuth Name Resolution & CSV Import Fixes',
        description: 'Fixed token reference errors during Google/Microsoft login and standardized single Name field CSV imports.'
      }
    ]
  },
  {
    version: '0.0.3-beta',
    date: 'October 18, 2026',
    highlights: 'Social link preview metadata cards and cloud SMTP network reliability.',
    added: [
      {
        title: 'Social & Messaging Link Preview Meta Tags',
        description: 'Rich Open Graph and Twitter Card preview cards when sharing links on WhatsApp, X, Facebook, Discord, and Slack.'
      }
    ],
    changed: [
      {
        title: 'Official Brand Favicon Standardization',
        description: 'Standardized on official 32×32 high-resolution brand icons across browser tabs.'
      }
    ],
    fixed: [
      {
        title: 'Cloud SMTP IPv4 Resolution',
        description: 'Explicit IPv4 DNS resolution for email transports to eliminate connection timeouts on cloud hosts.'
      }
    ]
  },
  {
    version: '0.0.2-beta',
    date: 'October 18, 2026',
    highlights: 'Timezone synchronization, session auto-activation, and refined onboarding navigation.',
    added: [
      {
        title: 'Unified WebSocket Connection Utility',
        description: 'Centralized live projector display and real-time session attendee counter synchronization.'
      },
      {
        title: 'Configurable Frontend API Base URL',
        description: 'Support for decoupled frontend and backend subdomain deployments.'
      }
    ],
    changed: [
      {
        title: 'Streamlined Navigation for New Users',
        description: 'Simplified navigation for new users before joining or creating an organization.'
      },
      {
        title: 'Clean Desktop Empty States',
        description: 'Modern full-width canvas layouts eliminating restrictive card boxing.'
      }
    ],
    fixed: [
      {
        title: 'Global Timezone Synchronization',
        description: 'Standardized UTC ISO 8601 timestamps to resolve timezone offset bugs on scheduled sessions.'
      },
      {
        title: 'Immediate Session Auto-Activation',
        description: '60-second grace window on session start to avoid rejections from device clock drift.'
      }
    ]
  },
  {
    version: '0.0.1-beta',
    date: 'October 18, 2026',
    highlights: 'Initial public beta launch of Attendance Shield.',
    added: [
      {
        title: 'Dynamic QR Attendance Verification',
        description: 'Rotating cryptographic tokens and expiring QR codes preventing proxy attendance.'
      },
      {
        title: 'Geofenced Campus Check-ins',
        description: 'Device GPS verification ensuring attendees are physically present inside lecture halls.'
      },
      {
        title: 'Live Projector Display Mode',
        description: 'Real-time WebSocket attendee counter and full-screen classroom QR code display.'
      },
      {
        title: 'PWA & Offline Capability',
        description: 'Installable Progressive Web App with offline service worker support.'
      },
      {
        title: 'PDF Attendance Reports',
        description: 'Customizable PDF attendance exports with lecture filtering and statistics.'
      }
    ]
  }
];
