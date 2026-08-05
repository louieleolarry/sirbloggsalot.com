import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    Trash2,
    Edit,
    RefreshCw,
    Eye,
    EyeOff,
    Package,
    Image as ImageIcon,
    AlertCircle,
    CheckCircle,
    LoaderIcon,
    Search,
    X,
    ExternalLink,
    Clock,
    Settings
} from 'lucide-react';
import apiClient from '../utils/apiClient';
import { toast } from 'react-hot-toast';
import { useImpersonation } from '../contexts/ImpersonationContext';
import DutchieConnect from './DutchieConnect';

const ProductsTab = () => {
    const { siteSettings } = useImpersonation();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null);
    const [filter, setFilter] = useState('all'); // all, synced, manual, hidden
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSyncSettings, setShowSyncSettings] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        currency: 'USD',
        url: '',
        imageUrl: ''
    });
    const [syncSettings, setSyncSettings] = useState({
        enabled: false,
        frequency: 'daily'
    });

    const site = siteSettings?.site;
    const isShopifyConnected = !!siteSettings?.siteName;

    // Fetch products
    const fetchProducts = useCallback(async () => {
        if (!site) return;

        try {
            setLoading(true);
            const response = await apiClient.get(`/api/products/${site}`);
            setProducts(response.data.products || []);
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [site]);

    // Fetch sync status
    const fetchSyncStatus = useCallback(async () => {
        if (!site || !isShopifyConnected) return;

        try {
            const response = await apiClient.get(`/api/products/${site}/sync/status`);
            setSyncStatus(response.data.syncSettings);
            setSyncSettings({
                enabled: response.data.syncSettings?.enabled || false,
                frequency: response.data.syncSettings?.frequency || 'daily'
            });
        } catch (error) {
            console.error('Error fetching sync status:', error);
        }
    }, [site, isShopifyConnected]);

    useEffect(() => {
        fetchProducts();
        fetchSyncStatus();
    }, [fetchProducts, fetchSyncStatus]);

    // Trigger manual sync
    const handleSync = async () => {
        try {
            setSyncing(true);
            const response = await apiClient.post(`/api/products/${site}/sync`);
            toast.success(response.data.message || 'Sync started');

            // Refresh products after a delay
            setTimeout(() => {
                fetchProducts();
                fetchSyncStatus();
            }, 3000);
        } catch (error) {
            console.error('Error syncing products:', error);
            toast.error(error.response?.data?.message || 'Failed to sync products');
        } finally {
            setSyncing(false);
        }
    };

    // Save sync settings
    const handleSaveSyncSettings = async () => {
        try {
            await apiClient.put(`/api/products/${site}/sync/settings`, syncSettings);
            toast.success('Sync settings saved');
            setShowSyncSettings(false);
            fetchSyncStatus();
        } catch (error) {
            console.error('Error saving sync settings:', error);
            toast.error('Failed to save sync settings');
        }
    };

    // Add manual product
    const handleAddProduct = async () => {
        if (!formData.name.trim()) {
            toast.error('Product name is required');
            return;
        }
        if (formData.description.length > 5000) {
            toast.error('Description must be under 5000 characters');
            return;
        }
        if (saving) return;

        try {
            setSaving(true);
            await apiClient.post(`/api/products/${site}`, {
                ...formData,
                price: formData.price ? parseFloat(formData.price) : null
            });
            toast.success('Product added successfully');
            setShowAddModal(false);
            resetForm();
            fetchProducts();
        } catch (error) {
            console.error('Error adding product:', error);
            toast.error(error.response?.data?.message || 'Failed to add product');
        } finally {
            setSaving(false);
        }
    };

    // Update product
    const handleUpdateProduct = async () => {
        if (!formData.name.trim()) {
            toast.error('Product name is required');
            return;
        }
        if (saving) return;

        try {
            setSaving(true);
            await apiClient.put(`/api/products/${site}/${editingProduct._id}`, {
                ...formData,
                price: formData.price ? parseFloat(formData.price) : null
            });
            toast.success('Product updated successfully');
            setShowEditModal(false);
            setEditingProduct(null);
            resetForm();
            fetchProducts();
        } catch (error) {
            console.error('Error updating product:', error);
            toast.error(error.response?.data?.message || 'Failed to update product');
        } finally {
            setSaving(false);
        }
    };

    // Archive (delete) product
    const handleArchiveProduct = async (productId) => {
        if (!window.confirm('Are you sure you want to archive this product?')) return;

        try {
            await apiClient.delete(`/api/products/${site}/${productId}`);
            toast.success('Product archived');
            fetchProducts();
        } catch (error) {
            console.error('Error archiving product:', error);
            toast.error('Failed to archive product');
        }
    };

    // Hide/unhide product
    const handleToggleVisibility = async (product) => {
        try {
            if (product.status === 'hidden') {
                await apiClient.post(`/api/products/${site}/${product._id}/unhide`);
                toast.success('Product is now visible');
            } else {
                await apiClient.post(`/api/products/${site}/${product._id}/hide`);
                toast.success('Product hidden');
            }
            fetchProducts();
        } catch (error) {
            console.error('Error toggling visibility:', error);
            toast.error('Failed to update product visibility');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            price: '',
            currency: 'USD',
            url: '',
            imageUrl: ''
        });
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name || '',
            description: product.description || '',
            price: product.price || '',
            currency: product.currency || 'USD',
            url: product.url || '',
            imageUrl: product.images?.[0]?.src || ''
        });
        setShowEditModal(true);
    };

    // Filter products
    const filteredProducts = products.filter(product => {
        const isSyncedProduct = product.source === 'shopify' || product.source === 'dutchie' || Boolean(product.shopifyId);
        // Archived products are soft-deleted - never show them
        if (product.status === 'archived') return false;

        // Apply filter
        if (filter === 'synced' && !isSyncedProduct) return false;
        if (filter === 'manual' && isSyncedProduct) return false;
        if (filter === 'hidden' && product.status !== 'hidden') return false;
        if (filter !== 'hidden' && product.status === 'hidden') return false;

        // Apply search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                product.name?.toLowerCase().includes(query) ||
                product.description?.toLowerCase().includes(query)
            );
        }

        return true;
    });

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* POS / storefront connections. Listed here so a dispensary sees
                Dutchie as an option next to the manual and Shopify paths. */}
            <DutchieConnect site={site} onSynced={fetchProducts} />

            {/* Header actions */}
            <div className="flex items-center justify-end">
                <div className="flex items-center gap-3">
                    {isShopifyConnected && (
                        <>
                            <button
                                onClick={() => setShowSyncSettings(true)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border rounded-lg"
                            >
                                <Settings className="w-4 h-4" />
                                Sync Settings
                            </button>
                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                                {syncing ? 'Syncing...' : 'Sync Now'}
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white hover:bg-primary-hover rounded-lg"
                    >
                        <Plus className="w-4 h-4" />
                        Add Product
                    </button>
                </div>
            </div>

            {/* Sync Status Banner */}
            {isShopifyConnected && syncStatus && (
                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${syncStatus.enabled ? 'bg-green-100' : 'bg-gray-200'}`}>
                            <RefreshCw className={`w-4 h-4 ${syncStatus.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                Shopify Sync {syncStatus.enabled ? 'Enabled' : 'Disabled'}
                            </p>
                            <p className="text-xs text-gray-500">
                                Last synced: {formatDate(syncStatus.lastSyncAt)}
                                {syncStatus.enabled && ` • Next sync: ${formatDate(syncStatus.nextSyncAt)}`}
                            </p>
                        </div>
                    </div>
                    {syncStatus.syncErrors?.length > 0 && (
                        <div className="flex items-center gap-2 text-amber-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">Last sync had errors</span>
                        </div>
                    )}
                </div>
            )}

            {/* Filters and Search */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                    {['all', 'synced', 'manual', 'hidden'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 text-sm rounded-md capitalize ${
                                filter === f
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                    />
                </div>
            </div>

            {/* Products List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <LoaderIcon className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                        {searchQuery
                            ? 'No products match your search'
                            : filter === 'hidden'
                            ? 'No hidden products'
                            : 'No products yet'}
                    </p>
                    {!searchQuery && filter === 'all' && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="mt-4 text-primary hover:text-gray-700 text-sm font-medium"
                        >
                            Add your first product
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredProducts.map((product) => (
                        <div
                            key={product._id}
                            className={`flex items-start gap-4 p-4 bg-white border rounded-lg ${
                                product.status === 'hidden' ? 'opacity-60' : ''
                            }`}
                        >
                            {/* Product Image */}
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {product.images?.[0]?.src ? (
                                    <img
                                        src={product.images?.[0]?.src}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-6 h-6 text-gray-300" />
                                    </div>
                                )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900 truncate">
                                            {product.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {/* Keyed off `source`, not shopifyId — a Dutchie
                                                product has no shopifyId and would otherwise
                                                mislabel itself as hand-entered. */}
                                            {product.source === 'shopify' || product.shopifyId ? (
                                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                                                    Shopify
                                                </span>
                                            ) : product.source === 'dutchie' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                                                    Dutchie
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                                                    Manual
                                                </span>
                                            )}
                                            {product.price && (
                                                <span className="text-sm text-gray-500">
                                                    {product.currency} {product.price}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        {product.url && (
                                            <a
                                                href={product.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-gray-400 hover:text-gray-600"
                                                title="View product"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => handleToggleVisibility(product)}
                                            className="p-2 text-gray-400 hover:text-gray-600"
                                            title={product.status === 'hidden' ? 'Show product' : 'Hide product'}
                                        >
                                            {product.status === 'hidden' ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => openEditModal(product)}
                                            className="p-2 text-gray-400 hover:text-gray-600"
                                            title="Edit product"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleArchiveProduct(product._id)}
                                            className="p-2 text-gray-400 hover:text-red-600"
                                            title="Archive product"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {product.description && (
                                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                                        {product.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Product Modal */}
            {(showAddModal || showEditModal) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold">
                                    {showEditModal ? 'Edit Product' : 'Add Product'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setShowEditModal(false);
                                        setEditingProduct(null);
                                        resetForm();
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Product Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Premium Bath Towel Set"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                        <span className="text-gray-400 font-normal ml-2">
                                            ({formData.description.length}/5000)
                                        </span>
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Describe your product..."
                                        rows={4}
                                        maxLength={5000}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Price
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Currency
                                        </label>
                                        <select
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                        >
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="GBP">GBP</option>
                                            <option value="AUD">AUD</option>
                                            <option value="CAD">CAD</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Product URL
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.url}
                                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                        placeholder="https://yoursite.com/products/..."
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Image URL
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.imageUrl}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        placeholder="https://..."
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                    />
                                    {formData.imageUrl && (
                                        <div className="mt-2">
                                            <img
                                                src={formData.imageUrl}
                                                alt="Preview"
                                                className="w-20 h-20 object-cover rounded-lg"
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setShowEditModal(false);
                                        setEditingProduct(null);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={showEditModal ? handleUpdateProduct : handleAddProduct}
                                    disabled={saving}
                                    className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving
                                        ? 'Saving...'
                                        : showEditModal ? 'Save Changes' : 'Add Product'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sync Settings Modal */}
            {showSyncSettings && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold">Sync Settings</h3>
                                <button
                                    onClick={() => setShowSyncSettings(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">Auto-sync enabled</p>
                                        <p className="text-sm text-gray-500">
                                            Automatically sync products from Shopify
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSyncSettings({ ...syncSettings, enabled: !syncSettings.enabled })}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${
                                            syncSettings.enabled ? 'bg-primary' : 'bg-gray-200'
                                        }`}
                                    >
                                        <span
                                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                                syncSettings.enabled ? 'translate-x-5' : ''
                                            }`}
                                        />
                                    </button>
                                </div>

                                {syncSettings.enabled && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Sync Frequency
                                        </label>
                                        <select
                                            value={syncSettings.frequency}
                                            onChange={(e) => setSyncSettings({ ...syncSettings, frequency: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setShowSyncSettings(false)}
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveSyncSettings}
                                    className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover"
                                >
                                    Save Settings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductsTab;
