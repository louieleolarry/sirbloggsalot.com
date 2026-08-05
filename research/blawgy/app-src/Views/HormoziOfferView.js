import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import '../styles/hormozi.css';

function HormoziOfferView() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offers, setOffers] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log(`Fetching offers for slug: ${slug}`);
        const response = await apiClient.get(`/hormozi/api/offers/${slug}`);
        
        if (response.data.success) {
          console.log('Offers data received:', response.data.data);
          setOffers(response.data.data);
        } else {
          setError(response.data.message || 'Failed to fetch offers');
        }
      } catch (err) {
        console.error('API error:', err);
        setError(err.response?.data?.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchOffers();
    }
  }, [slug]);

  // Very simple currency formatter
  const formatPrice = (price) => {
    return '$' + price.toLocaleString();
  };

  if (loading) {
    return (
      <div className="hormozi-page">
        <div className="loading-state">
          <div className="loading-animation">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
          <p>Loading offers...</p>
          <p className="loading-sub">Please wait while we retrieve your offer</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hormozi-page">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <a href="/alex-hormozi-offer-ai" className="get-started-button">Return to Generator</a>
        </div>
      </div>
    );
  }

  if (!offers) {
    return (
      <div className="hormozi-page">
        <div className="error-message">
          <h2>Offers Not Found</h2>
          <p>We couldn't find any offers for this domain.</p>
          <a href="/alex-hormozi-offer-ai" className="get-started-button">Try generating new offers</a>
        </div>
      </div>
    );
  }

  // Extract domain without http/https
  const domainName = offers.domain.replace(/^https?:\/\//, '');

  return (
    <div className="hormozi-page">
      <div className="logo-container">
        <img src="/hormozi.webp" alt="Hormozi" className="transparent-logo" />
      </div>

      <h1 className="page-title">
        {domainName} <br />
        <span style={{ fontSize: '0.8em' }}>Hormozi-Style Offers</span>
      </h1>
      
      <div className="results-container">
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
      <div className="footer-text">Based on Alex Hormozi's Grand Slam Offer methodology</div>
    </div>
  );
}

export default HormoziOfferView; 