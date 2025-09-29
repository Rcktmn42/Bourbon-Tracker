// frontend/src/pages/WarehouseInventory.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './WarehouseInventory.css';

const CACHE_KEY = 'warehouse-inventory-cache';
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

const WarehouseInventory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rawInventoryData, setRawInventoryData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastCacheTime, setLastCacheTime] = useState(null);
  const [activeRequests, setActiveRequests] = useState(new Set());

  const [filterSettings, setFilterSettings] = useState({
    timePeriod: 'current_month',
    productTypes: ['Allocation', 'Limited', 'Barrel'],
    hideZeroActivity: true
  });

  const saveToCache = useCallback((timePeriod, data) => {
    try {
      const cacheData = {
        rawData: data,
        timestamp: Date.now(),
        timePeriod,
        etag: data.meta?.file_modified
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
      ['current_month', 'last_30_days', 'last_90_days'].forEach(period => {
        localStorage.removeItem(`${CACHE_KEY}-${period}`);
      });
      setLastCacheTime(null);
    }
  }, []);

  const fetchRawData = useCallback(async (timePeriod, forceRefresh = false) => {
    const requestKey = timePeriod;

    if (activeRequests.has(requestKey)) {
      return;
    }

    if (!forceRefresh) {
      const cached = loadFromCache(timePeriod);
      if (cached && cached.rawData) {
        setRawInventoryData(prev => ({
          ...prev,
          [timePeriod]: cached.rawData
        }));
        return;
      }
    }

    setActiveRequests(prev => new Set(prev).add(requestKey));
    setLoading(true);
    setError(null);

    try {
      const headers = {};
      const cached = loadFromCache(timePeriod);
      if (cached && cached.etag) {
        headers['If-None-Match'] = `"${cached.etag}"`;
      }

      const response = await fetch(`/api/reports/warehouse-inventory?timePeriod=${timePeriod}`, {
        credentials: 'include',
        headers
      });

      if (response.status === 304) {
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
        setRawInventoryData(prev => ({
          ...prev,
          [timePeriod]: data
        }));
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

  const handleProductClick = useCallback((product) => {
    // Navigate to StatewideShipments with the product name pre-filled
    const productName = product.product_name || product.name || 'Unknown Product';
    navigate(`/statewide-shipments?search=${encodeURIComponent(productName)}`);
  }, [navigate]);

  const filteredInventory = useMemo(() => {
    const currentData = rawInventoryData[filterSettings.timePeriod];
    if (!currentData || !currentData.products) {
      return [];
    }

    let filtered = currentData.products;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        (product.product_name && product.product_name.toLowerCase().includes(searchLower)) ||
        (product.plu && product.plu.toString().includes(searchTerm))
      );
    } else {
      if (filterSettings.productTypes && filterSettings.productTypes.length > 0) {
        filtered = filtered.filter(product =>
          filterSettings.productTypes.includes(product.listing_type)
        );
      }

      if (filterSettings.hideZeroActivity) {
        filtered = filtered.filter(product =>
          product.current_inventory > 0 || product.peak_inventory > 0
        );
      }
    }

    return filtered;
  }, [rawInventoryData, filterSettings, searchTerm]);

  useEffect(() => {
    fetchRawData(filterSettings.timePeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRawData(filterSettings.timePeriod);
  }, [filterSettings.timePeriod, fetchRawData]);

  const getTimePeriodLabel = useCallback((period) => {
    switch (period) {
      case 'current_month': return 'Current Month';
      case 'last_30_days': return 'Last 30 Days';
      case 'last_90_days': return 'Last 90 Days';
      default: return period;
    }
  }, []);

  const sanitizeImagePath = (imagePath) => {
    if (!imagePath) {
      return null;
    }

    return imagePath
      .replace(/\\/g, '/')
      .replace(/^alcohol_images\//i, '')
      .replace(/^\//, '');
  };

  const ProductImage = React.memo(({ product }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [imageFailed, setImageFailed] = useState(false);

    const imageSources = useMemo(() => {
      const sources = [];

      if (product?.image_url) {
        sources.push(product.image_url);
      }

      if (product?.image_path) {
        const normalized = sanitizeImagePath(product.image_path);
        if (normalized) {
          sources.push(`/api/images/${normalized}`);
          sources.push(`/api/images/alcohol_images/${normalized}`);
        }
        const rawPath = product.image_path.replace(/^\//, '');
        if (rawPath && rawPath !== normalized) {
          sources.push(`/api/images/${rawPath}`);
        }
      }

      return Array.from(new Set(sources));
    }, [product?.image_url, product?.image_path]);

    useEffect(() => {
      setCurrentIndex(0);
      setImageFailed(false);
    }, [imageSources]);

    const handleImageError = () => {
      if (currentIndex < imageSources.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setImageFailed(true);
      }
    };

    if (imageSources.length === 0 || imageFailed) {
      return (
        <div className="product-image-placeholder">
          <span className="placeholder-icon">🥃</span>
        </div>
      );
    }

    return (
      <div className="product-image-container">
        <img
          src={imageSources[currentIndex]}
          alt={`${product.product_name || 'Product'} bottle`}
          className="product-image"
          onError={handleImageError}
        />
      </div>
    );
  });

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

        {/* Filters */}
        <div className="filters-section">
          <h2>Filter Options</h2>

          <div className="filter-controls">
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
              </select>
            </div>

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
              </select>
            </div>

            <button onClick={resetFilters} className="reset-button">
              Reset
            </button>

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

          {lastCacheTime && !searchTerm && (
            <div className="cache-status">
              <small>
                📄 Cached data from {new Date(lastCacheTime).toLocaleString()}
                {' '}(expires {new Date(lastCacheTime + CACHE_DURATION).toLocaleString()})
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

        {/* Error */}
        {error && (
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}

        {/* Results */}
        {!error && (
          <div className="results-section">
            <div className="results-header">
              <h3>
                {searchTerm
                  ? `Search Results: "${searchTerm}"`
                  : `Warehouse Inventory - ${getTimePeriodLabel(filterSettings.timePeriod)}`}
              </h3>
              <p>{filteredInventory.length} products found</p>
            </div>

            {filteredInventory.length === 0 && !loading ? (
              <div className="no-results">
                {searchTerm
                  ? `No products found matching "${searchTerm}"`
                  : 'No products found with current filters'}
              </div>
            ) : (
              <div className="mobile-card-layout">
                {filteredInventory.map((product) => (
                  <div
                    key={product.plu}
                    className="mobile-product-card clickable"
                    onClick={() => handleProductClick(product)}
                    title={`View shipments for ${product.product_name || 'this product'}`}
                  >
                    {/* Left: Image */}
                    <div className="mobile-image-section">
                      <ProductImage product={product} />
                    </div>

                    {/* Center: Top (2/3) with name + meta, Divider, Bottom (1/3) with Peak/Low */}
                    <div className="mobile-content-section split-layout">
                      <div className="content-top">
                        <div className="mobile-product-name">
                          {product.product_name || 'Unknown Product'}
                        </div>
                        <div className="mobile-meta-row">
                          <span
                            className={`listing-type-badge ${(product.listing_type || 'unknown').toLowerCase()}`}
                            title={product.listing_type || 'N/A'}
                          >
                            {product.listing_type || 'N/A'}
                          </span>
                          <span className="mobile-product-plu">
                            PLU: {product.plu || product.nc_code || 'N/A'}
                          </span>
                          <span className="mobile-product-price">
                            {product.retail_price ? `$${product.retail_price}` : 'N/A'}
                          </span>
                        </div>
                        {product.bottles_per_case && (
                          <div className="mobile-bottles-per-case">
                            Bottles Per Case: {product.bottles_per_case}
                          </div>
                        )}
                      </div>

                      <div className="soft-divider" aria-hidden="true"></div>

                      <div className="content-bottom">
                        <div className="mobile-peak-low">
                          <div className="stat-row">
                            <span className="mobile-stat-label">Peak:</span>
                            <span className="mobile-stat-value">
                              {Number(product.peak_inventory ?? 0).toLocaleString()}
                            </span>
                            {product.peak_inventory_date && (
                              <span className="mobile-stat-date">
                                {new Date(product.peak_inventory_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="stat-row">
                            <span className="mobile-stat-label">Low:</span>
                            <span className="mobile-stat-value">
                              {Number(product.low_inventory ?? 0).toLocaleString()}
                            </span>
                            {product.low_inventory_date && (
                              <span className="mobile-stat-date">
                                {new Date(product.low_inventory_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Current */}
                    <div className="mobile-current-section">
                      <div className="mobile-current-label">Current</div>
                      <div className="mobile-current-value">
                        {product.current_inventory || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseInventory;
