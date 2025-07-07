// --- Authentication with background service worker ---
const signInBtn = document.getElementById('signInBtn');
const authStatus = document.getElementById('authStatus');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const clientIdInput = document.getElementById('clientIdInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsStatus = document.getElementById('settingsStatus');

let isSignedIn = false;
let currentUser = null;

// Send message to background service worker
async function sendMessage(action, data = null) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, data }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

// Load settings from storage and update UI
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['clientId']);
    const clientId = result.clientId || 'c9b8d6c6-0ef6-4c2e-8f7b-7a9e8a7d8b01';
    clientIdInput.value = clientId;
    
    // Show extension ID for reference
    const extensionId = chrome.runtime.id;
    document.getElementById('detectedUri').textContent = `Extension ID: ${extensionId}`;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Check authentication status and update UI
async function updateAuthStatus() {
  try {
    isSignedIn = await sendMessage('isSignedIn');
    
    if (isSignedIn) {
      currentUser = await sendMessage('getUserInfo');
      authStatus.textContent = `Signed in as ${currentUser.userPrincipalName}`;
      authStatus.style.color = '#4ea1ff';
      signInBtn.style.display = 'none';
    } else {
      authStatus.textContent = 'Not signed in';
      authStatus.style.color = 'orange';
      signInBtn.style.display = 'block';
      currentUser = null;
    }
  } catch (error) {
    console.error('Failed to check auth status:', error);
    authStatus.textContent = 'Authentication error';
    authStatus.style.color = 'red';
    isSignedIn = false;
    signInBtn.style.display = 'block';
  }
}

// Get access token for API calls
async function getAccessToken() {
  if (!isSignedIn) {
    throw new Error('Not signed in');
  }
  return await sendMessage('getAccessToken');
}

// Sign in handler
signInBtn.addEventListener('click', async () => {
  try {
    authStatus.textContent = 'Signing in...';
    authStatus.style.color = '#4ea1ff';
    
    await sendMessage('signIn');
    await updateAuthStatus();
    
  } catch (error) {
    console.error('Sign-in failed:', error);
    authStatus.textContent = `Sign-in failed: ${error.message}`;
    authStatus.style.color = 'red';
    
    // Show more specific error messages
    if (error.message.includes('redirect_uri_mismatch') || error.message.includes('AADSTS50011')) {
      authStatus.textContent = 'Sign-in failed: Redirect URI mismatch. Check Azure AD app settings.';
    } else if (error.message.includes('invalid_client')) {
      authStatus.textContent = 'Sign-in failed: Invalid Client ID. Check extension settings.';
    } else if (error.message.includes('User denied')) {
      authStatus.textContent = 'Sign-in cancelled by user.';
    }
  }
});

// Initialize when popup loads
window.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await updateAuthStatus();
});

// --- Settings modal logic ---
settingsBtn.addEventListener('click', () => {
  settingsModal.style.display = 'flex';
  settingsStatus.textContent = '';
});

closeSettingsBtn.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

saveSettingsBtn.addEventListener('click', async () => {
  const clientId = clientIdInput.value.trim();
  
  if (!clientId) {
    settingsStatus.textContent = 'Client ID is required.';
    settingsStatus.style.color = 'orange';
    return;
  }
  
  try {
    await chrome.storage.local.set({ clientId });
    settingsStatus.textContent = 'Settings saved! Please sign in again.';
    settingsStatus.style.color = 'green';
    
    // Sign out user so they can sign in with new settings
    if (isSignedIn) {
      await sendMessage('signOut');
      await updateAuthStatus();
    }
    
    setTimeout(() => { settingsModal.style.display = 'none'; }, 1500);
  } catch (error) {
    settingsStatus.textContent = `Failed to save settings: ${error.message}`;
    settingsStatus.style.color = 'red';
  }
});

