// frontend/src/pages/TodaysArrivals.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TodaysArrivals.css';

export default function TodaysArrivals() {
  const navigate = useNavigate();
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [availableDates, setAvailableDates] = useState([]);
  const [navigationLoading, setNavigationLoading] = useState(false);

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  };

  useEffect(() => {
    fetchArrivalsForDate(currentDate);
    fetchAvailableDates();
  }, []);

  useEffect(() => {
    if (currentDate) {
      fetchArrivalsForDate(currentDate);
    }
  }, [currentDate]);

  const fetchArrivalsForDate = async (date) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/inventory/todays-arrivals?date=${date}`, {
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
      setError(`Failed to load arrivals for ${formatDate(date)}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDates = async () => {
    try {
      const response = await fetch('/api/inventory/available-dates?currentDate=' + currentDate, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableDates(data.allAvailableDates || []);
      }
    } catch (err) {
      console.error('Error fetching available dates:', err);
    }
  };

  const navigateToDate = async (direction) => {
    try {
      setNavigationLoading(true);
      
      const response = await fetch(`/api/inventory/available-dates?currentDate=${currentDate}&direction=${direction}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.availableDate) {
        setCurrentDate(data.availableDate);
      } else {
        setError(`No ${direction === 'previous' ? 'earlier' : 'later'} dates with arrivals found.`);
      }

    } catch (err) {
      console.error('Error navigating dates:', err);
      setError(`Failed to navigate to ${direction} date.`);
    } finally {
      setNavigationLoading(false);
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
            <button onClick={() => fetchArrivalsForDate(currentDate)} className="retry-button">
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
          <h1>Bourbon Arrivals</h1>
          
          <div className="date-navigation">
            <button 
              onClick={() => navigateToDate('previous')} 
              disabled={navigationLoading}
              className="nav-button prev-button"
            >
              ← Previous Day
            </button>
            
            <div className="current-date">
              <h2>{formatDate(currentDate)}</h2>
              <span className="date-type">
                {currentDate === new Date().toLocaleDateString('en-CA') ? 'Today' : 'Historical'}
              </span>
            </div>
            
            <button 
              onClick={() => navigateToDate('next')} 
              disabled={navigationLoading || currentDate === new Date().toLocaleDateString('en-CA')}
              className="nav-button next-button"
            >
              Next Day →
            </button>
          </div>

          {summary && (
            <div className="arrivals-summary">
              <p>{summary.total_arrivals} inventory increases detected</p>
              <button onClick={() => fetchArrivalsForDate(currentDate)} className="refresh-button">
                Refresh Data
              </button>
            </div>
          )}
        </div>

        {arrivals.length === 0 ? (
          <div className="no-arrivals">
            <h2>No Inventory Increases</h2>
            <p>No bourbon inventory increases detected for {formatDate(currentDate)}. Try a different date using the navigation above.</p>
            {availableDates.length > 0 && (
              <div className="available-dates-hint">
                <p>Recent dates with arrivals: {availableDates.slice(0, 5).map(formatDate).join(', ')}</p>
              </div>
            )}
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
                  navigate={navigate}
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

const ProductCard = ({ bourbonName, locations, isExpanded, onToggle, navigate }) => {
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
              <StoreItem key={`${location.store_number}-${index}`} location={location} navigate={navigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StoreItem = ({ location, navigate }) => {
  const lastUpdated = location.last_updated ? 
    new Date(location.last_updated).toLocaleDateString() : 'Today';
  
  return (
    <div className="store-item">
      <div className="store-info">
        <div className="store-name">
          <span 
            className="store-name-link"
            onClick={() => navigate(`/stores/${location.store_id}`)}
          >
            {location.store_nickname || `Store ${location.store_number}`} (#{location.store_number})
          </span>
        </div>
        <div className="store-details">
          {location.store_address} | Updated: {lastUpdated}
        </div>
        <div className={`arrival-info ${location.change_type}`}>
          {location.change_type === 'first' ? (
            <span className="first-arrival">First time stocked!</span>
          ) : (
            <span className="increase">
              +{location.delta || (location.new_quantity - location.previous_quantity)} from previous stock
            </span>
          )}
        </div>
      </div>
      <div className="quantity-badge">{location.new_quantity}</div>
    </div>
  );
};