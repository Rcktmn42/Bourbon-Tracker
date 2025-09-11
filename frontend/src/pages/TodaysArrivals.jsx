// frontend/src/pages/TodaysArrivals.jsx
import React, { useState, useEffect } from 'react';
import './TodaysArrivals.css';

export default function TodaysArrivals() {
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(new Set());

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  };

  useEffect(() => {
    fetchTodaysArrivals();
  }, []);

  const fetchTodaysArrivals = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/inventory/todays-arrivals', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setArrivals(data.arrivals || []);
      setSummary({
        date: data.date,
        total_arrivals: data.total_arrivals
      });

    } catch (err) {
      console.error('Error fetching arrivals:', err);
      setError('Failed to load today\'s arrivals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (bourbonName) => {
    const newExpanded = new Set(expandedProducts);
    
    if (newExpanded.has(bourbonName)) {
      newExpanded.delete(bourbonName);
    } else {
      newExpanded.add(bourbonName);
    }
    
    setExpandedProducts(newExpanded);
  };

  // Group arrivals by bourbon name
  const groupedArrivals = arrivals.reduce((groups, arrival) => {
    const bourbon = arrival.bourbon_name;
    if (!groups[bourbon]) {
      groups[bourbon] = [];
    }
    groups[bourbon].push(arrival);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="arrivals-page">
        <div className="arrivals-container">
          <div className="arrivals-loading">
            <div className="loading-spinner"></div>
            <p>Loading today's bourbon deliveries...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="arrivals-page">
        <div className="arrivals-container">
          <div className="arrivals-error">
            <h2>Error Loading Arrivals</h2>
            <p>{error}</p>
            <button onClick={fetchTodaysArrivals} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="arrivals-page">
      <div className="arrivals-container">
        <div className="arrivals-header">
          <h1>Today's Arrivals</h1>
          {summary && (
            <div className="arrivals-summary">
              <p>{summary.total_arrivals} new deliveries detected for {formatDate(summary.date)}</p>
              <button onClick={fetchTodaysArrivals} className="refresh-button">
                Refresh Data
              </button>
            </div>
          )}
        </div>

        {arrivals.length === 0 ? (
          <div className="no-arrivals">
            <h2>No New Arrivals Today</h2>
            <p>No bourbon deliveries detected yet today. Check back later or refresh to see updates.</p>
          </div>
        ) : (
          <div className="arrivals-content">
            <div className="product-list">
              {Object.entries(groupedArrivals).map(([bourbonName, locations]) => (
                <ProductCard
                  key={bourbonName}
                  bourbonName={bourbonName}
                  locations={locations}
                  isExpanded={expandedProducts.has(bourbonName)}
                  onToggle={() => toggleProduct(bourbonName)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="arrivals-footer">
          <p className="data-note">
            Data updates every 15 minutes during business hours (7 AM - 9 PM).
            Last check: {arrivals.length > 0 ? new Date(arrivals[0].last_updated).toLocaleString() : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}

const ProductCard = ({ bourbonName, locations, isExpanded, onToggle }) => {
  const totalBottles = locations.reduce((sum, loc) => sum + loc.new_quantity, 0);
  const storeCount = locations.length;
  const price = locations[0].price !== 'Not Available' ? `${locations[0].price}` : 'Price N/A';
  
  // Get listing type from the first location (should be same for all locations of same product)
  const listingType = locations[0].listing_type || 'Unknown';
  const listingTypeClass = listingType?.toLowerCase() || 'unknown';
  
  return (
    <div className="product-card">
      <button 
        className={`product-header ${isExpanded ? 'active' : ''}`}
        onClick={onToggle}
      >
        <div className="product-info">
          <div className="product-name">
            {bourbonName}
            <span className={`listing-badge ${listingTypeClass}`}>
              {listingType}
            </span>
          </div>
          <div className="product-details">
            PLU: {locations[0].plu} | {price} | New deliveries detected today
          </div>
        </div>
        <div className="product-summary">
          <div className="bottles-count">{totalBottles} bottles</div>
          <div className="stores-count">{storeCount} stores</div>
        </div>
        <span className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>▼</span>
      </button>
      
      {isExpanded && (
        <div className="product-content">
          <div className="store-grid">
            {locations.map((location, index) => (
              <StoreItem key={`${location.store_number}-${index}`} location={location} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StoreItem = ({ location }) => {
  const lastUpdated = location.last_updated ? 
    new Date(location.last_updated).toLocaleDateString() : 'Today';
  
  return (
    <div className="store-item">
      <div className="store-info">
        <div className="store-name">
          {location.store_nickname || `Store ${location.store_number}`} (#{location.store_number})
        </div>
        <div className="store-details">
          {location.store_address} | Updated: {lastUpdated}
        </div>
        {location.previous_quantity > 0 && (
          <div className="arrival-info">
            +{location.new_quantity - location.previous_quantity} from previous stock
          </div>
        )}
        {location.previous_quantity === 0 && (
          <div className="arrival-info new-stock">
            New arrival at this location!
          </div>
        )}
      </div>
      <div className="quantity-badge">{location.new_quantity}</div>
    </div>
  );
};