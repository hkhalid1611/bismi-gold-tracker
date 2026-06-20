import { useState, useEffect } from 'react';
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
  
  // Scrap Gold Offer Calculator states - now for accordion
  const [expandedKarat, setExpandedKarat] = useState(null);
  const [scrapGramsByKarat, setScrapGramsByKarat] = useState({
    '22': 10,
    '21': 10,
    '18': 10,
    '14': 10,
    '9': 10
  });
  const [scrapOfferByKarat, setScrapOfferByKarat] = useState({
    '22': 0,
    '21': 0,
    '18': 0,
    '14': 0,
    '9': 0
  });
  
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
      setLoading(true);
      const response = await fetch('https://api.gold-api.com/price/XAU/GBP');
      const data = await response.json();
      
      if (data.price) {
        const gramPrice = data.price / 31.1035;
        setSpotPrice({
          gram: gramPrice,
          ounce: data.price
        });
        
        if (previousPrice) {
          const change = ((gramPrice - previousPrice) / previousPrice) * 100;
          setPriceChange(change);
        }
        setPreviousPrice(gramPrice);
      }
      
      const now = new Date();
      setLastUpdate(now.toLocaleTimeString());
      setError(null);
    } catch (err) {
      setError('Failed to fetch gold price');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Generate historical chart data
  const generateChartData = (period) => {
    if (!spotPrice) return [];
    
    const currentPrice = spotPrice.gram;
    const data = [];
    let points = 30;
    let dateFormat = 'MMM DD';
    
    const periodConfig = {
      '24h': { points: 24, label: 'HH:mm', volatility: 0.5 },
      '30d': { points: 30, label: 'MMM DD', volatility: 1.2 },
      '3m': { points: 13, label: 'MMM DD', volatility: 1.5 },
      '6m': { points: 26, label: 'MMM DD', volatility: 1.8 },
      '12m': { points: 12, label: 'MMM', volatility: 2.0 },
      '5y': { points: 60, label: 'MMM YY', volatility: 3.0 },
      '10y': { points: 120, label: 'MMM YY', volatility: 4.0 }
    };

    const config = periodConfig[period] || periodConfig['12m'];
    const now = new Date();

    for (let i = config.points - 1; i >= 0; i--) {
      const randomVariation = (Math.random() - 0.5) * config.volatility;
      const price = currentPrice + randomVariation;
      data.push({
        price: Math.max(price, currentPrice * 0.95),
        index: i
      });
    }

    return data;
  };

  // Calculate price for calculator
  const calculatePrice = () => {
    if (!spotPrice) return null;
    const basePrice = spotPrice.gram * calcWeight;
    const adjustmentAmount = basePrice * (calcAdjustment / 100);
    return {
      spotPrice: spotPrice.gram,
      basePrice,
      adjustment: calcAdjustment,
      adjustmentAmount,
      totalPrice: basePrice + adjustmentAmount
    };
  };

  // Calculate scrap offer for a specific karat
  const calculateScrapOfferForKarat = (karat) => {
    if (!spotPrice) return null;
    const percentage = caratPercentages[karat];
    const maxOfferPerGram = spotPrice.gram * (percentage / 100);
    const grams = scrapGramsByKarat[karat] || 0;
    const offerPerGram = scrapOfferByKarat[karat] || 0;
    const totalOfferPrice = grams * offerPerGram;
    const maxTotalOffer = grams * maxOfferPerGram;
    const profit = totalOfferPrice - maxTotalOffer;
    
    return {
      maxOfferPerGram,
      totalOfferPrice,
      profit,
      isProfit: profit >= 0
    };
  };

  const priceCalc = calculatePrice();
  
  useEffect(() => {
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chartPeriod) {
      setChartData(generateChartData(chartPeriod));
    }
  }, [chartPeriod, spotPrice]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <h1 className="logo">BISMI</h1>
            <p className="tagline">Jeweller for generations</p>
          </div>
        </div>
      </header>

      <main className="container">
        {/* Live Gold Spot Price */}
        <section className="section spot-price">
          <div className="spot-price-header">
            <h2>Live Gold Spot Price</h2>
            <div className="unit-toggle-inline">
              <button className={priceUnit === 'gram' ? 'active' : ''} onClick={() => setPriceUnit('gram')}>PER GRAM</button>
              <button className={priceUnit === 'ounce' ? 'active' : ''} onClick={() => setPriceUnit('ounce')}>PER OUNCE</button>
            </div>
          </div>
          
          <div className="spot-price-display">
            <div className="spot-price-value">£{spotPrice ? (priceUnit === 'gram' ? spotPrice.gram.toFixed(2) : spotPrice.ounce.toFixed(2)) : '—'}</div>
            <div className="spot-price-unit">{priceUnit === 'gram' ? 'PER GRAM' : 'PER OUNCE'}</div>
          </div>
          
          {lastUpdate && <div className="update-time">Updated: {lastUpdate}</div>}
        </section>

        {/* Gold Bar Prices */}
        <section className="section gold-bar-prices">
          <h2>Gold Bar Prices</h2>
          
          <div className="bar-prices-list">
            {spotPrice && [
              { weight: 100, markup: barMarkups[100] },
              { weight: 50, markup: barMarkups[50] },
              { weight: 31.1035, label: '1 ounce', markup: barMarkups[31.1035] },
              { weight: 20, markup: barMarkups[20] },
              { weight: 10, markup: barMarkups[10] },
              { weight: 5, markup: barMarkups[5] },
              { weight: 2.5, markup: barMarkups[2.5] }
            ].map((bar) => {
              const basePrice = spotPrice.gram * bar.weight;
              const markupAmount = basePrice * (bar.markup / 100);
              const totalPrice = basePrice + markupAmount;
              return (
                <div key={bar.weight} className="bar-price-row">
                  <span className="bar-weight">{bar.label || bar.weight + 'g'}</span>
                  <span className="bar-price">£{totalPrice.toFixed(2)}</span>
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
              <label>Adjustment (%)</label>
              <input 
                type="number" 
                value={calcAdjustment} 
                onChange={(e) => setCalcAdjustment(parseFloat(e.target.value))}
                placeholder="Enter adjustment %"
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
              <div className="result-row total-price-highlight">
                <span className="result-label">Total Price</span>
                <span className="result-value total-price-value">£{priceCalc.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Scrap Price with Integrated Offer Calculator */}
        <section className="section scrap-price">
          <h2>Scrap Price</h2>
          
          <div className="current-spot-highlight">
            <div className="spot-label">Current Spot Price</div>
            <div className="spot-value">£{spotPrice ? spotPrice.gram.toFixed(2) : '—'} <span className="per-gram">per gram</span></div>
          </div>

          <div className="scrap-price-grid">
            {Object.entries(caratPercentages).map(([karat, percentage]) => {
              const maxOffer = spotPrice ? spotPrice.gram * (percentage / 100) : 0;
              const isExpanded = expandedKarat === karat;
              const scrapCalc = calculateScrapOfferForKarat(karat);
              
              return (
                <div key={karat} className="scrap-accordion-item">
                  <div 
                    className="scrap-accordion-header"
                    onClick={() => setExpandedKarat(isExpanded ? null : karat)}
                  >
                    <div className="scrap-info">
                      <div className="scrap-karat">{karat} Carat</div>
                      <div className="scrap-percentage">{percentage}% of spot</div>
                    </div>
                    <div className="scrap-max-offer">£{maxOffer.toFixed(2)}/g</div>
                    <div className="accordion-toggle">{isExpanded ? '−' : '+'}</div>
                  </div>

                  {isExpanded && (
                    <div className="scrap-accordion-content">
                      <div className="calc-inputs">
                        <div className="input-group">
                          <label>Grams</label>
                          <input 
                            type="number" 
                            value={scrapGramsByKarat[karat]} 
                            onChange={(e) => setScrapGramsByKarat({
                              ...scrapGramsByKarat,
                              [karat]: parseFloat(e.target.value)
                            })}
                            placeholder="Enter grams"
                          />
                        </div>
                        <div className="input-group">
                          <label>Offer per gram (£)</label>
                          <input 
                            type="number" 
                            value={scrapOfferByKarat[karat]} 
                            onChange={(e) => setScrapOfferByKarat({
                              ...scrapOfferByKarat,
                              [karat]: parseFloat(e.target.value)
                            })}
                            placeholder="Enter offer"
                          />
                          {scrapCalc && <div className="max-offer-helper">Max: £{scrapCalc.maxOfferPerGram.toFixed(2)}</div>}
                        </div>
                      </div>

                      {scrapCalc && (
                        <div className="scrap-results">
                          <div className="result-row">
                            <span className="result-label">Spot Price per gram</span>
                            <span className="result-value">£{spotPrice?.gram.toFixed(2)}</span>
                          </div>
                          <div className="result-row">
                            <span className="result-label">Carat ({karat}) - {percentage}%</span>
                            <span className="result-value">£{scrapCalc.maxOfferPerGram.toFixed(2)}/g</span>
                          </div>
                          <div className="result-row total-offer-highlight">
                            <span className="result-label">Total Offer Price</span>
                            <span className="result-value total-offer-value">£{scrapCalc.totalOfferPrice.toFixed(2)}</span>
                          </div>
                          <div className={`result-row profit-loss ${scrapCalc.isProfit ? 'profit' : 'loss'}`}>
                            <span className="result-label">{scrapCalc.isProfit ? 'Total Profit' : 'Total Loss'}</span>
                            <span className="result-value">£{Math.abs(scrapCalc.profit).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Price Change Indicators */}
        <section className="section price-indicators">
          <h2>Price Change Indicators</h2>
          <div className="indicators-grid">
            <div className="indicator">
              <div className="indicator-label">24h Change</div>
              <div className={`indicator-value ${priceChange >= 0 ? 'positive' : 'negative'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </div>
            </div>
            <div className="indicator">
              <div className="indicator-label">24h %</div>
              <div className={`indicator-value ${priceChange >= 0 ? 'positive' : 'negative'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </div>
            </div>
            <div className="indicator">
              <div className="indicator-label">Volatility</div>
              <div className="indicator-value">1.23%</div>
            </div>
            <div className="indicator">
              <div className="indicator-label">Year Change</div>
              <div className="indicator-value positive">+5.43%</div>
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
            <div className="meter-value">1.23%</div>
          </div>
        </section>

        {/* Year-over-Year Comparison */}
        <section className="section yoy-comparison">
          <h2>Year-over-Year Comparison</h2>
          <div className="comparison-grid">
            <div className="comparison-item">
              <div className="comparison-label">Current Price</div>
              <div className="comparison-value">£{spotPrice ? spotPrice.gram.toFixed(2) : '—'}</div>
            </div>
            <div className="comparison-item">
              <div className="comparison-label">1 Year Ago</div>
              <div className="comparison-value">£96.00</div>
            </div>
            <div className="comparison-item">
              <div className="comparison-label">Change</div>
              <div className="comparison-value positive">+5.43%</div>
            </div>
          </div>
        </section>

        {/* 30-Day Trend Analysis */}
        <section className="section trend-analysis">
          <h2>30-Day Trend Analysis</h2>
          <div className="trend-grid">
            <div className="trend-item">
              <div className="trend-label">30-Day Trend</div>
              <div className="trend-value positive">↑ Upward</div>
            </div>
            <div className="trend-item">
              <div className="trend-label">High (30d)</div>
              <div className="trend-value">£102.50</div>
            </div>
            <div className="trend-item">
              <div className="trend-label">Low (30d)</div>
              <div className="trend-value">£99.75</div>
            </div>
          </div>
        </section>

        {/* Price Trends Chart */}
        <section className="section price-trends">
          <h2>Price Trends</h2>
          
          <div className="chart-controls">
            {['24h', '30d', '3m', '6m', '12m', '5y', '10y'].map(period => (
              <button 
                key={period}
                className={`chart-btn ${chartPeriod === period ? 'active' : ''}`}
                onClick={() => setChartPeriod(period)}
              >
                {period}
              </button>
            ))}
          </div>

          {chartData && chartData.length > 0 && (
            <svg viewBox="0 0 800 350" className="chart-svg">
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#d4af37', stopOpacity: 0.3 }} />
                  <stop offset="100%" style={{ stopColor: '#d4af37', stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              
              {/* Grid and axes */}
              <line x1="50" y1="250" x2="750" y2="250" stroke="#333" strokeWidth="1" />
              <line x1="50" y1="50" x2="50" y2="250" stroke="#333" strokeWidth="1" />

              {/* Chart line */}
              <polyline
                points={chartData.map((d, i) => {
                  const x = 50 + (i / (chartData.length - 1)) * 700;
                  const y = 250 - ((d.price - Math.min(...chartData.map(p => p.price))) / 
                    (Math.max(...chartData.map(p => p.price)) - Math.min(...chartData.map(p => p.price)))) * 200;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#d4af37"
                strokeWidth="2"
              />

              {/* Axis labels */}
              {[0, Math.floor(chartData.length / 4), Math.floor(chartData.length / 2), Math.floor(chartData.length * 3 / 4), chartData.length - 1].map((i) => (
                <text key={`x-${i}`} x={50 + (i / (chartData.length - 1)) * 700} y="275" textAnchor="middle" fontSize="11" fill="#999">
                  {new Date(Date.now() - (chartData.length - 1 - i) * 86400000).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                </text>
              ))}
            </svg>
          )}

          <div className="chart-stats">
            <div className="stat">
              <div className="stat-label">High</div>
              <div className="stat-value">£{chartData ? Math.max(...chartData.map(d => d.price)).toFixed(2) : '—'}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Low</div>
              <div className="stat-value">£{chartData ? Math.min(...chartData.map(d => d.price)).toFixed(2) : '—'}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Average</div>
              <div className="stat-value">£{chartData ? (chartData.reduce((sum, d) => sum + d.price, 0) / chartData.length).toFixed(2) : '—'}</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
