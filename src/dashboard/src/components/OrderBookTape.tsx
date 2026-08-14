import React, { useState } from 'react';
import { Layers, Zap, Clock, ShieldCheck, Flame } from 'lucide-react';
import { OrderBook, TradeTapeEntry } from '../types';

interface OrderBookTapeProps {
  orderBook: OrderBook;
  tradeTape: TradeTapeEntry[];
  currentPrice: number;
}

export const OrderBookTape: React.FC<OrderBookTapeProps> = ({ orderBook, tradeTape, currentPrice }) => {
  const [viewMode, setViewMode] = useState<'book' | 'tape'>('book');

  const maxTotal = Math.max(
    orderBook.bids[orderBook.bids.length - 1]?.total || 1,
    orderBook.asks[orderBook.asks.length - 1]?.total || 1
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-full flex-1">
      {/* Header with toggle */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3 className="font-extrabold text-xs text-white">DOM Depth & Trade Tape</h3>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('book')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
              viewMode === 'book' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Level 2 Book
          </button>
          <button
            onClick={() => setViewMode('tape')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
              viewMode === 'tape' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Time & Sales
          </button>
        </div>
      </div>

      {/* Buyer Dominance Meter */}
      <div className="bg-slate-950/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <span>Bids: {orderBook.buyerDominance}%</span>
        </div>
        <div className="flex-1 mx-3 h-2 bg-rose-950 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${orderBook.buyerDominance}%` }}
          ></div>
        </div>
        <div className="flex items-center gap-1.5 text-rose-400 font-bold">
          <span>Asks: {Number((100 - orderBook.buyerDominance).toFixed(1))}%</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3 flex-1 overflow-y-auto">
        {viewMode === 'book' ? (
          <div className="space-y-3 text-[11px] font-mono">
            {/* Asks (Sell Orders - Top down) */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 font-semibold uppercase px-1 mb-1">
                <span>Ask Price</span>
                <span>Size</span>
                <span>Total Depth</span>
              </div>
              <div className="space-y-0.5">
                {orderBook.asks.slice(0, 8).reverse().map((ask, i) => {
                  const depthPct = Math.min(100, (ask.total / maxTotal) * 100);
                  return (
                    <div key={i} className="relative flex justify-between px-2 py-0.5 rounded overflow-hidden">
                      <div
                        className="absolute right-0 top-0 bottom-0 bg-rose-950/40 -z-0 transition-all"
                        style={{ width: `${depthPct}%` }}
                      ></div>
                      <span className="text-rose-400 font-bold z-10">${ask.price.toFixed(2)}</span>
                      <span className="text-slate-300 z-10">{ask.size.toLocaleString()}</span>
                      <span className="text-slate-500 z-10">{ask.total.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Spread Indicator */}
            <div className="bg-slate-950 border-y border-slate-800/90 py-1.5 px-3 flex items-center justify-between text-xs">
              <span className="font-extrabold text-white">Current: ${currentPrice.toFixed(2)}</span>
              <span className="text-slate-400">Spread: <strong className="text-cyan-400">${orderBook.spread.toFixed(2)}</strong> ({orderBook.spreadPercent}%)</span>
            </div>

            {/* Bids (Buy Orders) */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 font-semibold uppercase px-1 mb-1">
                <span>Bid Price</span>
                <span>Size</span>
                <span>Total Depth</span>
              </div>
              <div className="space-y-0.5">
                {orderBook.bids.slice(0, 8).map((bid, i) => {
                  const depthPct = Math.min(100, (bid.total / maxTotal) * 100);
                  return (
                    <div key={i} className="relative flex justify-between px-2 py-0.5 rounded overflow-hidden">
                      <div
                        className="absolute right-0 top-0 bottom-0 bg-emerald-950/40 -z-0 transition-all"
                        style={{ width: `${depthPct}%` }}
                      ></div>
                      <span className="text-emerald-400 font-bold z-10">${bid.price.toFixed(2)}</span>
                      <span className="text-slate-300 z-10">{bid.size.toLocaleString()}</span>
                      <span className="text-slate-500 z-10">{bid.total.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Time & Sales Stream Tape */
          <div>
            <div className="flex justify-between text-[10px] text-slate-500 font-semibold uppercase px-1 mb-1.5 font-mono">
              <span>Time</span>
              <span>Price</span>
              <span>Size</span>
              <span>Side</span>
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              {tradeTape.slice(0, 20).map((trade) => (
                <div
                  key={trade.id}
                  className={`flex items-center justify-between px-2 py-1 rounded transition-all ${
                    trade.side === 'BUY' ? 'bg-emerald-950/30' : 'bg-rose-950/30'
                  } ${trade.isBlockTrade ? 'ring-1 ring-amber-500/80 bg-amber-950/30' : ''}`}
                >
                  <span className="text-slate-400 text-[10px]">{trade.time}</span>
                  <span className={`font-bold ${trade.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${trade.price.toFixed(2)}
                  </span>
                  <span className="text-slate-200 flex items-center gap-1">
                    {trade.size.toLocaleString()}
                    {trade.isBlockTrade && (
                      <Flame className="w-3 h-3 text-amber-400" title="Whale / Block Trade" />
                    )}
                  </span>
                  <span className={`text-[9px] font-bold uppercase px-1 rounded ${
                    trade.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {trade.side}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
