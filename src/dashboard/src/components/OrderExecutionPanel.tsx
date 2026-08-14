import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Target,
  ShieldAlert,
  Percent,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { AIAnalysisResult, OrderSide, OrderType, StockQuote } from '../types';

interface OrderExecutionPanelProps {
  quote: StockQuote;
  availableCash: number;
  aiAnalysis?: AIAnalysisResult | null;
  prefillOrder?: {
    side: 'BUY' | 'SELL';
    shares: number;
    limitPrice: number;
    tp: number;
    sl: number;
  } | null;
  onExecuteOrder: (order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: OrderType;
    shares: number;
    limitPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    reasoning?: string;
  }) => void;
}

export const OrderExecutionPanel: React.FC<OrderExecutionPanelProps> = ({
  quote,
  availableCash,
  aiAnalysis,
  prefillOrder,
  onExecuteOrder
}) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [shares, setShares] = useState<number>(10);
  const [limitPrice, setLimitPrice] = useState<number>(quote.price);
  const [takeProfit, setTakeProfit] = useState<number>(Number((quote.price * 1.03).toFixed(2)));
  const [stopLoss, setStopLoss] = useState<number>(Number((quote.price * 0.98).toFixed(2)));
  const [useBracket, setUseBracket] = useState(true);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);

  // Sync prefill from AI analysis click
  useEffect(() => {
    if (prefillOrder) {
      setSide(prefillOrder.side);
      setShares(prefillOrder.shares || 10);
      setLimitPrice(prefillOrder.limitPrice || quote.price);
      setTakeProfit(prefillOrder.tp || Number((quote.price * 1.03).toFixed(2)));
      setStopLoss(prefillOrder.sl || Number((quote.price * 0.98).toFixed(2)));
      setUseBracket(true);
      setOrderNotice('Pre-filled from AI Strategy');
      setTimeout(() => setOrderNotice(null), 3000);
    }
  }, [prefillOrder, quote.price]);

  const effectivePrice = orderType === 'MARKET' ? quote.price : limitPrice;
  const totalCost = shares * effectivePrice;
  const canAfford = side === 'SELL' || totalCost <= availableCash;

  // Potential PnL calculations
  const potentialProfit = Math.max(0, (takeProfit - effectivePrice) * shares * (side === 'BUY' ? 1 : -1));
  const potentialLoss = Math.abs((effectivePrice - stopLoss) * shares);

  const handleQuickPercent = (pct: number) => {
    if (effectivePrice <= 0) return;
    const maxAffordable = Math.floor((availableCash * (pct / 100)) / effectivePrice);
    setShares(Math.max(1, maxAffordable));
  };

  const handleUseAiSize = () => {
    if (!aiAnalysis || effectivePrice <= 0) return;
    const allocation = availableCash * (aiAnalysis.recommendedPositionSizePct / 100);
    const calculatedShares = Math.max(1, Math.floor(allocation / effectivePrice));
    setShares(calculatedShares);
    if (aiAnalysis.targets.tp1) setTakeProfit(aiAnalysis.targets.tp1);
    if (aiAnalysis.stopLoss.price) setStopLoss(aiAnalysis.stopLoss.price);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (shares <= 0 || !canAfford) return;

    onExecuteOrder({
      symbol: quote.symbol,
      side,
      type: orderType,
      shares,
      limitPrice: orderType !== 'MARKET' ? limitPrice : undefined,
      takeProfit: useBracket ? takeProfit : undefined,
      stopLoss: useBracket ? stopLoss : undefined,
      reasoning: aiAnalysis ? `AI Signal: ${aiAnalysis.verdict} (${aiAnalysis.confidence}%)` : 'Manual execution'
    });

    setOrderNotice(`Order Filled: ${side} ${shares} ${quote.symbol} @ $${effectivePrice.toFixed(2)}`);
    setTimeout(() => setOrderNotice(null), 3500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
      {/* Panel Header */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="font-extrabold text-sm text-white">Order Execution Terminal</h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Cash: <strong className="text-emerald-400">${availableCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
        </span>
      </div>

      {orderNotice && (
        <div className="bg-emerald-950/90 border-b border-emerald-700/80 px-4 py-1.5 text-xs text-emerald-300 font-semibold flex items-center gap-2 animate-pulse">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{orderNotice}</span>
        </div>
      )}

      {/* Buy / Sell Tabs */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            id="order-buy-side-btn"
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              side === 'BUY'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>BUY / LONG</span>
          </button>

          <button
            id="order-sell-side-btn"
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              side === 'SELL'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 ring-2 ring-rose-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>SELL / SHORT</span>
          </button>
        </div>

        {/* Order Type Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {(['MARKET', 'LIMIT', 'STOP_LIMIT'] as OrderType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setOrderType(t)}
              className={`flex-1 py-1.5 rounded-md font-semibold text-[11px] transition-colors ${
                orderType === t
                  ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Inputs Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Shares Quantity & Quick Pct Pills */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label className="font-semibold text-slate-300">Quantity (Shares)</label>
              <div className="flex items-center gap-1">
                {[25, 50, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickPercent(pct)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {pct}%
                  </button>
                ))}
                {aiAnalysis && (
                  <button
                    type="button"
                    onClick={handleUseAiSize}
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 flex items-center gap-0.5"
                    title={`AI suggests ${aiAnalysis.recommendedPositionSizePct}% allocation`}
                  >
                    AI Size ({aiAnalysis.recommendedPositionSizePct}%)
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <input
                id="order-shares-input"
                type="number"
                min="1"
                step="1"
                value={shares}
                onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm font-mono font-bold text-white outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">SHARES</span>
            </div>
          </div>

          {/* Limit Price Input if not Market */}
          {orderType !== 'MARKET' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Limit Price ($)</label>
              <input
                id="order-limit-price-input"
                type="number"
                step="0.01"
                value={limitPrice}
                onChange={(e) => setLimitPrice(parseFloat(e.target.value) || quote.price)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm font-mono font-bold text-white outline-none"
              />
            </div>
          )}

          {/* Bracket Order (Take Profit & Stop Loss) Toggle */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useBracket}
                  onChange={(e) => setUseBracket(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-950 cursor-pointer"
                />
                <span>Attach AI Bracket Protection (TP & SL)</span>
              </label>
            </div>

            {useBracket && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-emerald-400 block mb-1">Take Profit Target ($)</span>
                  <input
                    id="order-tp-input"
                    type="number"
                    step="0.01"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-emerald-800/80 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-300 outline-none"
                  />
                  <span className="text-[10px] text-emerald-400/80 font-mono block mt-0.5">
                    Est Gain: +${potentialProfit.toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-rose-400 block mb-1">Stop Loss ($)</span>
                  <input
                    id="order-sl-input"
                    type="number"
                    step="0.01"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-rose-800/80 focus:border-rose-500 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-rose-300 outline-none"
                  />
                  <span className="text-[10px] text-rose-400/80 font-mono block mt-0.5">
                    Max Loss: -${potentialLoss.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Box */}
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg text-xs space-y-1.5 font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Estimated Order Value:</span>
              <strong className="text-white">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Commission & Fees:</span>
              <strong className="text-emerald-400">$0.00 (Zero-Fee Simulation)</strong>
            </div>
            {!canAfford && (
              <p className="text-[11px] text-rose-400 font-bold mt-1">
                ⚠️ Insufficient buying power for {shares} shares (${totalCost.toFixed(2)} &gt; ${availableCash.toFixed(2)}).
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            id="order-submit-btn"
            type="submit"
            disabled={!canAfford || shares <= 0}
            className={`w-full py-3 rounded-xl font-extrabold text-sm tracking-wide transition-all shadow-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              side === 'BUY'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/40'
                : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-950/40'
            }`}
          >
            {side === 'BUY' ? 'EXECUTE BUY ORDER' : 'EXECUTE SELL / SHORT ORDER'}
          </button>
        </form>
      </div>
    </div>
  );
};
