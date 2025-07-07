// PKCE (Proof Key for Code Exchange) helper functions
// Used for secure OAuth 2.0 authorization code flow

/**
 * Generate a cryptographically secure random string for PKCE
 * @param {number} length - Length of the random string
 * @returns {string} Base64URL encoded random string
 */
export function randomBase64Url(length) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Create SHA256 hash and encode as Base64URL
 * @param {string} plain - Plain text to hash
 * @returns {Promise<string>} Base64URL encoded SHA256 hash
 */
export async function sha256Base64Url(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Encode bytes as Base64URL (URL-safe base64 without padding)
 * @param {Uint8Array} bytes - Bytes to encode
 * @returns {string} Base64URL encoded string
 */
function base64UrlEncode(bytes) {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
