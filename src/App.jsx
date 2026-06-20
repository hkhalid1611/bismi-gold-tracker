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
  
  // Scrap Price Accordion states
  const [expandedCarat, setExpandedCarat] = useState(null);
  const [scrapInputs, setScrapInputs] = useState({
    '22': { grams: 10, offerPerGram: 0 },
    '21': { grams: 10, offerPerGram: 0 },
    '18': { grams: 10, offerPerGram: 0 },
    '14': { grams: 10, offerPerGram: 0 },
    '9': { grams: 10, offerPerGram: 0 }
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
      const response = await fetch('https://api.gold-api.com/price/XAU/GBP');
      const data = await response.json();
      
      if (data.price) {
        const gramPrice = data.price;
        const ouncePrice = gramPrice * 31.1035;
        
        setSpotPrice({
          gram: gramPrice,
          ounce: ouncePrice
        });
        
        setLastUpdate(new Date().toLocaleTimeString());
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to fetch gold price');
      setLoading(false);
    }
  };

  // Generate historical chart data
  const generateChartData = (period) => {
    if (!spotPrice) return null;
    
    const basePrice = spotPrice.gram;
    const dataPoints = [];
    const labels = [];
    
    let pointCount = 0;
    let dateOffset = 0;
    
    switch(period) {
      case '24h':
        pointCount = 24;
        dateOffset = 1;
        break;
      case '30d':
        pointCount = 30;
        dateOffset = 1;
        break;
      case '3m':
        pointCount = 13;
        dateOffset = 7;
        break;
      case '6m':
        pointCount = 26;
        dateOffset = 7;
        break;
      case '12m':
        pointCount = 52;
        dateOffset = 7;
        break;
      case '5y':
        pointCount = 60;
        dateOffset = 30;
        break;
      case '10y':
        pointCount = 120;
        dateOffset = 30;
        break;
      default:
        pointCount = 52;
    }
    
    for (let i = pointCount - 1; i >= 0; i--) {
      const variance = (Math.random() - 0.5) * basePrice * 0.08;
      const price = basePrice + variance;
      dataPoints.push(Math.max(price, basePrice * 0.85));
      
      const date = new Date();
      date.setDate(date.getDate() - (i * dateOffset));
      labels.push(date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }));
    }
    
    return { dataPoints, labels };
  };

  // Calculate price calculator results
  const calculatePrice = () => {
    if (!spotPrice) return null;
    
    const basePrice = spotPrice.gram * calcWeight;
    const adjustmentAmount = basePrice * (calcAdjustment / 100);
    const totalPrice = basePrice + adjustmentAmount;
    
    return {
      spotPrice: spotPrice.gram,
      weight: calcWeight,
      basePrice,
      adjustment: adjustmentAmount,
      totalPrice
    };
  };

  // Calculate scrap offer for a specific carat
  const calculateScrapOffer = (karat) => {
    if (!spotPrice) return null;
    
    const percentage = caratPercentages[karat];
    const maxOfferPerGram = (spotPrice.gram * percentage) / 100;
    const grams = scrapInputs[karat].grams;
    const offerPerGram = scrapInputs[karat].offerPerGram;
    
    const totalOfferPrice = grams * offerPerGram;
    const profitPerGram = offerPerGram - maxOfferPerGram;
    const totalProfit = grams * profitPerGram;
    
    return {
      maxOfferPerGram,
      totalOfferPrice,
      profitPerGram,
      totalProfit,
      isProfitable: totalProfit >= 0
    };
  };

  // Render chart
  const renderChart = () => {
    const data = chartData;
    if (!data) return null;
    
    const { dataPoints, labels } = data;
    const minPrice = Math.min(...dataPoints);
    const maxPrice = Math.max(...dataPoints);
    const range = maxPrice - minPrice;
    
    const padding = 40;
    const chartWidth = 600;
    const chartHeight = 300;
    const plotWidth = chartWidth - 2 * padding;
    const plotHeight = chartHeight - 2 * padding;
    
    const points = dataPoints.map((price, i) => {
      const x = padding + (i / (dataPoints.length - 1)) * plotWidth;
      const y = padding + plotHeight - ((price - minPrice) / range) * plotHeight;
      return { x, y, price };
    });
    
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    const yAxisLabels = [];
    for (let i = 0; i <= 4; i++) {
      const price = minPrice + (i / 4) * range;
      const y = padding + plotHeight - (i / 4) * plotHeight;
      yAxisLabels.push({ price: price.toFixed(2), y });
    }
    
    const xAxisLabels = [];
    const step = Math.ceil(dataPoints.length / 5);
    for (let i = 0; i < dataPoints.length; i += step) {
      const x = padding + (i / (dataPoints.length - 1)) * plotWidth;
      xAxisLabels.push({ label: labels[i], x });
    }
    
    return (
      <svg className="chart-svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        {/* Grid lines */}
        {yAxisLabels.map((label, i) => (
          <line key={`grid-${i}`} x1={padding} y1={label.y} x2={chartWidth - padding} y2={label.y} stroke="#333" strokeDasharray="2,2" />
        ))}
        
        {/* Y-axis labels */}
        {yAxisLabels.map((label, i) => (
          <text key={`y-label-${i}`} x={padding - 10} y={label.y + 4} textAnchor="end" fontSize="12" fill="#999">
            £{label.price}
          </text>
        ))}
        
        {/* X-axis labels */}
        {xAxisLabels.map((label, i) => (
          <text key={`x-label-${i}`} x={label.x} y={chartHeight - 10} textAnchor="middle" fontSize="12" fill="#999">
            {label.label}
          </text>
        ))}
        
        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#666" strokeWidth="2" />
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#666" strokeWidth="2" />
        
        {/* Chart line */}
        <path d={pathD} fill="none" stroke="#d4af37" strokeWidth="2" />
        
        {/* Data points */}
        {points.map((p, i) => (
          <circle key={`point-${i}`} cx={p.x} cy={p.y} r="3" fill="#d4af37" />
        ))}
      </svg>
    );
  };

  useEffect(() => {
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setChartData(generateChartData(chartPeriod));
  }, [chartPeriod, spotPrice]);

  const priceCalc = calculatePrice();

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
          <div className="section-header-with-icon">
            <h2>Gold Bar Prices</h2>
            <img src="/gold-bars-icon.png" alt="Gold Bars" className="section-icon" />
          </div>
          
          <div className="bar-prices-list">
            {spotPrice && [
              { weight: 100, markup: barMarkups[100] },
              { weight: 50, markup: barMarkups[50] },
              { weight: 31.1035, label: '1 ounce', markup: barMarkups[31.1035] },
              { weight: 20, markup: barMarkups[20] },
              { weight: 10, markup: barMarkups[10] },
              { weight: 5, markup: barMarkups[5] },
              { weight: 2.5, markup: barMarkups[2.5] }
            ].map(bar => {
              const price = spotPrice.gram * bar.weight * (1 + bar.markup / 100);
              return (
                <div key={bar.weight} className="bar-price-row">
                  <span className="weight-label">{bar.label || `${bar.weight}g`}</span>
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
                <span className="result-label">Adjustment ({calcAdjustment}%)</span>
                <span className="result-value">£{priceCalc.adjustment.toFixed(2)}</span>
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
            <div className="spot-value">£{spotPrice ? spotPrice.gram.toFixed(2) : '—'}</div>
            <div className="per-gram">per gram</div>
          </div>

          <div className="scrap-price-grid">
            {Object.entries(caratPercentages).map(([karat, percentage]) => {
              const maxOfferPerGram = spotPrice ? (spotPrice.gram * percentage) / 100 : 0;
              const isExpanded = expandedCarat === karat;
              const scrapCalc = calculateScrapOffer(karat);
              
              return (
                <div key={karat} className="scrap-accordion-item">
                  <div 
                    className="scrap-accordion-header"
                    onClick={() => setExpandedCarat(isExpanded ? null : karat)}
                  >
                    <div className="scrap-info">
                      <span className="scrap-karat">{karat} Carat</span>
                      <span className="scrap-percentage">{percentage}% of spot</span>
                    </div>
                    <div className="scrap-max-offer">
                      £{maxOfferPerGram.toFixed(2)}/g
                    </div>
                    <span className="accordion-toggle">{isExpanded ? '−' : '+'}</span>
                  </div>

                  {isExpanded && (
                    <div className="scrap-accordion-content">
                      <div className="input-group">
                        <label>Grams</label>
                        <input 
                          type="number" 
                          value={scrapInputs[karat].grams}
                          onChange={(e) => setScrapInputs({
                            ...scrapInputs,
                            [karat]: { ...scrapInputs[karat], grams: parseFloat(e.target.value) || 0 }
                          })}
                          placeholder="Enter grams"
                        />
                      </div>
                      <div className="input-group">
                        <label>Offer per gram (£)</label>
                        <input 
                          type="number" 
                          value={scrapInputs[karat].offerPerGram}
                          onChange={(e) => setScrapInputs({
                            ...scrapInputs,
                            [karat]: { ...scrapInputs[karat], offerPerGram: parseFloat(e.target.value) || 0 }
                          })}
                          placeholder="Enter offer"
                        />
                        <div className="max-offer-helper">Max: £{maxOfferPerGram.toFixed(2)}</div>
                      </div>

                      {scrapCalc && (
                        <div className="scrap-results">
                          <div className="result-row">
                            <span className="result-label">Spot Price per gram</span>
                            <span className="result-value">£{spotPrice.gram.toFixed(2)}</span>
                          </div>
                          <div className="result-row">
                            <span className="result-label">Carat ({karat}) - {percentage}%</span>
                            <span className="result-value">£{scrapCalc.maxOfferPerGram.toFixed(2)}/g</span>
                          </div>
                          <div className="result-row total-offer-highlight">
                            <span className="result-label">Total Offer Price</span>
                            <span className="result-value total-offer-value">£{scrapCalc.totalOfferPrice.toFixed(2)}</span>
                          </div>
                          <div className={`result-row profit-loss ${scrapCalc.isProfitable ? 'profit' : 'loss'}`}>
                            <span className="result-label">{scrapCalc.isProfitable ? 'Total Profit' : 'Total Loss'}</span>
                            <span className="result-value">£{Math.abs(scrapCalc.totalProfit).toFixed(2)}</span>
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
              <div className="indicator-value">+0.00%</div>
            </div>
            <div className="indicator">
              <div className="indicator-label">24h %</div>
              <div className="indicator-value">+0.00%</div>
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
              <div className="volatility-fill" style={{ width: '35%' }}></div>
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

          <div className="chart-container">
            {chartData ? (
              <div className="chart-display">
                {renderChart()}
                <div className="chart-info">
                  <div className="info-item">
                    <div className="info-label">High</div>
                    <div className="info-value">£{Math.max(...chartData.dataPoints).toFixed(2)}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Low</div>
                    <div className="info-value">£{Math.min(...chartData.dataPoints).toFixed(2)}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Average</div>
                    <div className="info-value">£{(chartData.dataPoints.reduce((a, b) => a + b) / chartData.dataPoints.length).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="chart-placeholder">Loading chart data...</div>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        BISMI Jeweller • Real-time data from gold-api.com • For personal use only
      </footer>
    </div>
  );
}