// --- User search and dropdown logic ---
const sourceUserInput = document.getElementById('sourceUser');
const sourceUserDropdown = document.getElementById('sourceUserDropdown');
const targetUserInput = document.getElementById('targetUser');
const targetUserDropdown = document.getElementById('targetUserDropdown');

// User search for source user
sourceUserInput.addEventListener('input', async () => {
  if (!isSignedIn) {
    authStatus.textContent = 'Please sign in first.';
    authStatus.style.color = 'orange';
    return;
  }
  const query = sourceUserInput.value.trim();
  if (query.length < 2) {
    sourceUserDropdown.style.display = 'none';
    return;
  }
  try {
    const token = await getAccessToken();
    const users = await searchUsers(query, token);
    renderUserDropdown(users, sourceUserDropdown, sourceUserInput);
  } catch (e) {
    console.error('User search error:', e);
    sourceUserDropdown.style.display = 'none';
  }
});

// User search for target user
targetUserInput.addEventListener('input', async () => {
  if (!isSignedIn) {
    authStatus.textContent = 'Please sign in first.';
    authStatus.style.color = 'orange';
    return;
  }
  const query = targetUserInput.value.trim();
  if (query.length < 2) {
    targetUserDropdown.style.display = 'none';
    return;
  }
  try {
    const token = await getAccessToken();
    const users = await searchUsers(query, token);
    renderUserDropdown(users, targetUserDropdown, targetUserInput);
  } catch (e) {
    console.error('User search error:', e);
    targetUserDropdown.style.display = 'none';
  }
});

function renderUserDropdown(users, dropdown, input) {
  if (!users.length) {
    dropdown.style.display = 'none';
    return;
  }
  dropdown.innerHTML = users.map(u => `<div class="dropdown-item" data-upn="${u.userPrincipalName}">${u.displayName} (${u.userPrincipalName})</div>`).join('');
  dropdown.style.display = 'block';
  Array.from(dropdown.children).forEach(item => {
    item.onclick = () => {
      input.value = item.getAttribute('data-upn');
      dropdown.style.display = 'none';
    };
  });
}

// Hide dropdown on blur
sourceUserInput.addEventListener('blur', () => setTimeout(() => { sourceUserDropdown.style.display = 'none'; }, 200));
targetUserInput.addEventListener('blur', () => setTimeout(() => { targetUserDropdown.style.display = 'none'; }, 200));

// Helper: Search users in directory
async function searchUsers(query, token) {
  const res = await fetch(`https://graph.microsoft.com/v1.0/users?$filter=startswith(displayName,'${encodeURIComponent(query)}') or startswith(userPrincipalName,'${encodeURIComponent(query)}')&$top=10`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.value || [];
}

// Helper: Get token, prompt if needed
// Remove old getToken and authenticateWithMicrosoft

// --- Fetch groups logic ---
document.getElementById('fetchGroups').addEventListener('click', async () => {
  if (!isSignedIn) {
    authStatus.textContent = 'Please sign in first.';
    authStatus.style.color = 'orange';
    return;
  }
  const sourceUser = sourceUserInput.value.trim();
  if (!sourceUser) {
    document.getElementById('groupsList').innerHTML = '<p style="color:red">Please enter a source user.</p>';
    return;
  }
  document.getElementById('groupsList').innerHTML = '<p>Loading groups...</p>';
  try {
    const token = await getAccessToken();
    
    // Always show debug info first
    await debugUserRoles(token);
    
    const isAdmin = await checkIfAdmin(token);
    if (!isAdmin) {
      // Add error message to existing debug info instead of replacing it
      const currentHtml = document.getElementById('groupsList').innerHTML;
      document.getElementById('groupsList').innerHTML = currentHtml + '<div style="background:#ff4444;color:white;padding:10px;margin-top:10px;border-radius:5px;"><strong>❌ ADMIN CHECK FAILED</strong><br>The extension detected you are not an admin. Review the role information above.</div>';
      return;
    }
    const userId = await getUserIdByEmail(sourceUser, token);
    const groups = await getUserGroups(userId, token);
    renderGroups(groups);
  } catch (e) {
    let msg = e.message || e.toString();
    if (msg.includes('AADSTS')) msg = 'Authentication error. Please ensure you are signed in as an admin.';
    document.getElementById('groupsList').innerHTML = `<p style=\"color:red\">Error: ${msg}</p>`;
  }
});

// --- Copy groups logic ---
document.getElementById('copyGroups').addEventListener('click', async () => {
  if (!isSignedIn) {
    authStatus.textContent = 'Please sign in first.';
    authStatus.style.color = 'orange';
    return;
  }
  const targetUser = targetUserInput.value.trim();
  if (!targetUser) {
    document.getElementById('status').textContent = 'Please enter a target user.';
    document.getElementById('status').style.color = 'red';
    return;
  }
  const checked = Array.from(document.querySelectorAll('.group-checkbox:checked'));
  if (!checked.length) {
    document.getElementById('status').textContent = 'No groups selected.';
    document.getElementById('status').style.color = 'red';
    return;
  }
  document.getElementById('status').textContent = 'Copying groups...';
  document.getElementById('status').style.color = 'black';
  try {
    const token = await getAccessToken();
    const isAdmin = await checkIfAdmin(token);
    if (!isAdmin) {
      document.getElementById('status').textContent = 'You must be an admin to use this extension.';
      document.getElementById('status').style.color = 'red';
      return;
    }
    const targetUserId = await getUserIdByEmail(targetUser, token);
    let successCount = 0, failCount = 0, skippedCount = 0;
    const errors = [];
    const skipped = [];
    
    for (const cb of checked) {
      const groupId = cb.value;
      const groupName = cb.parentElement.textContent.replace(/^\s*\S+\s*/, '').trim(); // Extract group name
      
      // Check if user is already a member first
      const isMember = await checkGroupMembership(targetUserId, groupId, token);
      if (isMember) {
        console.log(`User is already a member of ${groupName}, skipping...`);
        skippedCount++;
        skipped.push(groupName);
        continue;
      }
      
      const result = await addUserToGroup(targetUserId, groupId, token);
      
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        errors.push(`${groupName}: ${result.error}`);
      }
    }
    
    let statusText = `Done. ${successCount} group(s) copied, ${failCount} failed`;
    if (skippedCount > 0) {
      statusText += `, ${skippedCount} skipped (already member)`;
    }
    statusText += '.';
    
    if (skipped.length > 0) {
      statusText += `\n\nAlready a member of:\n${skipped.join('\n')}`;
    }
    
    if (errors.length > 0) {
      statusText += `\n\nFailure details:\n${errors.join('\n')}`;
    }
    
    document.getElementById('status').textContent = statusText;
    document.getElementById('status').style.color = failCount ? 'orange' : (successCount > 0 ? 'green' : '#4ea1ff');
    
    // Also log detailed info to console for debugging
    if (skipped.length > 0) {
      console.log('Groups skipped (already member):', skipped);
    }
    if (errors.length > 0) {
      console.log('Group copy failures:', errors);
    }
  } catch (e) {
    let msg = e.message || e.toString();
    if (msg.includes('Insufficient privileges')) msg = 'You do not have permission to add users to groups.';
    document.getElementById('status').textContent = `Error: ${msg}`;
    document.getElementById('status').style.color = 'red';
  }
});

// Helper: Check if current user is an admin
async function checkIfAdmin(token) {
  try {
    // Check for Directory roles
    const res = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      console.log('Admin check: API call failed with status:', res.status);
      return false;
    }
    const data = await res.json();
    
    // Check for admin roles by template ID or display name
    const adminRoles = [
      '62e90394-69f5-4237-9190-012177145e10', // Global Administrator
      'fe930be7-5e62-47db-91af-98c3a49a38b1', // User Administrator  
      '9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3', // Application Administrator
      '194ae4cb-b126-40b2-bd5b-6091b380977d', // Security Administrator
      '729827e3-9c14-49f7-bb1b-9608f156bbb8', // Helpdesk Administrator
      'fdd7a751-b60b-444a-984c-02652fe8fa1c', // Groups Administrator
      '52cc5d7e-eadb-40c5-98d9-8def5b2c6005', // Found role ID - might be Global Admin
    ];
    
    const adminRoleNames = [
      'Global Administrator',
      'User Administrator', 
      'Application Administrator',
      'Security Administrator',
      'Helpdesk Administrator',
      'Groups Administrator'
    ];
    
    console.log('Admin check: Looking for admin roles...');
    const directoryRoles = data.value.filter(obj => obj['@odata.type'] === '#microsoft.graph.directoryRole');
    console.log('Admin check: Found directory roles:', directoryRoles.length);
    
    const isAdmin = directoryRoles.some(obj => {
      const matchByTemplateId = obj.roleTemplateId && adminRoles.includes(obj.roleTemplateId);
      const matchByName = obj.displayName && adminRoleNames.includes(obj.displayName);
      const matchById = adminRoles.includes(obj.id); // Also try matching by ID
      console.log(`Admin check: Role "${obj.displayName}" (ID: ${obj.id}, template: ${obj.roleTemplateId}) - Match by template: ${matchByTemplateId}, Match by name: ${matchByName}, Match by ID: ${matchById}`);
      return matchByTemplateId || matchByName || matchById;
    });
    
    console.log('Admin check: Final result:', isAdmin);
    return isAdmin;
  } catch (error) {
    console.error('Admin check failed:', error);
    return false;
  }
}

