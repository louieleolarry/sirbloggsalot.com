import React, { useState, useEffect, useCallback } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import apiClient from '../../utils/apiClient';
import { auth } from '../../firebaseConfig';

// Plan + billing options mirror CompLinksTab so the admin UI feels
// consistent. Default to Pro+ Monthly per Adam's stated preference for
// the test-account spawn flow (matches the most common subscriber).
const PLAN_OPTIONS = [
  { value: 'seo_pro', label: 'Pro+' },
  { value: 'growth', label: 'Pro' },
];

const BILLING_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

const TestAccountsTab = ({ adminEmail }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Spawn-form state
  const [plan, setPlan] = useState('seo_pro');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [spawning, setSpawning] = useState(false);
  const [spawnError, setSpawnError] = useState(null);

  // Most-recently-spawned credentials, surfaced prominently so Adam can
  // paste them into the login form without scrolling.
  const [latest, setLatest] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Per-row in-flight tracking (keyed by email) so we can disable the
  // Test drive / Delete buttons on the account that's mid-request.
  const [busyEmail, setBusyEmail] = useState(null);
  // Inline per-row error, keyed by email.
  const [rowError, setRowError] = useState({});
  // Which action is chained after a create ('spawn' = fallback creds path,
  // 'spawnAndDrive' = instant swap). Drives the button spinner labels.
  const [createMode, setCreateMode] = useState(null);

  const load = useCallback(async () => {
    if (!adminEmail) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/admin/test-accounts', {
        params: { adminEmail },
      });
      if (res.data.success) {
        setAccounts(res.data.testAccounts || []);
      } else {
        setError(res.data.message || 'Failed to load test accounts');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [adminEmail]);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch a Firebase custom login token for a test account and instantly
  // become that user. On success we stash a marker in localStorage (so the
  // TestDriveBanner can flag the temporary state), sign in with the custom
  // token, and hard-navigate to onboarding so the app boots fresh as the
  // test user.
  const enterTestDrive = async (email) => {
    const res = await apiClient.post('/admin/test-accounts/login-token', {
      adminEmail,
      email,
    });
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to create login token');
    }
    localStorage.setItem(
      'testDriveActive',
      JSON.stringify({
        testEmail: res.data.email || email,
        adminEmail,
        startedAt: new Date().toISOString(),
      })
    );
    // Drop the admin's selected site so the test session doesn't boot pointed
    // at a site the test user doesn't own (surfaces as "Site not found" 404s
    // until onboarding overwrites it).
    localStorage.removeItem('currentSite');
    await signInWithCustomToken(auth, res.data.token);
    window.location.href = '/onboarding';
  };

  const handleSpawn = async (e, { drive = false } = {}) => {
    e.preventDefault();
    setSpawnError(null);
    setSpawning(true);
    setCreateMode(drive ? 'spawnAndDrive' : 'spawn');
    try {
      const res = await apiClient.post('/admin/test-accounts', {
        adminEmail,
        plan,
        billingPeriod,
      });
      if (res.data.success) {
        if (drive) {
          // Chain straight into the instant swap; on success this navigates
          // away so we never fall through to the credentials fallback.
          await enterTestDrive(res.data.email);
          return;
        }
        setLatest({
          email: res.data.email,
          password: res.data.password,
          signInUrl: res.data.signInUrl,
          planName: res.data.planName,
        });
        await load();
      } else {
        setSpawnError(res.data.message || 'Failed to spawn test account');
      }
    } catch (err) {
      setSpawnError(err.response?.data?.message || err.message);
    } finally {
      setSpawning(false);
      setCreateMode(null);
    }
  };

  const handleTestDrive = async (email) => {
    setBusyEmail(email);
    setRowError((prev) => ({ ...prev, [email]: null }));
    try {
      await enterTestDrive(email);
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [email]: err.response?.data?.message || err.message,
      }));
      setBusyEmail(null);
    }
  };

  const handleDelete = async (email) => {
    const ok = window.confirm(
      `Delete ${email} and all its sites/articles? This cannot be undone.`
    );
    if (!ok) return;
    setBusyEmail(email);
    setRowError((prev) => ({ ...prev, [email]: null }));
    try {
      const res = await apiClient.delete('/admin/test-accounts', {
        data: { adminEmail, email },
      });
      if (res.data.success) {
        setAccounts((prev) => prev.filter((a) => a.email !== email));
      } else {
        setRowError((prev) => ({
          ...prev,
          [email]: res.data.message || 'Failed to delete test account',
        }));
      }
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [email]: err.response?.data?.message || err.message,
      }));
    } finally {
      setBusyEmail(null);
    }
  };

  const copy = async (value, field) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(
        () => setCopiedField((curr) => (curr === field ? null : curr)),
        1500
      );
    } catch (err) {
      window.prompt(`Copy ${field}:`, value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Spawn form */}
      <form
        onSubmit={handleSpawn}
        className="bg-white rounded-lg shadow p-4 space-y-3 border border-gray-100"
      >
        <h3 className="font-semibold text-gray-900">Spawn a test account</h3>
        <p className="text-sm text-gray-500">
          Creates a Firebase user, comps them onto the chosen plan, and stamps
          a single-use comp slug — paste the returned credentials into the
          login form to dogfood signup/onboarding/dashboard.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="p-2 border border-gray-200 rounded"
            aria-label="Plan"
          >
            {PLAN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={billingPeriod}
            onChange={(e) => setBillingPeriod(e.target.value)}
            className="p-2 border border-gray-200 rounded"
            aria-label="Billing period"
          >
            {BILLING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            type="submit"
            data-testid="test-accounts-spawn"
            disabled={spawning}
            className="bg-white text-primary border border-primary px-4 py-2 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {spawning && createMode === 'spawn' ? 'Spawning...' : 'Spawn test account'}
          </button>
        </div>
        <button
          type="button"
          data-testid="test-accounts-spawn-drive"
          onClick={(e) => handleSpawn(e, { drive: true })}
          disabled={spawning}
          className="w-full bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {spawning && createMode === 'spawnAndDrive'
            ? 'Creating and starting test drive...'
            : 'Create and test drive'}
        </button>
        {spawnError && (
          <p className="text-sm text-red-600">{spawnError}</p>
        )}
      </form>

      {/* Latest credentials banner */}
      {latest && (
        <div
          data-testid="test-accounts-latest"
          className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2"
        >
          <h4 className="font-semibold text-green-900">
            New test account ready ({latest.planName})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-green-800">Email</p>
              <div className="flex items-center gap-2">
                <code
                  data-testid="test-accounts-latest-email"
                  className="text-sm bg-white px-2 py-1 rounded border border-green-200 break-all flex-1"
                >
                  {latest.email}
                </code>
                <button
                  type="button"
                  data-testid="test-accounts-copy-email"
                  onClick={() => copy(latest.email, 'email')}
                  className="text-xs px-2 py-1 rounded border border-green-200 bg-white hover:bg-green-100"
                >
                  {copiedField === 'email' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-green-800">Password</p>
              <div className="flex items-center gap-2">
                <code
                  data-testid="test-accounts-latest-password"
                  className="text-sm bg-white px-2 py-1 rounded border border-green-200 break-all flex-1"
                >
                  {latest.password}
                </code>
                <button
                  type="button"
                  data-testid="test-accounts-copy-password"
                  onClick={() => copy(latest.password, 'password')}
                  className="text-xs px-2 py-1 rounded border border-green-200 bg-white hover:bg-green-100"
                >
                  {copiedField === 'password' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
          <div className="pt-1">
            <a
              href={latest.signInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-800 underline"
            >
              Open sign-in page
            </a>
          </div>
        </div>
      )}

      {/* Previously spawned accounts */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900">Previously spawned</h3>
        {loading && <p className="text-gray-500 text-sm">Loading test accounts...</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {!loading && !error && accounts.length === 0 && (
          <p className="text-gray-500 text-sm">No test accounts yet. Spawn your first one above.</p>
        )}
        {accounts.map((acct) => (
          <div
            key={acct.email}
            className="bg-white rounded-lg shadow p-4 border border-gray-100"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm text-gray-900 break-all">{acct.email}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {acct.subscriptionActive ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
                      Subscription active{acct.subscriptionTier ? ` (${acct.subscriptionTier})` : ''}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      No active subscription
                    </span>
                  )}
                  {acct.hasSite ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      Site: {acct.site || 'yes'}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      No site
                    </span>
                  )}
                  {acct.pendingCompSlug && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      Pending comp
                    </span>
                  )}
                </div>
                {acct.createdAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Created {new Date(acct.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  data-testid={`test-drive-${acct.email}`}
                  onClick={() => handleTestDrive(acct.email)}
                  disabled={busyEmail === acct.email}
                  className="bg-primary text-white text-sm px-3 py-1.5 rounded hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {busyEmail === acct.email ? 'Working...' : 'Test drive'}
                </button>
                <button
                  type="button"
                  data-testid={`delete-test-account-${acct.email}`}
                  onClick={() => handleDelete(acct.email)}
                  disabled={busyEmail === acct.email}
                  className="border border-red-200 text-red-700 text-sm px-3 py-1.5 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
            {rowError[acct.email] && (
              <p className="text-sm text-red-600 mt-2">{rowError[acct.email]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestAccountsTab;
