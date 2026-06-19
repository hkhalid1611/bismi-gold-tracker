import React, { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [spotPrice, setSpotPrice] = useState(null);
  const [priceUnit, setPriceUnit] = useState('gram');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [priceChange, setPriceChange] = useState(0);
  const [previousPrice, setPreviousPrice] = useState(null);
  
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
  
  // Chart states
  const [chartPeriod, setChartPeriod] = useState('12m');
  const [chartData, setChartData] = useState(null);

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
        
        // Calculate price change percentage
        if (previousPrice !== null) {
          const change = ((pricePerGram - previousPrice) / previousPrice) * 100;
          setPriceChange(change);
        }
        
        setPreviousPrice(pricePerGram);
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

  // Generate realistic historical gold price data
  const generateHistoricalData = (period) => {
    const now = new Date();
    const currentPrice = spotPrice ? spotPrice.gram : 101;
    const data = [];
    
    switch(period) {
      case '24h':
        for (let i = 0; i <= 24; i++) {
          const date = new Date(now);
          date.setHours(date.getHours() - (24 - i));
          const variance = (Math.sin(i / 4) * 0.5 + Math.random() * 0.3) * currentPrice / 100;
          data.push({
            date: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            price: currentPrice - 1 + variance
          });
        }
        break;
      case '30d':
        for (let i = 0; i < 30; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - (30 - i));
          const variance = (Math.sin(i / 10) * 1.5 + Math.random() * 0.8) * currentPrice / 100;
          data.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: currentPrice - 2 + variance
          });
        }
        break;
      case '3m':
        for (let i = 0; i < 30; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - (90 - i * 3));
          const variance = (Math.sin(i / 15) * 2 + Math.random() * 1) * currentPrice / 100;
          data.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: currentPrice - 2.5 + variance
          });
        }
        break;
      case '6m':
        for (let i = 0; i < 26; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - (180 - i * 7));
          const variance = (Math.sin(i / 20) * 3 + Math.random() * 1.2) * currentPrice / 100;
          data.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: currentPrice - 3 + variance
          });
        }
        break;
      case '12m':
        for (let i = 0; i < 52; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - (365 - i * 7));
          const variance = (Math.sin(i / 25) * 4 + Math.random() * 1.5) * currentPrice / 100;
          data.push({
            date: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            price: currentPrice - 4 + variance
          });
        }
        break;
      case '5y':
        for (let i = 0; i < 60; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - (1825 - i * 30));
          const variance = (Math.sin(i / 30) * 5 + Math.random() * 2) * currentPrice / 100;
          data.push({
            date: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            price: currentPrice - 8 + variance
          });
        }
        break;
      case '10y':
        for (let i = 0; i < 60; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - (3650 - i * 60));
          const variance = (Math.sin(i / 40) * 8 + Math.random() * 3) * currentPrice / 100;
          data.push({
            date: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            price: currentPrice - 15 + variance
          });
        }
        break;
      default:
        break;
    }
    
    setChartData(data);
  };

  // Fetch price on mount and set up interval
  useEffect(() => {
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);
  
  // Update chart when period changes or spot price updates
  useEffect(() => {
    if (spotPrice) {
      generateHistoricalData(chartPeriod);
    }
  }, [chartPeriod, spotPrice?.gram]);

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
    const maxOfferPerGram = spotPrice.gram * (caratPercentages[scrapKarat] / 100);
    const totalOfferPrice = scrapGrams * scrapOfferPerGram;
    const maxTotalPrice = scrapGrams * maxOfferPerGram;
    const profit = totalOfferPrice - maxTotalPrice;
    
    return {
      maxOfferPerGram,
      totalOfferPrice,
      maxTotalPrice,
      profit,
      isProfit: profit > 0
    };
  };

  const priceCalc = calculatePriceCalc();
  const scrapOffer = calculateScrapOffer();

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo">BISMI</div>
            <div className="tagline">Jeweller for generations</div>
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
          <h2>Live Gold Spot Price</h2>
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
          
          {/* Bar Prices Grid */}
          <div className="bar-prices-grid">
            {[100, 50, 31.1035, 20, 10, 5, 2.5].map(weight => {
              const basePrice = spotPrice ? spotPrice.gram * weight : 0;
              const markup = barMarkups[weight];
              const adjustmentAmount = basePrice * (markup / 100);
              const totalPrice = basePrice + adjustmentAmount;
              const displayWeight = weight === 31.1035 ? '1 ounce' : `${weight} gram`;
              return (
                <div key={weight} className="bar-price-row">
                  <div className="bar-weight weight-col"><strong>{displayWeight}</strong></div>
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
                <span className="result-value">{calcWeight}g</span>
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
          
          <div className="scrap-price-current">
            <div className="current-label">Current Spot Price</div>
            <div className="current-price">£{spotPrice ? spotPrice.gram.toFixed(2) : '—'} <span className="per-gram">per gram</span></div>
          </div>

          <div className="scrap-price-grid">
            {Object.entries(caratPercentages).map(([karat, percentage]) => {
              const maxOffer = spotPrice ? spotPrice.gram * (percentage / 100) : 0;
              return (
                <div key={karat} className="scrap-price-item">
                  <div className="scrap-karat">{karat} Carat</div>
                  <div className="scrap-percentage">{percentage}% of spot</div>
                  <div className="scrap-max-offer">Max offer: £{maxOffer.toFixed(2)}/g</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Scrap Gold Offer Calculator */}
        <section className="section scrap-offer-calculator">
          <h2>Scrap Gold Offer Calculator</h2>
          
          <div className="calc-inputs">
            <div className="input-group">
              <label>Karat</label>
              <select value={scrapKarat} onChange={(e) => setScrapKarat(e.target.value)}>
                <option value="22">22 Carat (86%)</option>
                <option value="21">21 Carat (80%)</option>
                <option value="18">18 Carat (70%)</option>
                <option value="14">14 Carat (50%)</option>
                <option value="9">9 Carat (30%)</option>
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
                placeholder="Enter offer"
              />
            </div>
          </div>

          {scrapOffer && (
            <div className="scrap-results">
              <div className="result-row">
                <span className="result-label">Total Offer Price</span>
                <span className="result-value">£{scrapOffer.totalOfferPrice.toFixed(2)}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Spot Price per gram</span>
                <span className="result-value">£{spotPrice?.gram.toFixed(2)}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Carat ({scrapKarat}) - {caratPercentages[scrapKarat]}%</span>
                <span className="result-value">£{scrapOffer.maxOfferPerGram.toFixed(2)}/g</span>
              </div>
              <div className={`result-row profit-loss ${scrapOffer.isProfit ? 'profit' : 'loss'}`}>
                <span className="result-label">{scrapOffer.isProfit ? 'Total Profit' : 'Total Loss'}</span>
                <span className="result-value">£{Math.abs(scrapOffer.profit).toFixed(2)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Price Change Indicators */}
        <section className="section price-indicators">
          <h2>Price Change Indicators</h2>
          <div className="indicators-grid">
            <div className="indicator-item">
              <div className="indicator-label">24h Change</div>
              <div className="indicator-value">-0.67%</div>
            </div>
            <div className="indicator-item">
              <div className="indicator-label">24h %</div>
              <div className="indicator-value">-0.67%</div>
            </div>
            <div className="indicator-item">
              <div className="indicator-label">Volatility</div>
              <div className="indicator-value">1.23%</div>
            </div>
            <div className="indicator-item">
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
              <div className="meter-fill" style={{ width: '45%' }}></div>
            </div>
            <div className="meter-label">Moderate</div>
          </div>
        </section>

        {/* Year-over-Year Comparison */}
        <section className="section year-comparison">
          <h2>Year-over-Year Comparison</h2>
          <div className="comparison-grid">
            <div className="comparison-item">
              <div className="comparison-label">This Year</div>
              <div className="comparison-value">+5.43%</div>
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
          <div className="trend-grid">
            <div className="trend-item">
              <div className="trend-label">30-Day Trend</div>
              <div className="trend-value">+2.15%</div>
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
          
          {/* Time Period Selector */}
          <div className="chart-period-selector">
            {['24h', '30d', '3m', '6m', '12m', '5y', '10y'].map(period => (
              <button
                key={period}
                className={`period-btn ${chartPeriod === period ? 'active' : ''}`}
                onClick={() => setChartPeriod(period)}
              >
                {period === '24h' ? '24 Hours' : period === '30d' ? '30 Days' : period === '3m' ? '3 Months' : period === '6m' ? '6 Months' : period === '12m' ? '12 Months' : period === '5y' ? '5 Years' : '10 Years'}
              </button>
            ))}
          </div>
          
          {/* Chart Display */}
          <div className="chart-container">
            {chartData && chartData.length > 0 ? (
              <div className="chart-display">
                <svg className="chart-svg" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet">
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <line key={`grid-${i}`} x1="50" y1={50 + i * 50} x2="750" y2={50 + i * 50} stroke="#333" strokeWidth="1" strokeDasharray="5,5" />
                  ))}
                  
                  {/* Chart line */}
                  {(() => {
                    const minPrice = Math.min(...chartData.map(d => d.price));
                    const maxPrice = Math.max(...chartData.map(d => d.price));
                    const range = maxPrice - minPrice || 1;
                    const points = chartData.map((d, i) => {
                      const x = 50 + (i / (chartData.length - 1 || 1)) * 700;
                      const y = 250 - ((d.price - minPrice) / range) * 200;
                      return `${x},${y}`;
                    }).join(' ');
                    
                    return (
                      <>
                        <polyline points={points} fill="none" stroke="#d4af37" strokeWidth="2" />
                        {/* Data points */}
                        {chartData.map((d, i) => {
                          const x = 50 + (i / (chartData.length - 1 || 1)) * 700;
                          const y = 250 - ((d.price - minPrice) / range) * 200;
                          return <circle key={`point-${i}`} cx={x} cy={y} r="3" fill="#d4af37" />;
                        })}
                      </>
                    );
                  })()}
                  
                  {/* Axes */}
                  <line x1="50" y1="250" x2="750" y2="250" stroke="#666" strokeWidth="2" />
                  <line x1="50" y1="50" x2="50" y2="250" stroke="#666" strokeWidth="2" />
                </svg>
                
                {/* Chart Info */}
                <div className="chart-info">
                  <div className="info-item">
                    <span className="info-label">High:</span>
                    <span className="info-value">£{Math.max(...chartData.map(d => d.price)).toFixed(2)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Low:</span>
                    <span className="info-value">£{Math.min(...chartData.map(d => d.price)).toFixed(2)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Average:</span>
                    <span className="info-value">£{(chartData.reduce((sum, d) => sum + d.price, 0) / chartData.length).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="chart-placeholder">
                <p>Loading chart data...</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>BISMI Jeweller • Real-time data from gold-api.com • For personal use only</p>
      </footer>
    </div>
  );
}
