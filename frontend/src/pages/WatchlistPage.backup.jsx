// frontend/src/pages/WatchlistPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import BourbonBarrelToggle from '../components/BourbonBarrelToggle';
import apiFetch from '../utils/api';
import './WatchlistPage.css';

const sanitizeImagePath = (imagePath) => {
  if (!imagePath) {
    return null;
  }

  return imagePath
    .replace(/\\/g, '/')
    .replace(/^alcohol_images\//i, '')
    .replace(/^\//, '');
};

const WatchlistProductImage = React.memo(({ item }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  const imageSources = useMemo(() => {
    const sources = [];

    if (item?.image_url) {
      sources.push(item.image_url);
    }

    if (item?.image_path) {
      const normalized = sanitizeImagePath(item.image_path);
      if (normalized) {
        // After sanitization, we have just the filename (e.g., '638.jpg')
        // Request it from /api/images/ which nginx serves from /opt/alcohol_images/
        sources.push(`/api/images/${normalized}`);
      }
    }

    return Array.from(new Set(sources));
  }, [item?.image_url, item?.image_path]);

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
        🥃
      </div>
    );
  }

  return (
    <div className="product-image-container">
      <img
        src={imageSources[currentIndex]}
        alt={item?.brand_name || 'Product image'}
        className="product-image"
        onError={handleImageError}
      />
    </div>
  );
});

