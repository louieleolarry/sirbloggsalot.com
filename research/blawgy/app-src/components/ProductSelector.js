import React, { useState, useEffect, useCallback } from 'react';
import {
    Package,
    X,
    Search,
    Check,
    Image as ImageIcon
} from 'lucide-react';
import apiClient from '../utils/apiClient';
import { useImpersonation } from '../contexts/ImpersonationContext';

/**
 * ProductSelector - A component to select products for articles
 *
 * Usage:
 * <ProductSelector
 *   selectedProductIds={['id1', 'id2']}
 *   onChange={(ids) => setSelectedIds(ids)}
 *   maxSelections={10}
 * />
 */
const ProductSelector = ({
    selectedProductIds = [],
    onChange,
    maxSelections = 10,
    compact = false,
    hideLabel = false
}) => {
    const { siteSettings } = useImpersonation();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    const site = siteSettings?.site;

    // Fetch products
    const fetchProducts = useCallback(async () => {
        if (!site) return;

        try {
            setLoading(true);
            const response = await apiClient.get(`/api/products/${site}`);
            // Filter out hidden and archived products (status field; legacy
            // items without one count as visible)
            const visibleProducts = (response.data.products || []).filter(
                p => p.status !== 'hidden' && p.status !== 'archived'
            );
            setProducts(visibleProducts);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    }, [site]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Filter products based on search
    const filteredProducts = products.filter(product => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            product.name?.toLowerCase().includes(query) ||
            product.description?.toLowerCase().includes(query)
        );
    });

    // Get selected products for display
    const selectedProducts = products.filter(p =>
        selectedProductIds.includes(p._id)
    );

    const handleToggleProduct = (productId) => {
        const isSelected = selectedProductIds.includes(productId);

        if (isSelected) {
            onChange(selectedProductIds.filter(id => id !== productId));
        } else {
            if (selectedProductIds.length >= maxSelections) {
                return; // Max reached
            }
            onChange([...selectedProductIds, productId]);
        }
    };

    const handleRemoveProduct = (productId) => {
        onChange(selectedProductIds.filter(id => id !== productId));
    };

    if (products.length === 0 && !loading) {
        return (
            <div className="text-sm text-gray-500 py-2">
                <p>No products available. <a href="/settings/products" className="text-primary hover:underline">Add products</a> to link them to articles.</p>
            </div>
        );
    }

    if (compact) {
        return (
            <div className="space-y-2">
                {!hideLabel && (
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">
                            Products ({selectedProductIds.length}/{maxSelections})
                        </label>
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-sm text-primary hover:text-gray-700"
                        >
                            {isExpanded ? 'Hide' : 'Select Products'}
                        </button>
                    </div>
                )}

                {/* Selected products chips */}
                {selectedProducts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {selectedProducts.map(product => (
                            <span
                                key={product._id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                                <span className="max-w-[150px] truncate">{product.name}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveProduct(product._id)}
                                    className="hover:text-gray-900 ml-0.5"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Add button when label is hidden */}
                {hideLabel && (
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-primary hover:text-gray-700"
                    >
                        {isExpanded ? '− Hide list' : `+ Add products (${selectedProductIds.length}/${maxSelections})`}
                    </button>
                )}

                {/* Expandable product list */}
                {isExpanded && (
                    <div className="border rounded-lg p-2 max-h-40 overflow-y-auto bg-gray-50">
                        <div className="relative mb-2">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-7 pr-2 py-1 text-xs border rounded focus:ring-1 focus:ring-gray-500 bg-white"
                            />
                        </div>
                        <div className="space-y-0.5">
                            {filteredProducts.slice(0, 50).map(product => {
                                const isSelected = selectedProductIds.includes(product._id);
                                const isDisabled = !isSelected && selectedProductIds.length >= maxSelections;

                                return (
                                    <button
                                        key={product._id}
                                        type="button"
                                        onClick={() => handleToggleProduct(product._id)}
                                        disabled={isDisabled}
                                        className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left text-xs ${
                                            isSelected
                                                ? 'bg-white text-gray-900 font-medium'
                                                : isDisabled
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : 'hover:bg-white'
                                        }`}
                                    >
                                        <span className="flex-1 truncate">{product.name}</span>
                                        {isSelected && <Check className="w-3 h-3 text-green-600" />}
                                    </button>
                                );
                            })}
                            {filteredProducts.length > 50 && (
                                <p className="text-xs text-gray-400 px-2 py-1">
                                    Showing 50 of {filteredProducts.length} — use search to find more
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Full view
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-gray-900">Link Products</h3>
                    <p className="text-xs text-gray-500">
                        Select up to {maxSelections} products to feature in this article
                    </p>
                </div>
                <span className="text-sm text-gray-500">
                    {selectedProductIds.length}/{maxSelections} selected
                </span>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                />
            </div>

            {/* Selected products */}
            {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedProducts.map(product => (
                        <span
                            key={product._id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-sm"
                        >
                            {product.images?.[0]?.src && (
                                <img
                                    src={product.images?.[0]?.src}
                                    alt=""
                                    className="w-5 h-5 rounded object-cover"
                                />
                            )}
                            {product.name}
                            <button
                                type="button"
                                onClick={() => handleRemoveProduct(product._id)}
                                className="hover:text-gray-900"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Product grid */}
            {loading ? (
                <div className="text-center py-8 text-gray-500">Loading products...</div>
            ) : (
                <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                    {filteredProducts.map(product => {
                        const isSelected = selectedProductIds.includes(product._id);
                        const isDisabled = !isSelected && selectedProductIds.length >= maxSelections;

                        return (
                            <button
                                key={product._id}
                                type="button"
                                onClick={() => handleToggleProduct(product._id)}
                                disabled={isDisabled}
                                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                                    isSelected
                                        ? 'border-primary bg-gray-50'
                                        : isDisabled
                                            ? 'opacity-50 cursor-not-allowed border-gray-200'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                                    {product.images?.[0]?.src ? (
                                        <img
                                            src={product.images?.[0]?.src}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-5 h-5 text-gray-300" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {product.name}
                                    </p>
                                    {product.price && (
                                        <p className="text-xs text-gray-500">
                                            {product.currency} {product.price}
                                        </p>
                                    )}
                                </div>
                                {isSelected && (
                                    <div className="flex-shrink-0">
                                        <Check className="w-5 h-5 text-primary" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {filteredProducts.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'No products match your search' : 'No products available'}
                </div>
            )}
        </div>
    );
};

export default ProductSelector;
