import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../utils/apiClient';
import { toast } from 'react-hot-toast';

/**
 * White-label partner admin.
 *
 * Creating a partner is the entire setup for a reseller: the row turns a host
 * into a branded instance whose customers skip billing. `ownerEmail` is the
 * important field — it is what lets that person see the White Label tab in
 * their own Settings and manage the domain, logo and customer list themselves.
 *
 * Everything here is admin-gated server-side; hiding the tab is presentation.
 */
const PartnersTab = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', ownerEmail: '', domain: '', supportEmail: '' });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await apiClient.get('/admin/partners');
            setPartners(data.partners || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not load partners');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async (event) => {
        event.preventDefault();
        if (!form.name.trim()) return toast.error('A name is required');
        try {
            setSaving(true);
            await apiClient.post('/admin/partners', {
                name: form.name.trim(),
                ownerEmail: form.ownerEmail.trim() || undefined,
                domain: form.domain.trim() || undefined,
                supportEmail: form.supportEmail.trim() || undefined
            });
            toast.success(`Created ${form.name.trim()}`);
            setForm({ name: '', ownerEmail: '', domain: '', supportEmail: '' });
            load();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not create that partner');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (partner) => {
        try {
            await apiClient.put(`/admin/partners/${partner.id}`, { active: !partner.active });
            toast.success(partner.active ? `Paused ${partner.name}` : `Reactivated ${partner.name}`);
            load();
        } catch (error) {
            toast.error('Could not update that partner');
        }
    };

    // Extra logins that also unlock the White Label tab (owners who sign in
    // with more than one account). Comma-separated in the editor; the backend
    // normalizes and stores them on the partner row.
    const [editingLoginsId, setEditingLoginsId] = useState(null);
    const [loginsDraft, setLoginsDraft] = useState('');

    const openLoginsEditor = (partner) => {
        setEditingLoginsId(partner.id);
        setLoginsDraft((partner.additionalOwnerEmails || []).join(', '));
    };

    const saveLogins = async (partner) => {
        try {
            await apiClient.put(`/admin/partners/${partner.id}`, { additionalOwnerEmails: loginsDraft });
            toast.success(`Updated logins for ${partner.name}`);
            setEditingLoginsId(null);
            load();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not update those logins');
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleCreate} className="border rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-gray-900">Add a white-label partner</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Kush Groove Content"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Owner email
                        </label>
                        <input
                            type="email"
                            value={form.ownerEmail}
                            onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                            placeholder="Their Blawgy login"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            This login gets the White Label tab in Settings.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Domain <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={form.domain}
                            onChange={(e) => setForm({ ...form, domain: e.target.value })}
                            placeholder="blog.theirsite.com"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            They can connect this themselves, which also issues the certificate.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Support email <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <input
                            type="email"
                            value={form.supportEmail}
                            onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm bg-primary text-white hover:bg-primary-hover rounded-lg disabled:opacity-50"
                >
                    {saving ? 'Creating...' : 'Create partner'}
                </button>
            </form>

            {loading ? (
                <p className="text-sm text-gray-400">Loading partners...</p>
            ) : partners.length === 0 ? (
                <p className="text-sm text-gray-500">No white-label partners yet.</p>
            ) : (
                <div className="border rounded-lg divide-y">
                    {partners.map((partner) => (
                        <div key={partner.id} className="p-3">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">{partner.name}</span>
                                        {!partner.active && (
                                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                                Paused
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">
                                        {partner.domain || 'No domain yet'}
                                        {partner.ownerEmail ? ` · ${partner.ownerEmail}` : ' · no owner set'}
                                        {(partner.additionalOwnerEmails || []).length > 0
                                            ? ` (+${partner.additionalOwnerEmails.length} more login${partner.additionalOwnerEmails.length === 1 ? '' : 's'})`
                                            : ''}
                                        {` · ${partner.customerCount} customer${partner.customerCount === 1 ? '' : 's'}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => (editingLoginsId === partner.id
                                            ? setEditingLoginsId(null)
                                            : openLoginsEditor(partner))}
                                        className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                                    >
                                        Logins
                                    </button>
                                    <button
                                        onClick={() => toggleActive(partner)}
                                        className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                                    >
                                        {partner.active ? 'Pause' : 'Reactivate'}
                                    </button>
                                </div>
                            </div>
                            {editingLoginsId === partner.id && (
                                <div className="mt-3 flex items-start gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={loginsDraft}
                                            onChange={(e) => setLoginsDraft(e.target.value)}
                                            placeholder="second@email.com, third@email.com"
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Extra logins that also get the White Label tab, comma separated. The primary owner email stays as is.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => saveLogins(partner)}
                                        className="px-3 py-2 text-sm bg-primary text-white hover:bg-primary-hover rounded-lg shrink-0"
                                    >
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PartnersTab;
