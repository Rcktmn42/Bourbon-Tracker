// frontend/src/pages/WarehouseInventory.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './WarehouseInventory.css';

const CACHE_KEY = 'warehouse-inventory-cache';
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

const WarehouseInventory = () => {
    const { user } = useAuth();
    const [rawInventoryData, setRawInventoryData] = useState({}); // Store full datasets by timePeriod
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [lastCacheTime, setLastCacheTime] = useState(null);
    const [activeRequests, setActiveRequests] = useState(new Set()); // Track active requests
    
    // Filter states
    const [filterSettings, setFilterSettings] = useState({
        timePeriod: 'current_month',
        productTypes: ['Allocation', 'Limited', 'Barrel'],
        hideZeroActivity: true
    });

    // Cache utility functions - now per time period
    const saveToCache = useCallback((timePeriod, data) => {
        try {
            const cacheData = {
                rawData: data,
                timestamp: Date.now(),
                timePeriod,
                etag: data.meta?.file_modified // Use file modification time for cache validation
            };
            localStorage.setItem(`${CACHE_KEY}-${timePeriod}`, JSON.stringify(cacheData));
            setLastCacheTime(Date.now());
        } catch (error) {
            console.error('Failed to save to cache:', error);
        }
    }, []);

    const loadFromCache = useCallback((timePeriod) => {
        try {
            const cached = localStorage.getItem(`${CACHE_KEY}-${timePeriod}`);
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            const now = Date.now();
            
            // Check if cache is expired
            if (now - cacheData.timestamp > CACHE_DURATION) {
                localStorage.removeItem(`${CACHE_KEY}-${timePeriod}`);
                return null;
            }
            
            setLastCacheTime(cacheData.timestamp);
            return cacheData;
        } catch (error) {
            console.error('Failed to load from cache:', error);
            localStorage.removeItem(`${CACHE_KEY}-${timePeriod}`);
            return null;
        }
    }, []);

    const clearCache = useCallback((timePeriod = null) => {
        if (timePeriod) {
            localStorage.removeItem(`${CACHE_KEY}-${timePeriod}`);
        } else {
            // Clear all cache entries
            ['current_month', 'last_30_days', 'last_90_days', 'last_180_days'].forEach(period => {
                localStorage.removeItem(`${CACHE_KEY}-${period}`);
            });
            setLastCacheTime(null);
        }
    }, []);

    // Optimized data fetching - download full JSON once per time period
    const fetchRawData = useCallback(async (timePeriod, forceRefresh = false) => {
        const requestKey = timePeriod;
        
        // Prevent duplicate requests
        if (activeRequests.has(requestKey)) {
            console.log(`Request for ${timePeriod} already in progress`);
            return;
        }

        // Check cache first (unless forcing refresh)
        if (!forceRefresh) {
            const cached = loadFromCache(timePeriod);
            if (cached && cached.rawData) {
                console.log(`Using cached data for ${timePeriod}`);
                setRawInventoryData(prev => ({
                    ...prev,
                    [timePeriod]: cached.rawData
                }));
                return;
            }
        }

        // Start request
        setActiveRequests(prev => new Set(prev).add(requestKey));
        setLoading(true);
        setError(null);

        try {
            const headers = {};
            
            // Add ETag for cache validation if we have cached data
            const cached = loadFromCache(timePeriod);
            if (cached && cached.etag) {
                headers['If-None-Match'] = `"${cached.etag}"`;
            }

            const response = await fetch(`/api/reports/warehouse-inventory?timePeriod=${timePeriod}`, {
                credentials: 'include',
                headers
            });

            if (response.status === 304) {
                // Server says our cached data is still valid
                console.log(`Cached data still valid for ${timePeriod}`);
                if (cached && cached.rawData) {
                    setRawInventoryData(prev => ({
                        ...prev,
                        [timePeriod]: cached.rawData
                    }));
                }
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                console.log(`Downloaded fresh data for ${timePeriod}: ${data.meta.total_products} products`);
                
                // Store raw data in state
                setRawInventoryData(prev => ({
                    ...prev,
                    [timePeriod]: data
                }));

                // Save to cache
                saveToCache(timePeriod, data);
            } else {
                setError(data.error || 'Unknown error occurred');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.message || 'Failed to fetch warehouse inventory');
        } finally {
            setLoading(false);
            setActiveRequests(prev => {
                const newSet = new Set(prev);
                newSet.delete(requestKey);
                return newSet;
            });
        }
    }, [activeRequests, loadFromCache, saveToCache]);

    const resetFilters = useCallback(() => {
        setFilterSettings({
            timePeriod: 'current_month',
            productTypes: ['Allocation', 'Limited', 'Barrel'],
            hideZeroActivity: true
        });
        setSearchTerm('');
    }, []);

    // Client-side filtering - ALL filtering happens in browser now
    const filteredInventory = useMemo(() => {
        const currentData = rawInventoryData[filterSettings.timePeriod];
        if (!currentData || !currentData.products) {
            return [];
        }

        let filtered = currentData.products;

        // Search filtering (overrides other filters when active)
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(product => 
                (product.product_name && product.product_name.toLowerCase().includes(searchLower)) ||
                (product.plu && product.plu.toString().includes(searchTerm))
            );
        } else {
            // Product type filtering (only if not searching)
            if (filterSettings.productTypes && filterSettings.productTypes.length > 0) {
                filtered = filtered.filter(product => 
                    filterSettings.productTypes.includes(product.listing_type)
                );
            }

            // Hide zero activity filtering
            if (filterSettings.hideZeroActivity) {
                filtered = filtered.filter(product => 
                    product.current_inventory > 0 || product.peak_inventory > 0
                );
            }
        }

        return filtered;
    }, [rawInventoryData, filterSettings, searchTerm]);

    // Load cached data on component mount
    useEffect(() => {
        // Load initial data for current time period
        fetchRawData(filterSettings.timePeriod);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency to run only once on mount

    // Fetch data when time period changes (no debounce needed - we only fetch when time period changes)
    useEffect(() => {
        fetchRawData(filterSettings.timePeriod);
    }, [filterSettings.timePeriod, fetchRawData]);

    const getTimePeriodLabel = useCallback((period) => {
        switch (period) {
            case 'current_month': return 'Current Month';
            case 'last_30_days': return 'Last 30 Days';
            case 'last_90_days': return 'Last 90 Days';
            case 'last_180_days': return 'Last 180 Days';
            default: return period;
        }
    }, []);

    // OPTIMIZED: Memoized ProductImage component to prevent unnecessary re-renders
    const ProductImage = React.memo(({ product }) => {
        const [imageError, setImageError] = useState(false);
        const [imageLoading, setImageLoading] = useState(true);
        const [currentImageIndex, setCurrentImageIndex] = useState(0);

        // Generate multiple image path variations to try
        const getImageVariations = useCallback(() => {
            if (!product.image_path || product.image_path === 'no image available') {
                return [];
            }

            const variations = [
                // Backend provided URL
                product.image_url,
                // Direct paths with different cleaning approaches
                `/api/images/${product.image_path}`,
                `/api/images/${product.image_path.replace(/^alcohol_images[\\\/]/, '')}`,
                `/api/images/${product.image_path.replace(/^.*[\\\/]/, '')}`,
                // PLU-based attempts
                `/api/images/${product.plu}.jpg`,
                `/api/images/${product.plu}.png`,
                // NC code attempts if available
                product.nc_code ? `/api/images/${product.nc_code}.jpg` : null,
                product.nc_code ? `/api/images/${product.nc_code}.png` : null,
                // Common naming patterns
                `/api/images/${String(product.plu).padStart(5, '0')}.jpg`,
                `/api/images/product_${product.plu}.jpg`
            ];

            return variations.filter(Boolean);
        }, [product.image_path, product.image_url, product.plu, product.nc_code]);

        const imageVariations = useMemo(() => getImageVariations(), [getImageVariations]);

        const handleImageError = useCallback((e) => {
            console.error('Image failed to load:', {
                attempted_url: e.target.src,
                product_name: product.product_name,
                plu: product.plu,
                original_path: product.image_path,
                backend_url: product.image_url,
                attempt_number: currentImageIndex + 1,
                total_variations: imageVariations.length
            });

            // Try next variation
            if (currentImageIndex < imageVariations.length - 1) {
                setCurrentImageIndex(prev => prev + 1);
                setImageError(false);
                setImageLoading(true);
                console.log(`Trying next image variation: ${imageVariations[currentImageIndex + 1]}`);
            } else {
                console.log('All image variations exhausted, showing placeholder');
                setImageError(true);
                setImageLoading(false);
            }
        }, [currentImageIndex, imageVariations, product]);

        const handleImageLoad = useCallback((e) => {
            console.log('Image loaded successfully:', {
                url: e.target.src,
                product: product.product_name,
                attempt_number: currentImageIndex + 1
            });
            setImageLoading(false);
            setImageError(false);
        }, [currentImageIndex, product.product_name]);

        // If no variations available or all failed, show placeholder
        if (imageVariations.length === 0 || (imageError && currentImageIndex >= imageVariations.length - 1)) {
            return (
                <div className="product-image-placeholder">
                    <span className="placeholder-icon">🥃</span>
                </div>
            );
        }

        return (
            <div className="product-image-container">
                <img 
                    src={imageVariations[currentImageIndex]}
                    alt={`${product.product_name} bottle`}
                    className={`product-image ${imageLoading ? 'loading' : ''}`}
                    onError={handleImageError}
                    onLoad={handleImageLoad}
                />
            </div>
        );
    });

    // Early return for loading state
    if (loading && filteredInventory.length === 0) {
        return (
            <div className="warehouse-inventory">
                <div className="inventory-container">
                    <div className="inventory-header">
                        <h1>Warehouse Inventory</h1>
                        <p>Loading warehouse inventory levels...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="warehouse-inventory">
            <div className="inventory-container">
                <div className="inventory-header">
                    <h1>Warehouse Inventory</h1>
                    <p>State warehouse inventory levels and analytics</p>
                </div>

                {/* Filter Controls */}
                <div className="filters-section">
                    <h2>Filter Options</h2>
                    
                    <div className="filter-controls">
                        {/* Time Period */}
                        <div className="filter-group time-period">
                            <label>Time Period</label>
                            <select
                                value={filterSettings.timePeriod}
                                onChange={(e) => setFilterSettings(prev => ({
                                    ...prev,
                                    timePeriod: e.target.value
                                }))}
                                className="filter-select"
                            >
                                <option value="current_month">Current Month</option>
                                <option value="last_30_days">Last 30 Days</option>
                                <option value="last_90_days">Last 90 Days</option>
                                <option value="last_180_days">Last 180 Days</option>
                            </select>
                        </div>

                        {/* Product Types */}
                        <div className="filter-group">
                            <label>Product Types</label>
                            <select
                                value={filterSettings.productTypes.join(',')}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === 'all') {
                                        setFilterSettings(prev => ({
                                            ...prev,
                                            productTypes: ['Allocation', 'Limited', 'Barrel', 'Listed']
                                        }));
                                    } else {
                                        setFilterSettings(prev => ({
                                            ...prev,
                                            productTypes: value.split(',')
                                        }));
                                    }
                                }}
                                className="filter-select"
                            >
                                <option value="Allocation,Limited,Barrel">Allocated/Limited/Barrel</option>
                                <option value="Allocation">Allocation Only</option>
                                <option value="Limited">Limited Only</option>
                                <option value="Barrel">Barrel Only</option>
                                <option value="all">All Products</option>
                            </select>
                        </div>

                        {/* Reset Button - Inline with filters */}
                        <button
                            onClick={resetFilters}
                            className="reset-button"
                        >
                            Reset
                        </button>

                        {/* Hide Zero Activity - Under Time Period */}
                        <div className="filter-group checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={filterSettings.hideZeroActivity}
                                    onChange={(e) => setFilterSettings(prev => ({
                                        ...prev,
                                        hideZeroActivity: e.target.checked
                                    }))}
                                />
                                Hide items with no activity
                            </label>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="action-buttons">
                        <button
                            onClick={() => fetchRawData(filterSettings.timePeriod, false)}
                            disabled={loading || activeRequests.has(filterSettings.timePeriod)}
                            className="load-button"
                        >
                            {loading ? 'Loading...' : 'Load Data'}
                        </button>
                        
                        <button
                            onClick={() => fetchRawData(filterSettings.timePeriod, true)}
                            disabled={loading || activeRequests.has(filterSettings.timePeriod)}
                            className="refresh-button"
                            title="Refresh data (clears cache)"
                        >
                            {loading ? '↻ Refreshing...' : '↻ Refresh'}
                        </button>
                    </div>

                    {/* Cache Status */}
                    {lastCacheTime && !searchTerm && (
                        <div className="cache-status">
                            <small>
                                📄 Cached data from {new Date(lastCacheTime).toLocaleString()} 
                                (expires {new Date(lastCacheTime + CACHE_DURATION).toLocaleString()})
                            </small>
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="search-section">
                    <div className="search-container">
                        <input
                            type="text"
                            placeholder="Search by product name or PLU (searches all products)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <div className="search-icon">🔍</div>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="error-message">
                        <h3>Error</h3>
                        <p>{error}</p>
                    </div>
                )}

                {/* Results Table */}
                {!error && (
                    <div className="results-section">
                        <div className="results-header">
                            <h3>
                                {searchTerm ? 
                                    `Search Results: "${searchTerm}"` : 
                                    `Warehouse Inventory - ${getTimePeriodLabel(filterSettings.timePeriod)}`
                                }
                            </h3>
                            <p>{filteredInventory.length} products found</p>
                        </div>

                        {filteredInventory.length === 0 && !loading ? (
                            <div className="no-results">
                                {searchTerm ? 
                                    `No products found matching "${searchTerm}"` :
                                    'No products found with current filters'
                                }
                            </div>
                        ) : (
                            <div className="inventory-table">
                                {/* Table Header */}
                                <div className="table-header">
                                    <div className="column-header col-product-name">Product Name</div>
                                    <div className="column-header col-listing-type">Type</div>
                                    <div className="column-header col-price">Price</div>
                                    <div className="column-header col-peak">Peak</div>
                                    <div className="column-header col-low">Low</div>
                                    <div className="column-header col-current">Current</div>
                                    <div className="column-header col-plu">PLU</div>
                                </div>

                                {/* Table Body */}
                                <div className="table-body">
                                    {filteredInventory.map((product) => (
                                        <div key={product.plu} className="table-row">
                                            {/* Product Name with Image */}
                                            <div className="table-cell col-product-name">
                                                <div className="product-name-container">
                                                    <ProductImage product={product} />
                                                    <span className="product-name-text">
                                                        {product.product_name || 'Unknown Product'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Listing Type */}
                                            <div className="table-cell col-listing-type">
                                                <span className={`listing-type-badge ${(product.listing_type || 'unknown').toLowerCase()}`}>
                                                    {product.listing_type || 'N/A'}
                                                </span>
                                            </div>

                                            {/* Price */}
                                            <div className="table-cell col-price">
                                                <span className="price-text">
                                                    {product.retail_price ? `$${product.retail_price}` : 'N/A'}
                                                </span>
                                            </div>

                                            {/* Peak Inventory */}
                                            <div className="table-cell col-peak">
                                                <span className="inventory-number">
                                                    {product.peak_inventory || 0}
                                                </span>
                                            </div>

                                            {/* Low Inventory */}
                                            <div className="table-cell col-low">
                                                <span className="inventory-number">
                                                    {product.low_inventory || 0}
                                                </span>
                                            </div>

                                            {/* Current Inventory - HIGHLIGHTED */}
                                            <div className="table-cell col-current">
                                                <span className="current-inventory-highlight">
                                                    {product.current_inventory || 0}
                                                </span>
                                            </div>

                                            {/* PLU */}
                                            <div className="table-cell col-plu">
                                                <span className="plu-text">
                                                    {product.plu}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WarehouseInventory;