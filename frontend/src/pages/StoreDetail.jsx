// frontend/src/pages/StoreDetail.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './StoreDetail.css';

const ProductImage = React.memo(({ product }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const getImageVariations = useCallback(() => {
    if (!product.image_path || product.image_path === 'no image available') {
      return [];
    }

    const variations = [
      product.image_url,
      `/api/images/${product.image_path}`,
      `/api/images/${product.image_path.replace(/^alcohol_images[/\\]/, '')}`,
      `/api/images/${product.image_path.replace(/^.*[/\\]/, '')}`,
      `/api/images/${product.nc_code}.jpg`,
      `/api/images/${product.nc_code}.png`,
      `/api/images/${String(product.nc_code).padStart(5, '0')}.jpg`,
      `/api/images/product_${product.nc_code}.jpg`
    ];

    return variations.filter(Boolean);
  }, [product.image_path, product.image_url, product.nc_code]);

  const imageVariations = useMemo(() => getImageVariations(), [getImageVariations]);

  const handleImageError = useCallback(() => {
    if (currentImageIndex < imageVariations.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
      setImageError(false);
      setImageLoading(true);
    } else {
      setImageError(true);
      setImageLoading(false);
    }
  }, [currentImageIndex, imageVariations.length]);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
    setImageError(false);
  }, []);

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
        alt={`${product.brand_name} bottle`}
        className={`product-image ${imageLoading ? 'loading' : ''}`}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </div>
  );
});

const StoreInventoryCard = ({ item }) => {
  return (
    <div className="store-product-card">
      {/* Left: Image */}
      <div className="store-image-section">
        <ProductImage product={item} />
      </div>

      {/* Center: Product details (simplified from warehouse version) */}
      <div className="store-content-section">
        <div className="store-product-name">
          {item.brand_name || 'Unknown Product'}
        </div>
        <div className="store-meta-row">
          <span
            className={`listing-type-badge ${(item.Listing_Type || 'unknown').toLowerCase()}`}
            title={item.Listing_Type || 'N/A'}
          >
            {item.Listing_Type || 'N/A'}
          </span>
          <span className="store-product-price">
            {item.retail_price ? `$${item.retail_price}` : 'N/A'}
          </span>
        </div>
        <div className="store-plu-row">
          <span className="store-plu-label">PLU:</span>
          <span className="store-plu-value">{item.nc_code || 'N/A'}</span>
        </div>
      </div>

      {/* Right: Current inventory */}
      <div className="store-current-section">
        <div className="store-current-label">In Stock</div>
        <div className="store-current-value">
          {item.quantity || 0}
        </div>
      </div>
    </div>
  );
};

const InventoryChangeCard = ({ item }) => {
  return (
    <div className="inventory-change-card">
      {/* Left: Image */}
      <div className="change-image-section">
        <ProductImage product={item} />
      </div>

      {/* Center: Product details with change info */}
      <div className="change-content-section">
        <div className="change-product-name">
          {item.product_name || 'Unknown Product'}
        </div>
        <div className="change-meta-row">
          <span
            className={`listing-type-badge ${(item.listing_type || 'unknown').toLowerCase()}`}
            title={item.listing_type || 'N/A'}
          >
            {item.listing_type || 'N/A'}
          </span>
          <span className="change-product-price">
            {item.retail_price ? `$${item.retail_price}` : 'N/A'}
          </span>
        </div>
        <div className="change-plu-row">
          <span className="change-plu-label">PLU:</span>
          <span className="change-plu-value">{item.nc_code || item.plu || 'N/A'}</span>
        </div>
        
        {/* Net change indicator */}
        <div className={`change-indicator ${item.change_type}`}>
          {item.change_type === 'first' ? (
            <span className="first-arrival">First time stocked!</span>
          ) : (
            <span className="increase">
              +{item.delta || 0} bottles added
            </span>
          )}
        </div>
      </div>

      {/* Right: Reported quantity */}
      <div className="change-quantity-section">
        <div className="change-quantity-label">Reported</div>
        <div className="change-quantity-value">
          {item.quantity || 0}
        </div>
      </div>
    </div>
  );
};

