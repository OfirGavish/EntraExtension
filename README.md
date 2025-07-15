# Entra ID Group Membership Manager Extension

## Overview
This Microsoft Edge extension allows Microsoft Entra (Azure AD) administrators to efficiently manage group memberships - copy groups from one user to another or remove users from multiple groups - using the Microsoft Graph API. Built with modern OAuth 2.0 + PKCE authentication for maximum security.

**Browser Compatibility**: Primarily designed for Microsoft Edge, but also compatible with Chrome and other Chromium-based browsers.

## ✨ Features
- **🔐 Secure OAuth 2.0 + PKCE Authentication** - Modern, secure authentication flow
- **👤 Smart User Search** - Auto-complete user search with real-time suggestions
- **📊 Intelligent Group Filtering** - Automatically filters out non-manageable groups:
  - Dynamic groups (membership rules)
  - Mail-enabled security groups
  - Distribution lists
- **✅ Pre-flight Membership Checks** - Prevents duplicate membership errors
- **📈 Detailed Status Reporting** - Shows success, failure, and skip counts with detailed error messages
- **🛡️ Multi-tenant Support** - Works across different Azure AD tenants
- **🔍 Admin Role Detection** - Validates admin permissions before operations
- **🎯 Group Type Classification** - Clearly identifies Security Groups, Office 365 Groups, and Teams
- **🚀 Bulk Group Operations** - Copy group memberships to other users or remove users from multiple groups
- **🔄 Confirmation for Destructive Actions** - Requires confirmation before removing users from groups

## 🚀 Quick Start

### Prerequisites
- Microsoft Edge browser (or Chrome/other Chromium-based browsers)
- Microsoft Entra ID (Azure AD) admin account with one of these roles:
  - Global Administrator
  - User Administrator
  - Groups Administrator
  - Application Administrator
  - Security Administrator
  - Helpdesk Administrator

