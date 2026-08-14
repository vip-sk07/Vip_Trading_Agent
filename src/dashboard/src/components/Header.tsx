import React from 'react';
import {
  Activity,
  Bot,
  BrainCircuit,
  Cpu,
  DollarSign,
  Play,
  Pause,
  RefreshCw,
  Sliders,
  TrendingUp,
  Volume2,
  VolumeX,
  Zap,
  TrendingDown,
  Bell
} from 'lucide-react';
import { LLMProviderConfig, PortfolioState, StockQuote } from '../types';

interface HeaderProps {
  quote: StockQuote;
  portfolio: PortfolioState;
  llmConfig: LLMProviderConfig;
  isStreaming: boolean;
  streamSpeed: number;
  soundEnabled: boolean;
  unreadAlertsCount: number;
  onToggleStream: () => void;
  onChangeSpeed: (speed: number) => void;
  onToggleSound: () => void;
  onOpenLlmConfig: () => void;
  onOpenAlertsModal: () => void;
  onRefreshData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  quote,
  portfolio,
  llmConfig,
  isStreaming,
  streamSpeed,
  soundEnabled,
  unreadAlertsCount,
  onToggleStream,
  onChangeSpeed,
  onToggleSound,
  onOpenLlmConfig,
  onOpenAlertsModal,
  onRefreshData
}) => {
  const isPositive = quote.change >= 0;
  const isPnlPositive = portfolio.unrealizedPnL >= 0;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 px-4 py-2.5">
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Brand & Active Ticker Quick Info */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-950/40 text-slate-950 font-black">
              <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-base text-white">QUANTUM<span className="text-emerald-400">EDGE</span></span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE TICK
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Real-Time Stock & AI Trading Engine</p>
            </div>
          </div>

          <div className="h-7 w-px bg-slate-800 hidden sm:block"></div>

          {/* Active Symbol Display */}
          <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800/90 rounded-lg px-3 py-1.5">
            <span className="font-bold text-sm text-slate-200">{quote.symbol}</span>
            <span className="text-xs font-semibold text-slate-400 truncate max-w-[110px] hidden sm:inline">{quote.name}</span>
            <span className="text-sm font-extrabold font-mono text-white">${quote.price.toFixed(2)}</span>
            <span className={`text-xs font-bold flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-end">

          {/* Stream & Tick Speed Controls */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5">
            <button
              id="stream-toggle-btn"
              onClick={onToggleStream}
              className={`p-1.5 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
                isStreaming ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={isStreaming ? 'Pause Live Market Tick Stream' : 'Resume Live Market Tick Stream'}
            >
              {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                onClick={() => onChangeSpeed(speed)}
                className={`px-1.5 py-1 text-[11px] font-mono rounded transition-colors ${
                  streamSpeed === speed ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-500 hover:text-slate-300'
                }`}
                title={`Simulation tick speed: ${speed}x`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Audio Chime Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={onToggleSound}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:text-white'
                : 'bg-slate-900/80 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={soundEnabled ? 'Mute Trade & Alert Sounds' : 'Enable Trade & Alert Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Price Alerts Modal Trigger */}
          <button
            id="alerts-modal-btn"
            onClick={onOpenAlertsModal}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white relative transition-colors"
            title="Manage Price & RSI Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Manual Refresh */}
          <button
            id="refresh-btn"
            onClick={onRefreshData}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh All Indicators & Quotes"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
