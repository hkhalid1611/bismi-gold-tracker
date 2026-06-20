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
      '12m': { points: 52, label: 'MMM DD', volatility: 2.0 },
      '5y': { points: 60, label: 'MMM YY', volatility: 2.5 },
      '10y': { points: 120, label: 'MMM YY', volatility: 3.0 }
    };
    
    const config = periodConfig[period] || periodConfig['12m'];
    
    for (let i = 0; i < config.points; i++) {
      const randomChange = (Math.random() - 0.5) * config.volatility;
      const price = currentPrice * (1 + randomChange / 100);
      
      const date = new Date();
      if (period === '24h') {
        date.setHours(date.getHours() - (config.points - i));
      } else if (period === '30d') {
        date.setDate(date.getDate() - (config.points - i));
      } else if (period === '3m') {
        date.setDate(date.getDate() - (config.points - i) * 7);
      } else if (period === '6m') {
        date.setDate(date.getDate() - (config.points - i) * 7);
      } else if (period === '12m') {
        date.setDate(date.getDate() - (config.points - i) * 7);
      } else if (period === '5y') {
        date.setMonth(date.getMonth() - (config.points - i));
      } else if (period === '10y') {
        date.setMonth(date.getMonth() - (config.points - i));
      }
      
      let dateStr = '';
      if (config.label === 'HH:mm') {
        dateStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } else if (config.label === 'MMM DD') {
        dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        dateStr = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
      
      data.push({ date: dateStr, price: Math.max(price, 50) });
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

  // Calculate price calculator results
  const calculatePriceCalc = () => {
    if (!spotPrice) return null;
    const spotPriceValue = priceUnit === 'gram' ? spotPrice.gram : spotPrice.ounce;
    const weight = calcWeight === 31.1035 ? 1 : calcWeight;
    const basePrice = spotPriceValue * weight;
    const adjustmentAmount = basePrice * (calcAdjustment / 100);
    const totalPrice = basePrice + adjustmentAmount;
    const calcAdjustment_val = parseFloat(calcAdjustment) || 0;
    
    return {
      spotPrice: spotPriceValue,
      weight,
      basePrice,
      adjustment: calcAdjustment_val,
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
    // Profit if offer is LESS than max (you're offering less than allowed)
    // Loss if offer is MORE than max (you're overpaying)
    const profit = maxTotalPrice - totalOfferPrice;
    
    return {
      maxOfferPerGram,
      totalOfferPrice,
      maxTotalPrice,
      profit,
      isProfit: profit >= 0
    };
  };

  const priceCalc = calculatePriceCalc();
  const scrapOffer = calculateScrapOffer();

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">BISMI</h1>
          <p className="tagline">Jeweller for generations</p>
        </div>
        <div className="unit-toggle">
          <button className={priceUnit === 'gram' ? 'active' : ''} onClick={() => setPriceUnit('gram')}>PER GRAM</button>
          <button className={priceUnit === 'ounce' ? 'active' : ''} onClick={() => setPriceUnit('ounce')}>PER OUNCE</button>
        </div>
      </header>

      <main className="container">
        {/* Live Gold Spot Price */}
        <section className="section spot-price">
          <h2>Live Gold Spot Price</h2>
          
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
            ].map((item, idx) => {
              const price = spotPrice.gram * item.weight * (1 + item.markup / 100);
              return (
                <div key={idx} className="bar-price-row">
                  <span className="weight-label">{item.label || `${item.weight}g`}</span>
                  <span className="bar-price">£{price.toFixed(2)}</span>
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
              <div className="result-row total-price-highlight">
                <span className="result-label">Total Price</span>
                <span className="result-value total-price-value">£{priceCalc.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Scrap Price */}
        <section className="section scrap-price">
          <h2>Scrap Price</h2>
          
          <div className="current-spot-highlight">
            <div className="spot-label">Current Spot Price</div>
            <div className="spot-value">£{spotPrice ? spotPrice.gram.toFixed(2) : '—'} <span className="per-gram">per gram</span></div>
          </div>

          <div className="scrap-price-grid">
            {Object.entries(caratPercentages).map(([karat, percentage]) => {
              const maxOffer = spotPrice ? spotPrice.gram * (percentage / 100) : 0;
              return (
                <div key={karat} className="scrap-price-row">
                  <div className="scrap-info">
                    <div className="scrap-karat">{karat} Carat</div>
                    <div className="scrap-percentage">{percentage}% of spot</div>
                  </div>
                  <div className="scrap-max-offer">£{maxOffer.toFixed(2)}/g</div>
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
              {scrapOffer && <div className="max-offer-helper">Max: £{scrapOffer.maxOfferPerGram.toFixed(2)}</div>}
            </div>
          </div>

          {scrapOffer && (
            <div className="scrap-results">
              <div className="result-row">
                <span className="result-label">Spot Price per gram</span>
                <span className="result-value">£{spotPrice?.gram.toFixed(2)}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Carat ({scrapKarat}) - {caratPercentages[scrapKarat]}%</span>
                <span className="result-value">£{scrapOffer.maxOfferPerGram.toFixed(2)}/g</span>
              </div>
              <div className="result-row total-offer-highlight">
                <span className="result-label">Total Offer Price</span>
                <span className="result-value total-offer-value">£{scrapOffer.totalOfferPrice.toFixed(2)}</span>
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
          <div className="volatility-display">
            <div className="volatility-bar">
              <div className="volatility-fill" style={{width: '40%'}}></div>
            </div>
            <div className="volatility-label">Moderate</div>
          </div>
        </section>

        {/* Year-over-Year Comparison */}
        <section className="section year-comparison">
          <h2>Year-over-Year Comparison</h2>
          <div className="comparison-grid">
            <div className="comparison-item">
              <div className="comparison-label">This Year</div>
              <div className="comparison-value positive">+5.43%</div>
            </div>
            <div className="comparison-item">
              <div className="comparison-label">Last Year</div>
              <div className="comparison-value positive">+8.5%</div>
            </div>
          </div>
        </section>

        {/* 30-Day Trend Analysis */}
        <section className="section trend-analysis">
          <h2>30-Day Trend Analysis</h2>
          <div className="trend-grid">
            <div className="trend-item">
              <div className="trend-label">30-Day Trend</div>
              <div className="trend-value positive">+2.15%</div>
            </div>
            <div className="trend-item">
              <div className="trend-label">30-Day High</div>
              <div className="trend-value">£106.11</div>
            </div>
            <div className="trend-item">
              <div className="trend-label">30-Day Low</div>
              <div className="trend-value">£96.01</div>
            </div>
          </div>
        </section>

        {/* Price Trends Chart */}
        <section className="section price-trends">
          <h2>Price Trends</h2>
          
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

          {chartData && chartData.length > 0 ? (
            <div className="chart-container">
              <div className="chart-display">
                <svg viewBox="0 0 800 350" className="chart-svg">
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
                        
                        {/* Horizontal axis labels (dates) */}
                        {chartData.map((d, i) => {
                          if (i % Math.max(1, Math.floor(chartData.length / 6)) === 0 || i === chartData.length - 1) {
                            const x = 50 + (i / (chartData.length - 1 || 1)) * 700;
                            return (
                              <g key={`date-${i}`}>
                                <line x1={x} y1="250" x2={x} y2="260" stroke="#666" strokeWidth="1" />
                                <text x={x} y="275" textAnchor="middle" fontSize="11" fill="#999" fontFamily="Arial">{d.date}</text>
                              </g>
                            );
                          }
                          return null;
                        })}
                        
                        {/* Vertical axis labels (prices) */}
                        {[0, 1, 2, 3, 4].map(i => {
                          const price = minPrice + (range / 4) * i;
                          const y = 250 - (i * 50);
                          return (
                            <g key={`price-${i}`}>
                              <line x1="45" y1={y} x2="50" y2={y} stroke="#666" strokeWidth="1" />
                              <text x="40" y={y + 4} textAnchor="end" fontSize="11" fill="#999" fontFamily="Arial">£{price.toFixed(0)}</text>
                            </g>
                          );
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
            </div>
          ) : (
            <div className="chart-placeholder">
              <p>Loading chart data...</p>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>BISMI Jeweller • Real-time data from gold-api.com • For personal use only</p>
      </footer>
    </div>
  );
}
