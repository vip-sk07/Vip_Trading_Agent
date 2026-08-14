import React, { useState } from 'react';
import { Search, TrendingUp, TrendingDown, Star, Sparkles, Plus } from 'lucide-react';
import { STOCK_UNIVERSE } from '../services/marketData';

interface StockSearchProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onAddToWatchlist: (symbol: string) => void;
}

export const StockSearch: React.FC<StockSearchProps> = ({
  currentSymbol,
  onSelectSymbol,
  onAddToWatchlist
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const symbolsList = Object.entries(STOCK_UNIVERSE);
  const filtered = symbolsList.filter(
    ([sym, data]) =>
      sym.toLowerCase().includes(searchTerm.toLowerCase()) ||
      data.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      data.sector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hotSymbols = ['RELIANCE', 'TCS', 'INFY', 'SBIN', 'ITC', 'NVDA', 'TSLA', 'AAPL', 'BTC-USD', 'SPY'];

  return (
    <div className="relative w-full bg-slate-900 border-b border-slate-800/80 px-4 py-2 text-slate-200">
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Bar with auto dropdown */}
        <div className="relative w-full md:w-80">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              id="stock-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder="Search ticker, company, or sector..."
              className="w-full bg-slate-950/90 border border-slate-700/80 hover:border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {isFocused && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-800/80">
              {filtered.length > 0 ? (
                filtered.map(([sym, data]) => (
                  <div
                    key={sym}
                    onMouseDown={() => {
                      onSelectSymbol(sym);
                      setSearchTerm('');
                    }}
                    className={`flex items-center justify-between p-2.5 hover:bg-slate-800/90 cursor-pointer transition-colors ${
                      sym === currentSymbol ? 'bg-emerald-950/40 border-l-2 border-emerald-400' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{sym}</span>
                        <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 bg-slate-800 rounded">
                          {data.sector}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">{data.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-200">${data.basePrice.toFixed(2)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToWatchlist(sym);
                        }}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-amber-400"
                        title="Add to Watchlist"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  No matching tickers found. Press enter to track custom symbol.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hot Tickers Quick Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Trending:
          </span>
          {hotSymbols.map((sym) => {
            const data = STOCK_UNIVERSE[sym];
            const isSelected = sym === currentSymbol;
            return (
              <button
                key={sym}
                onClick={() => onSelectSymbol(sym)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700/60'
                }`}
              >
                <span>{sym}</span>
                {data && (
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                    ${data.basePrice.toFixed(0)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
