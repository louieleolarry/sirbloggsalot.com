import React, { useState } from 'react';
import apiClient from '../utils/apiClient';
import '../styles/hormozi.css';

function HormoziOfferGenerator() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [offers, setOffers] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!domain) {
      setError('Please enter a domain');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setOffers(null);
      
      console.log(`Making API request for domain: ${domain}`);
      const response = await apiClient.get(`/hormozi/api/generate`, {
        params: { domain, useActualPricing: true },
        timeout: 60000 // Increase timeout to 60 seconds
      });
      
      if (response.data.success) {
        console.log('Offers received:', response.data.data);
        setOffers(response.data.data);
      } else {
        setError(response.data.message || 'Failed to generate offers');
      }
    } catch (err) {
      console.error('API error:', err);
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. The server might be busy, please try again.');
      } else {
        setError(err.response?.data?.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  // Very simple currency formatter
  const formatPrice = (price) => {
    return '$' + price.toLocaleString();
  };

  return (
    <div className="hormozi-page">
      <div className="logo-container">
        <img src="/hormozi.webp" alt="Hormozi" className="transparent-logo" />
      </div>

      <h1 className="page-title">Alex Hormozi Style Offer Generator</h1>
      
      {!loading && !offers && (
        <>
          <p className="url-label">Enter your domain to generate irresistible Hormozi-style offers</p>
          
          <div className="url-input-container">
            <div className="url-field">
              <span className="url-prefix">https://</span>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="url-input"
              />
            </div>
            
            <button 
              className="get-started-button"
              onClick={handleSubmit}
            >
              Generate Offers
            </button>
          </div>
          
          {error && <div className="error-message">{error}</div>}
        </>
      )}
      
      {loading && (
        <div className="loading-state">
          <div className="loading-animation">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
          <p>Analyzing your website and crafting irresistible offers...</p>
          <p className="loading-sub">Extracting your actual pricing and creating realistic packages</p>
        </div>
      )}
      
      {offers && !loading && (
        <div className="results-container">
          <div className="share-section">
            <p>Share your offers: <a href={`/hormozi/offers/${offers.domainSlug}`} target="_blank" rel="noopener noreferrer">
              {window.location.origin}/hormozi/offers/{offers.domainSlug}
            </a></p>
          </div>
          
          <div className="tabs-container">
            <div className="tab-headers">
              {offers.offers && offers.offers.map((offer, index) => (
                <button 
                  key={index} 
                  className={`tab-btn ${activeTab === index ? 'active-tab' : ''}`}
                  onClick={() => setActiveTab(index)}
                >
                  {offer.tier === 'low' ? 'BASIC' : offer.tier === 'medium' ? 'PREMIUM' : 'ELITE'}
                </button>
              ))}
            </div>
            
            {offers.offers && offers.offers.length > 0 && (
              <div className="offer-content">
                <div className="offer-header">
                  <h2>{offers.offers[activeTab].name}</h2>
                  <p>{offers.offers[activeTab].headline}</p>
                </div>
                
                <div className="offer-details">
                  <div className="offer-section">
                    <h3>Promise</h3>
                    <p>{offers.offers[activeTab].promise}</p>
                  </div>
                  
                  <div className="offer-section">
                    <h3>Price</h3>
                    <div className="price-display">
                      <p className="actual-price">{formatPrice(offers.offers[activeTab].price)}</p>
                      <p className="total-value">Value: {formatPrice(offers.offers[activeTab].totalValue)}</p>
                    </div>
                  </div>
                  
                  <div className="offer-section">
                    <h3>What You Get</h3>
                    <div className="value-stack">
                      {offers.offers[activeTab].valueStack && offers.offers[activeTab].valueStack.map((item, idx) => (
                        <div key={idx} className="stack-item">
                          <div className="stack-header">
                            <p>{item.itemName}</p>
                            <p>{formatPrice(item.itemValue)}</p>
                          </div>
                          <p className="stack-desc">{item.itemDescription}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="offer-section">
                    <h3>Our Guarantee</h3>
                    <p>{offers.offers[activeTab].guarantee}</p>
                  </div>
                  
                  <div className="offer-section benefits-grid">
                    <div className="benefit">
                      <h3>Time Reduction</h3>
                      <p>{offers.offers[activeTab].timeReduction}</p>
                    </div>
                    <div className="benefit">
                      <h3>Effort Reduction</h3>
                      <p>{offers.offers[activeTab].effortReduction}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default HormoziOfferGenerator; 