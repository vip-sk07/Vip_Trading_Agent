import React from 'react';
import {
  Activity,
  Gauge,
  TrendingUp,
  TrendingDown,
  Compass,
  Zap,
  BarChart2,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { TechnicalIndicators } from '../types';

interface TechnicalMatrixProps {
  indicators: TechnicalIndicators;
  currentPrice: number;
}

export const TechnicalMatrix: React.FC<TechnicalMatrixProps> = ({ indicators, currentPrice }) => {
  const rsi = indicators.rsi;
  const isRsiOverbought = rsi >= 70;
  const isRsiOversold = rsi <= 30;

  const macd = indicators.macd;
  const isMacdBullish = macd.histogram > 0 || macd.trend.includes('BULLISH');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
      {/* Header */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="font-extrabold text-sm text-white">Technical Indicator Matrix</h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-emerald-400 font-bold">{indicators.bullishIndicatorsCount} Bull</span>
          <span className="text-slate-600">/</span>
          <span className="text-rose-400 font-bold">{indicators.bearishIndicatorsCount} Bear</span>
        </div>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* 1. RSI (14) Dynamic Gauge */}
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              RSI (14 Period)
            </span>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isRsiOverbought
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : isRsiOversold
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {indicators.rsiSignal}
              </span>
              <span className="font-mono font-extrabold text-white text-sm">{rsi}</span>
            </div>
          </div>

          {/* Visual RSI Slider Bar */}
          <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mt-2">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 opacity-60"></div>
            {/* 30 & 70 threshold markers */}
            <div className="absolute left-[30%] top-0 bottom-0 w-0.5 bg-white/40"></div>
            <div className="absolute left-[70%] top-0 bottom-0 w-0.5 bg-white/40"></div>
            {/* Indicator needle */}
            <div
              className="absolute top-0 bottom-0 w-2 bg-white rounded shadow-md transition-all -ml-1"
              style={{ left: `${Math.min(100, Math.max(0, rsi))}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
            <span>0 Oversold</span>
            <span>30 Neutral</span>
            <span>70 Overbought</span>
            <span>100</span>
          </div>
        </div>

        {/* 2. Moving Average Status Grid */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Moving Average Alignment:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
            {[
              { label: 'EMA 9', value: indicators.ema9, isAbove: currentPrice > indicators.ema9 },
              { label: 'EMA 20', value: indicators.ema20, isAbove: currentPrice > indicators.ema20 },
              { label: 'EMA 50', value: indicators.ema50, isAbove: currentPrice > indicators.ema50 },
              { label: 'EMA 200', value: indicators.ema200, isAbove: currentPrice > indicators.ema200 }
            ].map((item) => (
              <div
                key={item.label}
                className={`p-2 rounded-lg border text-center ${
                  item.isAbove
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                }`}
              >
                <div className="text-[10px] text-slate-400 font-semibold">{item.label}</div>
                <div className="text-xs font-bold mt-0.5">${item.value.toFixed(2)}</div>
                <div className="text-[9px] font-bold uppercase mt-0.5">
                  {item.isAbove ? '▲ Price Above' : '▼ Price Below'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. MACD & Momentum Bar */}
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
              MACD (12, 26, 9)
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isMacdBullish ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}>
              {macd.trend.replace('_', ' ')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono mt-2">
            <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-center">
              <span className="text-[9px] text-slate-500 block">MACD Line</span>
              <span className="font-bold text-slate-200">{macd.macdLine}</span>
            </div>
            <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-center">
              <span className="text-[9px] text-slate-500 block">Signal Line</span>
              <span className="font-bold text-slate-200">{macd.signalLine}</span>
            </div>
            <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-center">
              <span className="text-[9px] text-slate-500 block">Histogram</span>
              <span className={`font-bold ${macd.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {macd.histogram > 0 ? '+' : ''}{macd.histogram}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Pivot Points Support & Resistance Floor */}
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Support & Resistance Key Pivots:
          </span>
          <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px]">
            <div className="bg-rose-950/50 border border-rose-900/60 p-1.5 rounded">
              <span className="text-rose-400 font-bold block">R2</span>
              <span className="text-slate-200">${indicators.pivotPoints.r2.toFixed(2)}</span>
            </div>
            <div className="bg-rose-950/30 border border-rose-900/40 p-1.5 rounded">
              <span className="text-rose-300 font-bold block">R1</span>
              <span className="text-slate-200">${indicators.pivotPoints.r1.toFixed(2)}</span>
            </div>
            <div className="bg-cyan-950/60 border border-cyan-800/80 p-1.5 rounded">
              <span className="text-cyan-300 font-bold block">PIVOT</span>
              <span className="text-white font-bold">${indicators.pivotPoints.pivot.toFixed(2)}</span>
            </div>
            <div className="bg-emerald-950/30 border border-emerald-900/40 p-1.5 rounded">
              <span className="text-emerald-300 font-bold block">S1</span>
              <span className="text-slate-200">${indicators.pivotPoints.s1.toFixed(2)}</span>
            </div>
            <div className="bg-emerald-950/50 border border-emerald-900/60 p-1.5 rounded">
              <span className="text-emerald-400 font-bold block">S2</span>
              <span className="text-slate-200">${indicators.pivotPoints.s2.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* 5. Additional Volatility & Trend Metrics */}
        <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 block">ATR (14)</span>
            <span className="font-bold text-white">${indicators.atr.toFixed(2)}</span>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 block">ADX Strength</span>
            <span className="font-bold text-cyan-300">{indicators.adx} (Strong)</span>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 block">VWAP Gap</span>
            <span className={`font-bold ${currentPrice >= indicators.vwap ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(((currentPrice - indicators.vwap) / indicators.vwap) * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