// Debug function to see user's actual roles
async function debugUserRoles(token) {
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      const roles = data.value.filter(obj => obj['@odata.type'] === '#microsoft.graph.directoryRole');
      console.log('=== DEBUG: User roles ===');
      console.log('Total roles found:', roles.length);
      console.log('All memberOf objects:', data.value.length);
      
      // Show comprehensive debug info in UI
      let debugHtml = '<div style="background:#333;padding:10px;border-radius:5px;margin:10px 0;font-size:12px;color:#fff;">';
      debugHtml += '<strong>🔍 ADMIN ROLE DEBUG INFORMATION</strong><br><br>';
      debugHtml += `<strong>Total memberOf objects:</strong> ${data.value.length}<br>`;
      debugHtml += `<strong>Directory roles found:</strong> ${roles.length}<br><br>`;
      
      if (roles.length > 0) {
        debugHtml += '<strong>Your Directory Roles:</strong><br>';
        roles.forEach((role, index) => {
          console.log(`Role ${index + 1}:`, {
            id: role.id,
            displayName: role.displayName,
            roleTemplateId: role.roleTemplateId,
            '@odata.type': role['@odata.type']
          });
          
          debugHtml += `${index + 1}. <strong>${role.displayName || 'Unknown Name'}</strong><br>`;
          debugHtml += `&nbsp;&nbsp;• ID: ${role.id}<br>`;
          debugHtml += `&nbsp;&nbsp;• Template ID: ${role.roleTemplateId || 'Not available'}<br>`;
          
          // Show ALL properties of the role for debugging
          debugHtml += `&nbsp;&nbsp;• <em>All properties:</em><br>`;
          for (const [key, value] of Object.entries(role)) {
            if (key !== 'id' && key !== 'displayName' && key !== 'roleTemplateId') {
              debugHtml += `&nbsp;&nbsp;&nbsp;&nbsp;- ${key}: ${JSON.stringify(value)}<br>`;
            }
          }
          debugHtml += '<br>';
        });
        
        // Check which admin roles we're looking for
        const adminRoles = [
          '62e90394-69f5-4237-9190-012177145e10', // Global Administrator
          'fe930be7-5e62-47db-91af-98c3a49a38b1', // User Administrator  
          '9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3', // Application Administrator
          '194ae4cb-b126-40b2-bd5b-6091b380977d', // Security Administrator
          '729827e3-9c14-49f7-bb1b-9608f156bbb8', // Helpdesk Administrator
          'fdd7a751-b60b-444a-984c-02652fe8fa1c', // Groups Administrator
        ];
        
        const adminRoleNames = [
          'Global Administrator',
          'User Administrator', 
          'Application Administrator',
          'Security Administrator',
          'Helpdesk Administrator',
          'Groups Administrator',
          'Found Role ID (52cc5d7e...)', // For the role we discovered
        ];
        
        debugHtml += '<strong>Expected Admin Roles (checking for these):</strong><br>';
        adminRoleNames.forEach((name, index) => {
          const templateId = adminRoles[index];
          const hasRoleByTemplate = roles.some(r => r.roleTemplateId === templateId);
          const hasRoleByName = roles.some(r => r.displayName === name);
          const hasRoleById = roles.some(r => r.id === templateId);
          const hasRole = hasRoleByTemplate || hasRoleByName || hasRoleById;
          
          debugHtml += `• ${name} (${templateId}): ${hasRole ? '✅ FOUND' : '❌ Not found'}`;
          if (hasRole) {
            if (hasRoleByTemplate) debugHtml += ' <em>(matched by template ID)</em>';
            else if (hasRoleByName) debugHtml += ' <em>(matched by name)</em>';
            else if (hasRoleById) debugHtml += ' <em>(matched by role ID)</em>';
          }
          debugHtml += '<br>';
        });
        
      } else {
        debugHtml += '<strong style="color:#ff6b6b;">No directory roles found!</strong><br>';
        debugHtml += 'This could mean:<br>';
        debugHtml += '• You don\'t have any admin roles<br>';
        debugHtml += '• The app permissions don\'t include reading directory roles<br>';
        debugHtml += '• There\'s an issue with the Microsoft Graph API call<br>';
      }
      
      debugHtml += '</div>';
      document.getElementById('groupsList').innerHTML = debugHtml;
      
      console.log('=== END DEBUG ===');
    } else {
      document.getElementById('groupsList').innerHTML = `<p style="color:red">DEBUG: Failed to fetch roles. HTTP ${res.status}</p>`;
      console.error('Failed to fetch memberOf:', res.status, res.statusText);
    }
  } catch (error) {
    console.error('Debug roles failed:', error);
    document.getElementById('groupsList').innerHTML = `<p style="color:red">DEBUG: Error fetching roles: ${error.message}</p>`;
  }
}

