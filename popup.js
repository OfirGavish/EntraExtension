// --- MSAL.js Authentication logic ---
const signInBtn = document.getElementById('signInBtn');
const authStatus = document.getElementById('authStatus');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const clientIdInput = document.getElementById('clientIdInput');
const redirectUriInput = document.getElementById('redirectUriInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsStatus = document.getElementById('settingsStatus');
let isSignedIn = false;
let msalInstance = null;
let msalAccount = null;
let msToken = null;
let msalConfig = null;

// Load settings from storage and initialize MSAL config
async function loadSettingsAndInitMsal() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['clientId', 'redirectUri'], (result) => {
      const clientId = result.clientId || 'c9b8d6c6-0ef6-4c2e-8f7b-7a9e8a7d8b01';
      const redirectUri = result.redirectUri || 'https://login.microsoftonline.com/common/oauth2/nativeclient';
      msalConfig = {
        auth: {
          clientId,
          authority: 'https://login.microsoftonline.com/common',
          redirectUri
        },
        cache: {
          cacheLocation: 'localStorage',
          storeAuthStateInCookie: false
        }
      };
      clientIdInput.value = clientId;
      redirectUriInput.value = redirectUri;
      resolve();
    });
  });
}

const msalRequest = {
  scopes: [
    'User.Read',
    'User.ReadBasic.All',
    'User.Read.All',
    'Group.Read.All',
    'GroupMember.ReadWrite.All'
  ],
  prompt: 'select_account'
};

function updateAuthStatus() {
  if (isSignedIn && msalAccount) {
    authStatus.textContent = `Signed in as ${msalAccount.username}`;
    authStatus.style.color = '#4ea1ff';
    signInBtn.style.display = 'none';
  } else {
    authStatus.textContent = 'Not signed in';
    authStatus.style.color = 'orange';
    signInBtn.style.display = 'block';
  }
}

async function msalSignIn() {
  try {
    const loginResponse = await msalInstance.loginPopup(msalRequest);
    msalAccount = loginResponse.account;
    isSignedIn = true;
    updateAuthStatus();
    return msalAccount;
  } catch (e) {
    isSignedIn = false;
    updateAuthStatus();
    throw e;
  }
}

async function getMsalToken() {
  if (!isSignedIn || !msalAccount) throw new Error('Not signed in');
  try {
    const response = await msalInstance.acquireTokenSilent({ ...msalRequest, account: msalAccount });
    msToken = response.accessToken;
    return msToken;
  } catch (e) {
    // Fallback to interactive
    const response = await msalInstance.acquireTokenPopup(msalRequest);
    msToken = response.accessToken;
    return msToken;
  }
}


window.addEventListener('DOMContentLoaded', async () => {
  await loadSettingsAndInitMsal();
  msalInstance = new msal.PublicClientApplication(msalConfig);
  const accounts = msalInstance.getAllAccounts();
  if (accounts && accounts.length > 0) {
    msalAccount = accounts[0];
    isSignedIn = true;
  }
  updateAuthStatus();
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
  const redirectUri = redirectUriInput.value.trim();
  if (!clientId || !redirectUri) {
    settingsStatus.textContent = 'Client ID and Redirect URI are required.';
    settingsStatus.style.color = 'orange';
    return;
  }
  chrome.storage.local.set({ clientId, redirectUri }, async () => {
    settingsStatus.textContent = 'Settings saved! Reloading authentication...';
    settingsStatus.style.color = 'green';
    // Re-initialize MSAL with new config
    await loadSettingsAndInitMsal();
    msalInstance = new msal.PublicClientApplication(msalConfig);
    msalAccount = null;
    isSignedIn = false;
    updateAuthStatus();
    setTimeout(() => { settingsModal.style.display = 'none'; }, 800);
  });
});

signInBtn.addEventListener('click', async () => {
  try {
    await msalSignIn();
  } catch (e) {
    authStatus.textContent = 'Sign-in failed';
    authStatus.style.color = 'red';
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
    const token = await getMsalToken();
    const users = await searchUsers(query, token);
    renderUserDropdown(users, sourceUserDropdown, sourceUserInput);
  } catch (e) {
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
    const token = await getMsalToken();
    const users = await searchUsers(query, token);
    renderUserDropdown(users, targetUserDropdown, targetUserInput);
  } catch (e) {
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
    const token = await getMsalToken();
    const isAdmin = await checkIfAdmin(token);
    if (!isAdmin) {
      document.getElementById('groupsList').innerHTML = '<p style="color:red">You must be an admin to use this extension.</p>';
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
    const token = await getMsalToken();
    const isAdmin = await checkIfAdmin(token);
    if (!isAdmin) {
      document.getElementById('status').textContent = 'You must be an admin to use this extension.';
      document.getElementById('status').style.color = 'red';
      return;
    }
    const targetUserId = await getUserIdByEmail(targetUser, token);
    let successCount = 0, failCount = 0;
    for (const cb of checked) {
      const groupId = cb.value;
      const ok = await addUserToGroup(targetUserId, groupId, token);
      if (ok) successCount++; else failCount++;
    }
    document.getElementById('status').textContent = `Done. ${successCount} group(s) copied, ${failCount} failed.`;
    document.getElementById('status').style.color = failCount ? 'orange' : 'green';
  } catch (e) {
    let msg = e.message || e.toString();
    if (msg.includes('Insufficient privileges')) msg = 'You do not have permission to add users to groups.';
    document.getElementById('status').textContent = `Error: ${msg}`;
    document.getElementById('status').style.color = 'red';
  }
});

// Helper: Check if current user is an admin
async function checkIfAdmin(token) {
  // Check for Directory role (Company Administrator)
  const res = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return false;
  const data = await res.json();
  // Company Administrator role has well-known objectId: 62e90394-69f5-4237-9190-012177145e10
  return (data.value || []).some(obj => obj['@odata.type'] === '#microsoft.graph.directoryRole' && obj.id === '62e90394-69f5-4237-9190-012177145e10');
}

// Helper: Add user to group
async function addUserToGroup(userId, groupId, token) {
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
  return res.ok;
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

// Helper: Get user's group memberships
async function getUserGroups(userId, token) {
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}/memberOf`,
    { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch groups');
  const data = await res.json();
  // Filter only group objects
  return (data.value || []).filter(obj => obj['@odata.type'] === '#microsoft.graph.group');
}

// Helper: Render groups as checkboxes
function renderGroups(groups) {
  if (!groups.length) {
    document.getElementById('groupsList').innerHTML = '<p>No groups found.</p>';
    return;
  }
  const html = groups.map(g =>
    `<div><input type="checkbox" class="group-checkbox" value="${g.id}" checked> ${g.displayName}</div>`
  ).join('');
  document.getElementById('groupsList').innerHTML = html;
}
}
