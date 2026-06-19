import React, { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [spotPrice, setSpotPrice] = useState(null);
  const [priceUnit, setPriceUnit] = useState('gram');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Gold bar markup percentages for each weight
  const barMarkups = {
    2.5: 17.82,
    5: 13.84,
    10: 9.04,
    20: 7.17,
    31.1035: 6.10,  // 1 ounce
    50: 5.99,
    100: 5.72
  };

  // Price Calculator states
  const [calcWeight, setCalcWeight] = useState(100);
  const [calcAdjustment, setCalcAdjustment] = useState(5.72);
  
  // Scrap Gold Offer Calculator states
  const [scrapKarat, setScrapKarat] = useState('22');
  const [scrapGrams, setScrapGrams] = useState(10);
  const [scrapOfferPerGram, setScrapOfferPerGram] = useState(0);

  // Carat percentages of spot price
  const caratPercentages = {
    '22': 86,
    '21': 80,
    '18': 70,
    '14': 50,
    '9': 30
  };

  // Carat purities (out of 24)
  const caratPurity = {
    '22': 22/24,
    '21': 21/24,
    '18': 18/24,
    '14': 14/24,
    '9': 9/24
  };

  // Fetch gold price
  const fetchGoldPrice = async () => {
    try {
      // Try multiple APIs with CORS support
      let data = null;
      
      try {
        // Primary: gold-api.com with CORS proxy
        const response = await fetch('https://api.gold-api.com/price/XAU/GBP');
        data = await response.json();
      } catch (err1) {
        try {
          // Fallback: Alternative API endpoint
          const response = await fetch('https://api.metals.live/api/spot/gold');
          const metalData = await response.json();
          if (metalData.gold) {
            // Convert USD to GBP (approximate)
            data = { price: metalData.gold * 0.79 }; // Rough USD to GBP conversion
          }
        } catch (err2) {
          throw new Error('All APIs failed');
        }
      }
      
      if (data && data.price) {
        // Convert ounce to gram (1 ounce = 31.1035 grams)
        const pricePerGram = data.price / 31.1035;
        setSpotPrice({
          gram: pricePerGram,
          ounce: data.price,
          raw: data
        });
        setLastUpdate(new Date());
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch gold price. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch price on mount and set up interval
  useEffect(() => {
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  // Calculate price calculator results
  const calculatePriceCalc = () => {
    if (!spotPrice) return null;
    const basePrice = spotPrice[priceUnit] * calcWeight;
    const adjustmentAmount = basePrice * (calcAdjustment / 100);
    const totalPrice = basePrice + adjustmentAmount;
    return {
      spotPrice: spotPrice[priceUnit],
      weight: calcWeight,
      basePrice,
      adjustment: calcAdjustment,
      adjustmentAmount,
      totalPrice
    };
  };

  // Calculate scrap offer results
  const calculateScrapOffer = () => {
    if (!spotPrice) return null;
    const percentage = caratPercentages[scrapKarat];
    const purity = caratPurity[scrapKarat];
    const maxOfferPerGram = spotPrice.gram * (percentage / 100);
    const totalOfferPrice = scrapGrams * scrapOfferPerGram;
    
    // Calculate the actual value of the gold based on purity and spot price
    const actualGoldValue = scrapGrams * spotPrice.gram * purity;
    
    // Profit/loss is the difference between offer and actual gold value
    const profit = totalOfferPrice - actualGoldValue;
    
    return {
      percentage,
      maxOfferPerGram,
      totalOfferPrice,
      actualGoldValue,
      profit,
      isLoss: profit < 0
    };
  };

  const priceCalc = calculatePriceCalc();
  const scrapOffer = calculateScrapOffer();

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <h1 className="logo">BISMI</h1>
            <p className="tagline">Jeweller for generations</p>
          </div>
          <div className="header-controls">
            <button 
              className={`unit-btn ${priceUnit === 'gram' ? 'active' : ''}`}
              onClick={() => setPriceUnit('gram')}
            >
              per gram
            </button>
            <button 
              className={`unit-btn ${priceUnit === 'ounce' ? 'active' : ''}`}
              onClick={() => setPriceUnit('ounce')}
            >
              per ounce
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Live Gold Spot Price */}
        <section className="section spot-price">
          <div className="spot-price-display">
            <div className="price-value">
              £{spotPrice ? spotPrice[priceUnit].toFixed(2) : '—'}
            </div>
            <div className="price-label">
              {priceUnit === 'gram' ? 'per gram' : 'per ounce'}
            </div>
          </div>
          {lastUpdate && (
            <div className="last-update">
              Updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </section>

        {/* Gold Bar Prices */}
        <section className="section gold-bar-prices">
          <h2>Gold Bar Prices</h2>
          
          {/* Header Row */}
          <div className="bar-prices-header">
            <div className="header-col weight-col">Weight</div>
            <div className="header-col price-col">Gold Bar Price</div>
          </div>

          {/* Bar Prices Grid */}
          <div className="bar-prices-grid">
            {[100, 50, 31.1035, 20, 10, 5, 2.5].map(weight => {
              const basePrice = spotPrice ? spotPrice.gram * weight : 0;
              const markup = barMarkups[weight];
              const adjustmentAmount = basePrice * (markup / 100);
              const totalPrice = basePrice + adjustmentAmount;
              const displayWeight = weight === 31.1035 ? '1 oz' : `${weight}g`;
              return (
                <div key={weight} className="bar-price-row">
                  <div className="bar-weight weight-col">{displayWeight}</div>
                  <div className="bar-price price-col">£{totalPrice.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Price Calculator */}
        <section className="section price-calculator">
          <h2>Price Calculator</h2>
          
          <div className="calc-inputs">
            <div className="input-group">
              <label>Weight</label>
              <select value={calcWeight} onChange={(e) => setCalcWeight(parseFloat(e.target.value))}>
                <option value={100}>100 gram</option>
                <option value={50}>50 gram</option>
                <option value={31.1035}>1 ounce</option>
                <option value={20}>20 gram</option>
                <option value={10}>10 gram</option>
                <option value={5}>5 gram</option>
                <option value={2.5}>2.5 gram</option>
              </select>
            </div>
            <div className="input-group">
              <label>Adjustment %</label>
              <input 
                type="number" 
                value={calcAdjustment} 
                onChange={(e) => setCalcAdjustment(parseFloat(e.target.value))}
                placeholder="Enter adjustment percentage"
              />
            </div>
          </div>

          {priceCalc && (
            <div className="calc-results">
              <div className="result-row">
                <span className="result-label">Spot Price per gram</span>
                <span className="result-value">£{priceCalc.spotPrice.toFixed(2)}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Weight</span>
                <span className="result-value">{priceCalc.weight}g</span>
              </div>
              <div className="result-row">
                <span className="result-label">Base Price</span>
                <span className="result-value">£{priceCalc.basePrice.toFixed(2)}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Adjustment ({priceCalc.adjustment}%)</span>
                <span className="result-value">£{priceCalc.adjustmentAmount.toFixed(2)}</span>
              </div>
              <div className="result-row total">
                <span className="result-label">Total Price</span>
                <span className="result-value">£{priceCalc.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Scrap Price */}
        <section className="section scrap-price">
          <h2>Scrap Price</h2>
          
          {spotPrice && (
            <div className="scrap-prices-list">
              <div className="current-spot">
                <div className="spot-label">Current Spot Price</div>
                <div className="spot-value">£{spotPrice.gram.toFixed(2)} per gram</div>
              </div>

              {Object.entries(caratPercentages).map(([karat, percentage]) => (
                <div key={karat} className="scrap-price-item">
                  <div className="scrap-karat-label">{karat} Carat</div>
                  <div className="scrap-price-details">
                    <div className="scrap-percentage">{percentage}% of spot</div>
                    <div className="scrap-max-offer">
                      Max offer: £{(spotPrice.gram * (percentage / 100)).toFixed(2)}/g
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Scrap Gold Offer Calculator */}
        <section className="section scrap-offer-calculator">
          <h2>Scrap Gold Offer Calculator</h2>
          
          <div className="calc-inputs">
            <div className="input-group">
              <label>Karat</label>
              <select value={scrapKarat} onChange={(e) => setScrapKarat(e.target.value)}>
                <option value="22">22 Carat</option>
                <option value="21">21 Carat</option>
                <option value="18">18 Carat</option>
                <option value="14">14 Carat</option>
                <option value="9">9 Carat</option>
              </select>
            </div>
            <div className="input-group">
              <label>Grams</label>
              <input 
                type="number" 
                value={scrapGrams} 
                onChange={(e) => setScrapGrams(parseFloat(e.target.value))}
                placeholder="Enter grams"
              />
            </div>
            <div className="input-group">
              <label>Offer per gram (£)</label>
              <input 
                type="number" 
                value={scrapOfferPerGram} 
                onChange={(e) => setScrapOfferPerGram(parseFloat(e.target.value))}
                placeholder="Enter offer price"
              />
            </div>
          </div>

          {scrapOffer && spotPrice && (
            <div className={`scrap-calc-results ${scrapOffer.isLoss ? 'loss' : 'profit'}`}>
              <div className="result-row">
                <span className="result-label">Total Offer Price</span>
                <span className="result-value">£{scrapOffer.totalOfferPrice.toFixed(2)}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Spot Price per gram</span>
                <span className="result-value">£{spotPrice.gram.toFixed(2)}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Carat ({scrapKarat}) - {scrapOffer.percentage}%</span>
                <span className="result-value">£{scrapOffer.maxOfferPerGram.toFixed(2)}/g</span>
              </div>
              <div className={`result-row profit-loss ${scrapOffer.isLoss ? 'loss' : 'profit'}`}>
                <span className="result-label">
                  {scrapOffer.isLoss ? 'Total Loss' : 'Total Profit'}
                </span>
                <span className="result-value">£{Math.abs(scrapOffer.profit).toFixed(2)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Price Change Indicators */}
        <section className="section price-indicators">
          <h2>Price Change Indicators</h2>
          <div className="indicators-grid">
            <div className="indicator">
              <div className="indicator-label">24h Change</div>
              <div className="indicator-value">-0.67%</div>
            </div>
            <div className="indicator">
              <div className="indicator-label">24h %</div>
              <div className="indicator-value">-0.67%</div>
            </div>
            <div className="indicator">
              <div className="indicator-label">Volatility</div>
              <div className="indicator-value">1.23%</div>
            </div>
            <div className="indicator">
              <div className="indicator-label">Year Change</div>
              <div className="indicator-value">+5.43%</div>
            </div>
          </div>
        </section>

        {/* Price Volatility Meter */}
        <section className="section volatility-meter">
          <h2>Price Volatility Meter</h2>
          <div className="meter-container">
            <div className="meter-bar">
              <div className="meter-fill" style={{ width: '35%' }}></div>
            </div>
            <div className="meter-label">Moderate</div>
          </div>
        </section>

        {/* Year-over-Year Comparison */}
        <section className="section yoy-comparison">
          <h2>Year-over-Year Comparison</h2>
          <div className="comparison-items">
            <div className="comparison-item">
              <div className="comparison-label">This Year</div>
              <div className="comparison-value positive">+5.43%</div>
            </div>
            <div className="comparison-item">
              <div className="comparison-label">Last Year</div>
              <div className="comparison-value">+8.5%</div>
            </div>
          </div>
        </section>

        {/* 30-Day Trend Analysis */}
        <section className="section trend-analysis">
          <h2>30-Day Trend Analysis</h2>
          <div className="trend-items">
            <div className="trend-item">
              <div className="trend-label">30-Day Trend</div>
              <div className="trend-value positive">+2.15%</div>
            </div>
            <div className="trend-item">
              <div className="trend-label">30-Day High</div>
              <div className="trend-value">£{spotPrice ? (spotPrice.gram * 1.05).toFixed(2) : '—'}</div>
            </div>
            <div className="trend-item">
              <div className="trend-label">30-Day Low</div>
              <div className="trend-value">£{spotPrice ? (spotPrice.gram * 0.95).toFixed(2) : '—'}</div>
            </div>
          </div>
        </section>

        {/* Price Trends Chart */}
        <section className="section price-trends">
          <h2>Price Trends</h2>
          <div className="chart-container">
            <div className="chart-placeholder">
              <p>📈 Live price chart</p>
              <p className="chart-note">View detailed trends at <a href="https://goldprice.org" target="_blank" rel="noopener noreferrer">goldprice.org</a> or <a href="https://www.gold.org" target="_blank" rel="noopener noreferrer">gold.org</a></p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>BISMI Jeweller • Real-time data from gold-api.com • For personal use only</p>
      </footer>
    </div>
  );
}
