# Group Membership Copier Extension

## Overview
This browser extension allows Microsoft Entra (Azure AD) administrators to copy group memberships from one user to another using the Microsoft Graph API. It works in Chrome and Edge.

## Features
- Authenticate as an admin using your own credentials
- Fetch and display all group memberships for a source user
- Select which groups to copy
- Copy selected groups to a target user
- All operations are performed locally and securely using Microsoft Graph API

## Installation
1. Open Chrome or Edge and go to `chrome://extensions` or `edge://extensions`.
2. Enable "Developer mode".
3. Click "Load unpacked" and select the `EntraExtension` folder.
4. Click the extension icon to open the popup.

## Configuration

### 1. Register an Azure AD App (App Registration)
1. Go to the Azure Portal > Azure Active Directory > App registrations > New registration.
2. Name your app (e.g., "Group Membership Copier").
3. Set the redirect URI to:
	- For Chrome/Edge: `https://<YOUR_EXTENSION_ID>.chromiumapp.org/`
	- (Replace `<YOUR_EXTENSION_ID>` with your extension's ID from the extensions page.)
4. Complete the registration and copy the Application (client) ID.
5. Under "API permissions", add the following delegated Microsoft Graph permissions:
	- User.Read
	- User.ReadBasic.All
	- User.Read.All
	- Group.Read.All
	- GroupMember.ReadWrite.All
6. Click "Grant admin consent" for your tenant.

### 2. Configure the Extension Settings
1. Open the extension popup and click the **Settings** button.
2. Enter your Azure AD App Registration's **Client ID** and **Redirect URI** (as above).
3. Save the settings.
4. You can now sign in and use the extension.

## Usage
1. Enter the source user's email or UPN and click "Fetch Groups".
2. Select the groups you want to copy.
3. Enter the target user's email or UPN.
4. Click "Copy Selected Groups".
5. Status and errors will be displayed in the popup.

## Permissions
- `identity`: To authenticate the admin user.
- `storage`: To store extension settings (if needed).
- `scripting`: For future enhancements.

## Troubleshooting
- You must be a Microsoft Entra (Azure AD) admin to use this extension.
- If you see permission errors, ensure your account has the required Graph API permissions (`Group.Read.All`, `User.Read.All`, `GroupMember.ReadWrite.All`).
- If you encounter authentication issues, try signing out and back in.

## Security
- The extension only communicates with Microsoft Graph API endpoints.
- No data is sent to any third-party servers.

## License
MIT
