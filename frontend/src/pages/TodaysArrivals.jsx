// frontend/src/pages/TodaysArrivals.jsx
import React, { useState, useEffect } from 'react';
import './TodaysArrivals.css';

export default function TodaysArrivals() {
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

 // ADD THIS FUNCTION HERE:
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
          <h1>Today's Arrivals</h1>
          <div className="loading">Loading today's bourbon deliveries...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="arrivals-page">
        <div className="arrivals-container">
          <h1>Today's Arrivals</h1>
          <div className="error-message">
            {error}
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
            {Object.entries(groupedArrivals).map(([bourbonName, locations]) => (
              <div key={bourbonName} className="bourbon-group">
                <h2 className="bourbon-name">
                  {bourbonName}
                  <span className="plu-badge">PLU: {locations[0].plu}</span>
                  {locations[0].price !== 'Not Available' && (
                    <span className="price-badge">{locations[0].price}</span>
                  )}
                </h2>
                
                <div className="stores-grid">
                  {locations.map((location, index) => (
                    <div key={`${location.store_number}-${index}`} className="store-card">
                      <div className="store-info">
                        <div className="store-name">
                          Store #{location.store_number}
                          {location.store_nickname && (
                            <span className="store-nickname">({location.store_nickname})</span>
                          )}
                        </div>
                        <div className="store-address">{location.store_address}</div>
                      </div>
                      
                      <div className="quantity-info">
                        <div className="new-quantity">
                          <strong>{location.new_quantity}</strong> bottles
                        </div>
                        {location.previous_quantity > 0 && (
                          <div className="quantity-change">
                            +{location.new_quantity - location.previous_quantity} from previous
                          </div>
                        )}
                        {location.previous_quantity === 0 && (
                          <div className="first-appearance">New arrival!</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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