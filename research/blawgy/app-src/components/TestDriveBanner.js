import React, { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth, markIntentionalSignOut } from '../firebaseConfig';
import apiClient from '../utils/apiClient';

// Slim fixed warning banner shown ONLY when the currently logged-in user is
// a test account (spawned from the admin Test Accounts tab). It makes the
// temporary "test drive" state obvious the same way an impersonation banner
// does, and gives a one-click way back out to the login screen.
//
// Self-contained: fetches /me on mount, no context changes. Renders null
// when /me fails or the user is not a test account, and cleans up any stale
// 'testDriveActive' localStorage key in that case.
const TestDriveBanner = () => {
  const [testEmail, setTestEmail] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await apiClient.get('/me');
        const data = res.data || {};
        if (cancelled) return;
        if (data.isTestAccount) {
          setTestEmail(data.email || 'test account');
        } else {
          setTestEmail(null);
          localStorage.removeItem('testDriveActive');
        }
      } catch (err) {
        if (cancelled) return;
        setTestEmail(null);
        localStorage.removeItem('testDriveActive');
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const endTestDrive = async () => {
    try {
      if (auth) {
        markIntentionalSignOut();
        await signOut(auth);
      }
    } catch (err) {
      // Even if sign-out throws, still clear local state and bounce to login.
    }
    localStorage.removeItem('testDriveActive');
    window.location.href = '/login';
  };

  if (!testEmail) return null;

  return (
    <div
      data-testid="test-drive-banner"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-3 bg-amber-400 text-black text-sm font-medium px-4 py-2 shadow-md"
    >
      <span className="truncate">
        Test drive: {testEmail}. Your admin session ended when this began.
      </span>
      <button
        type="button"
        data-testid="end-test-drive"
        onClick={endTestDrive}
        className="shrink-0 rounded bg-black/80 text-white px-3 py-1 text-xs font-semibold hover:bg-black transition-colors"
      >
        End test drive
      </button>
    </div>
  );
};

export default TestDriveBanner;
