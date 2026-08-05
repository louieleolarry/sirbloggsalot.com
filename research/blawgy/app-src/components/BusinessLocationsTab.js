import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  LoaderIcon,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
  X
} from 'lucide-react';
import apiClient from '../utils/apiClient';
import { useImpersonation } from '../contexts/ImpersonationContext';

// Per-site multi-location manager. The Pages tab also has a chip selector
// for picking which location a generation targets — this tab is the canonical
// place to add / edit / delete / promote locations, and is the only entry
// point WordPress users get for managing more than one location.
//
// Stays backwards-compatible with the legacy single-profile shape on the
// `sites` record: the model layer keeps `businessProfile` in sync with the
// primary location, so older read paths see no change.
const BusinessLocationsTab = () => {
  const { user, siteSettings, currentSite, impersonatedSite } = useImpersonation();

  const activeSite = impersonatedSite?.site || currentSite?.site || siteSettings?.site || user?.site;
  const activeEmail = impersonatedSite?.email || currentSite?.email || siteSettings?.email || user?.email;

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null); // location id being edited
  const [addingNew, setAddingNew] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [primaryingId, setPrimaryingId] = useState(null);

  const editing = editingId !== null || addingNew;

  const load = async () => {
    if (!activeSite) return;
    setLoading(true);
    setError('');
    try {
      const resp = await apiClient.get('/api/pages/business-profiles', {
        params: { site: activeSite, email: activeEmail }
      });
      setProfiles(Array.isArray(resp.data?.profiles) ? resp.data.profiles : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load business locations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSite, activeEmail]);

  const setField = (field, value) => setForm(prev => ({ ...(prev || {}), [field]: value }));
  const setServiceArea = (raw) => {
    const arr = String(raw || '')
      .split(/[\n,]+/)
      .map(t => t.trim())
      .filter(Boolean);
    setForm(prev => ({ ...(prev || {}), serviceArea: arr }));
  };

  const startEdit = (loc) => {
    setEditingId(loc.id);
    setAddingNew(false);
    setForm({ ...loc });
    setError('');
  };

  const startAdd = async () => {
    setEditingId(null);
    setAddingNew(true);
    setError('');
    // Auto-detect to prefill if this is the first location.
    if (profiles.length === 0) {
      setDetecting(true);
      try {
        const det = await apiClient.post('/api/pages/business-profile/detect', {
          site: activeSite, email: activeEmail
        });
        setForm(det.data?.detected || {});
      } catch {
        setForm({});
      } finally {
        setDetecting(false);
      }
    } else {
      setForm({});
    }
  };

  const cancel = () => {
    setEditingId(null);
    setAddingNew(false);
    setForm({});
    setError('');
  };

  const reDetect = async () => {
    setDetecting(true);
    setError('');
    try {
      const det = await apiClient.post('/api/pages/business-profile/detect', {
        site: activeSite, email: activeEmail
      });
      setForm(prev => ({ ...(det.data?.detected || {}), ...(prev || {}) }));
    } catch {
      setError('Could not auto-detect. Enter details manually.');
    } finally {
      setDetecting(false);
    }
  };

  const save = async () => {
    const f = form || {};
    if (!f.city && !f.address && !f.businessName) {
      setError('Add at least a business name, city, or address.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        const resp = await apiClient.put(`/api/pages/business-profiles/${editingId}`, {
          site: activeSite, email: activeEmail, profile: f
        });
        const updated = resp.data?.profile;
        setProfiles(prev => prev.map(p => (p.id === editingId ? { ...p, ...updated } : p)));
      } else {
        const resp = await apiClient.post('/api/pages/business-profiles', {
          site: activeSite, email: activeEmail, profile: f
        });
        const created = resp.data?.profile;
        if (created?.id) setProfiles(prev => [...prev, created]);
      }
      cancel();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save location.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this location? This cannot be undone.')) return;
    setDeletingId(id);
    setError('');
    try {
      await apiClient.delete(`/api/pages/business-profiles/${id}`, {
        params: { site: activeSite, email: activeEmail }
      });
      setProfiles(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not delete location.');
    } finally {
      setDeletingId(null);
    }
  };

  const makePrimary = async (id) => {
    setPrimaryingId(id);
    setError('');
    try {
      await apiClient.post(`/api/pages/business-profiles/${id}/primary`, {
        site: activeSite, email: activeEmail
      });
      setProfiles(prev => prev.map(p => ({ ...p, isPrimary: p.id === id })));
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not change primary location.');
    } finally {
      setPrimaryingId(null);
    }
  };

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return (a.label || '').localeCompare(b.label || '');
    });
  }, [profiles]);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Business locations</h2>
        <p className="text-sm text-gray-500 mt-1">
          The Pages generator and Write use these as real-world facts. On the Pages tab you pick which location a batch of pages targets. Articles include all of them so the model has accurate addresses, phone numbers, and service areas to draw on.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-6 rounded-xl bg-white border border-gray-200 flex items-center gap-2 text-sm text-gray-500">
          <LoaderIcon className="w-4 h-4 animate-spin" />
          Loading locations...
        </div>
      ) : (
        <>
          {sortedProfiles.length === 0 && !editing && (
            <div className="p-6 rounded-xl bg-white border border-gray-200 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <p className="text-sm text-gray-700 mb-1">No locations yet</p>
              <p className="text-xs text-gray-500 mb-4">
                Add your first business location so generated pages and articles use accurate details.
              </p>
              <button
                type="button"
                onClick={startAdd}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add a location
              </button>
            </div>
          )}

          {sortedProfiles.length > 0 && (
            <div className="space-y-2 mb-4">
              {sortedProfiles.map((loc) => {
                const isEditingThis = editingId === loc.id;
                if (isEditingThis) return null;
                return (
                  <div
                    key={loc.id}
                    className="p-4 rounded-xl bg-white border border-gray-200 flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {loc.label || loc.city || loc.businessName || 'Location'}
                        </p>
                        {loc.isPrimary && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            <Star className="w-2.5 h-2.5" /> Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">
                        {[loc.address, [loc.city, loc.state].filter(Boolean).join(', '), loc.postalCode].filter(Boolean).join(' · ') || '—'}
                      </p>
                      {loc.phone && (
                        <p className="text-xs text-gray-500 mt-0.5">{loc.phone}</p>
                      )}
                      {Array.isArray(loc.serviceArea) && loc.serviceArea.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-medium text-gray-600">Service area:</span>{' '}
                          {loc.serviceArea.slice(0, 8).join(', ')}
                          {loc.serviceArea.length > 8 && `, +${loc.serviceArea.length - 8} more`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!loc.isPrimary && (
                        <button
                          type="button"
                          onClick={() => makePrimary(loc.id)}
                          disabled={primaryingId === loc.id}
                          className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 inline-flex items-center gap-1 disabled:opacity-50"
                          title="Make primary"
                        >
                          {primaryingId === loc.id
                            ? <LoaderIcon className="w-3 h-3 animate-spin" />
                            : <Star className="w-3 h-3" />}
                          Set primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(loc)}
                        className="text-xs text-gray-700 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(loc.id)}
                        disabled={deletingId === loc.id}
                        className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 inline-flex items-center gap-1 disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === loc.id
                          ? <LoaderIcon className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {editing ? (
            <div className="rounded-xl bg-white border border-emerald-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-emerald-50/40 border-b border-emerald-100 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {editingId ? 'Edit location' : 'Add a location'}
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {detecting
                      ? 'Detecting from your site...'
                      : 'These details are used verbatim on every generated page so your real business info stays accurate.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cancel}
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                  aria-label="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Label <span className="text-gray-400 font-normal">(short name for this location)</span></label>
                  <input
                    value={form?.label || ''}
                    onChange={(e) => setField('label', e.target.value)}
                    placeholder={form?.city || 'Cambridge'}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Business name</label>
                  <input
                    value={form?.businessName || ''}
                    onChange={(e) => setField('businessName', e.target.value)}
                    placeholder="Kush Groove Dispensary"
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    value={form?.phone || ''}
                    onChange={(e) => setField('phone', e.target.value)}
                    placeholder="508-555-1234"
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Street address</label>
                  <input
                    value={form?.address || ''}
                    onChange={(e) => setField('address', e.target.value)}
                    placeholder="123 Main St"
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                  <input
                    value={form?.city || ''}
                    onChange={(e) => setField('city', e.target.value)}
                    placeholder="Brockton"
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                    <input
                      value={form?.state || ''}
                      onChange={(e) => setField('state', e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="MA"
                      maxLength={2}
                      className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">ZIP</label>
                    <input
                      value={form?.postalCode || ''}
                      onChange={(e) => setField('postalCode', e.target.value)}
                      placeholder="02301"
                      className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Service area
                    <span className="ml-1 text-gray-400 font-normal">(towns you serve, comma or new-line separated)</span>
                  </label>
                  <textarea
                    value={(form?.serviceArea || []).join(', ')}
                    onChange={(e) => setServiceArea(e.target.value)}
                    placeholder="Whitman, Rockland, Holbrook, Hanover, Weymouth, East Bridgewater, Avon, Braintree"
                    rows={2}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Any sentence that lists 2+ of these towns is protected so your "we serve" copy stays accurate on pages generated for this location.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={reDetect}
                  disabled={detecting}
                  className="text-xs text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${detecting ? 'animate-spin' : ''}`} />
                  {detecting ? 'Detecting...' : 'Re-detect from site'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancel}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || detecting}
                    className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover shadow-sm disabled:opacity-50"
                  >
                    {saving && <LoaderIcon className="w-4 h-4 mr-1.5 animate-spin" />}
                    {editingId ? 'Save changes' : 'Add location'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            sortedProfiles.length > 0 && (
              <button
                type="button"
                onClick={startAdd}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border border-dashed border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add another location
              </button>
            )
          )}
        </>
      )}
    </div>
  );
};

export default BusinessLocationsTab;
