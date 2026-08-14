import {
  Candle,
  OrderBook,
  OrderBookEntry,
  StockNews,
  StockQuote,
  TechnicalIndicators,
  TimeFrame,
  TradeTapeEntry,
  WatchlistItem
} from '../types';

export const STOCK_UNIVERSE: Record<string, { name: string; sector: string; basePrice: number; beta: number; description: string }> = {
  RELIANCE: { name: 'Reliance Industries Ltd.', sector: 'Energy & Conglomerate', basePrice: 2847.00, beta: 1.1, description: 'Indian market leader with oil-to-retail conglomerate operations.' },
  TCS: { name: 'Tata Consultancy Services Ltd.', sector: 'IT Services & Consulting', basePrice: 4120.00, beta: 0.9, description: 'India\'s largest IT services provider and global tech consultant.' },
  INFY: { name: 'Infosys Limited', sector: 'IT Services & Software', basePrice: 1892.00, beta: 1.0, description: 'Leading digital services and consulting firm in India.' },
  SBIN: { name: 'State Bank of India', sector: 'Financial Services & Banking', basePrice: 812.00, beta: 1.25, description: 'India\'s largest public sector commercial bank.' },
  ITC: { name: 'ITC Limited', sector: 'Consumer Goods & Conglomerate', basePrice: 438.00, beta: 0.8, description: 'Major Indian FMCG, hotel, paperboard, and agri-business conglomerate.' },
  NVDA: { name: 'NVIDIA Corporation', sector: 'Semiconductors & AI Hardware', basePrice: 128.45, beta: 1.8, description: 'AI GPU market leader with Blackwell architecture demand.' },
  TSLA: { name: 'Tesla, Inc.', sector: 'Electric Vehicles & Robotics', basePrice: 218.60, beta: 2.1, description: 'FSD V13 rollout, Robotaxi progress and energy storage ramp.' },
  AAPL: { name: 'Apple Inc.', sector: 'Consumer Electronics', basePrice: 226.30, beta: 0.9, description: 'Apple Intelligence rollout across iPhone 16 ecosystem.' },
  MSFT: { name: 'Microsoft Corporation', sector: 'Cloud & Enterprise AI', basePrice: 416.70, beta: 1.1, description: 'Azure AI cloud acceleration and Copilot enterprise monetization.' },
  AMD: { name: 'Advanced Micro Devices', sector: 'Semiconductors', basePrice: 148.90, beta: 1.7, description: 'MI350 AI accelerators competing in enterprise data centers.' },
  AMZN: { name: 'Amazon.com, Inc.', sector: 'E-Commerce & Cloud (AWS)', basePrice: 184.20, beta: 1.2, description: 'AWS margin expansion, Bedrock AI models, retail logistics efficiency.' },
  GOOGL: { name: 'Alphabet Inc.', sector: 'Search & Generative AI', basePrice: 168.50, beta: 1.15, description: 'Gemini multimodal ecosystem, Cloud profitability, Search resilience.' },
  META: { name: 'Meta Platforms, Inc.', sector: 'Social Media & AI', basePrice: 512.40, beta: 1.3, description: 'Llama open-source AI dominance and high ad conversion rates.' },
  PLTR: { name: 'Palantir Technologies', sector: 'Enterprise AI & Defense', basePrice: 42.80, beta: 2.4, description: 'AIP bootcamps driving exponential US commercial customer growth.' },
  COIN: { name: 'Coinbase Global, Inc.', sector: 'Digital Assets & FinTech', basePrice: 205.10, beta: 2.8, description: 'Base L2 network adoption, institutional custody, ETF trading volume.' },
  SPY: { name: 'SPDR S&P 500 ETF Trust', sector: 'US Large Cap Index', basePrice: 548.90, beta: 1.0, description: 'Benchmark US broad market equities tracker.' },
  QQQ: { name: 'Invesco QQQ Trust', sector: 'Nasdaq-100 Tech Index', basePrice: 478.20, beta: 1.2, description: 'Tech-heavy growth index driven by mega-cap technology.' },
  'BTC-USD': { name: 'Bitcoin / USD', sector: 'Cryptocurrency', basePrice: 63250.00, beta: 2.5, description: 'Digital asset reserve currency and spot ETF liquidity flows.' }
};

