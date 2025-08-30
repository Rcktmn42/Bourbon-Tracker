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
        uniqueStores: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedProducts, setExpandedProducts] = useState(new Set());

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
                setSummary(data.summary); // Store the summary from backend
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
        if (!searchTerm.trim()) return products;
        
        const search = searchTerm.toLowerCase();
        return products.filter(product => 
            product.product_name.toLowerCase().includes(search) ||
            product.plu.toString().includes(search)
        );
    }, [products, searchTerm]);

    const filteredSummary = useMemo(() => {
        const totalBottles = filteredProducts.reduce((sum, p) => sum + p.total_bottles, 0);
        
        // Always use the accurate unique store count from backend
        let uniqueStores = summary.uniqueStores;
        
        if (searchTerm.trim()) {
            // When filtering, add asterisk to show it's total stores, not filtered
            uniqueStores = `${summary.uniqueStores}*`;
        }
        
        return {
            totalProducts: filteredProducts.length,
            totalBottles,
            uniqueStores
        };
    }, [filteredProducts, summary, searchTerm]);

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
                    <h1>Current Allocated Product Inventory</h1>
                    <p className="last-updated">
                        Last updated: {new Date().toLocaleString()}
                    </p>
                </div>

                <div className="inventory-content">
                    {/* Search Box */}
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

                    {/* Summary Stats */}
                    <div className="summary-grid">
                        <div className="summary-item">
                            <div className="summary-number">{filteredSummary.totalProducts}</div>
                            <div className="summary-label">Products In Stock</div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-number">{filteredSummary.totalBottles.toLocaleString()}</div>
                            <div className="summary-label">Total Bottles</div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-number">{filteredSummary.uniqueStores}</div>
                            <div className="summary-label">Unique Stores</div>
                        </div>
                    </div>

                    {/* Note about filtered store count */}
                    {searchTerm.trim() && (
                        <div className="filter-note">
                            <p>* Store count shows all stores with allocated products, not just filtered results</p>
                        </div>
                    )}

                    {/* Product List */}
                    <div className="product-list">
                        {filteredProducts.length === 0 ? (
                            <div className="no-results">
                                {searchTerm ? 
                                    `No products found for "${searchTerm}"` : 
                                    'No allocated products currently in stock'
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