const WatchlistPage = () => {
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Default products state
  const [defaultProducts, setDefaultProducts] = useState([]);
  const [defaultLoading, setDefaultLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Custom items state
  const [customItems, setCustomItems] = useState([]);
  const [customLoading, setCustomLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    plu: '',
    custom_name: '',
    retail_price: '',
    bottles_per_case: ''
  });

  // User preferences state (for toggle states)
  const [userPreferences, setUserPreferences] = useState([]);

  // Global state
  const [error, setError] = useState('');

  // Watchlist search state
  const [watchlistSearchTerm, setWatchlistSearchTerm] = useState('');

  // Default section collapse state
  const [isDefaultSectionCollapsed, setIsDefaultSectionCollapsed] = useState(false);

  const ITEMS_PER_PAGE = 20;

  // Load data on mount
  useEffect(() => {
    loadWatchlistData();
  }, []);

  const loadWatchlistData = async () => {
    try {
      setDefaultLoading(true);
      setCustomLoading(true);

      // Load the combined watchlist (default + custom items)
      const watchlistResponse = await fetch('/api/watchlist', {
        credentials: 'include'
      });

      if (!watchlistResponse.ok) {
        throw new Error('Failed to load watchlist');
      }

      const watchlistData = await watchlistResponse.json();

      // Separate items by source
      const defaultItems = watchlistData.data.filter(item => item.source === 'default');
      const customItems = watchlistData.data.filter(item => item.source === 'custom');

      setDefaultProducts(defaultItems);
      setCustomItems(customItems);

      // Load user preferences for toggle states
      const prefsResponse = await fetch('/api/watchlist/user-preferences', {
        credentials: 'include'
      });

      if (prefsResponse.ok) {
        const prefsData = await prefsResponse.json();
        setUserPreferences(prefsData.data || []);
      }

    } catch (err) {
      console.error('Error loading watchlist data:', err);
      setError('Failed to load watchlist');
    } finally {
      setDefaultLoading(false);
      setCustomLoading(false);
    }
  };

  // Search functionality
  const handleSearch = async () => {
    if (searchTerm.length < 2) {
      setError('Please enter at least 2 characters to search');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const response = await fetch(`/api/watchlist/search/products?q=${encodeURIComponent(searchTerm)}`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.data || []);
        setShowSearchResults(true);

        if (data.data && data.data.length === 0) {
          setError('No products found matching your search');
        }
      } else {
        setError('Failed to search products');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search products');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
    setError('');
  };

  const handleAddFromSearch = async (product) => {
    try {
      const response = await apiFetch('/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({
          plu: product.plu,
          interest_type: 'interested'
        })
      });

      if (response.ok) {
        await loadWatchlistData();
        clearSearch();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add item');
      }
    } catch (err) {
      console.error('Error adding from search:', err);
      setError('Failed to add item to watchlist');
    }
  };

  // Default products functionality
  const handleDefaultToggle = async (plu, isCurrentlyTracked) => {
    try {
      const existingEntry = userPreferences.find(item => item.plu === plu);

      if (isCurrentlyTracked) {
        // User wants to mark as not interested
        if (existingEntry) {
          // Entry exists - HARD DELETE it first
          await apiFetch(`/api/watchlist/${existingEntry.watch_id}`, {
            method: 'DELETE'
          });
        }

        // Create new not_interested entry
        const response = await apiFetch('/api/watchlist', {
          method: 'POST',
          body: JSON.stringify({
            plu,
            interest_type: 'not_interested'
          })
        });

        if (response.ok) {
          // Reload data to refresh state
          await loadWatchlistData();
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to update item');
        }
      } else {
        // User wants to re-enable tracking - HARD DELETE the not_interested entry
        if (existingEntry && existingEntry.interest_type === 'not_interested') {
          const deleteResponse = await apiFetch(`/api/watchlist/${existingEntry.watch_id}`, {
            method: 'DELETE'
          });

          if (deleteResponse.ok) {
            // Reload data to refresh state
            await loadWatchlistData();
          } else {
            const errorData = await deleteResponse.json();
            setError(errorData.message || 'Failed to update item');
          }
        }
      }
    } catch (err) {
      console.error('Error toggling default item:', err);
      setError('Failed to update item');
    }
  };

  // Custom items functionality
  const handleAddCustom = async (e) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!newItem.plu || !newItem.custom_name) {
      setError('PLU and Product Name are required');
      return;
    }

    // Clean PLU input (remove any non-digits)
    const cleanPlu = newItem.plu.replace(/\D/g, '');

    // Validate PLU format (5 digits)
    if (cleanPlu.length !== 5) {
      setError('PLU must be exactly 5 digits (e.g., 99999)');
      return;
    }

    // Validate price if provided
    if (newItem.retail_price && (isNaN(newItem.retail_price) || parseFloat(newItem.retail_price) < 0)) {
      setError('Retail price must be a valid number greater than or equal to 0');
      return;
    }

    // Validate bottles per case if provided
    if (newItem.bottles_per_case && (isNaN(newItem.bottles_per_case) || parseInt(newItem.bottles_per_case) < 1 || parseInt(newItem.bottles_per_case) > 24)) {
      setError('Bottles per case must be a number between 1 and 24');
      return;
    }

    // Check if PLU already exists in alcohol table
    try {
      const checkResponse = await fetch(`/api/inventory/search/${cleanPlu}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (checkResponse.ok) {
        const searchData = await checkResponse.json();
        if (searchData.products && searchData.products.length > 0) {
          const existingProduct = searchData.products[0];
          setError(`PLU ${cleanPlu} already exists in the database as "${existingProduct.brand_name}". Please use the search function above to add this existing product, or choose a different PLU for your custom entry.`);
          return;
        }
      }
    } catch (err) {
      console.warn('Could not check for existing PLU:', err);
      // Continue with creation if check fails
    }

    try {
      // Prepare the payload with all fields
      const payload = {
        plu: parseInt(cleanPlu),
        custom_name: newItem.custom_name.trim(),
        interest_type: 'interested'
      };

      // Add optional fields if they have values
      if (newItem.retail_price && newItem.retail_price !== '') {
        payload.retail_price = parseFloat(newItem.retail_price);
      }

      if (newItem.bottles_per_case && newItem.bottles_per_case !== '') {
        payload.bottles_per_case = parseInt(newItem.bottles_per_case);
      }

      const response = await apiFetch('/api/watchlist', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await loadWatchlistData();
        setNewItem({
          plu: '',
          custom_name: '',
          retail_price: '',
          bottles_per_case: ''
        });
        setShowAddForm(false);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add custom item');
      }
    } catch (err) {
      console.error('Error adding custom item:', err);
      setError('Failed to add custom item');
    }
  };

  const handleCustomToggle = async (item) => {
    try {
      // Find the user preference entry for this item
      const prefEntry = userPreferences.find(pref => pref.plu === item.plu);

      if (!prefEntry) {
        setError('Could not find preference entry for this item');
        return;
      }

      // Toggle between 'interested' and 'not_interested', keep active = true
      const newInterestType = prefEntry.interest_type === 'interested' ? 'not_interested' : 'interested';

      // We need to delete and recreate since interest_type is part of the logic
      // First delete
      await apiFetch(`/api/watchlist/${prefEntry.watch_id}`, {
        method: 'DELETE'
      });

      // Then create with new interest_type
      const response = await apiFetch('/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({
          plu: item.plu,
          custom_name: item.custom_name,
          interest_type: newInterestType
        })
      });

      if (response.ok) {
        await loadWatchlistData();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update item');
      }
    } catch (err) {
      console.error('Error toggling custom item:', err);
      setError('Failed to update item');
    }
  };

  const handleRemoveCustom = async (item) => {
    try {
      // Find the user preference entry for this item
      const prefEntry = userPreferences.find(pref => pref.plu === item.plu);

      if (!prefEntry) {
        setError('Could not find preference entry for this item');
        return;
      }

      // SOFT DELETE - set active = false
      const response = await apiFetch(`/api/watchlist/${prefEntry.watch_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: false })
      });

      if (response.ok) {
        await loadWatchlistData();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to remove item');
      }
    } catch (err) {
      console.error('Error removing custom item:', err);
      setError('Failed to remove item');
    }
  };

  // Filter and pagination logic
  const filteredDefaultProducts = defaultProducts.filter(item => {
    const listingTypeKey = (item.listing_type_key || item.listing_type || '').toLowerCase();
    const filterMatches = selectedFilter === 'all' ? true : listingTypeKey === selectedFilter;

    let searchMatch = true;
    if (watchlistSearchTerm.trim()) {
      const searchLower = watchlistSearchTerm.trim().toLowerCase();
      const pluMatch = item.plu?.toString().includes(searchLower);
      const nameMatch = (item.brand_name || '').toLowerCase().includes(searchLower);
      searchMatch = pluMatch || nameMatch;
    }

    return filterMatches && searchMatch;
  });

  const totalPages = Math.ceil(filteredDefaultProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredDefaultProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const filters = [
    { key: 'all', label: 'All Products' },
    { key: 'limited', label: 'Limited' },
    { key: 'allocation', label: 'Allocation' },
    { key: 'barrel', label: 'Barrel' }
  ];

  if (defaultLoading || customLoading) {
    return (
      <div className="watchlist-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your watchlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="watchlist-page">
      <div className="page-header">
        <h1>My Watchlist</h1>
        <p>Track your favorite products and manage custom items</p>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError('')} className="error-close">X</button>
        </div>
      )}


      {/* Default Products Section */}
      <section className="default-section">
        <div className="section-header">
          <div className="section-title">
            <h2>Default Watchlist</h2>
            <p>Premium and allocated products tracked by default</p>
          </div>
          <button
            className="collapse-btn"
            onClick={() => setIsDefaultSectionCollapsed(!isDefaultSectionCollapsed)}
            title={isDefaultSectionCollapsed ? "Expand section" : "Collapse section"}
          >
            <span className={`expand-icon ${isDefaultSectionCollapsed ? '' : 'rotated'}`}>▼</span>
          </button>
        </div>

        {!isDefaultSectionCollapsed && (
          <div className="default-section-content">
            <div className="filter-controls">
          {filters.map((filter) => (
            <button
              key={filter.key}
              className={`filter-btn ${selectedFilter === filter.key ? 'active' : ''}`}
              onClick={() => {
                setSelectedFilter(filter.key);
                setCurrentPage(1);
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Watchlist Search */}
        <div className="watchlist-search">
          <input
            type="text"
            placeholder="Search watchlist by PLU or product name..."
            value={watchlistSearchTerm}
            onChange={(e) => {
              setWatchlistSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
            className="watchlist-search-input"
          />
          {watchlistSearchTerm && (
            <button
              className="clear-watchlist-search"
              onClick={() => {
                setWatchlistSearchTerm('');
                setCurrentPage(1);
              }}
              title="Clear search"
            >
              X
            </button>
          )}
        </div>

        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <div className="pagination-info">
            Page {currentPage} of {totalPages} ({filteredDefaultProducts.length} items)
          </div>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>

        <div className="mobile-card-layout">
          {paginatedProducts.map((item) => {
            // Check user preferences to determine toggle state
            const prefEntry = userPreferences.find(pref => pref.plu === item.plu);
            // Default items are tracked UNLESS there's a not_interested preference
            const isTracked = !prefEntry || prefEntry.interest_type !== 'not_interested';
            const listingTypeKey = (item.listing_type_key || item.listing_type || 'unknown').toLowerCase();
            const listingLabel = item.listing_type || 'N/A';
            return (
              <div key={item.plu} className="mobile-product-card">
                {/* Left: Image */}
                <div className="mobile-image-section">
                  <WatchlistProductImage item={item} />
                </div>

                {/* Center: Top (2/3) with name + meta, Divider, Bottom (1/3) with bottles per case and size */}
                <div className="mobile-content-section split-layout">
                  <div className="content-top">
                    <div className="mobile-product-name">
                      {item.brand_name}
                    </div>
                    <div className="mobile-meta-row">
                      <span
                        className={`listing-type-badge ${listingTypeKey}`}
                        title={listingLabel}
                      >
                        {listingLabel}
                      </span>
                      <span className="mobile-product-plu">
                        PLU: {item.plu}
                      </span>
                      <span className="mobile-product-price">
                        {item.retail_price ? `$${item.retail_price}` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="soft-divider" aria-hidden="true"></div>

                  <div className="content-bottom">
                    <div className="mobile-peak-low">
                      <div className="stat-row">
                        <span className="mobile-stat-label">Size:</span>
                        <span className="mobile-stat-value">
                          {item.size_ml ? `${item.size_ml} ml` : (item.size || 'N/A')}
                        </span>
                      </div>
                      <div className="stat-row">
                        <span className="mobile-stat-label">Bottles/Case:</span>
                        <span className="mobile-stat-value">
                          {item.bottles_per_case || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Toggle instead of Current inventory */}
                <div className="mobile-current-section">
                  <div className="mobile-toggle-container">
                    <BourbonBarrelToggle
                      isOn={isTracked}
                      onChange={() => handleDefaultToggle(item.plu, isTracked)}
                      size="medium"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
          </div>
        )}
      </section>

      {/* Custom Items Section */}
      <section className="custom-section">
        <div className="section-header">
          <h2>Custom Items</h2>
          <button
            className="add-custom-btn"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : 'Add Custom Item'}
          </button>
        </div>

        {showAddForm && (
          <div className="add-custom-form">
            {/* Search Existing Products */}
            <div className="search-container">
              <h4>Search Existing Products</h4>
              <div className="search-input-group">
                <input
                  type="text"
                  placeholder="Search by product name or PLU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="search-input"
                />
                <button
                  className="search-btn"
                  onClick={handleSearch}
                  disabled={isSearching || searchTerm.length < 2}
                >
                  {isSearching ? 'Working...' : 'Search'}
                </button>
                {searchTerm && (
                  <button className="clear-btn" onClick={clearSearch}>
                    X
                  </button>
                )}
              </div>

              {showSearchResults && (
                <div className="search-results">
                  <div className="search-results-header">
                    <h5>Search Results ({searchResults.length})</h5>
                    <button className="close-results-btn" onClick={() => setShowSearchResults(false)}>
                      X
                    </button>
                  </div>
                  <div className="search-results-list">
                    {searchResults.length > 0 ? (
                      searchResults.map((product, index) => (
                        <div key={product.plu || index} className="search-result-item">
                          <div className="search-item-info">
                            <h6>{product.brand_name || 'Unknown Product'}</h6>
                            <div className="search-item-details">
                              <span className="plu">PLU: {product.plu}</span>
                              {product.retail_price && (
                                <span className="price">${product.retail_price}</span>
                              )}
                              {product.alcohol_type && (
                                <span className="type">{product.alcohol_type}</span>
                              )}
                            </div>
                          </div>
                          <button
                            className="add-btn"
                            onClick={() => handleAddFromSearch(product)}
                          >
                            Add to Watchlist
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="no-results">
                        <p>No products found matching "{searchTerm}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Manual Entry */}
            <div className="manual-entry-container">
              <h4>Or Create Custom Entry</h4>
              <p className="form-instructions">
                Create a custom entry for products not found in our database.
                PLU must be exactly 5 digits. Only PLU and Product Name are required.
              </p>
              <form onSubmit={handleAddCustom}>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="customPlu">PLU * <span className="field-hint">(5 digits)</span></label>
                    <input
                      id="customPlu"
                      type="text"
                      placeholder="99999"
                      value={newItem.plu}
                      onChange={(e) => setNewItem({ ...newItem, plu: e.target.value })}
                      maxLength="5"
                      required
                    />
                    <small className="field-description">
                      Product Lookup Number - must be exactly 5 digits
                    </small>
                  </div>
                  <div className="form-field">
                    <label htmlFor="customName">Product Name *</label>
                    <input
                      id="customName"
                      type="text"
                      placeholder="My Custom Bourbon"
                      value={newItem.custom_name}
                      onChange={(e) => setNewItem({ ...newItem, custom_name: e.target.value })}
                      maxLength="100"
                      required
                    />
                    <small className="field-description">
                      Enter a descriptive name for this product
                    </small>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="customPrice">Retail Price <span className="optional-label">(optional)</span></label>
                    <input
                      id="customPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="29.95"
                      value={newItem.retail_price}
                      onChange={(e) => setNewItem({ ...newItem, retail_price: e.target.value })}
                    />
                    <small className="field-description">
                      Price in dollars (e.g., 29.95)
                    </small>
                  </div>
                  <div className="form-field">
                    <label htmlFor="customBottles">Bottles per Case <span className="optional-label">(optional)</span></label>
                    <input
                      id="customBottles"
                      type="number"
                      min="1"
                      max="24"
                      placeholder="12"
                      value={newItem.bottles_per_case}
                      onChange={(e) => setNewItem({ ...newItem, bottles_per_case: e.target.value })}
                    />
                    <small className="field-description">
                      How many bottles come in a case (usually 6, 12, or 24)
                    </small>
                  </div>
                </div>

                <button type="submit" className="submit-btn">
                  Add Custom Item
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="mobile-card-layout">
          {customItems.length > 0 ? (
            customItems.map((item) => {
              // Check user preferences to determine toggle state
              const prefEntry = userPreferences.find(pref => pref.plu === item.plu);
              // Custom items are interested by default, toggle shows current state
              const isInterested = !prefEntry || prefEntry.interest_type === 'interested';

              return (
              <div key={item.plu} className="mobile-product-card">
                {/* Left: No image for custom items, show custom icon */}
                <div className="mobile-image-section">
                  <div className="product-image-container">
                    <div className="product-image-placeholder custom-placeholder">
                      📝
                    </div>
                  </div>
                </div>

                {/* Center: Top (2/3) with name + meta, Divider, Bottom (1/3) with bottles per case and size */}
                <div className="mobile-content-section split-layout">
                  <div className="content-top">
                    <div className="mobile-product-name">
                      {item.custom_name || item.brand_name}
                    </div>
                    <div className="mobile-meta-row">
                      <span className="listing-type-badge custom">
                        Custom
                      </span>
                      <span className="mobile-product-plu">
                        PLU: {item.plu}
                      </span>
                      <span className="mobile-product-price">
                        {item.retail_price ? `$${item.retail_price}` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="soft-divider" aria-hidden="true"></div>

                  <div className="content-bottom">
                    <div className="mobile-peak-low">
                      <div className="stat-row">
                        <span className="mobile-stat-label">Size:</span>
                        <span className="mobile-stat-value">
                          {item.size_ml ? `${item.size_ml} ml` : (item.size || 'N/A')}
                        </span>
                      </div>
                      <div className="stat-row">
                        <span className="mobile-stat-label">Bottles/Case:</span>
                        <span className="mobile-stat-value">
                          {item.bottles_per_case || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Toggle and Remove button */}
                <div className="mobile-current-section">
                  <div className="mobile-toggle-container custom-actions">
                    <BourbonBarrelToggle
                      isOn={isInterested}
                      onChange={() => handleCustomToggle(item)}
                      size="medium"
                    />
                    <button
                      className="remove-btn"
                      onClick={() => handleRemoveCustom(item)}
                      title="Remove from watchlist"
                    >
                      X
                    </button>
                  </div>
                </div>
              </div>
              );
            })
          ) : (
            <div className="no-custom-items">
              <p>No custom items yet. Add some using the search above or create a custom entry.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default WatchlistPage;