// Generates initial historical candles based on timeframe
export function generateHistoricCandles(symbol: string, timeframe: TimeFrame, count: number = 80): Candle[] {
  const stock = STOCK_UNIVERSE[symbol] || { basePrice: 150.0, beta: 1.0 };
  const candles: Candle[] = [];
  
  let timeframeMinutes = 5;
  switch (timeframe) {
    case '1m': timeframeMinutes = 1; break;
    case '5m': timeframeMinutes = 5; break;
    case '15m': timeframeMinutes = 15; break;
    case '1h': timeframeMinutes = 60; break;
    case '1D': timeframeMinutes = 1440; break;
    case '1W': timeframeMinutes = 10080; break;
  }

  const now = Date.now();
  const stepMs = timeframeMinutes * 60 * 1000;
  let currentPrice = stock.basePrice * (1 + (Math.random() * 0.08 - 0.04));

  // Volatility scale per timeframe
  const volFactor = (timeframeMinutes <= 5 ? 0.0035 : timeframeMinutes <= 60 ? 0.008 : 0.02) * stock.beta;

  const rawCandles: { time: number; open: number; high: number; low: number; close: number; volume: number }[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const time = now - i * stepMs;
    const changePct = (Math.random() - 0.49) * volFactor;
    const open = currentPrice;
    const close = Math.max(0.1, open * (1 + changePct));
    const high = Math.max(open, close) * (1 + Math.random() * (volFactor * 0.7));
    const low = Math.min(open, close) * (1 - Math.random() * (volFactor * 0.7));
    const baseVol = symbol.includes('BTC') ? 450 : 25000;
    const volume = Math.floor(baseVol * (0.6 + Math.random() * 1.2) * (1 + Math.abs(changePct) * 40));

    rawCandles.push({
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    });

    currentPrice = close;
  }

  return rawCandles;
}

// Calculate technical indicators from candle series
export function calculateTechnicalIndicators(candles: Candle[]): TechnicalIndicators {
  if (candles.length < 15) {
    return getDefaultIndicators(candles[candles.length - 1]?.close || 100);
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);
  const currentPrice = closes[closes.length - 1];

  // 1. RSI (14 period)
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - 14; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14 || 0.0001;
  const rs = avgGain / avgLoss;
  const rsi = Number((100 - 100 / (1 + rs)).toFixed(1));
  const rsiSignal = rsi > 70 ? 'OVERBOUGHT' : rsi < 30 ? 'OVERSOLD' : 'NEUTRAL';

  // 2. EMAs
  const ema9 = Number(calculateEMA(closes, 9).toFixed(2));
  const ema20 = Number(calculateEMA(closes, 20).toFixed(2));
  const ema50 = Number(calculateEMA(closes, 50).toFixed(2));
  const ema200 = Number(calculateEMA(closes, Math.min(200, closes.length)).toFixed(2));

  // 3. MACD (12, 26, 9)
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = Number((ema12 - ema26).toFixed(3));
  // Approximate signal line
  const prevMacdLine = (calculateEMA(closes.slice(0, -1), 12) - calculateEMA(closes.slice(0, -1), 26));
  const signalLine = Number(((macdLine * 2 + prevMacdLine * 7) / 9).toFixed(3));
  const histogram = Number((macdLine - signalLine).toFixed(3));
  
  let macdTrend: TechnicalIndicators['macd']['trend'] = 'BULLISH';
  if (macdLine > signalLine && prevMacdLine <= signalLine) macdTrend = 'BULLISH_CROSS';
  else if (macdLine < signalLine && prevMacdLine >= signalLine) macdTrend = 'BEARISH_CROSS';
  else if (macdLine > signalLine) macdTrend = 'BULLISH';
  else macdTrend = 'BEARISH';

  // 4. Bollinger Bands (20, 2)
  const bbSlice = closes.slice(-20);
  const bbMean = bbSlice.reduce((a, b) => a + b, 0) / bbSlice.length;
  const variance = bbSlice.reduce((sum, p) => sum + Math.pow(p - bbMean, 2), 0) / bbSlice.length;
  const stdDev = Math.sqrt(variance);
  const bbUpper = Number((bbMean + 2 * stdDev).toFixed(2));
  const bbLower = Number((bbMean - 2 * stdDev).toFixed(2));
  const bbBandwidth = Number((((bbUpper - bbLower) / bbMean) * 100).toFixed(2));
  const bbPercentB = Number(((currentPrice - bbLower) / ((bbUpper - bbLower) || 1)).toFixed(2));

  // 5. VWAP
  let cumVol = 0;
  let cumTypicalVol = 0;
  for (let i = 0; i < candles.length; i++) {
    const typical = (candles[i].high + candles[i].low + candles[i].close) / 3;
    cumTypicalVol += typical * candles[i].volume;
    cumVol += candles[i].volume;
  }
  const vwap = Number((cumTypicalVol / (cumVol || 1)).toFixed(2));

  // 6. ATR (14 period)
  let sumTR = 0;
  for (let i = candles.length - 14; i < candles.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    sumTR += tr;
  }
  const atr = Number((sumTR / 14).toFixed(2));

  // 7. ADX estimate (14 period trend strength)
  const adx = Number((20 + Math.abs(currentPrice - ema50) / ema50 * 250 + Math.random() * 5).toFixed(1));

  // 8. Stochastic (14, 3)
  const recentHighs = highs.slice(-14);
  const recentLows = lows.slice(-14);
  const highestH = Math.max(...recentHighs);
  const lowestL = Math.min(...recentLows);
  const stochK = Number((((currentPrice - lowestL) / ((highestH - lowestL) || 1)) * 100).toFixed(1));
  const stochD = Number((stochK * 0.6 + 40 * 0.4).toFixed(1));

  // 9. Pivot Points (Floor)
  const lastCandle = candles[candles.length - 1];
  const pivot = (lastCandle.high + lastCandle.low + lastCandle.close) / 3;
  const r1 = Number((2 * pivot - lastCandle.low).toFixed(2));
  const s1 = Number((2 * pivot - lastCandle.high).toFixed(2));
  const r2 = Number((pivot + (lastCandle.high - lastCandle.low)).toFixed(2));
  const s2 = Number((pivot - (lastCandle.high - lastCandle.low)).toFixed(2));

  // Consensus score
  let bullish = 0;
  let bearish = 0;
  let neutral = 0;

  if (currentPrice > ema20) bullish++; else bearish++;
  if (currentPrice > ema50) bullish++; else bearish++;
  if (currentPrice > ema200) bullish++; else bearish++;
  if (rsi > 50 && rsi < 70) bullish++; else if (rsi >= 70) bearish++; else if (rsi < 30) bullish++; else bearish++;
  if (macdTrend === 'BULLISH' || macdTrend === 'BULLISH_CROSS') bullish++; else bearish++;
  if (currentPrice > vwap) bullish++; else bearish++;
  if (stochK > 50) bullish++; else bearish++;

  let trendConsensus: TechnicalIndicators['trendConsensus'] = 'NEUTRAL';
  if (bullish >= 6) trendConsensus = 'STRONG_BULLISH';
  else if (bullish >= 4) trendConsensus = 'BULLISH';
  else if (bearish >= 6) trendConsensus = 'STRONG_BEARISH';
  else if (bearish >= 4) trendConsensus = 'BEARISH';

  return {
    rsi,
    rsiSignal,
    macd: {
      macdLine,
      signalLine,
      histogram,
      trend: macdTrend
    },
    ema9,
    ema20,
    ema50,
    ema200,
    bollinger: {
      upper: bbUpper,
      middle: Number(bbMean.toFixed(2)),
      lower: bbLower,
      bandwidth: bbBandwidth,
      percentB: bbPercentB
    },
    vwap,
    atr,
    adx: Math.min(85, Math.max(12, adx)),
    stochastic: {
      k: stochK,
      d: stochD
    },
    pivotPoints: {
      r2,
      r1,
      pivot: Number(pivot.toFixed(2)),
      s1,
      s2
    },
    trendConsensus,
    bullishIndicatorsCount: bullish,
    bearishIndicatorsCount: bearish,
    neutralIndicatorsCount: neutral
  };
}

function calculateEMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

function getDefaultIndicators(price: number): TechnicalIndicators {
  return {
    rsi: 54.2,
    rsiSignal: 'NEUTRAL',
    macd: { macdLine: 0.85, signalLine: 0.62, histogram: 0.23, trend: 'BULLISH' },
    ema9: price * 1.002,
    ema20: price * 0.998,
    ema50: price * 0.992,
    ema200: price * 0.975,
    bollinger: { upper: price * 1.025, middle: price, lower: price * 0.975, bandwidth: 5.0, percentB: 0.5 },
    vwap: price * 0.999,
    atr: price * 0.015,
    adx: 28.4,
    stochastic: { k: 58.2, d: 52.1 },
    pivotPoints: { r2: price * 1.03, r1: price * 1.015, pivot: price, s1: price * 0.985, s2: price * 0.97 },
    trendConsensus: 'BULLISH',
    bullishIndicatorsCount: 4,
    bearishIndicatorsCount: 2,
    neutralIndicatorsCount: 1
  };
}

// Generate Live Order Book (Depth of Market)
export function generateOrderBook(currentPrice: number, symbol: string): OrderBook {
  const isCrypto = symbol.includes('BTC');
  const tickSize = isCrypto ? 1.0 : 0.05;
  const depth = 8;
  const baseSize = isCrypto ? 0.8 : 450;

  const bids: OrderBookEntry[] = [];
  const asks: OrderBookEntry[] = [];

  let bidTotal = 0;
  let askTotal = 0;

  // Buyer bias based on symbol hash
  const bias = 0.5 + (Math.sin(currentPrice * 10) * 0.15);

  for (let i = 1; i <= depth; i++) {
    const bidPrice = Number((currentPrice - i * tickSize).toFixed(2));
    const bidSize = Math.floor(baseSize * (0.5 + Math.random() * 1.2) * (1 + (depth - i) * 0.2) * (bias > 0.5 ? 1.3 : 0.8));
    bidTotal += bidSize;
    bids.push({ price: bidPrice, size: bidSize, total: bidTotal });

    const askPrice = Number((currentPrice + i * tickSize).toFixed(2));
    const askSize = Math.floor(baseSize * (0.5 + Math.random() * 1.2) * (1 + (depth - i) * 0.2) * (bias <= 0.5 ? 1.3 : 0.8));
    askTotal += askSize;
    asks.push({ price: askPrice, size: askSize, total: askTotal });
  }

  const spread = Number((asks[0].price - bids[0].price).toFixed(2));
  const spreadPercent = Number(((spread / currentPrice) * 100).toFixed(3));
  const buyerDominance = Number(((bidTotal / (bidTotal + askTotal || 1)) * 100).toFixed(1));

  return {
    bids,
    asks,
    spread,
    spreadPercent,
    buyerDominance
  };
}

// Generate Time & Sales Trade Tape Entry
export function generateTradeTapeEntry(currentPrice: number, symbol: string): TradeTapeEntry {
  const isCrypto = symbol.includes('BTC');
  const variation = (Math.random() - 0.48) * (isCrypto ? 2.5 : 0.1);
  const tradePrice = Number((currentPrice + variation).toFixed(2));
  const side = variation >= 0 ? 'BUY' : 'SELL';
  const baseSize = isCrypto ? (Math.random() * 0.5 + 0.05) : Math.floor(Math.random() * 300 + 10);
  const isBlock = Math.random() < 0.08;
  const size = isBlock ? (isCrypto ? Number((baseSize * 6).toFixed(3)) : baseSize * 8) : isCrypto ? Number(baseSize.toFixed(3)) : baseSize;

  const now = new Date();
  const time = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

  return {
    id: Math.random().toString(36).substring(2, 9),
    time,
    price: tradePrice,
    size,
    side,
    isBlockTrade: isBlock
  };
}

