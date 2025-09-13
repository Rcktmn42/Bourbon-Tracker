// frontend/src/pages/StatewideShipments.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './StatewideShipments.css';

const StatewideShipments = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [boards, setBoards] = useState([]);
  const [products, setProducts] = useState([]);
  
  // View and filter states
  const [viewMode, setViewMode] = useState('product');
  const [expandedCard, setExpandedCard] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [filters, setFilters] = useState({
    productType: 'all-allocation-limited-barrel',
    boardId: 'all',
    searchTerm: '',
    dateRange: 'current-month'
  });
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const [boardsRes, productsRes] = await Promise.all([
        fetch('/api/state/boards', { credentials: 'include' }),
        fetch('/api/state/products', { credentials: 'include' })
      ]);

      const boardsData = await boardsRes.json();
      const productsData = await productsRes.json();

      if (boardsData.success) setBoards(boardsData.boards);
      if (productsData.success) setProducts(productsData.products);

    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`/api/state/shipments?${queryParams}`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShipments(data.shipments);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch shipments data');
      console.error('Shipments fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate date range display text
  const getDateRangeText = () => {
    const today = new Date();
    let startDate, endDate;

    switch (filters.dateRange) {
      case 'current-month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = today;
        break;
      case 'last-16-days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 15);
        endDate = today;
        break;
      case 'last-24-days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 23);
        endDate = today;
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = today;
        break;
    }

    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  // Group data by view mode
  const groupedData = useMemo(() => {
    if (!shipments.length) return [];

    switch (viewMode) {
      case 'product':
        const productGroups = {};
        shipments.forEach(shipment => {
          const key = shipment.brand_name;
          if (!productGroups[key]) {
            productGroups[key] = {
              id: key,
              title: shipment.brand_name,
              nc_code: shipment.nc_code,
              listing_type: shipment.Listing_Type,
              retail_price: shipment.retail_price,
              bottles_per_case: shipment.bottles_per_case,
              items: []
            };
          }
          productGroups[key].items.push({
            board: shipment.board_name_clean,
            date: shipment.ship_date_formatted,
            cases: shipment.cases,
            raw_date: shipment.ship_date
          });
        });
        return Object.values(productGroups).sort((a, b) => a.title.localeCompare(b.title));

      case 'date':
        const dateGroups = {};
        
        if (filters.boardId !== 'all') {
          // When board is filtered, group by date -> board -> products
          shipments.forEach(shipment => {
            const key = shipment.ship_date;
            if (!dateGroups[key]) {
              dateGroups[key] = {
                id: key,
                title: shipment.ship_date_formatted,
                raw_date: shipment.ship_date,
                items: []
              };
            }
            dateGroups[key].items.push({
              product: shipment.brand_name,
              cases: shipment.cases,
              nc_code: shipment.nc_code
            });
          });
        } else {
          // When no board filter, group by date -> product -> boards with cases
          const tempGroups = {};
          shipments.forEach(shipment => {
            const dateKey = shipment.ship_date;
            const productKey = `${dateKey}-${shipment.brand_name}`;
            
            if (!tempGroups[dateKey]) {
              tempGroups[dateKey] = {};
            }
            
            if (!tempGroups[dateKey][shipment.brand_name]) {
              tempGroups[dateKey][shipment.brand_name] = {
                product: shipment.brand_name,
                nc_code: shipment.nc_code,
                boards: []
              };
            }
            
            tempGroups[dateKey][shipment.brand_name].boards.push({
              board: shipment.board_name_clean,
              cases: shipment.cases
            });
          });
          
          // Convert to the expected format and sort products alphabetically
          Object.keys(tempGroups).forEach(dateKey => {
            const sortedProducts = Object.values(tempGroups[dateKey]).sort((a, b) => 
              a.product.localeCompare(b.product)
            );
            
            dateGroups[dateKey] = {
              id: dateKey,
              title: new Date(dateKey).toLocaleDateString(),
              raw_date: dateKey,
              items: sortedProducts
            };
          });
        }
        
        return Object.values(dateGroups).sort((a, b) => new Date(b.raw_date) - new Date(a.raw_date));

      case 'board':
        const boardGroups = {};
        shipments.forEach(shipment => {
          const key = shipment.board_name_clean;
          if (!boardGroups[key]) {
            boardGroups[key] = {
              id: key,
              title: shipment.board_name_clean,
              items: []
            };
          }
          boardGroups[key].items.push({
            product: shipment.brand_name,
            date: shipment.ship_date_formatted,
            cases: shipment.cases,
            nc_code: shipment.nc_code,
            raw_date: shipment.ship_date
          });
        });
        return Object.values(boardGroups).sort((a, b) => a.title.localeCompare(b.title));

      default:
        return [];
    }
  }, [shipments, viewMode]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setExpandedCard(null); // Close any expanded cards when filters change
  };

  const handleSearchSubmit = () => {
    setFilters(prev => ({ ...prev, searchTerm: searchInput.trim() }));
    setExpandedCard(null);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setFilters(prev => ({ ...prev, searchTerm: '' }));
    setExpandedCard(null);
  };

  const toggleCard = (cardId) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const toggleProduct = (productKey) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productKey)) {
      newExpanded.delete(productKey);
    } else {
      newExpanded.add(productKey);
    }
    setExpandedProducts(newExpanded);
  };

  const toggleDate = (dateKey) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDates(newExpanded);
  };

  const getWakeBoardId = () => {
    const wakeBoard = boards.find(board => 
      board.board_name_clean.toLowerCase().includes('wake')
    );
    return wakeBoard ? wakeBoard.board_id : null;
  };

  if (loading) {
    return (
      <div className="shipments-page">
        <div className="shipments-container">
          <div className="shipments-loading">
            <div className="loading-spinner"></div>
            <p>Loading shipments data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shipments-page">
        <div className="shipments-container">
          <div className="shipments-error">
            <h2>Error Loading Shipments</h2>
            <p>{error}</p>
            <button onClick={fetchShipments} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shipments-page">
      <div className="shipments-container">
        {/* Header */}
        <div className="shipments-header">
          <h1>State Shipping Information</h1>
          <p className="shipments-subtitle">
            Track ABC board shipments across North Carolina
          </p>
        </div>

        <div className="shipments-content">
          {/* Filters */}
          <div className="shipments-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label>Product Type</label>
                <select 
                  value={filters.productType}
                  onChange={(e) => handleFilterChange('productType', e.target.value)}
                  className="filter-select"
                >
                  <option value="all-allocation-limited-barrel">All Allocation/Limited/Barrel</option>
                  <option value="allocation">Allocation Only</option>
                  <option value="limited">Limited Only</option>
                  <option value="barrel">Barrel Only</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Board</label>
                <select 
                  value={filters.boardId}
                  onChange={(e) => handleFilterChange('boardId', e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Boards</option>
                  {boards.map(board => (
                    <option key={board.board_id} value={board.board_id}>
                      {board.board_name_clean}
                    </option>
                  ))}
                </select>
                <div className="board-shortcuts">
                  <button 
                    className={`shortcut-button ${filters.boardId === getWakeBoardId() ? 'active' : ''}`}
                    onClick={() => handleFilterChange('boardId', getWakeBoardId() || 'all')}
                  >
                    Wake
                  </button>
                  <button 
                    className={`shortcut-button ${filters.boardId === 'all' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('boardId', 'all')}
                  >
                    All
                  </button>
                </div>
              </div>

              <div className="filter-group">
                <label>Search Products</label>
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search by brand name or NC code..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="search-input"
                  />
                  <button 
                    type="button"
                    onClick={handleSearchSubmit}
                    className="search-button"
                    disabled={!searchInput.trim()}
                  >
                    Search
                  </button>
                  {filters.searchTerm && (
                    <button 
                      type="button"
                      onClick={clearSearch}
                      className="clear-button"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="date-filter-row">
              <div className="filter-group">
                <label>Date Range</label>
                <select 
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="filter-select"
                >
                  <option value="current-month">Current Month</option>
                  <option value="last-16-days">Last 16 Days</option>
                  <option value="last-24-days">Last 24 Days</option>
                </select>
              </div>
              <div className="date-range-display">
                Showing shipments from {getDateRangeText()}
              </div>
            </div>
          </div>

          {/* View Toggle */}
          <div className="view-toggle">
            <button 
              className={`view-button ${viewMode === 'product' ? 'active' : ''}`}
              onClick={() => setViewMode('product')}
            >
              Product View
            </button>
            <button 
              className={`view-button ${viewMode === 'date' ? 'active' : ''}`}
              onClick={() => setViewMode('date')}
            >
              Date View
            </button>
            <button 
              className={`view-button ${viewMode === 'board' ? 'active' : ''}`}
              onClick={() => setViewMode('board')}
            >
              Board View
            </button>
          </div>

          {/* Results */}
          <div className="shipments-results">
            {groupedData.length === 0 ? (
              <div className="no-results">
                No shipments found for the selected criteria
              </div>
            ) : (
              <div className="shipments-grid">
                {groupedData.map(group => (
                  <ShipmentCard
                    key={group.id}
                    group={group}
                    viewMode={viewMode}
                    filters={filters}
                    isExpanded={expandedCard === group.id}
                    onToggle={() => toggleCard(group.id)}
                    expandedProducts={expandedProducts}
                    onToggleProduct={toggleProduct}
                    expandedDates={expandedDates}
                    onToggleDate={toggleDate}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Collapsible date item for product view  
const ProductDateGroupItem = ({ group, expandedDates, onToggleDate }) => {
  // Group items by date
  const dateGroups = {};
  group.items.forEach(item => {
    const dateKey = item.raw_date || item.date;
    if (!dateGroups[dateKey]) {
      dateGroups[dateKey] = {
        date: item.date,
        raw_date: dateKey,
        boards: []
      };
    }
    dateGroups[dateKey].boards.push({
      board: item.board,
      cases: item.cases
    });
  });

  // Sort dates chronologically (newest first) and boards alphabetically  
  const sortedDates = Object.values(dateGroups).sort((a, b) => 
    new Date(b.raw_date) - new Date(a.raw_date)
  );

  sortedDates.forEach(dateGroup => {
    dateGroup.boards.sort((a, b) => a.board.localeCompare(b.board));
  });

  return (
    <div className="product-date-groups">
      {sortedDates.map((dateGroup, dateIndex) => {
        const dateKey = `${group.id}-${dateGroup.raw_date}`;
        const isExpanded = expandedDates.has(dateKey);
        const totalCases = dateGroup.boards.reduce((sum, board) => sum + board.cases, 0);

        return (
          <div key={dateIndex} className="date-group">
            <div 
              className="date-group-header" 
              onClick={() => onToggleDate(dateKey)}
              style={{ cursor: 'pointer' }}
            >
              <div className="detail-date-cases">
                <span className="detail-date">{dateGroup.date}</span>
                <span className="detail-cases">{totalCases} cases</span>
              </div>
              <span className="date-expand-icon">
                {isExpanded ? '▲' : '▼'}
              </span>
            </div>
            
            {isExpanded && (
              <div className="board-list">
                {dateGroup.boards.map((boardItem, boardIndex) => (
                  <div key={boardIndex} className="detail-date-cases board-item">
                    <span className="detail-board">{boardItem.board}</span>
                    <span className="detail-cases">{boardItem.cases} cases</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Collapsible date item for board view  
const BoardDateGroupItem = ({ group, expandedDates, onToggleDate }) => {
  // Group items by date
  const dateGroups = {};
  group.items.forEach(item => {
    const dateKey = item.raw_date || item.date;
    if (!dateGroups[dateKey]) {
      dateGroups[dateKey] = {
        date: item.date,
        raw_date: dateKey,
        products: []
      };
    }
    dateGroups[dateKey].products.push({
      product: item.product,
      cases: item.cases
    });
  });

  // Sort dates chronologically (newest first) and products alphabetically  
  const sortedDates = Object.values(dateGroups).sort((a, b) => 
    new Date(b.raw_date) - new Date(a.raw_date)
  );

  sortedDates.forEach(dateGroup => {
    dateGroup.products.sort((a, b) => a.product.localeCompare(b.product));
  });

  return (
    <div className="board-date-groups">
      {sortedDates.map((dateGroup, dateIndex) => {
        const dateKey = `${group.id}-${dateGroup.raw_date}`;
        const isExpanded = expandedDates.has(dateKey);
        const totalCases = dateGroup.products.reduce((sum, product) => sum + product.cases, 0);

        return (
          <div key={dateIndex} className="date-group">
            <div 
              className="date-group-header" 
              onClick={() => onToggleDate(dateKey)}
              style={{ cursor: 'pointer' }}
            >
              <div className="detail-date-cases">
                <span className="detail-date">{dateGroup.date}</span>
                <span className="detail-cases">{totalCases} cases</span>
              </div>
              <span className="date-expand-icon">
                {isExpanded ? '▲' : '▼'}
              </span>
            </div>
            
            {isExpanded && (
              <div className="product-list">
                {dateGroup.products.map((productItem, productIndex) => (
                  <div key={productIndex} className="detail-date-cases product-item">
                    <span className="detail-product">{productItem.product}</span>
                    <span className="detail-cases">{productItem.cases} cases</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Collapsible product item for date view
const ProductCollapsibleItem = ({ item, index, groupId, expandedProducts, onToggleProduct }) => {
  const productKey = `${groupId}-${index}`;
  const isExpanded = expandedProducts.has(productKey);
  const totalCases = item.boards ? item.boards.reduce((sum, board) => sum + board.cases, 0) : 0;

  return (
    <div className="product-collapsible">
      <div 
        className="product-header" 
        onClick={() => onToggleProduct(productKey)}
        style={{ cursor: 'pointer' }}
      >
        <div className="detail-date-cases">
          <span className="detail-product">{item.product}</span>
        </div>
        <span className="product-expand-icon">
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>
      
      {isExpanded && (
        <div className="board-list">
          {item.boards && item.boards.length > 0 ? (
            item.boards.map((boardItem, boardIndex) => (
              <div key={boardIndex} className="detail-date-cases board-item">
                <span className="detail-board">{boardItem.board}</span>
                <span className="detail-cases">{boardItem.cases} cases</span>
              </div>
            ))
          ) : (
            <div className="detail-date-cases">
              <span className="detail-product">No board data available</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Individual shipment card component
const ShipmentCard = ({ group, viewMode, filters, isExpanded, onToggle, expandedProducts, onToggleProduct, expandedDates, onToggleDate }) => {
  const totalCases = group.items.reduce((sum, item) => {
    if (item.cases) {
      return sum + item.cases;
    } else if (item.boards) {
      return sum + item.boards.reduce((boardSum, board) => boardSum + board.cases, 0);
    }
    return sum;
  }, 0);

  const renderCardContent = () => {
    switch (viewMode) {
      case 'product':
        return (
          <div className="card-header product-view">
            <div className="card-title">
              <h3>{group.title}</h3>
              <span className="card-subtitle">
                PLU: {group.nc_code} | ${group.retail_price || 'N/A'} | {group.bottles_per_case || 'N/A'} bottles/case
              </span>
            </div>
            <div className="card-stats">
              <span className="stat-badge">{group.listing_type}</span>
              <span className="cases-badge">{totalCases} cases</span>
            </div>
          </div>
        );

      case 'date':
        return (
          <div className="card-header">
            <div className="card-title">
              <h3>{group.title}</h3>
              <span className="card-subtitle">{group.items.length} products</span>
            </div>
          </div>
        );

      case 'board':
        return (
          <div className="card-header">
            <div className="card-title">
              <h3>{group.title}</h3>
              <span className="card-subtitle">{group.items.length} products</span>
            </div>
            <div className="card-stats">
              <span className="cases-badge">{totalCases} cases</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`shipment-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="card-clickable" onClick={onToggle}>
        {renderCardContent()}
        <div className="expand-icon">
          {isExpanded ? '▲' : '▼'}
        </div>
      </div>

      {isExpanded && (
        <div className="card-details">
          <div className="details-list">
            {viewMode === 'product' ? (
              <ProductDateGroupItem
                group={group}
                expandedDates={expandedDates}
                onToggleDate={onToggleDate}
              />
            ) : viewMode === 'board' ? (
              <BoardDateGroupItem
                group={group}
                expandedDates={expandedDates}
                onToggleDate={onToggleDate}
              />
            ) : (
              group.items.map((item, index) => {
                try {
                  return (
                    <div key={index} className="detail-item">
                      {viewMode === 'date' && (
                        <>
                          {filters.boardId !== 'all' ? (
                            // When board is filtered, show product: cases
                            <div className="detail-date-cases">
                              <span className="detail-product">{item.product}</span>
                              <span className="detail-cases">{item.cases} cases</span>
                            </div>
                          ) : (
                            // When no board filter, show product with total cases and collapsible board list
                            <ProductCollapsibleItem 
                              item={item} 
                              index={index}
                              groupId={group.id}
                              expandedProducts={expandedProducts}
                              onToggleProduct={onToggleProduct}
                            />
                          )}
                        </>
                      )}
                    </div>
                  );
                } catch (error) {
                  console.error('Error rendering item:', error, item);
                  return (
                    <div key={index} className="detail-item">
                      <div className="detail-product">Error displaying item</div>
                    </div>
                  );
                }
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatewideShipments;