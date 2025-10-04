// frontend/src/pages/WatchlistPage.jsx

import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import BourbonBarrelToggle from '../components/BourbonBarrelToggle';
import './WatchlistPage.css';

// Product image component
const ProductImage = ({ product }) => {
  const hasImage = product.has_image && product.image_url;

  return hasImage ? (
    <img
      src={product.image_url}
      alt={product.brand_name || 'Product'}
      className="product-image"
    />
  ) : (
    <div className="product-image-placeholder">
      <span>No Image</span>
    </div>
  );
};

export default function WatchlistPage() {
  const [activeList, setActiveList] = useState([]);
  const [catalogList, setCatalogList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-list'); // 'my-list' | 'catalog'
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDisabledOnly, setShowDisabledOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [listExpanded, setListExpanded] = useState(true);
  const [addExpanded, setAddExpanded] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [customPLU, setCustomPLU] = useState('');
  const [customName, setCustomName] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (activeTab === 'my-list') {
      fetchActiveList();
    } else {
      fetchCatalog();
    }
  }, [activeTab, page, categoryFilter, search, showDisabledOnly]);

  const fetchActiveList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 50,
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(search && { search })
      });
      const response = await apiFetch(`/api/watchlist?${params}`);
      const data = await response.json();
      setActiveList(data.data || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching active watchlist:', error);
      showMessage('Failed to load watchlist', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 50,
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(search && { search })
      });
      const response = await apiFetch(`/api/watchlist/catalog?${params}`);
      const data = await response.json();
      setCatalogList(data.data || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching catalog:', error);
      showMessage('Failed to load catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleToggle = async (plu, currentIsWatching, isCustom) => {
    if (isCustom) {
      showMessage('Custom items cannot be toggled. Use "Remove" to delete.', 'warning');
      return;
    }

    try {
      const newInterest = currentIsWatching ? 'not_interested' : 'interested';
      const response = await apiFetch('/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({ plu, interest_type: newInterest })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle item');
      }

      showMessage(
        currentIsWatching
          ? 'Item removed from My List (visible in Browse Catalog)'
          : 'Item added to My List',
        'success'
      );

      // Refresh current view
      if (activeTab === 'my-list') {
        fetchActiveList();
      } else {
        fetchCatalog();
      }
    } catch (error) {
      console.error('Error toggling item:', error);
      showMessage('Failed to toggle item', 'error');
    }
  };

  const handleRemove = async (watchId) => {
    if (!confirm('Remove this item from your watchlist?')) {
      return;
    }

    try {
      const response = await apiFetch(`/api/watchlist/${watchId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove item');
      }

      showMessage('Item removed from watchlist', 'success');

      if (activeTab === 'my-list') {
        fetchActiveList();
      } else {
        fetchCatalog();
      }
    } catch (error) {
      console.error('Error removing item:', error);
      showMessage('Failed to remove item', 'error');
    }
  };

  const handleAddCustom = async () => {
    if (!customPLU || !customName) {
      showMessage('Please enter both PLU and name', 'warning');
      return;
    }

    const pluNum = parseInt(customPLU);
    if (isNaN(pluNum) || pluNum < 10000 || pluNum > 99999) {
      showMessage('PLU must be a 5-digit number (10000-99999)', 'error');
      return;
    }

    try {
      const response = await apiFetch('/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({
          plu: pluNum,
          custom_name: customName,
          interest_type: 'interested'
        })
      });

      const data = await response.json();

      if (data.success) {
        showMessage(data.data.message, 'success');
        setCustomPLU('');
        setCustomName('');
        if (activeTab === 'my-list') {
          fetchActiveList();
        } else {
          fetchCatalog();
        }
      } else {
        showMessage(data.message || 'Failed to add custom item', 'error');
      }
    } catch (error) {
      console.error('Error adding custom PLU:', error);
      showMessage(error.message || 'Failed to add custom item', 'error');
    }
  };

  const handleBulkToggleOff = async () => {
    if (!confirm('Turn off all default items? They will disappear from "My List" but remain in "Browse Catalog" where you can turn them back on.')) {
      return;
    }

    try {
      const defaultPLUs = activeList
        .filter(item => item.source === 'default')
        .map(item => item.plu);

      if (defaultPLUs.length === 0) {
        showMessage('No default items to toggle off', 'warning');
        return;
      }

      const response = await apiFetch('/api/watchlist/bulk/toggle', {
        method: 'POST',
        body: JSON.stringify({
          plu_list: defaultPLUs,
          interest_type: 'not_interested'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to bulk toggle');
      }

      showMessage(`Toggled off ${defaultPLUs.length} default items`, 'success');
      fetchActiveList();
    } catch (error) {
      console.error('Error bulk toggling:', error);
      showMessage('Failed to bulk toggle', 'error');
    }
  };

  // Filter catalog list by disabled status if needed
  let displayList = activeTab === 'my-list' ? (activeList || []) : (catalogList || []);

  if (activeTab === 'catalog' && showDisabledOnly) {
    displayList = displayList.filter(item => !item.is_watching);
  }

  const currentList = displayList;

  // Render pagination controls
  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    return (
      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          ← Previous
        </button>
        <span>Page {page} of {pagination.totalPages}</span>
        <button
          disabled={page >= pagination.totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next →
        </button>
      </div>
    );
  };

  // Render product list (shared between My List and Browse Catalog)
  const renderProductList = () => {
    if (loading) {
      return (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      );
    }

    if (currentList.length === 0) {
      return (
        <div className="empty-state">
          {activeTab === 'my-list' ? (
            <>
              <h3>Your watchlist is empty</h3>
              <p>Add custom items below or browse the catalog to start watching products.</p>
            </>
          ) : (
            <>
              <h3>No products found</h3>
              <p>Try adjusting your search or filters.</p>
            </>
          )}
        </div>
      );
    }

    return (
      <>
        <div className="product-list">
          {currentList.map((item) => (
            <div key={item.plu} className={`mobile-product-card ${!item.is_watching ? 'toggled-off' : ''}`}>
              {/* Left: Image */}
              <div className="mobile-image-section">
                <ProductImage product={item} />
              </div>

              {/* Center: Product info */}
              <div className="mobile-content-section split-layout">
                <div className="content-top">
                  <div className="mobile-product-name">
                    {item.brand_name || 'Unknown Product'}
                  </div>
                  <div className="mobile-meta-row">
                    <span
                      className={`listing-type-badge ${item.source === 'custom' ? 'custom' : (item.listing_type_key || 'unknown')}`}
                      title={item.source === 'custom' ? 'Custom' : (item.listing_type || 'N/A')}
                    >
                      {item.source === 'custom' ? 'Custom' : (item.listing_type || 'N/A')}
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
                  {item.bottles_per_case && (
                    <div className="mobile-bottles-per-case">
                      Bottles Per Case: {item.bottles_per_case}
                    </div>
                  )}
                  {item.size_ml && (
                    <div className="mobile-size-info">
                      Size: {item.size_ml}ml
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Toggle or Remove */}
              <div className="mobile-toggle-section">
                {item.can_toggle !== false ? (
                  <BourbonBarrelToggle
                    isOn={item.is_watching}
                    onChange={() => handleToggle(item.plu, item.is_watching, item.source === 'custom')}
                    size="medium"
                  />
                ) : (
                  <button
                    className="remove-btn"
                    onClick={() => handleRemove(item.watch_id)}
                    title="Remove custom item"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bulk Actions at bottom - Only on My List tab */}
        {activeTab === 'my-list' && currentList.filter(item => item.source === 'default').length > 0 && (
          <div className="bulk-actions-bottom">
            <button onClick={handleBulkToggleOff} className="bulk-disable-btn">
              Disable All on Page
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="watchlist-page">
      <h1>My Watchlist</h1>

      {/* Message Display */}
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={activeTab === 'my-list' ? 'active' : ''}
          onClick={() => { setActiveTab('my-list'); setPage(1); }}
        >
          My List {pagination && activeTab === 'my-list' && `(${pagination.total})`}
        </button>
        <button 
          className={activeTab === 'catalog' ? 'active' : ''}
          onClick={() => { setActiveTab('catalog'); setPage(1); }}
        >
          Browse Catalog {pagination && activeTab === 'catalog' && `(${pagination.total})`}
        </button>
      </div>

      {/* Tab Description */}
      <div className="tab-description">
        {activeTab === 'my-list' ? (
          <p>
            <strong>Your active watchlist.</strong> Only items you're watching appear here. 
            Toggled-off items don't show up (but you can turn them back on in "Browse Catalog").
          </p>
        ) : (
          <p>
            <strong>All 200+ premium products.</strong> Browse and toggle items on/off. 
            Items you've turned off are still visible here with the toggle switch off.
          </p>
        )}
      </div>

      {/* My List Tab: Collapsible Sections */}
      {activeTab === 'my-list' ? (
        <>
          {/* Pagination at top */}
          {renderPagination()}

          {/* Section 1: Product List (expanded by default) */}
          <div className="collapsible-section">
            <button
              className="section-header"
              onClick={() => setListExpanded(!listExpanded)}
            >
              <span className="section-title">My Watchlist Items</span>
              <span className="section-toggle">{listExpanded ? '−' : '+'}</span>
            </button>

            {listExpanded && (
              <div className="section-content">
                {/* Filters */}
                <div className="filters">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                  <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                  >
                    <option value="all">All Categories</option>
                    <option value="Allocation">Allocation</option>
                    <option value="Limited">Limited</option>
                    <option value="Barrel">Barrel</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                {/* Product List */}
                {renderProductList()}
              </div>
            )}
          </div>

          {/* Section 2: Add Custom Item (collapsed by default) */}
          <div className="collapsible-section">
            <button
              className="section-header"
              onClick={() => setAddExpanded(!addExpanded)}
            >
              <span className="section-title">Add Custom Item by PLU</span>
              <span className="section-toggle">{addExpanded ? '−' : '+'}</span>
            </button>

            {addExpanded && (
              <div className="section-content">
                <div className="add-custom">
                  <div className="custom-inputs">
                    <input
                      type="number"
                      placeholder="PLU (e.g., 12345)"
                      value={customPLU}
                      onChange={(e) => setCustomPLU(e.target.value)}
                      min="10000"
                      max="99999"
                    />
                    <input
                      type="text"
                      placeholder="Product Name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      maxLength="100"
                    />
                    <button onClick={handleAddCustom}>Add</button>
                  </div>
                  <p className="help-text">
                    Can't find a product? Enter its PLU number from the NC ABC website.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Pagination at bottom for My List */}
          {renderPagination()}
        </>
      ) : (
        <>
          {/* Browse Catalog Tab: No collapsible sections */}
          {/* Filters */}
          <div className="filters">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All Categories</option>
              <option value="Allocation">Allocation</option>
              <option value="Limited">Limited</option>
              <option value="Barrel">Barrel</option>
            </select>
            <label className="disabled-filter">
              <input
                type="checkbox"
                checked={showDisabledOnly}
                onChange={(e) => { setShowDisabledOnly(e.target.checked); setPage(1); }}
              />
              <span>Show disabled only</span>
            </label>
          </div>

          {/* Product List */}
          {renderProductList()}

          {/* Pagination at bottom for Browse Catalog */}
          {renderPagination()}
        </>
      )}
    </div>
  );
}
