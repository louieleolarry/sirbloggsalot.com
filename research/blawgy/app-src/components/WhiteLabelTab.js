import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Globe,
    Upload,
    RefreshCw,
    CheckCircle,
    AlertTriangle,
    Copy,
    Trash2,
    LogIn,
    Users
} from 'lucide-react';
import apiClient from '../utils/apiClient';
import { toast } from 'react-hot-toast';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../firebaseConfig';

/**
 * White-label owner console.
 *
 * Only rendered for a user who owns a partner (the API 403s otherwise, and the
 * Settings page hides the tab). Four jobs: brand it, connect a domain, see the
 * customers who signed up under it, and log in as one of them for support.
 *
 * The DNS step is the fiddly one. The backend asks Fly for the certificate and
 * returns the exact records to create, so this renders a copyable table rather
 * than prose telling someone to contact support.
 */
const WhiteLabelTab = () => {
    const [partner, setPartner] = useState(null);
    const [dns, setDns] = useState(null);
    const [automaticCertificates, setAutomaticCertificates] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [checking, setChecking] = useState(false);
    const [domainInput, setDomainInput] = useState('');
    const [name, setName] = useState('');
    const [supportEmail, setSupportEmail] = useState('');
    const fileInputRef = useRef(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await apiClient.get('/api/partner/me');
            setPartner(data.partner);
            setName(data.partner.name || '');
            setSupportEmail(data.partner.supportEmail || '');
            setDomainInput(data.partner.domain || '');
        } catch (error) {
            // A non-owner should never see this tab, so this is a real failure.
            console.error('Failed to load white-label settings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadCustomers = useCallback(async () => {
        try {
            const { data } = await apiClient.get('/api/partner/me/customers');
            setCustomers(data.customers || []);
        } catch (error) {
            console.error('Failed to load customers:', error);
        }
    }, []);

    const checkDomain = useCallback(async () => {
        try {
            setChecking(true);
            const { data } = await apiClient.get('/api/partner/me/domain/status');
            setDns(data.dns);
            setAutomaticCertificates(data.automaticCertificates !== false);
        } catch (error) {
            console.error('Failed to check domain:', error);
        } finally {
            setChecking(false);
        }
    }, []);

    useEffect(() => { load(); loadCustomers(); }, [load, loadCustomers]);
    useEffect(() => { if (partner?.domain) checkDomain(); }, [partner?.domain, checkDomain]);

    const handleSaveBrand = async () => {
        try {
            setSaving(true);
            const { data } = await apiClient.put('/api/partner/me', { name, supportEmail });
            setPartner(data.partner);
            toast.success('Branding saved');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not save');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Logo must be under 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                setSaving(true);
                const { data } = await apiClient.post('/api/partner/me/logo', { dataUrl: reader.result });
                setPartner(data.partner);
                toast.success('Logo updated');
            } catch (error) {
                toast.error(error.response?.data?.message || 'Could not upload that logo');
            } finally {
                setSaving(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsDataURL(file);
    };

    const handleConnectDomain = async () => {
        const domain = domainInput.trim();
        if (!domain) return toast.error('Enter a domain first');
        try {
            setSaving(true);
            const { data } = await apiClient.post('/api/partner/me/domain', { domain });
            setPartner(data.partner);
            setDns(data.dns);
            setAutomaticCertificates(data.automaticCertificates !== false);
            toast.success('Domain connected. Add the DNS records below to finish.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not connect that domain');
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnectDomain = async () => {
        try {
            setSaving(true);
            const { data } = await apiClient.delete('/api/partner/me/domain');
            setPartner(data.partner);
            setDns(null);
            setDomainInput('');
            toast.success('Domain disconnected');
        } catch (error) {
            toast.error('Could not disconnect that domain');
        } finally {
            setSaving(false);
        }
    };

    const handleImpersonate = async (email) => {
        try {
            const { data } = await apiClient.post('/api/partner/me/impersonate', { email });
            await signInWithCustomToken(auth, data.token);
            // Full reload so every context re-reads as the customer.
            window.location.href = '/dashboard';
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not open that account');
        }
    };

    const copy = (value) => {
        navigator.clipboard?.writeText(value);
        toast.success('Copied');
    };

    if (loading) {
        return <p className="text-sm text-gray-400">Loading your white-label settings...</p>;
    }

    if (!partner) {
        return (
            <p className="text-sm text-gray-500">
                No white-label account is attached to this login.
            </p>
        );
    }

    return (
        <div className="space-y-8">
            {/* Branding */}
            <section>
                <h3 className="font-medium text-gray-900 mb-1">Branding</h3>
                <p className="text-sm text-gray-500 mb-4">
                    What your customers see when they sign in on your domain.
                </p>

                <div className="space-y-4 max-w-lg">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Support email</label>
                        <input
                            type="email"
                            value={supportEmail}
                            onChange={(e) => setSupportEmail(e.target.value)}
                            placeholder="Where your customers should reach you"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                        <div className="flex items-center gap-4">
                            {partner.logoUrl ? (
                                <img
                                    src={partner.logoUrl}
                                    alt={`${partner.name} logo`}
                                    className="h-10 max-w-[160px] object-contain border rounded p-1 bg-white"
                                />
                            ) : (
                                <div className="h-10 w-28 border rounded flex items-center justify-center text-xs text-gray-400">
                                    No logo
                                </div>
                            )}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={saving}
                                className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                <Upload className="w-4 h-4" />
                                Upload
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                onChange={handleLogoFile}
                                className="hidden"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG or WebP, under 2MB.</p>
                    </div>

                    <button
                        onClick={handleSaveBrand}
                        disabled={saving}
                        className="px-4 py-2 text-sm bg-primary text-white hover:bg-primary-hover rounded-lg disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save branding'}
                    </button>
                </div>
            </section>

            {/* Domain */}
            <section className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-1">Your domain</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Point a subdomain at the dashboard so your customers never leave your brand.
                </p>

                <div className="flex items-center gap-2 max-w-lg">
                    <input
                        type="text"
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        placeholder="blog.yoursite.com"
                        className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    />
                    <button
                        onClick={handleConnectDomain}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white hover:bg-primary-hover rounded-lg disabled:opacity-50"
                    >
                        <Globe className="w-4 h-4" />
                        Connect
                    </button>
                    {partner.domain && (
                        <button
                            onClick={handleDisconnectDomain}
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="Disconnect domain"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {partner.domain && (
                    <div className="mt-4 max-w-2xl">
                        <div className="flex items-center gap-3 mb-3">
                            {dns?.issued ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                                    <CheckCircle className="w-3 h-3" />
                                    Live
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                                    <AlertTriangle className="w-3 h-3" />
                                    Waiting on DNS
                                </span>
                            )}
                            <button
                                onClick={checkDomain}
                                disabled={checking}
                                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                                Re-check
                            </button>
                        </div>

                        {!automaticCertificates && (
                            <p className="text-sm text-amber-700 mb-3">
                                Automatic certificates are not configured on this environment. Your
                                domain is saved, but someone at Blawgy needs to issue the certificate.
                            </p>
                        )}

                        {dns?.records?.length > 0 && (
                            <div className="border rounded-lg overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-left">
                                        <tr>
                                            <th className="px-3 py-2 font-medium text-gray-600">Type</th>
                                            <th className="px-3 py-2 font-medium text-gray-600">Name</th>
                                            <th className="px-3 py-2 font-medium text-gray-600">Value</th>
                                            <th className="px-3 py-2" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dns.records.map((record) => (
                                            <tr key={`${record.type}-${record.name}`} className="border-t">
                                                <td className="px-3 py-2 font-mono text-xs">{record.type}</td>
                                                <td className="px-3 py-2 font-mono text-xs break-all">{record.name}</td>
                                                <td className="px-3 py-2 font-mono text-xs break-all">{record.value}</td>
                                                <td className="px-3 py-2">
                                                    <button
                                                        onClick={() => copy(record.value)}
                                                        className="p-1 text-gray-400 hover:text-gray-700"
                                                        title="Copy value"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <p className="text-xs text-gray-500 mt-2">
                            Add these at your DNS provider. Certificates usually issue within a few
                            minutes of the records going live.
                        </p>
                    </div>
                )}
            </section>

            {/* Customers */}
            <section className="border-t pt-6">
                <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-gray-500" />
                    <h3 className="font-medium text-gray-900">Your customers</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    Everyone who signed up on your domain. Open an account to help them with setup.
                </p>

                {customers.length === 0 ? (
                    <p className="text-sm text-gray-400">
                        No signups yet. Once your domain is live, new accounts show up here.
                    </p>
                ) : (
                    <div className="border rounded-lg divide-y">
                        {customers.map((customer) => (
                            <div key={customer.id} className="flex items-center justify-between gap-4 p-3">
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{customer.email}</p>
                                    <p className="text-sm text-gray-500 truncate">
                                        {customer.sites.length > 0
                                            ? customer.sites.join(', ')
                                            : 'No site connected yet'}
                                        {!customer.onboardingComplete && ' · onboarding incomplete'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleImpersonate(customer.email)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 shrink-0"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Open account
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default WhiteLabelTab;
