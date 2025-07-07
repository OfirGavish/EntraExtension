// Background service worker for authentication and token management
import { sha256Base64Url, randomBase64Url } from './pkce.js';

const DEFAULT_CLIENT_ID = 'c9b8d6c6-0ef6-4c2e-8f7b-7a9e8a7d8b01';
const TENANT = 'common'; // Use 'common' for multi-tenant or your specific tenant ID

// Get configuration from storage
async function getConfig() {
  const result = await chrome.storage.local.get(['clientId']);
  return {
    clientId: result.clientId || DEFAULT_CLIENT_ID,
    redirectUri: chrome.identity.getRedirectURL()
  };
}

// Interactive login using OAuth 2.0 authorization code flow with PKCE
export async function interactiveLogin() {
  try {
    const config = await getConfig();
    const codeVerifier = randomBase64Url(96);
    const codeChallenge = await sha256Base64Url(codeVerifier);
    
    console.log('Starting interactive login with config:', config);
    
    const scopes = [
      'openid',
      'offline_access',
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/User.ReadBasic.All',
      'https://graph.microsoft.com/User.Read.All',
      'https://graph.microsoft.com/Group.Read.All',
      'https://graph.microsoft.com/GroupMember.ReadWrite.All'
    ].join(' ');

    const authUrl = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize` +
      `?client_id=${config.clientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(config.redirectUri)}` +
      `&response_mode=fragment` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256` +
      `&prompt=select_account`;

    console.log('Auth URL:', authUrl);

    // Launch web auth flow
    const redirectUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (responseUrl) {
            resolve(responseUrl);
          } else {
            reject(new Error('No response URL received'));
          }
        }
      );
    });

    console.log('Redirect URL:', redirectUrl);

    // Extract authorization code from the fragment
    const url = new URL(redirectUrl);
    const fragment = url.hash.substring(1); // Remove the #
    const params = new URLSearchParams(fragment);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      throw new Error(`Authorization error: ${error} - ${params.get('error_description')}`);
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    console.log('Authorization code received, exchanging for tokens...');

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        grant_type: 'authorization_code',
        scope: scopes,
        code: code,
        redirect_uri: config.redirectUri,
        code_verifier: codeVerifier
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      throw new Error(`Token error: ${tokens.error} - ${tokens.error_description}`);
    }

    console.log('Tokens received successfully');

    // Store tokens with expiration calculation
    const expiresAt = Date.now() + (tokens.expires_in * 1000);
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope
    };

    await chrome.storage.local.set({ tokens: tokenData });

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token);
    await chrome.storage.local.set({ userInfo });

    return { tokens: tokenData, userInfo };

  } catch (error) {
    console.error('Interactive login failed:', error);
    throw error;
  }
}

// Silent token refresh
async function refreshTokens() {
  try {
    const config = await getConfig();
    const { tokens } = await chrome.storage.local.get(['tokens']);
    
    if (!tokens || !tokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    console.log('Refreshing tokens...');

    const tokenResponse = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        grant_type: 'refresh_token',
        scope: tokens.scope,
        refresh_token: tokens.refresh_token
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token refresh failed: ${tokenResponse.status}`);
    }

    const newTokens = await tokenResponse.json();
    
    if (newTokens.error) {
      throw new Error(`Refresh error: ${newTokens.error}`);
    }

    // Update stored tokens
    const expiresAt = Date.now() + (newTokens.expires_in * 1000);
    const tokenData = {
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || tokens.refresh_token, // Keep old refresh token if new one not provided
      expires_at: expiresAt,
      scope: newTokens.scope || tokens.scope
    };

    await chrome.storage.local.set({ tokens: tokenData });
    console.log('Tokens refreshed successfully');
    
    return tokenData;

  } catch (error) {
    console.error('Token refresh failed:', error);
    // Clear tokens on refresh failure
    await chrome.storage.local.remove(['tokens', 'userInfo']);
    throw error;
  }
}

// Get valid access token (refresh if needed)
export async function getAccessToken() {
  const { tokens } = await chrome.storage.local.get(['tokens']);
  
  if (!tokens) {
    throw new Error('No tokens stored - user needs to sign in');
  }

  // Check if token needs refresh (5 minutes before expiry)
  const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
  if (tokens.expires_at < fiveMinutesFromNow) {
    const refreshedTokens = await refreshTokens();
    return refreshedTokens.access_token;
  }

  return tokens.access_token;
}

// Get user information
async function getUserInfo(accessToken) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  return await response.json();
}

// Check if user is signed in
export async function isSignedIn() {
  const { tokens, userInfo } = await chrome.storage.local.get(['tokens', 'userInfo']);
  return !!(tokens && tokens.access_token && userInfo);
}

// Sign out
export async function signOut() {
  await chrome.storage.local.remove(['tokens', 'userInfo']);
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case 'signIn':
          const result = await interactiveLogin();
          sendResponse({ success: true, data: result });
          break;
          
        case 'getAccessToken':
          const token = await getAccessToken();
          sendResponse({ success: true, data: token });
          break;
          
        case 'isSignedIn':
          const signedIn = await isSignedIn();
          sendResponse({ success: true, data: signedIn });
          break;
          
        case 'getUserInfo':
          const { userInfo } = await chrome.storage.local.get(['userInfo']);
          sendResponse({ success: true, data: userInfo });
          break;
          
        case 'signOut':
          await signOut();
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  return true; // Keep message channel open for async response
});
