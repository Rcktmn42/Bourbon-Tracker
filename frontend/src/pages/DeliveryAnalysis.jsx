// frontend/src/pages/DeliveryAnalysis.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './DeliveryAnalysis.css';

const DeliveryAnalysis = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [weeksBack, setWeeksBack] = useState(0);
    const [includeOtherDrops, setIncludeOtherDrops] = useState(true);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedSections, setExpandedSections] = useState(new Set(['deliveries']));

    const searchProducts = async (term) => {
        if (!term.trim() || term.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            const response = await fetch(`/api/inventory/search/${encodeURIComponent(term)}`, {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                setSearchResults(data.products);
            }
        } catch (err) {
            console.error('Search failed:', err);
        }
    };

    const selectProduct = (product) => {
        setSelectedProduct(product);
        setSearchResults([]);
        setSearchTerm(product.name);
    };

    const generateAnalysis = async () => {
        if (!selectedProduct) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/inventory/delivery-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    plu: selectedProduct.plu,
                    weeksBack,
                    includeOtherDrops
                })
            });

            const data = await response.json();
            
            if (data.success) {
                setAnalysis(data.analysis);
                // Auto-expand deliveries section if we have data
                if (data.analysis.deliveries.length > 0) {
                    setExpandedSections(new Set(['deliveries']));
                }
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to generate analysis');
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        } else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    };

    const getWeekDescription = () => {
        if (weeksBack === 0) {
            return "Current/Recent Week (last complete week + this week if in progress)";
        }
        return `${weeksBack} week${weeksBack > 1 ? 's' : ''} back (complete business weeks)`;
    };

    const groupDeliveriesByDate = (deliveries) => {
        const grouped = {};
        deliveries.forEach(delivery => {
            const date = delivery.delivery_date;
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(delivery);
        });
        return grouped;
    };

    const bottlesToCases = (bottles, bottlesPerCase) => {
        return bottles <= 0 ? 0 : Math.max(1, Math.ceil(bottles / bottlesPerCase));
    };

    useEffect(() => {
        const debounce = setTimeout(() => {
            searchProducts(searchTerm);
        }, 300);

        return () => clearTimeout(debounce);
    }, [searchTerm]);

    return (
        <div className="delivery-analysis">
            <div className="analysis-header">
                <h1>Delivery Analysis Report</h1>
                <p>Analyze delivery patterns and predict future distributions</p>
            </div>

            {/* Product Search */}
            <div className="search-section">
                <h2>Select Product</h2>
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search by product name or PLU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    {searchResults.length > 0 && (
                        <div className="search-results">
                            {searchResults.map(product => (
                                <div
                                    key={product.plu}
                                    className="search-result-item"
                                    onClick={() => selectProduct(product)}
                                >
                                    <div className="result-name">{product.name}</div>
                                    <div className="result-details">
                                        PLU: {product.plu} | {product.retail_price ? `$${product.retail_price.toFixed(2)}` : 'Price N/A'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Analysis Options */}
            <div className="options-section">
                <h2>Analysis Options</h2>
                <div className="options-grid">
                    <div className="option-group">
                        <label>Time Period</label>
                        <select 
                            value={weeksBack} 
                            onChange={(e) => setWeeksBack(parseInt(e.target.value))}
                            className="select-input"
                        >
                            <option value={0}>Current/Recent Week</option>
                            <option value={1}>1 Week Back</option>
                            <option value={2}>2 Weeks Back</option>
                            <option value={3}>3 Weeks Back</option>
                            <option value={4}>4 Weeks Back</option>
                        </select>
                        <div className="option-description">{getWeekDescription()}</div>
                    </div>
                    
                    <div className="option-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={includeOtherDrops}
                                onChange={(e) => setIncludeOtherDrops(e.target.checked)}
                            />
                            Include Other Drop Analysis
                        </label>
                        <div className="option-description">
                            Identify stores that received other allocated products but not this one
                        </div>
                    </div>
                </div>

                <button
                    onClick={generateAnalysis}
                    disabled={!selectedProduct || loading}
                    className="generate-button"
                >
                    {loading ? 'Generating Analysis...' : 'Generate Report'}
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="error-message">
                    <h3>Error</h3>
                    <p>{error}</p>
                </div>
            )}

            {/* Analysis Results */}
            {analysis && (
                <div className="analysis-results">
                    <div className="results-header">
                        <h2>{analysis.product.name}</h2>
                        <p>PLU: {analysis.product.plu} | Analysis Period: {analysis.dateRange.startDate} to {analysis.dateRange.endDate}</p>
                    </div>

                    {/* Summary Stats */}
                    <div className="summary-grid">
                        <div className="summary-item">
                            <div className="summary-number">
                                {analysis.shipmentInfo.totalCases}
                            </div>
                            <div className="summary-label">Cases Shipped*<br/>(This Month)</div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-number">
                                {analysis.summary.totalCasesDelivered || 0}
                            </div>
                            <div className="summary-label">Cases Observed<br/>at Stores</div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-number">{analysis.summary.uniqueStores}</div>
                            <div className="summary-label">Stores with<br/>Deliveries</div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-number">
                                {Math.max(0, analysis.shipmentInfo.totalCases - (analysis.summary.totalCasesDelivered || 0))}
                            </div>
                            <div className="summary-label">Cases Potentially<br/>Remaining*</div>
                        </div>
                    </div>

                    {/* Status Alert */}
                    {analysis.shipmentInfo.totalCases > 0 && (
                        <div className={`alert ${
                            (analysis.shipmentInfo.totalCases - (analysis.summary.totalCasesDelivered || 0)) === 0 
                                ? 'success' : 'warning'
                        }`}>
                            {(analysis.shipmentInfo.totalCases - (analysis.summary.totalCasesDelivered || 0)) === 0 
                                ? '✅ Distribution appears complete - no cases remaining in analysis'
                                : `📦 Up to ${analysis.shipmentInfo.totalCases - (analysis.summary.totalCasesDelivered || 0)} cases may remain for distribution*`
                            }
                        </div>
                    )}

                    {/* Deliveries by Date */}
                    {analysis.deliveries.length > 0 && (
                        <div className="analysis-section">
                            <button 
                                className={`section-header ${expandedSections.has('deliveries') ? 'active' : ''}`}
                                onClick={() => toggleSection('deliveries')}
                            >
                                <span>Deliveries by Date ({analysis.deliveries.length} total)</span>
                                <span className={`expand-icon ${expandedSections.has('deliveries') ? 'rotated' : ''}`}>▼</span>
                            </button>
                            
                            {expandedSections.has('deliveries') && (
                                <div className="section-content">
                                    {Object.entries(groupDeliveriesByDate(analysis.deliveries))
                                        .sort(([a], [b]) => a.localeCompare(b))
                                        .map(([date, deliveries]) => {
                                            const dateObj = new Date(date);
                                            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                                            const formattedDate = dateObj.toLocaleDateString('en-US', { 
                                                month: 'long', day: 'numeric', year: 'numeric' 
                                            });
                                            const totalCases = deliveries.reduce((sum, d) => 
                                                sum + bottlesToCases(d.quantity, analysis.product.bottles_per_case), 0);

                                            return (
                                                <div key={date} className="date-group">
                                                    <button 
                                                        className={`date-header ${expandedSections.has(`date-${date}`) ? 'active' : ''}`}
                                                        onClick={() => toggleSection(`date-${date}`)}
                                                    >
                                                        <span>{formattedDate} ({dayName}) - {totalCases} cases to {deliveries.length} stores</span>
                                                        <span className={`expand-icon ${expandedSections.has(`date-${date}`) ? 'rotated' : ''}`}>▼</span>
                                                    </button>
                                                    
                                                    {expandedSections.has(`date-${date}`) && (
                                                        <div className="date-content">
                                                            <div className="store-grid">
                                                                {deliveries
                                                                    .sort((a, b) => a.nickname.localeCompare(b.nickname))
                                                                    .map(delivery => (
                                                                    <div key={delivery.history_id} className={`store-item ${delivery.mixed_beverage ? 'mixed' : ''}`}>
                                                                        <div className="store-info">
                                                                            <div className="store-name">
                                                                                {delivery.nickname} (#{delivery.store_number})
                                                                                {delivery.mixed_beverage && <span className="mixed-badge">MB</span>}
                                                                            </div>
                                                                            <div className="store-details">
                                                                                {delivery.address} | {delivery.quantity} bottles
                                                                            </div>
                                                                        </div>
                                                                        <div className="cases-badge">
                                                                            {bottlesToCases(delivery.quantity, analysis.product.bottles_per_case)} case{bottlesToCases(delivery.quantity, analysis.product.bottles_per_case) !== 1 ? 's' : ''}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stores with Other Drops */}
                    {analysis.storesWithOtherDrops && analysis.storesWithOtherDrops.length > 0 && (
                        <div className="analysis-section">
                            <button 
                                className={`section-header ${expandedSections.has('otherDrops') ? 'active' : ''}`}
                                onClick={() => toggleSection('otherDrops')}
                            >
                                <span>🚚 Stores That Got Other Drop Products ({analysis.storesWithOtherDrops.length} stores)</span>
                                <span className={`expand-icon ${expandedSections.has('otherDrops') ? 'rotated' : ''}`}>▼</span>
                            </button>
                            
                            {expandedSections.has('otherDrops') && (
                                <div className="section-content">
                                    <p className="section-description">
                                        These stores received allocated deliveries this week but did not get {analysis.product.name}. 
                                        They are less likely to receive additional allocated deliveries in the near term.
                                    </p>
                                    <div className="store-grid">
                                        {analysis.storesWithOtherDrops.map(store => {
                                            const products = store.received_products ? store.received_products.split(',') : [];
                                            const plus = store.received_plus ? store.received_plus.split(',') : [];
                                            
                                            return (
                                                <div key={store.store_id} className={`store-item other-drop ${store.mixed_beverage ? 'mixed' : ''}`}>
                                                    <div className="store-info">
                                                        <div className="store-name">
                                                            {store.nickname} (#{store.store_number})
                                                            {store.mixed_beverage && <span className="mixed-badge">MB</span>}
                                                        </div>
                                                        <div className="store-details">
                                                            {store.address}<br/>
                                                            <small className="received-products">
                                                                <strong>Received:</strong> {products.slice(0, 2).join(', ')}
                                                                {products.length > 2 && ` and ${products.length - 2} more`}
                                                            </small>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stores That May Receive Future Deliveries - NOW IMPLEMENTED */}
                    <StoresWithoutDeliveries 
                        analysis={analysis}
                        expandedSections={expandedSections}
                        toggleSection={toggleSection}
                    />

                    {/* Disclaimer */}
                    <div className="disclaimer">
                        <h3>⚠️ Important Disclaimers</h3>
                        <p><strong>Data Accuracy:</strong> Analysis based on publicly available inventory data from Wake ABC's website, which may not reflect real-time inventory levels.</p>
                        <p><strong>Allocation Uncertainty:</strong> Wake ABC's allocation decisions are complex. Remaining inventory may be reserved for lotteries, restaurants, bars, or future distribution.</p>
                        <p><strong>Predictive Limitations:</strong> Store delivery predictions are based on historical patterns and may not account for changes in distribution strategy.</p>
                        <p style={{ fontSize: '0.8em', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #dee2e6' }}>
                            <em>Report generated: {new Date().toLocaleString()} | Data source: Wake ABC public inventory system</em>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

// FIXED: Now actually implements the stores without deliveries functionality
// FIXED: StoresWithoutDeliveries component with accurate counts
const StoresWithoutDeliveries = ({ analysis, expandedSections, toggleSection }) => {
    const [storesWithoutDeliveries, setStoresWithoutDeliveries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actualCount, setActualCount] = useState(0);

    const loadStoresWithoutDeliveries = async () => {
        if (storesWithoutDeliveries.length > 0) return; // Already loaded

        setLoading(true);
        try {
            const response = await fetch('/api/inventory/stores-without-deliveries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    deliveredStoreIds: analysis.deliveries.map(d => d.store_id),
                    otherDropStoreIds: analysis.storesWithOtherDrops ? 
                        analysis.storesWithOtherDrops.map(s => s.store_id) : []
                })
            });

            const data = await response.json();
            if (data.success) {
                setStoresWithoutDeliveries(data.stores);
                setActualCount(data.stores.length);
            }
        } catch (err) {
            console.error('Failed to load stores without deliveries:', err);
            // Fallback calculation
            setStoresWithoutDeliveries([]);
            setActualCount(0);
        } finally {
            setLoading(false);
        }
    };

    // Pre-load the count for display purposes
    React.useEffect(() => {
        const getCount = async () => {
            try {
                const response = await fetch('/api/inventory/stores-without-deliveries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        deliveredStoreIds: analysis.deliveries.map(d => d.store_id),
                        otherDropStoreIds: analysis.storesWithOtherDrops ? 
                            analysis.storesWithOtherDrops.map(s => s.store_id) : []
                    })
                });

                const data = await response.json();
                if (data.success) {
                    setActualCount(data.stores.length);
                }
            } catch (err) {
                console.error('Failed to get store count:', err);
                // Fallback: rough estimate
                const totalExcludedStores = analysis.deliveries.length + 
                    (analysis.storesWithOtherDrops ? analysis.storesWithOtherDrops.length : 0);
                setActualCount(Math.max(0, 26 - totalExcludedStores)); // Use 26 as total store count
            }
        };

        getCount();
    }, [analysis]);

    return (
        <div className="analysis-section">
            <button 
                className={`section-header ${expandedSections.has('futureDeliveries') ? 'active' : ''}`}
                onClick={() => {
                    toggleSection('futureDeliveries');
                    if (!expandedSections.has('futureDeliveries')) {
                        loadStoresWithoutDeliveries();
                    }
                }}
            >
                <span>📋 Stores That May Receive Future Deliveries ({actualCount} stores)</span>
                <span className={`expand-icon ${expandedSections.has('futureDeliveries') ? 'rotated' : ''}`}>▼</span>
            </button>
            
            {expandedSections.has('futureDeliveries') && (
                <div className="section-content">
                    <p className="section-description">
                        These stores have not received {analysis.product.name} and did not get other allocated products this week. 
                        They may be candidates for future deliveries, subject to Wake ABC's allocation decisions.
                    </p>
                    {loading ? (
                        <div className="loading-stores">Loading stores...</div>
                    ) : storesWithoutDeliveries.length > 0 ? (
                        <div className="store-grid">
                            {storesWithoutDeliveries.map(store => (
                                <div key={store.store_id} className={`store-item ${store.mixed_beverage ? 'mixed' : ''}`}>
                                    <div className="store-info">
                                        <div className="store-name">
                                            {store.nickname} (#{store.store_number})
                                            {store.mixed_beverage && <span className="mixed-badge">MB</span>}
                                        </div>
                                        <div className="store-details">
                                            {store.address}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : actualCount === 0 ? (
                        <div className="store-grid">
                            <div className="store-item">
                                <div className="store-info">
                                    <div className="store-name">
                                        All stores accounted for
                                    </div>
                                    <div className="store-details">
                                        All stores have either received {analysis.product.name} or received other allocated products this week.
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="store-grid">
                            <div className="store-item">
                                <div className="store-info">
                                    <div className="store-name">
                                        Loading store details...
                                    </div>
                                    <div className="store-details">
                                        {actualCount} stores may be candidates for future deliveries.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
export default DeliveryAnalysis;