// frontend/src/pages/Stores.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Stores.css';

const Stores = () => {
  const { user } = useAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMixedBeverage, setSelectedMixedBeverage] = useState('All');
  const [selectedDeliveryDay, setSelectedDeliveryDay] = useState('All');

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stores', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setStores(data.stores);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch stores data');
    } finally {
      setLoading(false);
    }
  };

  // Filter and search stores
  const filteredStores = useMemo(() => {
    let filtered = stores;
    
    // Apply mixed beverage filter
    if (selectedMixedBeverage === 'Mixed Beverage') {
      filtered = filtered.filter(store => store.mixed_beverage === 1);
    }
    
    // Apply delivery day filter
    if (selectedDeliveryDay !== 'All') {
      filtered = filtered.filter(store => store.delivery_day === selectedDeliveryDay);
    }
    
    // Apply search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(store => 
        store.nickname.toLowerCase().includes(search) ||
        store.store_number.toString().includes(search) ||
        store.address.toLowerCase().includes(search)
      );
    }
    
    return filtered.sort((a, b) => a.nickname.localeCompare(b.nickname));
  }, [stores, searchTerm, selectedMixedBeverage, selectedDeliveryDay]);


  // Summary statistics
  const summary = useMemo(() => {
    return {
      total: filteredStores.length,
      mixedBeverage: filteredStores.filter(store => store.mixed_beverage === 1).length
    };
  }, [filteredStores]);

  if (loading) {
    return (
      <div className="stores-page">
        <div className="stores-container">
          <div className="stores-loading">
            <div className="loading-spinner"></div>
            <p>Loading stores...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stores-page">
        <div className="stores-container">
          <div className="stores-error">
            <h2>Error Loading Stores</h2>
            <p>{error}</p>
            <button onClick={fetchStores} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stores-page">
      <div className="stores-container">
        <div className="stores-header">
          <h1>ABC Stores</h1>
          <p className="stores-subtitle">
            Wake County store locations and information
          </p>
        </div>

        <div className="stores-content">
          {/* Summary Stats */}
          <div className="stores-summary">
            <div className="summary-buttons">
              <button 
                className={`stat-button ${selectedMixedBeverage === 'All' ? 'active' : ''}`}
                onClick={() => setSelectedMixedBeverage('All')}
                title="Show all stores"
              >
                <span className="stat-number">{summary.total}</span>
                <span className="stat-label">Total Stores</span>
              </button>
              <button 
                className={`stat-button ${selectedMixedBeverage === 'Mixed Beverage' ? 'active' : ''}`}
                onClick={() => setSelectedMixedBeverage('Mixed Beverage')}
                title="Show only mixed beverage stores"
              >
                <span className="stat-number">{summary.mixedBeverage}</span>
                <span className="stat-label">Mixed Beverage</span>
              </button>
            </div>
            
            {/* Delivery Day Filters */}
            <div className="delivery-day-filters">
              <span className="filter-label">Delivery Days:</span>
              <div className="day-grid">
                <div className="day-row">
                  {['Monday', 'Tuesday', 'Wednesday'].map(day => (
                    <button 
                      key={day} 
                      className={`day-badge ${selectedDeliveryDay === day ? 'active' : ''}`}
                      onClick={() => setSelectedDeliveryDay(day)}
                      title={`Stores that receive deliveries on ${day}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <div className="day-row">
                  {['Thursday', 'Friday', 'Random'].map(day => (
                    <button 
                      key={day} 
                      className={`day-badge ${selectedDeliveryDay === day ? 'active' : ''}`}
                      onClick={() => setSelectedDeliveryDay(day)}
                      title={day === 'Random' ? 'Stores with irregular delivery schedules' : `Stores that receive deliveries on ${day}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <div className="day-all-row">
                  <button 
                    className={`day-badge day-all ${selectedDeliveryDay === 'All' ? 'active' : ''}`}
                    onClick={() => setSelectedDeliveryDay('All')}
                    title="Show all stores"
                  >
                    All
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="stores-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search by store name, number, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <div className="search-icon">🔍</div>
            </div>
            
          </div>

          {/* Stores List */}
          <div className="stores-list">
            {filteredStores.length === 0 ? (
              <div className="no-results">
                {searchTerm || selectedMixedBeverage !== 'All' || selectedDeliveryDay !== 'All' ? 
                  'No stores match your current filters' : 
                  'No stores found'
                }
              </div>
            ) : (
              filteredStores.map(store => (
                <StoreCard key={store.store_id} store={store} />
              ))
            )}
          </div>

          {/* Info Footer */}
          <div className="stores-footer">
            <h3>📍 Store Information</h3>
            <p>
              <strong>Mixed Beverage:</strong> Stores that also sell to restaurants and bars. 
              These stores may hold back premium bottles for retail customers, making inventory tracking important.
            </p>
            <p>
              <strong>Delivery Schedule:</strong> Most stores receive bourbon deliveries 
              every 7 days, though specific days may vary by location.
            </p>
            <p>
              <strong>Delivery Days:</strong> Day filter buttons are ready for use once delivery schedules are populated with real store data. 
              This will help predict when new inventory arrives at specific stores.
            </p>
            <p>
              <strong>Addresses:</strong> Click any address to open directions in Google Maps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StoreCard = ({ store }) => {
  // Format last delivery date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Not available';
    }
  };

  // Create Google Maps link
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`;

  return (
    <div className="store-card">
      <div className="store-header">
        <div className="store-title">
          <h3 className="store-name">
            {store.nickname} 
            <span className="store-number">(#{store.store_number})</span>
          </h3>
          <div className="store-badges">
            <span className="region-badge">{store.region}</span>
            {store.mixed_beverage === 1 && (
              <span className="mixed-badge">Mixed Beverage</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="store-details">
        <div className="store-address">
          <span className="address-icon">📍</span>
          <a 
            href={mapsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="address-link"
          >
            {store.address}
          </a>
        </div>
        
        <div className="store-delivery-info">
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
              {formatDate(store.last_delivery_date)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stores;