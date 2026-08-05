import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../utils/apiClient';

// Build a copy-pasteable signup URL for a given comp slug. Uses
// window.location.origin so it works in dev, preview, and prod.
const buildSignupUrl = (slug) =>
  `${window.location.origin}/signup?comp=${encodeURIComponent(slug)}`;

const PLAN_OPTIONS = [
  { value: 'growth', label: 'Pro' },
  { value: 'seo_pro', label: 'Pro+' },
];

const BILLING_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

const CompLinksTab = ({ adminEmail }) => {
  const [compLinks, setCompLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedSlug, setCopiedSlug] = useState(null);

  // Create-form state
  const [newName, setNewName] = useState('');
  const [newPlan, setNewPlan] = useState('seo_pro');
  const [newBilling, setNewBilling] = useState('annual');
  const [newMaxUses, setNewMaxUses] = useState('0');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const load = useCallback(async () => {
    if (!adminEmail) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/admin/comp-links', {
        params: { adminEmail },
      });
      if (res.data.success) {
        setCompLinks(res.data.compLinks || []);
      } else {
        setError(res.data.message || 'Failed to load comp links');
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

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) {
      setCreateError('Name is required');
      return;
    }
    const maxUsesNum = Number(newMaxUses);
    if (!Number.isFinite(maxUsesNum) || maxUsesNum < 0) {
      setCreateError('Max uses must be 0 or higher (0 means unlimited)');
      return;
    }
    setCreating(true);
    try {
      const res = await apiClient.post('/admin/comp-links', {
        adminEmail,
        name: newName.trim(),
        plan: newPlan,
        billingPeriod: newBilling,
        maxUses: maxUsesNum,
        enabled: true,
      });
      if (res.data.success) {
        setNewName('');
        setNewPlan('seo_pro');
        setNewBilling('annual');
        setNewMaxUses('0');
        await load();
      } else {
        setCreateError(res.data.message || 'Failed to create comp link');
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (link) => {
    try {
      await apiClient.patch(`/admin/comp-links/${link.id}`, {
        adminEmail,
        enabled: !link.enabled,
      });
      await load();
    } catch (err) {
      console.error('Failed to toggle comp link:', err);
    }
  };

  const handleDelete = async (link) => {
    const confirmed = window.confirm(`Delete comp link "${link.name}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await apiClient.delete(`/admin/comp-links/${link.id}`, {
        params: { adminEmail },
      });
      await load();
    } catch (err) {
      console.error('Failed to delete comp link:', err);
    }
  };

  const handleCopyUrl = async (link) => {
    const url = buildSignupUrl(link.slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(link.slug);
      setTimeout(() => setCopiedSlug((curr) => (curr === link.slug ? null : curr)), 1500);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      window.prompt('Copy this URL:', url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create new */}
      <form
        onSubmit={handleCreate}
        className="bg-white rounded-lg shadow p-4 space-y-3 border border-gray-100"
      >
        <h3 className="font-semibold text-gray-900">Create a new comp link</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Name (e.g. Marcus VIP)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="md:col-span-2 p-2 border border-gray-200 rounded"
          />
          <select
            value={newPlan}
            onChange={(e) => setNewPlan(e.target.value)}
            className="p-2 border border-gray-200 rounded"
          >
            {PLAN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={newBilling}
            onChange={(e) => setNewBilling(e.target.value)}
            className="p-2 border border-gray-200 rounded"
          >
            {BILLING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            placeholder="Max uses (0 = unlimited)"
            value={newMaxUses}
            onChange={(e) => setNewMaxUses(e.target.value)}
            className="p-2 border border-gray-200 rounded"
          />
        </div>
        {createError && (
          <p className="text-sm text-red-600">{createError}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creating}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create comp link'}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="space-y-2">
        {loading && <p className="text-gray-500 text-sm">Loading comp links...</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {!loading && !error && compLinks.length === 0 && (
          <p className="text-gray-500 text-sm">No comp links yet. Create your first one above.</p>
        )}
        {compLinks.map((link) => {
          const usageLabel = link.maxUses > 0
            ? `${link.usedCount} / ${link.maxUses}`
            : `${link.usedCount} / unlimited`;
          const isExhausted = link.maxUses > 0 && link.usedCount >= link.maxUses;
          return (
            <div
              key={link.id}
              className="bg-white rounded-lg shadow p-4 border border-gray-100"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 truncate">{link.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      {link.planName}
                    </span>
                    {!link.enabled && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                        Disabled
                      </span>
                    )}
                    {isExhausted && link.enabled && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        Exhausted
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 break-all">
                    {buildSignupUrl(link.slug)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Usage: {usageLabel}
                    {link.createdBy && (
                      <> &middot; Created by {link.createdBy}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(link)}
                    className="text-xs px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50"
                  >
                    {copiedSlug === link.slug ? 'Copied' : 'Copy URL'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(link)}
                    className={`text-xs px-3 py-1.5 rounded border ${
                      link.enabled
                        ? 'border-gray-200 hover:bg-gray-50'
                        : 'border-green-200 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    {link.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(link)}
                    className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompLinksTab;
