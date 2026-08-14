import React, { useState } from 'react';
import { Star, Plus, Trash2, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { WatchlistItem } from '../types';

interface WatchlistPanelProps {
  watchlist: WatchlistItem[];
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onRemoveFromWatchlist: (symbol: string) => void;
  onAddSymbol: (symbol: string) => void;
}

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  watchlist,
  currentSymbol,
  onSelectSymbol,
  onRemoveFromWatchlist,
  onAddSymbol
}) => {
  const [newSymbolInput, setNewSymbolInput] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymbolInput.trim()) {
      onAddSymbol(newSymbolInput.trim().toUpperCase());
      setNewSymbolInput('');
    }
  };

  const getSignalBadge = (signal: WatchlistItem['signal']) => {
    switch (signal) {
      case 'STRONG_BUY':
        return 'bg-emerald-950 text-emerald-300 border-emerald-700 font-black';
      case 'BUY':
        return 'bg-emerald-950/70 text-emerald-400 border-emerald-800 font-bold';
      case 'STRONG_SELL':
        return 'bg-rose-950 text-rose-300 border-rose-700 font-black';
      case 'SELL':
        return 'bg-rose-950/70 text-rose-400 border-rose-800 font-bold';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-full flex-1">
      {/* Header with Quick Add Form */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <h3 className="font-extrabold text-xs text-white">Live Watchlist</h3>
        </div>

        <form onSubmit={handleAdd} className="flex items-center gap-1">
          <input
            type="text"
            placeholder="Add ticker..."
            value={newSymbolInput}
            onChange={(e) => setNewSymbolInput(e.target.value)}
            className="w-24 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-2 py-0.5 text-[11px] text-white uppercase outline-none font-mono"
          />
          <button
            type="submit"
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors"
            title="Add to Watchlist"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Watchlist Table */}
      <div className="p-2 flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {watchlist.map((item) => {
          const isSelected = item.symbol === currentSymbol;
          const isPositive = item.changePercent >= 0;

          // Compute SVG sparkline path
          const minP = Math.min(...item.sparkline);
          const maxP = Math.max(...item.sparkline);
          const range = maxP - minP || 1;
          const points = item.sparkline
            .map((p, i) => {
              const x = (i / (item.sparkline.length - 1)) * 50;
              const y = 18 - ((p - minP) / range) * 16;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');

          return (
            <div
              key={item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                isSelected
                  ? 'bg-emerald-950/40 border-l-2 border-emerald-400'
                  : 'hover:bg-slate-800/60'
              }`}
            >
              {/* Ticker & Name */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-white">{item.symbol}</span>
                  <span className={`text-[9px] uppercase px-1 py-0.2 rounded border font-mono ${getSignalBadge(item.signal)}`}>
                    {item.signal.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{item.name}</span>
              </div>

              {/* Mini Sparkline Chart */}
              <div className="w-14 h-5 hidden sm:block">
                <svg viewBox="0 0 50 20" className="w-full h-full overflow-visible">
                  <polyline
                    fill="none"
                    stroke={isPositive ? '#22c55e' : '#f43f5e'}
                    strokeWidth="1.5"
                    points={points}
                  />
                </svg>
              </div>

              {/* Price & Change */}
              <div className="flex items-center gap-2">
                <div className="text-right font-mono">
                  <div className="font-bold text-xs text-slate-100">${item.price.toFixed(2)}</div>
                  <div className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${
                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromWatchlist(item.symbol);
                  }}
                  className="p-1 text-slate-600 hover:text-rose-400 rounded opacity-40 hover:opacity-100 transition-opacity"
                  title="Remove from Watchlist"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