// Generate dynamic financial news catalog
export function getStockNews(symbol: string): StockNews[] {
  const stock = STOCK_UNIVERSE[symbol] || { name: symbol, sector: 'Tech' };
  
  const newsTemplates: Record<string, StockNews[]> = {
    NVDA: [
      {
        id: 'n1',
        headline: 'NVIDIA Expands Blackwell Ultra Capacity as Hyperscalers Accelerate AI Clusters',
        source: 'Bloomberg Markets',
        timeAgo: '12m ago',
        sentiment: 'BULLISH',
        sentimentScore: 0.92,
        impactLevel: 'HIGH',
        relatedSymbols: ['NVDA', 'AMD', 'MSFT']
      },
      {
        id: 'n2',
        headline: 'Morgan Stanley Reaffirms Top Pick on NVDA With $170 Price Target',
        source: 'Reuters Financial',
        timeAgo: '48m ago',
        sentiment: 'BULLISH',
        sentimentScore: 0.78,
        impactLevel: 'MEDIUM',
        relatedSymbols: ['NVDA', 'SPY']
      },
      {
        id: 'n3',
        headline: 'Semiconductor Supply Chain Tightness Seen Easing by Q3 on TSMC CoWoS Expansion',
        source: 'Wall Street Journal',
        timeAgo: '2h ago',
        sentiment: 'NEUTRAL',
        sentimentScore: 0.15,
        impactLevel: 'MEDIUM',
        relatedSymbols: ['NVDA', 'AMD', 'TSLA']
      }
    ],
    TSLA: [
      {
        id: 't1',
        headline: 'Tesla Unveils Autonomous Ride-Hail Fleet Architecture in Key Metro Test Markets',
        source: 'Electrek Daily',
        timeAgo: '8m ago',
        sentiment: 'BULLISH',
        sentimentScore: 0.85,
        impactLevel: 'HIGH',
        relatedSymbols: ['TSLA', 'QQQ']
      },
      {
        id: 't2',
        headline: 'Megapack Energy Storage Deployments Reach Record 12.8 GWh Quarterly Run Rate',
        source: 'CNBC Pro',
        timeAgo: '1h ago',
        sentiment: 'BULLISH',
        sentimentScore: 0.88,
        impactLevel: 'HIGH',
        relatedSymbols: ['TSLA']
      },
      {
        id: 't3',
        headline: 'Global EV Price War Stabilizes as Margin Floor Holds Above Street Consensus',
        source: 'Financial Times',
        timeAgo: '3h ago',
        sentiment: 'NEUTRAL',
        sentimentScore: 0.22,
        impactLevel: 'MEDIUM',
        relatedSymbols: ['TSLA', 'SPY']
      }
    ]
  };

  if (newsTemplates[symbol]) {
    return newsTemplates[symbol];
  }

  return [
    {
      id: `${symbol}-1`,
      headline: `${stock.name} Technical Breakout: Institutional Accumulation Seen Above 20-Day EMA`,
      source: 'MarketWatch Trading Desk',
      timeAgo: '15m ago',
      sentiment: 'BULLISH',
      sentimentScore: 0.74,
      impactLevel: 'HIGH',
      relatedSymbols: [symbol, 'SPY']
    },
    {
      id: `${symbol}-2`,
      headline: `Options Volume Spikes in ${symbol} Ahead of Sector Macro Catalyst`,
      source: 'Benzinga Pro',
      timeAgo: '45m ago',
      sentiment: 'BULLISH',
      sentimentScore: 0.65,
      impactLevel: 'MEDIUM',
      relatedSymbols: [symbol]
    },
    {
      id: `${symbol}-3`,
      headline: `Analyst Consensus Upgrades Growth Outlook for ${stock.sector}`,
      source: 'Seeking Alpha',
      timeAgo: '2h ago',
      sentiment: 'NEUTRAL',
      sentimentScore: 0.30,
      impactLevel: 'LOW',
      relatedSymbols: [symbol, 'QQQ']
    }
  ];
}

// Generate Initial Watchlist
export function getInitialWatchlist(): WatchlistItem[] {
  return Object.keys(STOCK_UNIVERSE).slice(0, 10).map((sym) => {
    const s = STOCK_UNIVERSE[sym];
    const change = Number(((Math.random() * 4.8) - 1.8).toFixed(2));
    const price = Number((s.basePrice * (1 + change / 100)).toFixed(2));
    const rsi = Math.floor(40 + Math.random() * 32);
    
    // Sparkline points
    const sparkline: number[] = [];
    let p = price * 0.98;
    for (let i = 0; i < 12; i++) {
      p = p * (1 + (Math.random() * 0.01 - 0.0045));
      sparkline.push(Number(p.toFixed(2)));
    }
    sparkline.push(price);

    let signal: WatchlistItem['signal'] = 'BUY';
    if (change > 2.0 && rsi < 70) signal = 'STRONG_BUY';
    else if (change > 0.2) signal = 'BUY';
    else if (change < -2.0) signal = 'STRONG_SELL';
    else if (change < -0.5) signal = 'SELL';
    else signal = 'NEUTRAL';

    return {
      symbol: sym,
      name: s.name,
      price,
      changePercent: change,
      signal,
      rsi,
      sparkline
    };
  });
}