// Helper: Check if user is already a member of a group
async function checkGroupMembership(userId, groupId, token) {
  try {
    const res = await fetch(`https://graph.microsoft.com/v1.0/groups/${groupId}/members/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // If the request succeeds, user is a member
    return res.ok;
  } catch (error) {
    // If there's an error, assume user is not a member
    return false;
  }
}

// Helper: Add user to group
async function addUserToGroup(userId, groupId, token) {
  try {
    const res = await fetch(`https://graph.microsoft.com/v1.0/groups/${groupId}/members/$ref`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
      })
    });
    
    if (!res.ok) {
      let errorDetails = `${res.status}: ${res.statusText}`;
      try {
        const errorData = await res.json();
        if (errorData.error && errorData.error.message) {
          // Handle specific common error cases
          if (errorData.error.message.includes("already exist")) {
            errorDetails = "User is already a member of this group";
          } else if (errorData.error.message.includes("Forbidden")) {
            errorDetails = "Access denied - insufficient permissions";
          } else if (errorData.error.message.includes("not found")) {
            errorDetails = "Group or user not found";
          } else {
            errorDetails += ` - ${errorData.error.message}`;
          }
        }
      } catch (e) {
        // If JSON parsing fails, try text
        try {
          const errorText = await res.text();
          if (errorText) {
            errorDetails += ` - ${errorText}`;
          }
        } catch (e2) {
          // If both fail, keep the basic status
        }
      }
      console.error(`Failed to add user to group ${groupId}:`, res.status, res.statusText, errorDetails);
      return { success: false, error: errorDetails };
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error adding user to group ${groupId}:`, error);
    return { success: false, error: error.message };
  }
}

// Helper: Authenticate with Microsoft and get access token
async function authenticateWithMicrosoft() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError || !token) {
        reject(new Error('Authentication failed'));
      } else {
        resolve(token);
      }
    });
  });
}

// Helper: Get user ID by email/UPN
async function getUserIdByEmail(email, token) {
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('User not found');
  const user = await res.json();
  return user.id;
}

// Helper: Get user's group memberships (filtered for manageable groups)
async function getUserGroups(userId, token) {
  // Fetch groups with additional properties to determine if they're manageable
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}/memberOf?$select=id,displayName,groupTypes,mailEnabled,securityEnabled,membershipRule,membershipRuleProcessingState`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch groups');
  const data = await res.json();
  
  // Filter for groups that support manual membership management
  const allGroups = (data.value || []).filter(obj => obj['@odata.type'] === '#microsoft.graph.group');
  
  const manageableGroups = allGroups.filter(group => {
    // Exclude dynamic groups (have membership rules)
    if (group.membershipRule && group.membershipRuleProcessingState === 'On') {
      console.log(`Filtered out dynamic group: ${group.displayName}`);
      return false;
    }
    
    // Exclude mail-enabled security groups (they often have special restrictions)
    if (group.mailEnabled && group.securityEnabled) {
      console.log(`Filtered out mail-enabled security group: ${group.displayName}`);
      return false;
    }
    
    // Exclude Office 365 distribution groups (mail-enabled but not Unified groups)
    // These are legacy distribution lists that don't support manual membership management
    if (group.mailEnabled && (!group.groupTypes || !group.groupTypes.includes('Unified'))) {
      console.log(`Filtered out distribution group: ${group.displayName}`);
      return false;
    }
    
    // Log remaining manageable groups for debugging
    console.log(`Including manageable group: ${group.displayName}`, {
      groupTypes: group.groupTypes,
      mailEnabled: group.mailEnabled,
      securityEnabled: group.securityEnabled
    });
    
    return true;
  });
  
  console.log(`Groups filtered: ${allGroups.length} total, ${manageableGroups.length} manageable`);
  return manageableGroups;
}

// Helper: Render groups as checkboxes
function renderGroups(groups) {
  if (!groups.length) {
    document.getElementById('groupsList').innerHTML = '<p>No manageable groups found for this user.</p><p style="font-size:12px;color:#b3c7e6;margin-top:8px;">Note: Dynamic groups, mail-enabled security groups, and distribution groups are excluded as they don\'t support manual membership management.</p>';
    return;
  }
  
  const html = groups.map(g => {
    // Determine group type for display
    let groupType = '';
    if (g.groupTypes && g.groupTypes.includes('Unified')) {
      groupType = g.mailEnabled ? ' (Office 365 Group)' : ' (Office 365 Team)';
    } else if (g.securityEnabled && !g.mailEnabled) {
      groupType = ' (Security Group)';
    } else if (g.mailEnabled) {
      groupType = ' (Mail Group)';
    }
    
    return `<div><input type="checkbox" class="group-checkbox" value="${g.id}" checked> ${g.displayName}${groupType}</div>`;
  }).join('');
  
  document.getElementById('groupsList').innerHTML = html + 
    `<p style="font-size:12px;color:#b3c7e6;margin-top:8px;">Showing ${groups.length} manageable groups. Dynamic and distribution groups are excluded.</p>`;
}
