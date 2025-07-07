# Authentication Setup Guide

This extension supports multiple authentication approaches to work both locally during development and when published on the Chrome Web Store.

## Overview

The extension uses OAuth 2.0 authorization code flow with PKCE (Proof Key for Code Exchange) to authenticate with Azure AD and access Microsoft Graph APIs. This modern approach provides enhanced security and compliance with current browser restrictions.

## Authentication Options

### OAuth 2.0 Authorization Code Flow with PKCE (Current Implementation)

**How it works:**
- Uses OAuth 2.0 authorization code flow with PKCE (Proof Key for Code Exchange)
- Leverages Chrome's `chrome.identity.launchWebAuthFlow()` for the initial authorization
- Exchanges authorization code for access and refresh tokens in the background service worker
- Provides automatic token refresh for seamless user experience (up to 90 days)
- Complies with Microsoft's 2024+ security guidelines

**Setup Steps:**
1. Register your Azure AD application at https://portal.azure.com
2. In your Azure AD app registration:
   - **Platform Configuration**: Add a platform → Single-page application (SPA)
   - **Redirect URI**: `https://{extension-id}.chromiumapp.org/` (extension will show you the exact ID)
   - **Front-channel logout URL**: Leave empty (not required for extensions)
   - **Allow public client flows**: ✅ **Yes** (this unlocks the /token endpoint for native clients)
   - **Token Configuration**: Select both checkboxes:
     - ✅ **Access tokens** (used for implicit flows)
     - ✅ **ID tokens** (used for implicit and hybrid flows)
   - **API Permissions**: Add Microsoft Graph delegated permissions:
     - `User.Read`, `User.ReadBasic.All`, `User.Read.All`, `Group.Read.All`, `GroupMember.ReadWrite.All`
   - **Admin Consent**: Click "Grant admin consent" for your tenant
3. In the extension settings:
   - Enter your Client ID from the Azure AD app
   - Save settings and sign in

**Pros:**
- **Future-proof**: Uses Microsoft's recommended auth flow (not deprecated implicit grant)
- **Secure**: PKCE prevents authorization code interception attacks
- **Seamless**: Refresh tokens provide long-term authentication (up to 90 days)
- **Third-party cookie resistant**: Works with Privacy Sandbox and strict cookie policies
- **Cross-browser**: Works in both Chrome and Edge

**Cons:**
- Slightly more complex setup than implicit grant
- Requires proper Azure AD app configuration

## Current Implementation

The extension uses **OAuth 2.0 Authorization Code Flow with PKCE** with the following features:

1. **Authorization Code + PKCE**: Uses the most secure and future-proof OAuth 2.0 flow
2. **Background Service Worker**: Handles token exchange and refresh in the background
3. **Automatic Token Refresh**: Silently refreshes tokens up to 5 minutes before expiry
4. **Long-term Authentication**: Refresh tokens provide up to 90 days of authentication
5. **Chrome Identity API**: Uses `chrome.identity.launchWebAuthFlow()` for initial authorization
6. **Storage**: Saves tokens securely in `chrome.storage.local`

## Why This Approach Works (2024+)

**Previous methods that are now problematic:**
- ❌ **Implicit Grant**: Microsoft is deprecating this for security reasons
- ❌ **Popup-based Authentication**: Fails with third-party cookie restrictions
- ❌ **Chrome Identity getAuthToken**: Only works for Google accounts, not Azure AD

**Why Authorization Code + PKCE is better:**
- ✅ **Microsoft Recommended**: Official guidance for 2024+ applications
- ✅ **Security**: PKCE prevents code interception attacks
- ✅ **Privacy-resistant**: Works with strict cookie policies and Privacy Sandbox
- ✅ **Refresh Tokens**: Provides long-term authentication without re-prompting
- ✅ **Future-proof**: Won't be deprecated like implicit grant

## Azure AD SPA Configuration Details

When setting up your Azure AD application as a Single-Page Application (SPA), you'll encounter these specific configuration options:

### Platform Configuration
- **Application Type**: Single-page application (SPA)
- **Redirect URIs**: `https://{extension-id}.chromiumapp.org/`
- **Front-channel logout URL**: 
  - **For Extensions**: Leave this empty - extensions don't need logout URLs
  - **Optional**: You could add your extension's popup URL if you want centralized logout

### Token Configuration
**Important**: You must select BOTH token types for the extension to work properly:

