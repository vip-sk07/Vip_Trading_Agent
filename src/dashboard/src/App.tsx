/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { StockSearch } from './components/StockSearch';
import { StockChart } from './components/StockChart';
import { AiInsightPanel } from './components/AiInsightPanel';
import { TechnicalMatrix } from './components/TechnicalMatrix';
import { OrderBookTape } from './components/OrderBookTape';
import { WatchlistPanel } from './components/WatchlistPanel';
import { NewsSentimentPanel } from './components/NewsSentimentPanel';
import { LlmConfigModal } from './components/LlmConfigModal';
import { PriceAlertModal } from './components/PriceAlertModal';
import { VipTradingAgent } from './components/VipTradingAgent';
import {
  AIAnalysisResult,
  Candle,
  LLMProviderConfig,
  OrderBook,
  OrderType,
  PortfolioState,
  Position,
  PriceAlert,
  StockNews,
  StockQuote,
  StrategyPersona,
  TechnicalIndicators,
  TimeFrame,
  TradeOrder,
  TradeTapeEntry,
  WatchlistItem
} from './types';
import {
  STOCK_UNIVERSE,
  calculateTechnicalIndicators,
  generateHistoricCandles,
  generateOrderBook,
  generateTradeTapeEntry,
  getInitialWatchlist,
  getStockNews
} from './services/marketData';
import { DEFAULT_LLM_CONFIG, requestAIStockAnalysis } from './services/aiService';
import { Terminal, Briefcase, RefreshCw, Sparkles, Bot } from 'lucide-react';

