import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebaseConfig';

/**
 * In-place re-auth for dead sessions. Shown by App.js when an API call 401s and
 * the Firebase session can't be refreshed (signed out in another tab, revoked
 * refresh token — common for users who hop between Google accounts). The page
 * underneath keeps ALL its state: after sign-in the failed request is retried
 * by the apiClient interceptor, so an unsaved settings form just... saves.
 *
 * `onResolve(true)` = signed back in, retry the request; `onResolve(false)` =
 * user declined, let the original error surface.
 */
const SessionExpiredModal = ({ onResolve }) => {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // Keep the legacy localStorage token in sync (copyClient/ArticleBuilder
      // still read it), mirroring LoginPage.
      const token = await result.user.getIdToken();
      localStorage.setItem('authToken', token);
      onResolve(true);
    } catch (err) {
      console.error('Re-auth failed:', err);
      setError('Sign-in did not complete. Please try again.');
      setSigningIn(false);
    }
  };

  const handleGoToLogin = () => {
    onResolve(false);
    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          You've been signed out
        </h3>
        <p className="text-gray-600 mb-1">
          This can happen after signing in or out in another tab. Sign back in to
          pick up right where you left off.
        </p>
        <p className="text-gray-600 mb-6">
          Your unsaved changes are still here.
        </p>
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleGoToLogin}
            disabled={signingIn}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Go to login page
          </button>
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black rounded-md transition-colors disabled:opacity-60"
          >
            {signingIn ? 'Signing in...' : 'Continue with Google'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredModal;
