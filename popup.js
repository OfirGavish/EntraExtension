// --- Debounce function ---
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// --- Recursive function to handle nested groups ---
async function resolveNestedGroups(groupId, token, resolvedGroups = new Set()) {
  if (resolvedGroups.has(groupId)) {
    return resolvedGroups; // Avoid circular references
  }
  resolvedGroups.add(groupId);

  try {
    const response = await fetch(`https://graph.microsoft.com/v1.0/groups/${groupId}/transitiveMemberOf`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (data.value) {
      for (const nestedGroup of data.value) {
        await resolveNestedGroups(nestedGroup.id, token, resolvedGroups);
      }
    }
  } catch (error) {
    console.error('Error resolving nested groups:', error);
  }

  return resolvedGroups;
}

// --- Updated user search with debounce ---
sourceUserInput.addEventListener(
  'input',
  debounce(async () => {
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
  }, 300)
);

targetUserInput.addEventListener(
  'input',
  debounce(async () => {
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
  }, 300)
);