import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    RefreshCw,
    Store,
    Trash2,
    AlertTriangle,
    CheckCircle,
    X
} from 'lucide-react';
import apiClient from '../utils/apiClient';
import { toast } from 'react-hot-toast';

/**
 * Dutchie POS connection card.
 *
 * One card per connected dispensary location. Keys are write-only: they are
 * posted on connect and never returned, so the UI shows a verified location
 * name instead of a masked key.
 *
 * A location that authenticates but exposes no inventory is a real and common
 * state (it means products are not flagged available in Dutchie), so it gets a
 * distinct warning rather than being shown as an error.
 */
const DutchieConnect = ({ site, onSynced }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [label, setLabel] = useState('');

    const fetchStatus = useCallback(async () => {
        if (!site) return;
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/dutchie/${site}/status`);
            setStatus(response.data.dutchie);
        } catch (error) {
            console.error('Error fetching Dutchie status:', error);
        } finally {
            setLoading(false);
        }
    }, [site]);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    const handleConnect = async () => {
        const key = apiKey.trim();
        if (!key) {
            toast.error('Paste your Dutchie API key first');
            return;
        }
        try {
            setConnecting(true);
            const response = await apiClient.post(`/api/dutchie/${site}/connect`, {
                apiKey: key,
                label: label.trim() || undefined
            });
            // An empty menu is a successful connection with a caveat worth reading,
            // so it gets a longer-lived toast than the happy path.
            if (response.data.menuEmpty) {
                toast(response.data.message, { icon: '⚠️', duration: 8000 });
            } else {
                const added = response.data.sync?.added;
                toast.success(
                    added
                        ? `${response.data.message} Imported ${added} products.`
                        : response.data.message
                );
            }
            setApiKey('');
            setLabel('');
            setShowForm(false);
            fetchStatus();
            // The connect call syncs inline, so the product list is ready now.
            if (onSynced) onSynced();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not connect that key');
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async (locationRef, locationLabel) => {
        try {
            await apiClient.delete(`/api/dutchie/${site}/locations/${locationRef}`);
            toast.success(`Disconnected ${locationLabel}`);
            fetchStatus();
        } catch (error) {
            toast.error('Could not disconnect that location');
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            const response = await apiClient.post(`/api/dutchie/${site}/sync`);
            const { added = 0, updated = 0, archived = 0, errors = [] } = response.data;
            if (errors.length) {
                toast(`Synced with issues: ${errors[0]}`, { icon: '⚠️', duration: 8000 });
            } else {
                toast.success(`Menu synced: ${added} new, ${updated} updated, ${archived} removed`);
            }
            fetchStatus();
            if (onSynced) onSynced();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    const locations = status?.locations || [];
    const connected = locations.length > 0;

    return (
        <div className="border rounded-lg p-4 bg-white">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                        <Store className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-900">Dutchie POS</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {connected
                                ? 'Your live menu syncs daily so posts only mention what is in stock.'
                                : 'Connect your dispensary POS to pull your live menu into content.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {connected && (
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                    )}
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                    >
                        {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showForm ? 'Cancel' : connected ? 'Add location' : 'Connect'}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dutchie API key
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Paste the key Dutchie issued for this location"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            autoComplete="off"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Keys are issued per location, so add one key per store you want synced.
                            You can request one from Dutchie support for your dispensary, then paste
                            it here. We only ever read your menu, never write to it.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Label <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="We'll use the store name from Dutchie if you leave this blank"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                    </div>
                    <button
                        onClick={handleConnect}
                        disabled={connecting}
                        className="px-4 py-2 text-sm bg-primary text-white hover:bg-primary-hover rounded-lg disabled:opacity-50"
                    >
                        {connecting ? 'Verifying...' : 'Verify and connect'}
                    </button>
                </div>
            )}

            {loading && !status && (
                <p className="text-sm text-gray-400 mt-4">Checking connection...</p>
            )}

            {locations.length > 0 && (
                <div className="mt-4 space-y-2">
                    {locations.map((location) => (
                        <div
                            key={location.id}
                            className="flex items-start justify-between gap-3 p-3 border rounded-lg"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{location.label}</span>
                                    {location.menuEmpty ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                                            <AlertTriangle className="w-3 h-3" />
                                            No menu data
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                                            <CheckCircle className="w-3 h-3" />
                                            {location.itemCount} in stock
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 mt-0.5 truncate">
                                    {[location.address, location.city, location.state].filter(Boolean).join(', ')}
                                </p>
                                {location.menuEmpty && (
                                    <p className="text-xs text-amber-700 mt-1">
                                        Dutchie is not returning any inventory for this store. In Dutchie,
                                        check that products are marked API-enabled and available online.
                                    </p>
                                )}
                                {location.lastError && (
                                    <p className="text-xs text-red-600 mt-1">{location.lastError}</p>
                                )}
                            </div>
                            <button
                                onClick={() => handleDisconnect(location.id, location.label)}
                                className="p-2 text-gray-400 hover:text-red-600 shrink-0"
                                title={`Disconnect ${location.label}`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DutchieConnect;
