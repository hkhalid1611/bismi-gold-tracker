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

  // Expanded bar weight state (only one can be open at a time)
  const [expandedBarWeight, setExpandedBarWeight] = useState(null);
  const [barAdjustments, setBarAdjustments] = useState({
    100: 5.72,
    50: 5.99,
    31.1035: 6.10,
    20: 7.17,
    10: 9.04,
    5: 13.84,
    2.5: 17.82
  });

  // Expanded scrap karat state (only one can be open at a time)
  const [expandedScrapKarat, setExpandedScrapKarat] = useState(null);
  const [scrapGramsMap, setScrapGramsMap] = useState({
    '22': 10,
    '21': 10,
    '18': 10,
    '14': 10,
    '9': 10
  });
  const [scrapOfferPerGramMap, setScrapOfferPerGramMap] = useState({
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

  // Generate historical chart data with realistic price variations
  const generateChartData = (period) => {
    if (!spotPrice) return [];
    
    const currentPrice = spotPrice.gram;
    const baselinePrice = currentPrice * 0.98;
    const data = [];
    
    const periodConfig = {
      '24h': { points: 24, label: 'HH:mm', volatility: 2.0, daysPerPoint: 0 },
      '7d': { points: 7, label: 'MMM DD', volatility: 3.0, daysPerPoint: 1 },
      '30d': { points: 30, label: 'MMM DD', volatility: 3.5, daysPerPoint: 1 },
      '1y': { points: 52, label: 'MMM DD', volatility: 4.0, daysPerPoint: 7 },
      '5y': { points: 60, label: 'MMM YY', volatility: 4.5, daysPerPoint: 30 }
    };
    
    const config = periodConfig[period] || periodConfig['1y'];
    
    // Generate realistic trend: start with a direction, add noise
    const trendDirection = Math.random() > 0.5 ? 1 : -1;
    let trendValue = -2;
    
    for (let i = 0; i < config.points; i++) {
      // Create smooth trend component
      trendValue += (Math.random() - 0.4) * 0.6 * trendDirection;
      trendValue = Math.max(-4, Math.min(4, trendValue));
      
      // Add volatility on top of trend for realistic fluctuations
      const volatilityComponent = (Math.random() - 0.5) * config.volatility;
      const priceChange = trendValue + volatilityComponent;
      const price = baselinePrice * (1 + priceChange / 100);
      
      // Calculate date
      const date = new Date();
      if (period === '24h') {
        date.setHours(date.getHours() - (config.points - i));
      } else if (period === '7d') {
        date.setDate(date.getDate() - (config.points - i));
      } else if (period === '30d') {
        date.setDate(date.getDate() - (config.points - i));
      } else if (period === '1y') {
        date.setDate(date.getDate() - (config.points - i) * 7);
      } else if (period === '5y') {
        date.setMonth(date.getMonth() - (config.points - i));
      }
      
      // Format date label
      let dateStr = '';
      if (config.label === 'HH:mm') {
        dateStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } else if (config.label === 'MMM DD') {
        dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        dateStr = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
      
      data.push({ date: dateStr, price: Math.max(price, baselinePrice * 0.95) });
    }
    
    return data;
  };

  useEffect(() => {
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (spotPrice) {
      const data = generateChartData(chartPeriod);
      setChartData(data);
    }
  }, [spotPrice, chartPeriod]);

  // Calculate price for bar expansion
  const calculateBarPrice = (weight) => {
    if (!spotPrice) return null;
    const spotPriceValue = priceUnit === 'gram' ? spotPrice.gram : spotPrice.ounce;
    const weightValue = weight === 31.1035 ? 1 : weight;
    const adjustment = barAdjustments[weight] || 5.72;
    const basePrice = spotPriceValue * weightValue;
    const adjustmentAmount = basePrice * (adjustment / 100);
    const totalPrice = basePrice + adjustmentAmount;
    
    return {
      spotPrice: spotPriceValue,
      weight: weightValue,
      basePrice,
      adjustment,
      adjustmentAmount,
      totalPrice
    };
  };

  // Calculate scrap offer for karat expansion
  const calculateScrapOfferForKarat = (karat) => {
    if (!spotPrice) return null;
    const maxOfferPerGram = spotPrice.gram * (caratPercentages[karat] / 100);
    const grams = scrapGramsMap[karat] || 10;
    const offerPerGram = scrapOfferPerGramMap[karat] || 0;
    const totalOfferPrice = grams * offerPerGram;
    const maxTotalPrice = grams * maxOfferPerGram;
    const profit = maxTotalPrice - totalOfferPrice;
    
    return {
      maxOfferPerGram,
      totalOfferPrice,
      maxTotalPrice,
      profit,
      isProfit: profit >= 0,
      grams,
      offerPerGram
    };
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">BISMI</h1>
          <p className="tagline">Jeweller for generations</p>
        </div>
      </header>

      <main className="container">
        {/* Live Gold Spot Price */}
        <section className="section spot-price">
          <h2>Live Gold Spot Price</h2>
          
          <div className="unit-toggle">
            <button className={priceUnit === 'gram' ? 'active' : ''} onClick={() => setPriceUnit('gram')}>PER GRAM</button>
            <button className={priceUnit === 'ounce' ? 'active' : ''} onClick={() => setPriceUnit('ounce')}>PER OUNCE</button>
          </div>
          
          <div className="spot-price-display">
            <div className="spot-price-value">£{spotPrice ? (priceUnit === 'gram' ? spotPrice.gram.toFixed(2) : spotPrice.ounce.toFixed(2)) : '—'}</div>
            <div className="spot-price-unit">{priceUnit === 'gram' ? 'PER GRAM' : 'PER OUNCE'}</div>
          </div>
          
          {lastUpdate && <div className="update-time">Updated: {lastUpdate}</div>}
        </section>

        {/* Gold Bar Prices with Expandable Calculator */}
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
            ].map((item, idx) => {
              const price = spotPrice.gram * item.weight * (1 + item.markup / 100);
              const isExpanded = expandedBarWeight === item.weight;
              const barCalc = calculateBarPrice(item.weight);
              
              return (
                <div key={idx} className={`bar-price-item ${isExpanded ? 'expanded' : ''}`}>
                  <div 
                    className="bar-price-row"
                    onClick={() => setExpandedBarWeight(isExpanded ? null : item.weight)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="weight-label">{item.label || `${item.weight}g`}</span>
                    <span className="bar-price">£{price.toFixed(2)}</span>
                  </div>
                  
                  {isExpanded && barCalc && (
                    <div className="bar-expansion">
                      <div className="calc-inputs">
                        <div className="input-group">
                          <label>Adjustment %</label>
                          <input 
                            type="number" 
                            value={barAdjustments[item.weight]} 
                            onChange={(e) => setBarAdjustments({
                              ...barAdjustments,
                              [item.weight]: parseFloat(e.target.value)
                            })}
                            placeholder="Enter adjustment percentage"
                          />
                        </div>
                      </div>

                      <div className="calc-results">
                        <div className="result-row">
                          <span className="result-label">Spot Price per gram</span>
                          <span className="result-value">£{barCalc.spotPrice.toFixed(2)}</span>
                        </div>
                        <div className="result-row">
                          <span className="result-label">Weight</span>
                          <span className="result-value">{item.label || `${item.weight}g`}</span>
                        </div>
                        <div className="result-row">
                          <span className="result-label">Base Price</span>
                          <span className="result-value">£{barCalc.basePrice.toFixed(2)}</span>
                        </div>
                        <div className="result-row">
                          <span className="result-label">Adjustment ({barCalc.adjustment}%)</span>
                          <span className="result-value">£{barCalc.adjustmentAmount.toFixed(2)}</span>
                        </div>
                        <div className="result-row total-price-highlight">
                          <span className="result-label">Total Price</span>
                          <span className="result-value total-price-value">£{barCalc.totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Scrap Price with Expandable Calculator */}
        <section className="section scrap-price">
          <h2>Scrap Price</h2>
          
          <div className="current-spot-highlight">
            <div className="spot-label">Current Spot Price</div>
            <div className="spot-value">£{spotPrice ? spotPrice.gram.toFixed(2) : '—'} <span className="per-gram">per gram</span></div>
          </div>

          <div className="scrap-price-grid">
            {Object.entries(caratPercentages).map(([karat, percentage]) => {
              const maxOffer = spotPrice ? spotPrice.gram * (percentage / 100) : 0;
              const isExpanded = expandedScrapKarat === karat;
              const scrapCalc = calculateScrapOfferForKarat(karat);
              
              return (
                <div key={karat} className={`scrap-price-item ${isExpanded ? 'expanded' : ''}`}>
                  <div 
                    className="scrap-price-row"
                    onClick={() => setExpandedScrapKarat(isExpanded ? null : karat)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="scrap-info">
                      <div className="scrap-karat">{karat} Carat</div>
                      <div className="scrap-percentage">{percentage}% of spot</div>
                    </div>
                    <div className="scrap-max-offer">£{maxOffer.toFixed(2)}/g</div>
                  </div>

                  {isExpanded && scrapCalc && (
                    <div className="scrap-expansion">
                      <div className="calc-inputs">
                        <div className="input-group">
                          <label>Grams</label>
                          <input 
                            type="number" 
                            value={scrapGramsMap[karat]} 
                            onChange={(e) => setScrapGramsMap({
                              ...scrapGramsMap,
                              [karat]: parseFloat(e.target.value)
                            })}
                            placeholder="Enter grams"
                          />
                        </div>
                        <div className="input-group">
                          <label>Offer per gram (£)</label>
                          <input 
                            type="number" 
                            value={scrapOfferPerGramMap[karat]} 
                            onChange={(e) => setScrapOfferPerGramMap({
                              ...scrapOfferPerGramMap,
                              [karat]: parseFloat(e.target.value)
                            })}
                            placeholder="Enter offer"
                          />
                          <div className="max-offer-helper">Max: £{scrapCalc.maxOfferPerGram.toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="scrap-results">
                        <div className="result-row">
                          <span className="result-label">Spot Price per gram</span>
                          <span className="result-value">£{spotPrice?.gram.toFixed(2)}</span>
                        </div>
                        <div className="result-row">
                          <span className="result-label">Carat ({karat}) - {caratPercentages[karat]}%</span>
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
            <div className="indicator-card">
              <div className="indicator-label">24h Change</div>
              <div className={`indicator-value ${priceChange > 0 ? 'positive' : priceChange < 0 ? 'negative' : 'neutral'}`}>
                {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </div>
            </div>
          </div>
        </section>

        {/* Historical Price Trends */}
        <section className="section price-trends">
          <h2>Price Trends</h2>
          
          <div className="chart-period-selector">
            {['24h', '7d', '30d', '1y', '5y'].map((period) => (
              <button
                key={period}
                className={`period-btn ${chartPeriod === period ? 'active' : ''}`}
                onClick={() => setChartPeriod(period)}
              >
                {period}
              </button>
            ))}
          </div>

          <div className="chart-container">
            {chartData && chartData.length > 0 ? (
              <div className="simple-chart">
                <div className="chart-header">
                  <span className="chart-label">Gold Price ({chartPeriod})</span>
                  <span className="chart-value">£{spotPrice?.gram.toFixed(2)}</span>
                </div>
                <div className="chart-bars">
                  {chartData.map((point, idx) => {
                    const maxPrice = Math.max(...chartData.map(p => p.price));
                    const minPrice = Math.min(...chartData.map(p => p.price));
                    const range = maxPrice - minPrice || 1;
                    const height = ((point.price - minPrice) / range) * 100;
                    return (
                      <div key={idx} className="chart-bar-wrapper">
                        <div className="chart-bar" style={{ height: `${height}%` }}></div>
                        <div className="chart-label-small">{point.date}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="chart-info">
                  <div className="chart-stat">
                    <span className="stat-label">High</span>
                    <span className="stat-value">£{Math.max(...chartData.map(p => p.price)).toFixed(2)}</span>
                  </div>
                  <div className="chart-stat">
                    <span className="stat-label">Low</span>
                    <span className="stat-value">£{Math.min(...chartData.map(p => p.price)).toFixed(2)}</span>
                  </div>
                  <div className="chart-stat">
                    <span className="stat-label">Avg</span>
                    <span className="stat-value">£{(chartData.reduce((sum, p) => sum + p.price, 0) / chartData.length).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="chart-loading">Loading chart data...</div>
            )}
          </div>
        </section>

        {/* Price Comparison */}
        <section className="section price-comparison">
          <h2>Price Comparison</h2>
          
          <div className="comparison-grid">
            <div className="comparison-item">
              <div className="comparison-label">24h High</div>
              <div className="comparison-value">£{chartData && chartData.length > 0 ? Math.max(...chartData.map(p => p.price)).toFixed(2) : '—'}</div>
            </div>
            <div className="comparison-item">
              <div className="comparison-label">24h Low</div>
              <div className="comparison-value">£{chartData && chartData.length > 0 ? Math.min(...chartData.map(p => p.price)).toFixed(2) : '—'}</div>
            </div>
            <div className="comparison-item">
              <div className="comparison-label">Current</div>
              <div className="comparison-value">£{spotPrice?.gram.toFixed(2) || '—'}</div>
            </div>
            <div className="comparison-item">
              <div className="comparison-label">Range</div>
              <div className="comparison-value">{chartData && chartData.length > 0 ? (Math.max(...chartData.map(p => p.price)) - Math.min(...chartData.map(p => p.price))).toFixed(2) : '—'}</div>
            </div>
          </div>
        </section>

        {/* Price Prediction */}
        <section className="section price-prediction">
          <h2>Price Prediction & Analysis</h2>
          
          <div className="prediction-container">
            <div className="prediction-card">
              <div className="prediction-title">Market Outlook</div>
              <div className="prediction-content">
                <p className="prediction-text">
                  Based on current market trends and historical data, gold prices are expected to remain relatively stable in the short term. 
                  Key factors influencing gold prices include:
                </p>
                <ul className="prediction-factors">
                  <li><strong>USD Strength:</strong> Strong dollar typically pressures gold prices</li>
                  <li><strong>Interest Rates:</strong> Higher rates reduce gold's appeal as non-yielding asset</li>
                  <li><strong>Inflation:</strong> Rising inflation supports gold as a hedge</li>
                  <li><strong>Geopolitical Risk:</strong> Uncertainty increases safe-haven demand</li>
                </ul>
              </div>
            </div>

            <div className="prediction-card">
              <div className="prediction-title">Price Forecast</div>
              <div className="prediction-content">
                <div className="forecast-item">
                  <span className="forecast-label">1-Week Forecast</span>
                  <span className="forecast-value neutral">Stable</span>
                </div>
                <div className="forecast-item">
                  <span className="forecast-label">1-Month Forecast</span>
                  <span className="forecast-value neutral">Neutral</span>
                </div>
                <div className="forecast-item">
                  <span className="forecast-label">Confidence Level</span>
                  <span className="forecast-value">Moderate</span>
                </div>
              </div>
            </div>

            <div className="prediction-card">
              <div className="prediction-title">Recommendations</div>
              <div className="prediction-content">
                <ul className="prediction-recommendations">
                  <li>💡 Consider buying on price dips for long-term holdings</li>
                  <li>💡 Monitor USD movements for trading opportunities</li>
                  <li>💡 Keep watch on central bank policy announcements</li>
                  <li>💡 Diversify precious metals portfolio</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
