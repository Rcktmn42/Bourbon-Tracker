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

const StoreDetail = () => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStoreData = useCallback(async () => {
    try {
      const response = await fetch('/api/stores', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
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

  useEffect(() => {
    fetchStoreData();
    fetchStoreInventory();
  }, [fetchStoreData, fetchStoreInventory]);

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
            <button onClick={() => navigate('/stores')} className="back-button">
              Back to Stores
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
          <button onClick={() => navigate('/stores')} className="back-link">
            ← Back to Stores
          </button>
        </div>

        {/* Store Summary Section */}
        <div className="store-summary">
          <div className="store-summary-header">
            <h1>{store.nickname}</h1>
            <span className="store-number-display">Store #{store.store_number}</span>
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

        {/* Previous Drops Section (Placeholder) */}
        <div className="previous-drops">
          <h2>Previous Drops</h2>
          <div className="drops-placeholder">
            <p>🚚 Previous delivery tracking coming soon</p>
            <p className="drops-description">
              This section will show historical delivery information for this store, 
              including dates and products that were delivered in previous shipments.
            </p>
            <div className="placeholder-features">
              <h4>Upcoming Features:</h4>
              <ul>
                <li>Last 30 days of deliveries</li>
                <li>Delivery patterns and timing</li>
                <li>Product arrival notifications</li>
                <li>Historical availability trends</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreDetail;