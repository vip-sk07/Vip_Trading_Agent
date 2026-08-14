export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '1D' | '1W';

export type ChartType = 'candlestick' | 'line' | 'area';

export type SignalVerdict = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';

export type StrategyPersona = 'day_trader' | 'scalper' | 'swing_trader' | 'institutional';

export type LLMProvider = 'gemini' | 'ollama' | 'lmstudio' | 'custom';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockQuote {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  avgVolume: number;
  marketCap: string;
  peRatio: number;
  high52: number;
  low52: number;
  vwap: number;
  lastUpdated: number;
}

export interface TechnicalIndicators {
  rsi: number;
  rsiSignal: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    trend: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'BULLISH' | 'BEARISH';
  };
  ema9: number;
  ema20: number;
  ema50: number;
  ema200: number;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    percentB: number;
  };
  vwap: number;
  atr: number;
  adx: number;
  stochastic: {
    k: number;
    d: number;
  };
  pivotPoints: {
    r2: number;
    r1: number;
    pivot: number;
    s1: number;
    s2: number;
  };
  trendConsensus: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  bullishIndicatorsCount: number;
  bearishIndicatorsCount: number;
  neutralIndicatorsCount: number;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  spreadPercent: number;
  buyerDominance: number; // percentage 0 - 100
}

export interface TradeTapeEntry {
  id: string;
  time: string;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  isBlockTrade: boolean;
}

export interface StockNews {
  id: string;
  headline: string;
  source: string;
  timeAgo: string;
  url?: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number; // -1 to 1
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  relatedSymbols: string[];
}

export interface AIAnalysisResult {
  symbol: string;
  timestamp: number;
  verdict: SignalVerdict;
  confidence: number; // 0 - 100%
  timeHorizon: string;
  
  // Actionable price targets
  recommendedAction: string;
  entryZone: {
    min: number;
    max: number;
    optimal: number;
  };
  targets: {
    tp1: number;
    tp2: number;
    tp3: number;
  };
  stopLoss: {
    price: number;
    percentRisk: number;
    type: 'HARD' | 'TRAILING';
  };
  riskRewardRatio: number;
  recommendedPositionSizePct: number;
  
  // In-depth reasoning
  summary: string;
  technicalCatalyst: string;
  orderFlowMomentum: string;
  newsSentimentInsight: string;
  invalidationLevel: string;
  riskWarning: string;
  keyDrivers: string[];

  // Metadata
  modelUsed: string;
  provider: LLMProvider;
  latencyMs: number;
}

export interface LLMProviderConfig {
  provider: LLMProvider;
  geminiModel: string;
  ollamaEndpoint: string;
  ollamaModel: string;
  lmStudioEndpoint: string;
  customEndpoint: string;
  customApiKey?: string;
  temperature: number;
  persona: StrategyPersona;
  customStrategyPrompt: string;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LIMIT';

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  shares: number;
  stopLoss?: number;
  takeProfit?: number;
  entryTime: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface TradeOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  shares: number;
  limitPrice?: number;
  stopPrice?: number;
  status: 'FILLED' | 'PENDING' | 'CANCELLED' | 'REJECTED';
  timestamp: number;
  filledPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
  reasoning?: string;
}

export interface PortfolioState {
  cash: number;
  startingBalance: number;
  equity: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  positions: Position[];
  orderHistory: TradeOrder[];
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  signal: SignalVerdict;
  rsi: number;
  sparkline: number[];
  alertTriggered?: boolean;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  indicatorCondition?: 'RSI_OVERBOUGHT' | 'RSI_OVERSOLD';
  triggered: boolean;
  createdAt: number;
}