const StoreDetail = () => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [allStores, setAllStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canGoBack, setCanGoBack] = useState(false);
  
  // Previous drops section state
  const [dropsLoading, setDropsLoading] = useState(false);
  const [dropsData, setDropsData] = useState(null);
  const [selectedDaysPeriod, setSelectedDaysPeriod] = useState(30);
  const [expandedDates, setExpandedDates] = useState(new Set());

  const fetchStoreData = useCallback(async () => {
    try {
      const response = await fetch('/api/stores', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        // Set all stores for dropdown, sorted alphabetically by nickname
        const sortedStores = (data.stores || []).sort((a, b) => 
          (a.nickname || '').localeCompare(b.nickname || '', undefined, { 
            numeric: true, 
            sensitivity: 'base' 
          })
        );
        setAllStores(sortedStores);
        
        // Find current store
        const foundStore = data.stores.find(s => s.store_id === parseInt(storeId));
        if (foundStore) {
          setStore(foundStore);
        } else {
          setError('Store not found');
        }
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to fetch store data');
    }
  }, [storeId]);

  const fetchStoreInventory = useCallback(async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/inventory`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setInventory(data.inventory || []);
      } else {
        setInventory([]);
      }
    } catch (err) {
      console.error('Failed to fetch store inventory:', err);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  const fetchDropsData = useCallback(async (days = selectedDaysPeriod) => {
    try {
      setDropsLoading(true);
      
      const response = await fetch(`/api/inventory/store-history/${storeId}?days=${days}`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDropsData(data);
        // Start with all dates collapsed
        setExpandedDates(new Set());
      } else {
        console.error('Error fetching drops data:', data.error);
        setDropsData(null);
      }
    } catch (err) {
      console.error('Failed to fetch drops data:', err);
      setDropsData(null);
    } finally {
      setDropsLoading(false);
    }
  }, [storeId, selectedDaysPeriod]);

  useEffect(() => {
    fetchStoreData();
    fetchStoreInventory();
    fetchDropsData();
    
    // Check if we can go back (user didn't directly type URL)
    setCanGoBack(window.history.length > 1);
  }, [fetchStoreData, fetchStoreInventory, fetchDropsData]);

  const handleGoBack = () => {
    if (canGoBack && window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to stores page
      navigate('/stores');
    }
  };

  const handleStoreChange = (newStoreId) => {
    if (newStoreId && newStoreId !== storeId) {
      navigate(`/stores/${newStoreId}`);
    }
  };

  const getBackButtonText = () => {
    return '← Back';
  };

  const handleDaysPeriodChange = (days) => {
    setSelectedDaysPeriod(days);
    fetchDropsData(days);
  };

  const toggleDateExpansion = (date) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const expandAllDates = () => {
    if (dropsData && dropsData.changes) {
      const allDates = dropsData.changes.map(change => change.date);
      setExpandedDates(new Set(allDates));
    }
  };

  const collapseAllDates = () => {
    setExpandedDates(new Set());
  };

  if (loading) {
    return (
      <div className="store-detail-page">
        <div className="store-detail-container">
          <div className="store-detail-loading">
            <div className="loading-spinner"></div>
            <p>Loading store details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="store-detail-page">
        <div className="store-detail-container">
          <div className="store-detail-error">
            <h2>Error Loading Store</h2>
            <p>{error || 'Store not found'}</p>
            <button onClick={handleGoBack} className="back-button">
              {getBackButtonText()}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="store-detail-page">
      <div className="store-detail-container">
        {/* Back Navigation */}
        <div className="back-navigation">
          <button onClick={handleGoBack} className="back-link">
            {getBackButtonText()}
          </button>
        </div>

        {/* Store Summary Section */}
        <div className="store-summary">
          <div className="store-summary-header">
            <div className="store-selector-container">
              <div className="store-selector-wrapper">
                <select 
                  value={storeId} 
                  onChange={(e) => handleStoreChange(e.target.value)}
                  className="store-selector"
                >
                  {allStores.map(storeOption => (
                    <option key={storeOption.store_id} value={storeOption.store_id}>
                      {storeOption.nickname} (#{storeOption.store_number})
                    </option>
                  ))}
                </select>
                <div className="store-selector-icon">▼</div>
              </div>
              <span className="store-number-display">Store #{store.store_number}</span>
            </div>
          </div>
          
          <div className="store-summary-details">
            <div className="store-badges">
              <span className="region-badge">{store.region}</span>
              {store.mixed_beverage === 1 && (
                <span className="mixed-badge">Mixed Beverage</span>
              )}
            </div>
            
            <div className="store-contact-info">
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="address-link"
                >
                  {store.address}
                </a>
              </div>
              
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <span className="phone-placeholder">Phone: (919) 555-0123</span>
              </div>
            </div>
            
            <div className="delivery-info">
              <h3>Delivery Information</h3>
              <div className="delivery-details">
                <div className="delivery-detail">
                  <span className="delivery-label">Delivery Day:</span>
                  <span className="delivery-value">
                    {store.delivery_day || 'Not available'}
                  </span>
                </div>
                <div className="delivery-detail">
                  <span className="delivery-label">Delivery Interval:</span>
                  <span className="delivery-value">
                    {store.delivery_interval_days ? `${store.delivery_interval_days} weeks` : 'Not available'}
                  </span>
                </div>
                <div className="delivery-detail">
                  <span className="delivery-label">Last Delivery:</span>
                  <span className="delivery-value">
                    {store.last_delivery_date ? new Date(store.last_delivery_date).toLocaleDateString() : 'Not available'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Inventory Section */}
        <div className="store-inventory">
          <h2>Current Inventory</h2>
          {inventory.length === 0 ? (
            <div className="no-inventory">
              <p>No allocated products currently in stock at this store.</p>
              <p className="inventory-note">
                This section shows allocated bourbon and whiskey products. 
                Regular inventory items are not displayed.
              </p>
            </div>
          ) : (
            <div className="store-inventory-list">
              {inventory.map((item, index) => (
                <StoreInventoryCard key={index} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Previous Drops Section */}
        <div className="previous-drops">
          <div className="drops-header">
            <h2>Previous Drops</h2>
            
            <div className="drops-controls">
              {/* Time period selector */}
              <div className="drops-period-selector">
                <span className="period-label">Show last:</span>
                <div className="period-buttons">
                  {[30, 60, 90].map(days => (
                    <button
                      key={days}
                      onClick={() => handleDaysPeriodChange(days)}
                      className={`period-button ${selectedDaysPeriod === days ? 'active' : ''}`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>

              {/* Expand/Collapse controls */}
              {dropsData && dropsData.changes && dropsData.changes.length > 0 && (
                <div className="expand-collapse-controls">
                  <button
                    onClick={expandAllDates}
                    className="control-button expand-button"
                    title="Expand all dates"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={collapseAllDates}
                    className="control-button collapse-button"
                    title="Collapse all dates"
                  >
                    Collapse All
                  </button>
                </div>
              )}
            </div>
          </div>

          {dropsLoading ? (
            <div className="drops-loading">
              <div className="loading-spinner"></div>
              <p>Loading inventory changes...</p>
            </div>
          ) : dropsData && dropsData.changes && dropsData.changes.length > 0 ? (
            <div className="drops-content">
              {/* Summary stats */}
              <div className="drops-summary">
                <div className="summary-stat">
                  <span className="stat-value">{dropsData.summary.totalChanges}</span>
                  <span className="stat-label">Total Changes</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-value">{dropsData.summary.uniqueProducts}</span>
                  <span className="stat-label">Unique Products</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-value">+{dropsData.summary.totalInventoryAdded}</span>
                  <span className="stat-label">Bottles Added</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-value">{dropsData.summary.daysWithChanges}</span>
                  <span className="stat-label">Active Days</span>
                </div>
              </div>

              {/* Date-grouped changes */}
              <div className="drops-timeline">
                {dropsData.changes.map((dateGroup) => (
                  <div key={dateGroup.date} className="date-group">
                    <button 
                      className={`date-header ${expandedDates.has(dateGroup.date) ? 'expanded' : ''}`}
                      onClick={() => toggleDateExpansion(dateGroup.date)}
                    >
                      <div className="date-info">
                        <span className="date-primary">{dateGroup.formatted_date}</span>
                        <span className="date-secondary">{dateGroup.day_of_week}</span>
                      </div>
                      <div className="date-stats">
                        <span className="item-count">{dateGroup.item_count} changes</span>
                        <span className={`expand-icon ${expandedDates.has(dateGroup.date) ? 'rotated' : ''}`}>▼</span>
                      </div>
                    </button>
                    
                    {expandedDates.has(dateGroup.date) && (
                      <div className="date-content">
                        <div className="changes-grid">
                          {dateGroup.items.map((item, index) => (
                            <InventoryChangeCard key={`${dateGroup.date}-${item.history_id || index}`} item={item} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-drops">
              <h3>No inventory changes found</h3>
              <p>No bourbon deliveries or restocking detected for the last {selectedDaysPeriod} days.</p>
              <p className="drops-description">
                This section shows when products were first stocked or when inventory levels increased at this store.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Back Navigation */}
        <div className="bottom-navigation">
          <button onClick={handleGoBack} className="back-link bottom-back-link">
            {getBackButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreDetail;