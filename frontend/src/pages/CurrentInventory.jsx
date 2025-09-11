// frontend/src/pages/CurrentInventory.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './CurrentInventory.css';

const CurrentInventory = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [summary, setSummary] = useState({
        totalProducts: 0,
        totalBottles: 0,
        uniqueStores: 0,
        byListingType: {}
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedProducts, setExpandedProducts] = useState(new Set());
    const [selectedFilter, setSelectedFilter] = useState(null);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const response = await fetch('/api/inventory/allocated-current', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                setProducts(data.products);
                setSummary(data.summary);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to fetch inventory data');
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = useMemo(() => {
        let filtered = products;
        
        // Apply type filter first
        if (selectedFilter) {
            filtered = filtered.filter(product => 
                product.Listing_Type === selectedFilter
            );
        }
        
        // Then apply search filter
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(product => 
                product.product_name.toLowerCase().includes(search) ||
                product.plu.toString().includes(search)
            );
        }
        
        return filtered;
    }, [products, searchTerm, selectedFilter]);

    const filteredSummary = useMemo(() => {
        const totalBottles = filteredProducts.reduce((sum, p) => sum + p.total_bottles, 0);
        
        // Always use the accurate unique store count from backend
        let uniqueStores = summary.uniqueStores;
        
        if (searchTerm.trim()) {
            // When filtering, add asterisk to show it's total stores, not filtered
            uniqueStores = `${summary.uniqueStores}*`;
        }

        // Calculate filtered listing type breakdown
        const filteredByListingType = filteredProducts.reduce((acc, product) => {
            const type = product.Listing_Type || 'Unknown';
            if (!acc[type]) {
                acc[type] = { count: 0, bottles: 0 };
            }
            acc[type].count++;
            acc[type].bottles += product.total_bottles;
            return acc;
        }, {});
        
        return {
            totalProducts: filteredProducts.length,
            totalBottles,
            uniqueStores,
            byListingType: filteredByListingType
        };
    }, [filteredProducts, summary, searchTerm]);

    const handleFilterClick = (type) => {
        if (selectedFilter === type) {
            // Clicking the active filter removes it
            setSelectedFilter(null);
        } else {
            // Clicking a different filter activates it
            setSelectedFilter(type);
        }
    };

    const toggleProduct = async (plu) => {
        const newExpanded = new Set(expandedProducts);
        
        if (newExpanded.has(plu)) {
            newExpanded.delete(plu);
        } else {
            newExpanded.add(plu);
            // Fetch store details if not already loaded
            const product = products.find(p => p.plu === plu);
            if (product && !product.stores) {
                try {
                    const response = await fetch(`/api/inventory/product/${plu}/stores`, {
                        credentials: 'include'
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        // Update the product with store data
                        setProducts(prev => prev.map(p => 
                            p.plu === plu ? { ...p, stores: data.stores } : p
                        ));
                    }
                } catch (err) {
                    console.error('Failed to fetch store data:', err);
                }
            }
        }
        
        setExpandedProducts(newExpanded);
    };

    if (loading) {
        return (
            <div className="current-inventory">
                <div className="inventory-container">
                    <div className="inventory-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading current inventory...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="current-inventory">
                <div className="inventory-container">
                    <div className="inventory-error">
                        <h2>Error Loading Inventory</h2>
                        <p>{error}</p>
                        <button onClick={fetchInventory} className="retry-button">
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="current-inventory">
            <div className="inventory-container">
                <div className="inventory-header">
                    <h1>Current Product Inventory</h1>
                    <p className="last-updated">
                        Last updated: {new Date().toLocaleString()}
                    </p>
                </div>

                <div className="inventory-content">
                    {/* Compact Summary Stats */}
                    <div className="compact-summary">
                        <div className="summary-stats">
                            <div className="stat-item">
                                <span className="stat-number">{filteredSummary.totalProducts}</span>
                                <span className="stat-label">Products</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">{filteredSummary.totalBottles.toLocaleString()}</span>
                                <span className="stat-label">Bottles</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">{filteredSummary.uniqueStores}</span>
                                <span className="stat-label">Stores</span>
                            </div>
                        </div>
                        
                        {/* Clickable Type Breakdown */}
                        {Object.keys(summary.byListingType).length > 0 && (
                            <div className="type-badges">
                                {Object.entries(summary.byListingType)
                                    .sort(([,a], [,b]) => b.bottles - a.bottles)
                                    .map(([type, data]) => (
                                    <button 
                                        key={type} 
                                        className={`type-badge ${type.toLowerCase()} ${selectedFilter === type ? 'active' : ''}`}
                                        onClick={() => handleFilterClick(type)}
                                        title={`${data.count} products, ${data.bottles.toLocaleString()} bottles - Click to filter`}
                                    >
                                        {type} ({selectedFilter === type ? filteredSummary.totalProducts : data.count})
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Search Box - Moved closer to results */}
                    <div className="search-container">
                        <input
                            type="text"
                            placeholder="Search by product name or PLU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <div className="search-icon">🔍</div>
                    </div>

                    {/* Product List */}
                    <div className="product-list">
                        {filteredProducts.length === 0 ? (
                            <div className="no-results">
                                {searchTerm ? 
                                    `No products found for "${searchTerm}"` : 
                                    selectedFilter ? 
                                        `No ${selectedFilter} products currently in stock` :
                                        'No products currently in stock'
                                }
                            </div>
                        ) : (
                            filteredProducts.map(product => (
                                <ProductCard
                                    key={product.plu}
                                    product={product}
                                    isExpanded={expandedProducts.has(product.plu)}
                                    onToggle={() => toggleProduct(product.plu)}
                                />
                            ))
                        )}
                    </div>

                    {/* Note about search filtering - moved below products */}
                    {searchTerm.trim() && !selectedFilter && (
                        <div className="filter-note">
                            <p>* Store count during search may be approximate - not all store details are loaded until products are expanded</p>
                        </div>
                    )}

                    {/* Data disclaimer */}
                    <div className="disclaimer">
                        <h3>📋 Data Notes</h3>
                        <p>
                            <strong>Real-time Accuracy:</strong> Inventory levels are based on the most recent data 
                            from Wake ABC's public inventory system and may not reflect real-time availability.
                        </p>
                        <p>
                            <strong>Store Visits:</strong> Always call ahead or visit stores to confirm product 
                            availability before making a trip.
                        </p>
                        <p>
                            <strong>Product Types:</strong> Now showing all product types including Allocation, 
                            Limited, Barrel, and Listed products with current inventory.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProductCard = ({ product, isExpanded, onToggle }) => {
    const price = product.retail_price ? `$${product.retail_price.toFixed(2)}` : 'Price N/A';
    const listingType = product.Listing_Type?.toLowerCase() || 'unknown';
    
    return (
        <div className="product-card">
            <button 
                className={`product-header ${isExpanded ? 'active' : ''}`}
                onClick={onToggle}
            >
                <div className="product-info">
                    <div className="product-name">
                        {product.product_name}
                        <span className={`listing-badge ${listingType}`}>
                            {product.Listing_Type}
                        </span>
                    </div>
                    <div className="product-details">
                        PLU: {product.plu} | {price}
                        {product.size_ml && ` | ${product.size_ml}ml`}
                    </div>
                </div>
                <div className="product-summary">
                    <div className="bottles-count">{product.total_bottles} bottles</div>
                    <div className="stores-count">{product.stores_with_stock} stores</div>
                </div>
                <span className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>▼</span>
            </button>
            
            {isExpanded && (
                <div className="product-content">
                    {product.stores ? (
                        <div className="store-grid">
                            {product.stores.map(store => (
                                <StoreItem key={store.store_id} store={store} />
                            ))}
                        </div>
                    ) : (
                        <div className="loading-stores">Loading store details...</div>
                    )}
                </div>
            )}
        </div>
    );
};

const StoreItem = ({ store }) => {
    const lastUpdated = store.last_updated ? 
        new Date(store.last_updated).toLocaleDateString() : 'Unknown';
    
    return (
        <div className={`store-item ${store.mixed_beverage ? 'mixed' : ''}`}>
            <div className="store-info">
                <div className="store-name">
                    {store.nickname} (#{store.store_number})
                    {store.mixed_beverage ? <span className="mixed-badge">MB</span> : null}
                </div>
                <div className="store-details">
                    {store.address} | Updated: {lastUpdated}
                </div>
            </div>
            <div className="quantity-badge">{store.quantity}</div>
        </div>
    );
};

export default CurrentInventory;