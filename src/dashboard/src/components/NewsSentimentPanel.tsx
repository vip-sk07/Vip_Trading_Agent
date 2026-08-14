import React from 'react';
import { Newspaper, TrendingUp, TrendingDown, AlertCircle, ExternalLink } from 'lucide-react';
import { StockNews } from '../types';

interface NewsSentimentPanelProps {
  news: StockNews[];
  currentSymbol: string;
}

export const NewsSentimentPanel: React.FC<NewsSentimentPanelProps> = ({ news, currentSymbol }) => {
  const getSentimentBadge = (sentiment: StockNews['sentiment'], score: number) => {
    switch (sentiment) {
      case 'BULLISH':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            Bullish (+{(score * 100).toFixed(0)}%)
          </span>
        );
      case 'BEARISH':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
            <TrendingDown className="w-3 h-3 text-rose-400" />
            Bearish ({(score * 100).toFixed(0)}%)
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            Neutral ({score.toFixed(2)})
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-full flex-1">
      {/* Header */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Newspaper className="w-4 h-4 text-cyan-400" />
          <h3 className="font-extrabold text-xs text-white">Live News & Sentiment Feed ({currentSymbol})</h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400">AI Catalyst Scorer Active</span>
      </div>

      {/* News List */}
      <div className="p-3 space-y-2.5 flex-1 overflow-y-auto">
        {news.map((item) => (
          <div
            key={item.id}
            className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-slate-400">{item.source} • {item.timeAgo}</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-bold uppercase px-1 py-0.2 rounded ${
                  item.impactLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.impactLevel} Impact
                </span>
                {getSentimentBadge(item.sentiment, item.sentimentScore)}
              </div>
            </div>

            <p className="text-xs text-slate-200 font-medium leading-snug">
              {item.headline}
            </p>

            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500 font-mono">Related:</span>
              {item.relatedSymbols.map((sym) => (
                <span key={sym} className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1 rounded">
                  ${sym}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