- ✅ **Access tokens (used for implicit flows)**
  - Required for Microsoft Graph API calls
  - The extension needs these to authenticate API requests
  
- ✅ **ID tokens (used for implicit and hybrid flows)**
  - Required for user identity information
  - Used to get user profile and validate authentication

**Why both are needed:**
- **Access tokens**: Authorize calls to Microsoft Graph API
- **ID tokens**: Provide user identity and authentication proof

### API Permissions Setup
1. Go to **API permissions** in your Azure AD app
2. Click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
3. Add these permissions:
   - `User.Read` - Read user profile
   - `User.ReadBasic.All` - Read basic profiles of all users
   - `User.Read.All` - Read full profiles of all users
   - `Group.Read.All` - Read all groups
   - `GroupMember.ReadWrite.All` - Read and write group memberships
4. Click **Grant admin consent for [Your Tenant]**

### Security Settings
- **Supported account types**: Choose based on your needs:
  - **Single tenant**: Only your organization
  - **Multi-tenant**: Any organization (more flexible)
- **Implicit grant**: Will be automatically configured when you select token types above

## Troubleshooting

### Common Issues:

1. **"AADSTS50011: The reply URL specified in the request does not match"**
   - The redirect URI in Azure AD must exactly match: `https://{extension-id}.chromiumapp.org/` 
   - **Must include the trailing slash**
   - Use the extension ID shown in the settings modal
   - Ensure the platform is set to "Single-page application (SPA)"

2. **"AADSTS7000218: The request body must contain the following parameter: 'client_assertion'"**
   - Your app is not configured to allow public client flows
   - **Solution**: In Azure AD app → Authentication → Advanced settings → "Allow public client flows" = **Yes**

3. **"No authorization code received"**
   - Check if you enabled both "Access tokens" and "ID tokens" in Azure AD
   - Verify the Client ID matches exactly between Azure AD and extension settings

4. **"Token exchange failed"**
   - Ensure "Allow public client flows" is enabled in Azure AD
   - Check that all required Microsoft Graph permissions are granted
   - Verify admin consent was provided

5. **Authentication window closes immediately**
   - Check if popup blockers are enabled in your browser
   - Ensure the Azure AD app is configured as SPA (not Web app)
   - Verify both token types are selected in Azure AD configuration

6. **"Insufficient permissions" when using extension**
   - Verify all required Microsoft Graph permissions are granted
   - Ensure admin consent is provided for organization-wide permissions
   - Check that the signed-in user has admin privileges in your tenant

7. **Extension works locally but not when published**
   - Add both local development and published extension IDs as redirect URIs
   - The published extension will have a different ID than your local version

### Getting Extension IDs:

- **Local development**: Check `chrome://extensions/` in developer mode
- **Published version**: Will be provided when published to Chrome Web Store
- **Current ID**: Shown in the extension settings modal

## Security Considerations

1. **Client Secret**: Never include client secrets in browser extensions (they're public)
2. **Scope Minimization**: Only request the minimum required permissions
3. **Token Storage**: Tokens are stored in browser's local storage (encrypted by browser)
4. **Redirect URI**: Must be registered in Azure AD to prevent token interception

## Production Checklist

Before publishing:
- [ ] **Azure AD App Registration**:
  - [ ] Platform set to Single-page application (SPA)
  - [ ] "Allow public client flows" = **Yes** (required for PKCE)
  - [ ] Both Access tokens and ID tokens enabled
  - [ ] Redirect URI configured: `https://{extension-id}.chromiumapp.org/` (with trailing slash)
  - [ ] All Microsoft Graph permissions granted: `User.Read`, `User.ReadBasic.All`, `User.Read.All`, `Group.Read.All`, `GroupMember.ReadWrite.All`
  - [ ] Admin consent provided for tenant
- [ ] **Extension Configuration**:
  - [ ] Correct Client ID configured in extension settings
  - [ ] Extension tested with production Azure AD app
  - [ ] Background service worker working properly
- [ ] **Testing**:
  - [ ] Sign-in flow works correctly
  - [ ] Token refresh happens automatically
  - [ ] Group copying functionality tested
  - [ ] Admin permissions validated
- [ ] **Documentation & Store**:
  - [ ] Privacy policy updated with authentication details
  - [ ] Store listing includes authentication requirements and admin permissions needed
  - [ ] Setup instructions provided for IT administrators
  - [ ] Support documentation includes troubleshooting steps
