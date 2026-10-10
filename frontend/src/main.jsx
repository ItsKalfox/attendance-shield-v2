import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { PublicClientApplication } from '@azure/msal-browser'
import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge'
import { MsalProvider } from '@azure/msal-react'
import './index.css'
import App from './App.jsx'

// Detect if this window is an MSAL popup callback/redirect response
const isMsalResponse = (
  (window.location.hash.includes('code=') || window.location.search.includes('code=') ||
   window.location.hash.includes('error=') || window.location.search.includes('error=')) &&
  (window.location.hash.includes('state=') || window.location.search.includes('state='))
);

if (isMsalResponse) {
  // We are inside the popup callback: broadcast auth payload to the opener window and close
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui,-apple-system,sans-serif;color:#334155;font-weight:600;">Authenticating with Microsoft...</div>';
  }
  broadcastResponseToMainFrame()
    .catch((err) => {
      console.error('MSAL Redirect Bridge Error:', err);
    })
    .finally(() => {
      try {
        window.close();
      } catch (e) {
        console.error('Could not close popup window automatically:', e);
      }
    });
} else {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

  const msalConfig = {
    auth: {
      clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || 'YOUR_MICROSOFT_CLIENT_ID',
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: window.location.origin,
      navigateToLoginRequestUrl: false
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false
    }
  };

  let msalInstance = null;
  try {
    msalInstance = new PublicClientApplication(msalConfig);
  } catch (err) {
    console.warn('MSAL instance creation warning:', err);
  }

  const initMsalAndMount = async () => {
    if (msalInstance) {
      try {
        // Race with a 1500ms timeout so MSAL network calls never block app rendering
        await Promise.race([
          msalInstance.initialize(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('MSAL init timed out')), 1500))
        ]);
      } catch (err) {
        console.warn('MSAL initialization bypassed or handled:', err);
      }
    }

    const rootEl = document.getElementById('root');
    if (rootEl) {
      createRoot(rootEl).render(
        <StrictMode>
          <GoogleOAuthProvider clientId={googleClientId}>
            {msalInstance ? (
              <MsalProvider instance={msalInstance}>
                <App />
              </MsalProvider>
            ) : (
              <App />
            )}
          </GoogleOAuthProvider>
        </StrictMode>,
      );
    }
  };

  initMsalAndMount();
}

