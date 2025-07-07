# 🚀 Azure AD Group Copier Extension - Setup Guide

This guide will walk you through setting up the Azure AD Group Copier Extension from scratch.

## 📋 Prerequisites

Before you begin, ensure you have:
- [ ] Chrome browser installed
- [ ] Azure AD admin account with one of these roles:
  - Global Administrator
  - User Administrator
  - Groups Administrator  
  - Application Administrator
  - Security Administrator
  - Helpdesk Administrator
- [ ] Access to Azure Portal (portal.azure.com)
- [ ] Permission to create App Registrations in your Azure AD tenant

## 🔽 Step 1: Install the Extension

### Option A: Load Unpacked (Development)
1. **Download** the extension files to your computer
2. **Open Chrome** and navigate to `chrome://extensions`
3. **Enable Developer Mode** (toggle in the top right corner)
4. **Click "Load unpacked"** 
5. **Select the EntraExtension folder** where you downloaded the files
6. **Note the Extension ID** that appears (e.g., `abcdefghijklmnopqrstuvwxyz123456`)
   - You'll need this for the next step!

### Option B: Chrome Web Store (When Published)
- Install directly from the Chrome Web Store
- The Extension ID will be provided automatically

## 🏗️ Step 2: Create Azure AD App Registration

### 2.1 Navigate to App Registrations
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **"New registration"**

### 2.2 Configure Basic Settings
Fill out the registration form:

**Application Name:**
```
Group Membership Copier Extension
```

**Supported Account Types:**
```
☑️ Accounts in this organizational directory only (Single tenant)
```

**Redirect URI:**
- **Platform**: `Single-page application (SPA)`
- **URI**: `https://YOUR_EXTENSION_ID.chromiumapp.org/`
  
  ⚠️ **Replace `YOUR_EXTENSION_ID`** with the actual extension ID from Step 1
  
  **Example**: `https://abcdefghijklmnopqrstuvwxyz123456.chromiumapp.org/`

### 2.3 Complete Registration
1. Click **"Register"**
2. **Copy the Application (client) ID** from the overview page
   - Save this - you'll need it for extension configuration!

## 🔑 Step 3: Configure API Permissions

### 3.1 Add Microsoft Graph Permissions
1. In your app registration, go to **"API permissions"**
2. Click **"Add a permission"**
3. Select **"Microsoft Graph"**
4. Choose **"Delegated permissions"**

### 3.2 Add Required Permissions
Add each of these permissions one by one:

| Permission Name | Purpose |
|----------------|---------|
| `User.Read` | Read your profile information |
| `User.ReadBasic.All` | Search for users in directory |
| `User.Read.All` | Read detailed user information |
| `Group.Read.All` | Read group information and memberships |
| `GroupMember.ReadWrite.All` | Add/remove users from groups |
| `Directory.Read.All` | Read directory roles (admin validation) |

### 3.3 Grant Admin Consent
1. After adding all permissions, click **"Grant admin consent for [Your Organization]"**
2. Click **"Yes"** to confirm
3. Verify all permissions show **"Granted for [Your Organization]"**

## ⚙️ Step 4: Configure the Extension

### 4.1 Open Extension Settings
1. Click the **extension icon** in Chrome (may be in the extensions menu)
2. Click the **"Settings"** button (gear icon)

### 4.2 Enter Configuration
1. **Client ID**: Paste the Application (client) ID from Step 2.3
2. Click **"Save Settings"**
3. Close the settings modal

### 4.3 Test Authentication
1. Click **"Sign In"**
2. Complete the OAuth flow in the popup window
3. Verify you see "Signed in as [your-email]"

## ✅ Step 5: Verify Setup

### 5.1 Test Admin Role Detection
1. In the extension popup, enter a test user email in "Source User"
2. Click **"Fetch Groups"**
3. You should see debug information showing your admin roles
4. Verify it shows "✅ FOUND" for at least one admin role

### 5.2 Test Group Fetching
1. Enter a user who has group memberships
2. Click **"Fetch Groups"** 
3. Verify groups appear with proper type indicators:
   - (Security Group)
   - (Office 365 Group)
   - (Office 365 Team)

### 5.3 Test Group Copying (Optional)
1. Enter a target user email
2. Select one or more groups
3. Click **"Copy Selected Groups"**
4. Verify the operation completes with status information

## 🎯 Quick Reference

### Extension Configuration
- **Client ID**: From Azure AD App Registration Overview
- **Redirect URI**: `https://[EXTENSION_ID].chromiumapp.org/`

### Required Admin Roles (Any One)
- Global Administrator
- User Administrator
- Groups Administrator
- Application Administrator
- Security Administrator
- Helpdesk Administrator

### Required API Permissions
- User.Read
- User.ReadBasic.All
- User.Read.All
- Group.Read.All
- GroupMember.ReadWrite.All
- Directory.Read.All

## 🆘 Troubleshooting Setup Issues

### "Invalid Client ID" Error
- Verify you copied the Client ID correctly from Azure AD
- Ensure there are no extra spaces or characters

### "Redirect URI Mismatch" Error
- Check that the Extension ID in the redirect URI matches your actual extension ID
- Verify you selected "Single-page application (SPA)" as the platform type

### "Admin Consent Required" Error
- Go back to Azure AD → App registrations → Your app → API permissions
- Click "Grant admin consent" and confirm

### "You must be an admin" Error
- Verify your account has one of the required admin roles
- Check that Directory.Read.All permission is granted and consented
- Review the debug information shown when fetching groups

### Groups Not Showing
- The extension automatically filters out non-manageable groups
- This is normal behavior for dynamic groups and distribution lists
- Check console logs for detailed filtering information

## 🎉 You're Ready!

Once setup is complete, you can:
- ✅ Search for users with auto-complete
- ✅ View and filter group memberships
- ✅ Copy group memberships between users
- ✅ Monitor operation status and results

Happy group management! 🚀

---

**Need help?** Check the main [README.md](README.md) for detailed troubleshooting and technical information.
