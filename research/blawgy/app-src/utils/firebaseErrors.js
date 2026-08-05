/**
 * Map Firebase Auth error codes to plain-language copy.
 *
 * Firebase's error.message strings are developer-facing ("Firebase:
 * Error (auth/invalid-credential).") and must never be shown to users.
 * Every auth catch block should run the error through this helper.
 */

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
  'auth/invalid-credential': "That email and password don't match. Check them and try again.",
  'auth/wrong-password': "That email and password don't match. Check them and try again.",
  'auth/user-not-found': "We couldn't find an account with that email. Check the address or sign up.",
  'auth/weak-password': 'Please choose a stronger password. It needs at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/invalid-email': "That doesn't look like a valid email address.",
  'auth/user-disabled': 'This account has been disabled. Email adam@blawgy.com and we will sort it out.',
  'auth/network-request-failed': "We couldn't reach the server. Check your connection and try again.",
  'auth/popup-closed-by-user': 'The Google sign-in window was closed before finishing. Please try again.',
  'auth/cancelled-popup-request': 'The Google sign-in window was closed before finishing. Please try again.',
  'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow popups for this site and try again.',
  'auth/invalid-action-code': 'That sign-in link has expired or was already used. Please request a new one.',
  'auth/expired-action-code': 'That sign-in link has expired. Please request a new one.',
};

const GENERIC_MESSAGE = 'Something went wrong. Please try again, or email adam@blawgy.com if it keeps happening.';

/**
 * @param {unknown} error   The caught error (usually a FirebaseError with .code).
 * @param {string} [fallback]  Optional custom fallback for unmapped codes.
 * @returns {string} Plain copy safe to show a user. Never the raw error.message.
 */
export function friendlyAuthError(error, fallback = GENERIC_MESSAGE) {
  const code = error && typeof error === 'object' ? error.code : null;
  return (code && AUTH_ERROR_MESSAGES[code]) || fallback;
}

export default friendlyAuthError;