export default function App() {
  // 1. Core State
  const [symbol, setSymbol] = useState<string>('RELIANCE');
  const [timeframe, setTimeframe] = useState<TimeFrame>('5m');
  const [activeTab, setActiveTab] = useState<'intraday' | 'swing' | 'vip'>('intraday');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [quote, setQuote] = useState<StockQuote>(() => {
    const stock = STOCK_UNIVERSE['RELIANCE'];
    return {
      symbol: 'RELIANCE',
      name: stock.name,
      sector: stock.sector,
      price: stock.basePrice,
      change: 34.80,
      changePercent: 1.24,
      previousClose: stock.basePrice - 34.80,
      open: stock.basePrice - 12.0,
      high: stock.basePrice + 41.0,
      low: stock.basePrice - 20.0,
      volume: 4820000,
      avgVolume: 4500000,
      marketCap: '$220B',
      peRatio: 24.2,
      high52: 3200.00,
      low52: 2200.00,
      vwap: stock.basePrice * 0.998,
      lastUpdated: Date.now()
    };
  });

  const [indicators, setIndicators] = useState<TechnicalIndicators>(() => {
    const initCandles = generateHistoricCandles('RELIANCE', '5m', 80);
    return calculateTechnicalIndicators(initCandles);
  });

  const [orderBook, setOrderBook] = useState<OrderBook>(() => generateOrderBook(2847.00, 'RELIANCE'));
  const [tradeTape, setTradeTape] = useState<TradeTapeEntry[]>([]);
  const [news, setNews] = useState<StockNews[]>(() => getStockNews('RELIANCE'));
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => getInitialWatchlist());
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);

  // 2. AI Intelligence State
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [llmConfig, setLlmConfig] = useState<LLMProviderConfig>(DEFAULT_LLM_CONFIG);

  // 3. Paper Trading Portfolio State
  const [portfolio, setPortfolio] = useState<PortfolioState>(() => ({
    cash: 100000,
    startingBalance: 100000,
    equity: 100000,
    unrealizedPnL: 0,
    realizedPnL: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    positions: [],
    orderHistory: []
  }));

  // 4. Stream & UI Controls
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [streamSpeed, setStreamSpeed] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [prefillOrder, setPrefillOrder] = useState<{
    side: 'BUY' | 'SELL';
    shares: number;
    limitPrice: number;
    tp: number;
    sl: number;
  } | null>(null);

  // 5. Modals
  const [isLlmConfigOpen, setIsLlmConfigOpen] = useState<boolean>(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState<boolean>(false);

  // Web Audio Synth for crisp trade execution and alert sounds
  const playChime = useCallback((type: 'buy' | 'sell' | 'tp' | 'sl' | 'alert') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'buy' || type === 'tp') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'sell' || type === 'sl') {
        osc.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
        osc.frequency.exponentialRampToValueAtTime(392.0, ctx.currentTime + 0.15); // G4
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // Audio context might be restricted before user interaction
    }
  }, [soundEnabled]);

  // Load symbol data on switch
  const handleSelectSymbol = useCallback(async (newSymbol: string) => {
    setSymbol(newSymbol);
    try {
      const response = await fetch(`/api/market/chart?symbol=${encodeURIComponent(newSymbol)}&timeframe=${timeframe}`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      if (!data.candles || data.candles.length === 0) throw new Error("No data returned");

      const newCandles = data.candles;
      const quoteDetails = data.quote;
      const lastPrice = newCandles[newCandles.length - 1].close;

      setCandles(newCandles);
      const newInd = calculateTechnicalIndicators(newCandles);
      setIndicators(newInd);
      const newBook = generateOrderBook(lastPrice, newSymbol);
      setOrderBook(newBook);
      setTradeTape([]);
      const newNews = getStockNews(newSymbol);
      setNews(newNews);

      const updatedQuote: StockQuote = {
        symbol: newSymbol,
        name: quoteDetails.name,
        sector: quoteDetails.sector,
        price: lastPrice,
        change: quoteDetails.change,
        changePercent: quoteDetails.changePercent,
        previousClose: quoteDetails.previousClose,
        open: quoteDetails.open,
        high: quoteDetails.high,
        low: quoteDetails.low,
        volume: quoteDetails.volume,
        avgVolume: quoteDetails.avgVolume,
        marketCap: quoteDetails.marketCap,
        peRatio: quoteDetails.peRatio,
        high52: quoteDetails.high52,
        low52: quoteDetails.low52,
        vwap: newInd.vwap,
        lastUpdated: Date.now()
      };
      setQuote(updatedQuote);

      triggerAIAnalysis(newSymbol, updatedQuote, newInd, newBook, newNews, newCandles, llmConfig);
    } catch (err) {
      console.warn("Failed to fetch live data, falling back to simulator:", err);
      const stock = STOCK_UNIVERSE[newSymbol] || { name: newSymbol, sector: 'General Equities', basePrice: 150.0, beta: 1.0 };
      const newCandles = generateHistoricCandles(newSymbol, timeframe, 80);
      const lastPrice = newCandles[newCandles.length - 1].close;
      const change = Number((lastPrice - stock.basePrice).toFixed(2));
      const changePercent = Number(((change / stock.basePrice) * 100).toFixed(2));

      setCandles(newCandles);
      const newInd = calculateTechnicalIndicators(newCandles);
      setIndicators(newInd);
      const newBook = generateOrderBook(lastPrice, newSymbol);
      setOrderBook(newBook);
      setTradeTape([]);
      const newNews = getStockNews(newSymbol);
      setNews(newNews);

      const updatedQuote: StockQuote = {
        symbol: newSymbol,
        name: stock.name,
        sector: stock.sector,
        price: lastPrice,
        change,
        changePercent: changePercent,
        previousClose: stock.basePrice,
        open: Number((lastPrice * 0.995).toFixed(2)),
        high: Math.max(...newCandles.map((c) => c.high)),
        low: Math.min(...newCandles.map((c) => c.low)),
        volume: newSymbol.includes('BTC') ? 14200 : 38500000,
        avgVolume: newSymbol.includes('BTC') ? 12000 : 35000000,
        marketCap: newSymbol.includes('BTC') ? '$1.25T' : '$850B',
        peRatio: 32.5,
        high52: Number((lastPrice * 1.35).toFixed(2)),
        low52: Number((lastPrice * 0.65).toFixed(2)),
        vwap: newInd.vwap,
        lastUpdated: Date.now()
      };
      setQuote(updatedQuote);

      triggerAIAnalysis(newSymbol, updatedQuote, newInd, newBook, newNews, newCandles, llmConfig);
    }
  }, [timeframe, llmConfig]);

  // Handle timeframe change
  const handleTimeframeChange = async (tf: TimeFrame) => {
    setTimeframe(tf);
    try {
      const response = await fetch(`/api/market/chart?symbol=${encodeURIComponent(symbol)}&timeframe=${tf}`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      if (!data.candles || data.candles.length === 0) throw new Error("No data returned");

      const newCandles = data.candles;
      setCandles(newCandles);
      setIndicators(calculateTechnicalIndicators(newCandles));
    } catch (err) {
      console.warn("Failed to fetch live timeframe data, falling back to simulator:", err);
      const newCandles = generateHistoricCandles(symbol, tf, 80);
      setCandles(newCandles);
      setIndicators(calculateTechnicalIndicators(newCandles));
    }
  };

  // Trigger AI Analysis
  const triggerAIAnalysis = async (
    targetSymbol: string = symbol,
    q: StockQuote = quote,
    ind: TechnicalIndicators = indicators,
    book: OrderBook = orderBook,
    n: StockNews[] = news,
    c: Candle[] = candles,
    cfg: LLMProviderConfig = llmConfig
  ) => {
    setIsAiLoading(true);
    try {
      const result = await requestAIStockAnalysis(q, ind, book, n, c, cfg);
      setAiAnalysis(result);
    } catch (err) {
      console.error('AI Analysis failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    handleSelectSymbol('RELIANCE');
  }, []);

  // Real-time Tick Loop Engine
  useEffect(() => {
    if (!isStreaming) return;

    const intervalMs = Math.max(250, Math.floor(1000 / streamSpeed));
    const interval = setInterval(() => {
      setCandles((prevCandles) => {
        if (prevCandles.length === 0) return prevCandles;

        const lastIdx = prevCandles.length - 1;
        const current = { ...prevCandles[lastIdx] };
        const isCrypto = symbol.includes('BTC');
        const tickMove = (Math.random() - 0.49) * (isCrypto ? 12.0 : 0.22) * streamSpeed;
        const newClose = Math.max(0.1, Number((current.close + tickMove).toFixed(2)));

        current.close = newClose;
        if (newClose > current.high) current.high = newClose;
        if (newClose < current.low) current.low = newClose;
        current.volume += Math.floor((Math.random() * 80 + 10) * streamSpeed);

        const updatedCandles = [...prevCandles.slice(0, lastIdx), current];

        // Update technical indicators incrementally
        const updatedIndicators = calculateTechnicalIndicators(updatedCandles);
        setIndicators(updatedIndicators);

        // Update Quote
        setQuote((prevQuote) => {
          const change = Number((newClose - prevQuote.previousClose).toFixed(2));
          const changePercent = Number(((change / prevQuote.previousClose) * 100).toFixed(2));
          return {
            ...prevQuote,
            price: newClose,
            change,
            changePercent,
            high: Math.max(prevQuote.high, newClose),
            low: Math.min(prevQuote.low, newClose),
            volume: prevQuote.volume + current.volume,
            vwap: updatedIndicators.vwap,
            lastUpdated: Date.now()
          };
        });

        // Update Order Book and Time & Sales Tape
        setOrderBook(generateOrderBook(newClose, symbol));
        const newTapeEntry = generateTradeTapeEntry(newClose, symbol);
        setTradeTape((prevTape) => [newTapeEntry, ...prevTape.slice(0, 30)]);

        // Check Price & Indicator Alerts
        setAlerts((prevAlerts) =>
          prevAlerts.map((alt) => {
            if (alt.symbol === symbol && !alt.triggered) {
              let triggerPrice = false;
              if (alt.condition === 'ABOVE' && newClose >= alt.targetPrice) triggerPrice = true;
              if (alt.condition === 'BELOW' && newClose <= alt.targetPrice) triggerPrice = true;

              let triggerIndicator = false;
              if (alt.indicatorCondition === 'RSI_OVERBOUGHT' && updatedIndicators.rsi >= 70) triggerIndicator = true;
              if (alt.indicatorCondition === 'RSI_OVERSOLD' && updatedIndicators.rsi <= 30) triggerIndicator = true;

              if (triggerPrice || triggerIndicator) {
                playChime('alert');
                return { ...alt, triggered: true };
              }
            }
            return alt;
          })
        );

        // Update Positions trailing P&L and evaluate TP/SL auto-exits
        setPortfolio((prevPort) => {
          let updatedRealized = prevPort.realizedPnL;
          let updatedCash = prevPort.cash;
          let winning = prevPort.winningTrades;
          let losing = prevPort.losingTrades;
          let trades = prevPort.totalTrades;

          const updatedPositions: Position[] = [];

          prevPort.positions.forEach((pos) => {
            if (pos.symbol === symbol) {
              const currentP = newClose;
              const pnl = (currentP - pos.entryPrice) * pos.shares * (pos.side === 'LONG' ? 1 : -1);
              const pnlPct = ((currentP - pos.entryPrice) / pos.entryPrice) * 100 * (pos.side === 'LONG' ? 1 : -1);

              // Check Take Profit auto-hit
              if (pos.takeProfit && ((pos.side === 'LONG' && currentP >= pos.takeProfit) || (pos.side === 'SHORT' && currentP <= pos.takeProfit))) {
                updatedRealized += pnl;
                updatedCash += pos.shares * currentP;
                trades++;
                winning++;
                playChime('tp');
                confetti({ particleCount: 50, spread: 60, origin: { y: 0.85 } });
                return; // position closed
              }

              // Check Stop Loss auto-hit
              if (pos.stopLoss && ((pos.side === 'LONG' && currentP <= pos.stopLoss) || (pos.side === 'SHORT' && currentP >= pos.stopLoss))) {
                updatedRealized += pnl;
                updatedCash += pos.shares * currentP;
                trades++;
                losing++;
                playChime('sl');
                return; // position closed
              }

              updatedPositions.push({
                ...pos,
                currentPrice: currentP,
                unrealizedPnL: Number(pnl.toFixed(2)),
                unrealizedPnLPercent: Number(pnlPct.toFixed(2))
              });
            } else {
              updatedPositions.push(pos);
            }
          });

          const totalUnrealized = updatedPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
          const totalPositionsValue = updatedPositions.reduce((sum, p) => sum + (p.shares * p.currentPrice), 0);
          const totalEquity = updatedCash + totalPositionsValue;

          return {
            ...prevPort,
            cash: updatedCash,
            equity: Number(totalEquity.toFixed(2)),
            unrealizedPnL: Number(totalUnrealized.toFixed(2)),
            realizedPnL: Number(updatedRealized.toFixed(2)),
            totalTrades: trades,
            winningTrades: winning,
            losingTrades: losing,
            positions: updatedPositions
          };
        });

        return updatedCandles;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isStreaming, streamSpeed, symbol, playChime]);

  // Execute Trade Order
  const handleExecuteOrder = (order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: OrderType;
    shares: number;
    limitPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    reasoning?: string;
  }) => {
    const executionPrice = order.limitPrice || quote.price;
    const orderCost = order.shares * executionPrice;

    if (order.side === 'BUY' && orderCost > portfolio.cash) {
      return; // prevent overbuying
    }

    const newPosition: Position = {
      id: Math.random().toString(36).substring(2, 9),
      symbol: order.symbol,
      side: order.side === 'BUY' ? 'LONG' : 'SHORT',
      entryPrice: executionPrice,
      currentPrice: executionPrice,
      shares: order.shares,
      takeProfit: order.takeProfit,
      stopLoss: order.stopLoss,
      entryTime: Date.now(),
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0
    };

    const newOrderRecord: TradeOrder = {
      id: Math.random().toString(36).substring(2, 9),
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      shares: order.shares,
      filledPrice: executionPrice,
      status: 'FILLED',
      timestamp: Date.now(),
      takeProfit: order.takeProfit,
      stopLoss: order.stopLoss,
      reasoning: order.reasoning
    };

    setPortfolio((prev) => {
      const newCash = order.side === 'BUY' ? prev.cash - orderCost : prev.cash + orderCost;
      const newPositions = [...prev.positions, newPosition];
      const positionsValue = newPositions.reduce((sum, p) => sum + (p.shares * p.currentPrice), 0);

      return {
        ...prev,
        cash: newCash,
        equity: newCash + positionsValue,
        positions: newPositions,
        orderHistory: [...prev.orderHistory, newOrderRecord]
      };
    });

    playChime(order.side === 'BUY' ? 'buy' : 'sell');
  };

  // Close Position
  const handleClosePosition = (positionId: string) => {
    setPortfolio((prev) => {
      const pos = prev.positions.find((p) => p.id === positionId);
      if (!pos) return prev;

      const pnl = pos.unrealizedPnL;
      const isWin = pnl >= 0;
      const newCash = prev.cash + (pos.shares * pos.currentPrice);
      const remainingPositions = prev.positions.filter((p) => p.id !== positionId);
      const remainingValue = remainingPositions.reduce((sum, p) => sum + (p.shares * p.currentPrice), 0);

      if (isWin) confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
      playChime(isWin ? 'tp' : 'sl');

      return {
        ...prev,
        cash: newCash,
        equity: newCash + remainingValue,
        realizedPnL: prev.realizedPnL + pnl,
        unrealizedPnL: remainingPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0),
        totalTrades: prev.totalTrades + 1,
        winningTrades: isWin ? prev.winningTrades + 1 : prev.winningTrades,
        losingTrades: !isWin ? prev.losingTrades + 1 : prev.losingTrades,
        positions: remainingPositions
      };
    });
  };

  // Partial Close (50%)
  const handlePartialClosePosition = (positionId: string, fraction: number = 0.5) => {
    setPortfolio((prev) => {
      const pos = prev.positions.find((p) => p.id === positionId);
      if (!pos || pos.shares <= 1) return prev;

      const closedShares = Math.max(1, Math.floor(pos.shares * fraction));
      const remainingShares = pos.shares - closedShares;
      const partialPnl = (pos.currentPrice - pos.entryPrice) * closedShares * (pos.side === 'LONG' ? 1 : -1);
      const isWin = partialPnl >= 0;
      const newCash = prev.cash + (closedShares * pos.currentPrice);

      const updatedPositions = prev.positions.map((p) => {
        if (p.id === positionId) {
          const remPnl = (p.currentPrice - p.entryPrice) * remainingShares * (p.side === 'LONG' ? 1 : -1);
          return {
            ...p,
            shares: remainingShares,
            unrealizedPnL: Number(remPnl.toFixed(2))
          };
        }
        return p;
      });

      playChime(isWin ? 'tp' : 'sl');

      return {
        ...prev,
        cash: newCash,
        equity: newCash + updatedPositions.reduce((sum, p) => sum + (p.shares * p.currentPrice), 0),
        realizedPnL: prev.realizedPnL + partialPnl,
        unrealizedPnL: updatedPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0),
        totalTrades: prev.totalTrades + 1,
        winningTrades: isWin ? prev.winningTrades + 1 : prev.winningTrades,
        losingTrades: !isWin ? prev.losingTrades + 1 : prev.losingTrades,
        positions: updatedPositions
      };
    });
  };

  // Move SL to Breakeven
  const handleMoveSlToBreakeven = (positionId: string) => {
    setPortfolio((prev) => ({
      ...prev,
      positions: prev.positions.map((p) => (p.id === positionId ? { ...p, stopLoss: p.entryPrice } : p))
    }));
    playChime('alert');
  };

  // Close All
  const handleCloseAllPositions = () => {
    portfolio.positions.forEach((pos) => handleClosePosition(pos.id));
  };

  // Reset Portfolio
  const handleResetPortfolio = () => {
    setPortfolio({
      cash: 100000,
      startingBalance: 100000,
      equity: 100000,
      unrealizedPnL: 0,
      realizedPnL: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      positions: [],
      orderHistory: []
    });
  };

  // Watchlist Actions
  const handleAddToWatchlist = (newSym: string) => {
    if (watchlist.some((w) => w.symbol === newSym)) return;
    const s = STOCK_UNIVERSE[newSym] || { name: newSym, basePrice: 150.0 };
    const newItem: WatchlistItem = {
      symbol: newSym,
      name: s.name,
      price: s.basePrice,
      changePercent: 1.2,
      signal: 'BUY',
      rsi: 52,
      sparkline: [s.basePrice * 0.98, s.basePrice * 0.99, s.basePrice * 1.01, s.basePrice]
    };
    setWatchlist((prev) => [newItem, ...prev]);
  };

  const handleRemoveFromWatchlist = (symToRemove: string) => {
    setWatchlist((prev) => prev.filter((w) => w.symbol !== symToRemove));
  };

  const unreadAlertsCount = alerts.filter((a) => a.triggered).length;

  const renderIntradayTab = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[calc(100vh-130px)] min-h-[550px] overflow-hidden text-slate-200">
        
        {/* Left Area: Live Chart (8 columns) */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
          <StockChart
            symbol={symbol}
            candles={candles}
            timeframe={timeframe}
            indicators={indicators}
            aiAnalysis={aiAnalysis}
            onTimeframeChange={handleTimeframeChange}
          />
        </div>

        {/* Right Area: Order Book & Level 2 Depth (4 columns) */}
        <div className="lg:col-span-4 flex flex-col h-full overflow-hidden">
          <OrderBookTape
            orderBook={orderBook}
            tradeTape={tradeTape}
            currentPrice={quote.price}
          />
        </div>

      </div>
    );
  };

  const renderSwingTab = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[calc(100vh-130px)] min-h-[550px] overflow-hidden text-slate-200">
        
        {/* Left Area: Watchlist Panel (8 columns) */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
          <WatchlistPanel
            watchlist={watchlist}
            currentSymbol={symbol}
            onSelectSymbol={handleSelectSymbol}
            onRemoveFromWatchlist={handleRemoveFromWatchlist}
            onAddSymbol={handleAddToWatchlist}
          />
        </div>

        {/* Right Area: News Sentiment Feed (4 columns) */}
        <div className="lg:col-span-4 flex flex-col h-full overflow-hidden">
          <NewsSentimentPanel news={news} currentSymbol={symbol} />
        </div>

      </div>
    );
  };

  const renderVipTab = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[calc(100vh-130px)] min-h-[550px] overflow-hidden text-slate-200">
        
        {/* Left half (6 columns): AI Trading Intelligence */}
        <div className="lg:col-span-6 flex flex-col h-full overflow-hidden">
          <AiInsightPanel
            analysis={aiAnalysis}
            isLoading={isAiLoading}
            llmConfig={llmConfig}
            userCash={portfolio.cash}
            currentPrice={quote.price}
            candles={candles}
            indicators={indicators}
            onTriggerAnalysis={(persona?: StrategyPersona) => {
              if (persona) {
                const updatedCfg = { ...llmConfig, persona };
                setLlmConfig(updatedCfg);
                triggerAIAnalysis(symbol, quote, indicators, orderBook, news, candles, updatedCfg);
              } else {
                triggerAIAnalysis();
              }
            }}
            onApplyTradePlan={(side, shares, limitPrice, tp, sl) => {
              setPrefillOrder({ side, shares, limitPrice, tp, sl });
            }}
            onOpenLlmConfig={() => setIsLlmConfigOpen(true)}
          />
        </div>

        {/* Right half (6 columns): VIP Trading Agent Chat */}
        <div className="lg:col-span-6 flex flex-col h-full overflow-hidden">
          <VipTradingAgent
            llmConfig={llmConfig}
            symbol={symbol}
            quote={quote}
            indicators={indicators}
            candles={candles}
          />
        </div>

      </div>
    );
  };



  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* 1. Header Bar */}
      <Header
        quote={quote}
        portfolio={portfolio}
        llmConfig={llmConfig}
        isStreaming={isStreaming}
        streamSpeed={streamSpeed}
        soundEnabled={soundEnabled}
        unreadAlertsCount={unreadAlertsCount}
        onToggleStream={() => setIsStreaming(!isStreaming)}
        onChangeSpeed={(speed) => setStreamSpeed(speed)}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenLlmConfig={() => setIsLlmConfigOpen(true)}
        onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
        onRefreshData={() => handleSelectSymbol(symbol)}
      />

      {/* 2. Stock Search & Trending Bar */}
      <StockSearch
        currentSymbol={symbol}
        onSelectSymbol={handleSelectSymbol}
        onAddToWatchlist={handleAddToWatchlist}
      />

      {/* Tab Navigation Menu */}
      <div className="bg-slate-900/60 backdrop-blur-md border-b border-slate-855 sticky top-[60px] z-30">
        <div className="w-full px-4 flex items-center justify-start gap-1 overflow-x-auto py-1.5 scrollbar-none">
          <button
            onClick={() => {
              setActiveTab('intraday');
              const newCfg = { ...llmConfig, persona: 'day_trader' as StrategyPersona };
              setLlmConfig(newCfg);
              triggerAIAnalysis(symbol, quote, indicators, orderBook, news, candles, newCfg);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'intraday'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Intraday Trading Desk (Scalper / Day Trader)</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('swing');
              const newCfg = { ...llmConfig, persona: 'swing_trader' as StrategyPersona };
              setLlmConfig(newCfg);
              triggerAIAnalysis(symbol, quote, indicators, orderBook, news, candles, newCfg);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'swing'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Swing & Institutional (Portfolio Research)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('vip');
              const newCfg = { ...llmConfig, persona: 'institutional' as StrategyPersona };
              setLlmConfig(newCfg);
              triggerAIAnalysis(symbol, quote, indicators, orderBook, news, candles, newCfg);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'vip'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>VIP Agent AI Assistant</span>
          </button>
        </div>
      </div>

      {/* 3. Main Dashboard Grid Layout */}
      <main className="flex-1 w-full p-3 sm:p-4">
        {activeTab === 'intraday' && renderIntradayTab()}
        {activeTab === 'swing' && renderSwingTab()}
        {activeTab === 'vip' && renderVipTab()}
      </main>

      {/* 4. Modals */}
      <LlmConfigModal
        isOpen={isLlmConfigOpen}
        config={llmConfig}
        onClose={() => setIsLlmConfigOpen(false)}
        onSaveConfig={(newConfig) => {
          setLlmConfig(newConfig);
          triggerAIAnalysis(symbol, quote, indicators, orderBook, news, candles, newConfig);
        }}
      />

      <PriceAlertModal
        isOpen={isAlertsModalOpen}
        quote={quote}
        alerts={alerts}
        onClose={() => setIsAlertsModalOpen(false)}
        onCreateAlert={(newAlert) => {
          setAlerts((prev) => [
            {
              ...newAlert,
              id: Math.random().toString(36).substring(2, 9),
              triggered: false,
              createdAt: Date.now()
            },
            ...prev
          ]);
          setIsAlertsModalOpen(false);
        }}
        onDeleteAlert={(id) => {
          setAlerts((prev) => prev.filter((a) => a.id !== id));
        }}
      />
    </div>
  );
}