### 1. Install the Extension
1. Download or clone this repository
2. Open Microsoft Edge and go to `edge://extensions` (or `chrome://extensions` for Chrome)
3. Enable "Developer mode" (toggle in bottom left for Edge, top right for Chrome)
4. Click "Load unpacked" and select the `EntraExtension` folder
5. Note the Extension ID that appears (you'll need this for Azure setup)

### 2. Create Azure AD App Registration

1. **Go to Azure Portal** → [App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)

2. **Click "New registration"**
   - **Name**: `Group Membership Copier` (or your preferred name)
   - **Supported account types**: `Accounts in any organizational directory` (Any Microsoft Entra ID tenant - Multitenant)
   - **Redirect URI**: 
     - Platform: `Single-page application (SPA)`
     - URI: `https://YOUR_EXTENSION_ID.chromiumapp.org/`
     - Replace `YOUR_EXTENSION_ID` with the actual extension ID from step 1

3. **Click "Register"**

4. **Copy the Application (client) ID** - you'll need this for the extension settings

### 3. Configure API Permissions

1. **In your app registration**, go to **"API permissions"**

2. **Click "Add a permission"** → **Microsoft Graph** → **Delegated permissions**

3. **Add these permissions**:
   ```
   User.Read                    # Read user profile
   User.ReadBasic.All          # Read basic user info
   User.Read.All               # Read all user profiles  
   Group.Read.All              # Read all groups
   GroupMember.ReadWrite.All   # Manage group memberships
   Directory.Read.All          # Read directory (for admin role detection)
   ```

4. **Click "Grant admin consent"** for your organization
   - ⚠️ **Important**: Admin consent is required for the extension to work

### 4. Configure the Extension

1. **Click the extension icon** in Chrome
2. **Click the "Settings" button** 
3. **Enter your Client ID** (from step 2.4)
4. **Click "Save Settings"**
5. **Click "Sign In"** and complete the OAuth flow

## 📖 How to Use

### Copying Group Memberships

1. **Sign in** using the extension popup
2. **Enter source user** email/UPN in the "Source User" field
3. **Click "Fetch Groups"** to load their group memberships
4. **Review the groups** - the extension automatically:
   - ✅ Shows manageable groups (Security Groups, Office 365 Groups, Teams)
   - ❌ Filters out dynamic groups, distribution lists, and mail-enabled security groups
5. **Select/deselect** groups as needed (all manageable groups are selected by default)
6. **Enter target user** email/UPN in the "Target User" field  
7. **Click "Copy Selected Groups"**
8. **Review results** - the extension shows:
   - ✅ Successfully copied groups
   - ⏭️ Skipped groups (user already a member)
   - ❌ Failed groups with detailed error messages

### Removing Group Memberships

1. **Sign in** using the extension popup
2. **Enter source user** email/UPN in the "Source User" field
3. **Click "Fetch Groups"** to load their group memberships
4. **Review and select** the groups you want to remove the user from
5. **Click "Remove from Selected Groups"** (red button)
6. **Confirm the action** when prompted (this action cannot be undone)
7. **Review results** - the extension shows:
   - ✅ Successfully removed groups
   - ⏭️ Skipped groups (user was not a member)
   - ❌ Failed groups with detailed error messages

### Group Type Indicators

- **Security Group** - Azure AD security groups
- **Office 365 Group** - Microsoft 365 groups with email
- **Office 365 Team** - Microsoft Teams without email
- **Mail Group** - Legacy mail-enabled groups

### Understanding the Results

The extension provides detailed feedback:
- **Green**: All operations successful
- **Orange**: Some failures occurred (check details)
- **Blue**: Information messages
- **Red**: Critical errors

## 🔧 Technical Details

### Architecture
- **Authentication**: OAuth 2.0 Authorization Code flow with PKCE
- **API**: Microsoft Graph API v1.0
- **Extension Type**: Chrome Extension Manifest V3
- **Background**: Service Worker for token management
- **Frontend**: HTML/CSS/JavaScript popup interface

### Security Features
- ✅ **PKCE (Proof Key for Code Exchange)** - Prevents authorization code interception
- ✅ **Token refresh** - Automatic token renewal without re-authentication
- ✅ **Secure storage** - Tokens stored securely in Chrome extension storage
- ✅ **Admin validation** - Verifies admin roles before allowing operations
- ✅ **Pre-flight checks** - Validates membership before attempting operations

### Smart Filtering Logic
The extension intelligently filters groups to show only those that support manual membership management:

**✅ Included Groups:**
- Security Groups (`securityEnabled: true, mailEnabled: false`)
- Office 365 Groups (`groupTypes: ["Unified"], mailEnabled: true`)
- Microsoft Teams (`groupTypes: ["Unified"], mailEnabled: false`)

**❌ Excluded Groups:**
- Dynamic groups (have `membershipRule` and `membershipRuleProcessingState: "On"`)
- Mail-enabled security groups (`mailEnabled: true AND securityEnabled: true`)
- Distribution lists (`mailEnabled: true` without `groupTypes: ["Unified"]`)

## 🛠️ Troubleshooting

### Common Issues

#### "Not signed in" or Authentication Errors
- Ensure you've completed the Azure AD app registration setup
- Verify the Client ID is correct in extension settings
- Check that admin consent has been granted for API permissions
- Try signing out and back in

#### "You must be an admin" Error
- Verify your account has one of the required admin roles
- Check the debug information shown when fetching groups
- Ensure `Directory.Read.All` permission is granted and consented

#### Groups Not Appearing
- The extension filters out non-manageable groups by design
- Dynamic groups, distribution lists, and mail-enabled security groups are excluded
- Check the console logs for filtering details

#### Permission Errors When Copying Groups
- Verify `GroupMember.ReadWrite.All` permission is granted
- Ensure admin consent has been provided
- Some groups may have additional restrictions based on group settings

### Debug Information
The extension shows detailed debug information when fetching groups, including:
- Your admin roles and permissions
- Group filtering logic and results
- Detailed error messages for troubleshooting

## 📋 Required Permissions

### Chrome Extension Permissions
```json
{
  "storage": "Store extension settings and authentication tokens",
  "identity": "Handle OAuth 2.0 authentication flow"
}
```

### Microsoft Graph API Permissions (Delegated)
| Permission | Purpose |
|------------|---------|
| `User.Read` | Read signed-in user's profile |
| `User.ReadBasic.All` | Read basic user information for search |
| `User.Read.All` | Read detailed user information |
| `Group.Read.All` | Read group information and memberships |
| `GroupMember.ReadWrite.All` | Add/remove users from groups |
| `Directory.Read.All` | Read directory roles for admin validation |

## 🏗️ Development

### Project Structure
```
EntraExtension/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker for OAuth 2.0 + PKCE
├── popup.html            # Extension popup interface
├── popup.js              # Main application logic
├── pkce.js               # PKCE cryptographic functions
├── popup.css             # Styling for the popup
└── README.md             # This file
```

### Key Files
- **`background.js`** - Handles OAuth 2.0 authentication, token management, and refresh
- **`popup.js`** - Main UI logic, Microsoft Graph API calls, group filtering
- **`pkce.js`** - PKCE implementation for secure OAuth flow
- **`manifest.json`** - Chrome extension configuration

### Building and Testing
1. Make code changes
2. Go to `chrome://extensions`
3. Click the refresh icon on your extension
4. Test functionality in the popup

## 🔒 Security & Privacy

### Data Handling
- **No data collection** - Extension operates entirely client-side
- **No external servers** - Only communicates with Microsoft Graph API
- **Secure token storage** - Uses Chrome's secure extension storage
- **Local processing** - All filtering and logic runs locally

### Authentication Security
- **OAuth 2.0 + PKCE** - Industry standard secure authentication
- **Token encryption** - Tokens stored securely by Chrome
- **Automatic refresh** - Tokens refreshed without user intervention
- **Admin-only access** - Validates administrator permissions

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Make your changes
3. Test thoroughly with your Entra environment
4. Submit a pull request

### Areas for Contribution
- UI/UX improvements
- Additional group filtering options
- Bulk operations support
- Export/import functionality
- Better error handling

## 📜 License

MIT License - See LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the debug information shown in the extension
3. Open an issue on GitHub with:
   - Chrome version
   - Extension version
   - Error messages
   - Screenshots if applicable

---

**Note**: This extension is designed for administrators managing Azure AD group memberships. Ensure you have the appropriate permissions and follow your organization's policies when using this tool.
