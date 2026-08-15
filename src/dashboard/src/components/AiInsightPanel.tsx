import React, { useState } from 'react';
import {
  BrainCircuit,
  Cpu,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Shield,
  Zap,
  ArrowRight,
  Layers,
  BarChart,
  PieChart,
  Sliders,
  CheckCircle2,
  Clock,
  SendHorizontal
} from 'lucide-react';
import { AIAnalysisResult, LLMProviderConfig, SignalVerdict, StrategyPersona } from '../types';

import { calculateLinearRegression, predictRegimeNaiveBayes, predictPriceKNN } from '../services/mlAlgorithms';
import { Candle, TechnicalIndicators } from '../types';

interface AiInsightPanelProps {
  analysis: AIAnalysisResult | null;
  isLoading: boolean;
  llmConfig: LLMProviderConfig;
  userCash: number;
  currentPrice: number;
  candles: Candle[];
  indicators: TechnicalIndicators;
  onTriggerAnalysis: (persona?: StrategyPersona) => void;
  onApplyTradePlan: (side: 'BUY' | 'SELL', shares: number, limitPrice: number, tp: number, sl: number) => void;
  onOpenLlmConfig: () => void;
}

export const AiInsightPanel: React.FC<AiInsightPanelProps> = ({
  analysis,
  isLoading,
  llmConfig,
  userCash,
  currentPrice,
  candles,
  indicators,
  onTriggerAnalysis,
  onApplyTradePlan,
  onOpenLlmConfig
}) => {
  const [activeTab, setActiveTab] = useState<'plan' | 'technicals' | 'orderflow' | 'news' | 'risk' | 'ml'>('plan');
  const [customPromptInput, setCustomPromptInput] = useState('');

  const getVerdictStyle = (verdict: SignalVerdict) => {
    switch (verdict) {
      case 'STRONG_BUY':
        return {
          bg: 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-emerald-950/50 shadow-lg',
          badge: 'bg-emerald-500 text-slate-950 font-black',
          glow: 'from-emerald-500/20 to-teal-500/0',
          icon: <TrendingUp className="w-5 h-5 text-emerald-400" />
        };
      case 'BUY':
        return {
          bg: 'bg-emerald-950/50 border-emerald-600/80 text-emerald-300',
          badge: 'bg-emerald-600 text-white font-bold',
          glow: 'from-emerald-600/10 to-transparent',
          icon: <TrendingUp className="w-5 h-5 text-emerald-400" />
        };
      case 'STRONG_SELL':
        return {
          bg: 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-rose-950/50 shadow-lg',
          badge: 'bg-rose-500 text-white font-black',
          glow: 'from-rose-500/20 to-pink-500/0',
          icon: <TrendingDown className="w-5 h-5 text-rose-400" />
        };
      case 'SELL':
        return {
          bg: 'bg-rose-950/50 border-rose-600/80 text-rose-300',
          badge: 'bg-rose-600 text-white font-bold',
          glow: 'from-rose-600/10 to-transparent',
          icon: <TrendingDown className="w-5 h-5 text-rose-400" />
        };
      default:
        return {
          bg: 'bg-slate-900 border-slate-700 text-slate-300',
          badge: 'bg-amber-500/90 text-slate-950 font-bold',
          glow: 'from-amber-500/10 to-transparent',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />
        };
    }
  };

  const style = analysis ? getVerdictStyle(analysis.verdict) : getVerdictStyle('NEUTRAL');

  // Calculate suggested share count based on recommended position size % and user cash
  const suggestedAllocation = analysis ? (userCash * (analysis.recommendedPositionSizePct / 100)) : 0;
  const suggestedShares = analysis && currentPrice > 0 ? Math.max(1, Math.floor(suggestedAllocation / currentPrice)) : 0;

  const isBuySignal = analysis?.verdict === 'STRONG_BUY' || analysis?.verdict === 'BUY';
  const isSellSignal = analysis?.verdict === 'STRONG_SELL' || analysis?.verdict === 'SELL';

  const handleExecuteRecommended = () => {
    if (!analysis) return;
    const side = isBuySignal ? 'BUY' : 'SELL';
    const limit = analysis.entryZone.optimal;
    const tp = analysis.targets.tp1;
    const sl = analysis.stopLoss.price;
    onApplyTradePlan(side, suggestedShares, limit, tp, sl);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-full flex-1">
      {/* AI Panel Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-950/50">
              <Cpu className="w-6 h-6 text-slate-950 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base text-white tracking-tight">AI Trading Intelligence</h2>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/80">
                  {analysis?.modelUsed || `Ollama: ${llmConfig.ollamaModel || 'llama3'}`}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Horizon: {analysis?.timeHorizon || 'Intraday Day Trade'}</span>
                {analysis?.latencyMs && (
                  <span className="text-[10px] font-mono text-slate-500">({analysis.latencyMs}ms)</span>
                )}
              </p>
            </div>
          </div>

          {/* Strategy Persona Switcher & Re-analyze */}
          <div className="flex items-center gap-2">
            <select
              value={llmConfig.persona}
              onChange={(e) => onTriggerAnalysis(e.target.value as StrategyPersona)}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:border-cyan-500 outline-none cursor-pointer"
            >
              <option value="day_trader">Day Trader (Intraday)</option>
              <option value="scalper">Scalper (1m - 15m Fast)</option>
              <option value="swing_trader">Swing Trader (Multi-Day)</option>
              <option value="institutional">Institutional / Value Flow</option>
            </select>

            <button
              id="reanalyze-ai-btn"
              onClick={() => onTriggerAnalysis()}
              disabled={isLoading}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-all shadow-md shadow-emerald-950/30 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Reasoning...' : 'Re-Analyze'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Signal Banner & Score Card */}
      {analysis && (
        <div className={`p-4 border-b ${style.bg} transition-all`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Left: Signal Badge & Summary */}
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 shrink-0 mt-0.5">
                {style.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-xs tracking-wider uppercase ${style.badge}`}>
                    {analysis.verdict.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    Confidence: <strong className="text-white">{analysis.confidence}%</strong>
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    R:R <strong className="text-emerald-400">1:{analysis.riskRewardRatio}</strong>
                  </span>
                </div>
                <p className="text-xs text-slate-200 mt-1.5 leading-relaxed max-w-2xl font-medium">
                  {analysis.summary}
                </p>
              </div>
            </div>
          </div>

          {/* Actionable Price Levels Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5 pt-3 border-t border-slate-800/80">
            <div className="bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-lg">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Recommended Entry</span>
              <span className="text-sm font-extrabold font-mono text-cyan-300">
                ${analysis.entryZone.min.toFixed(2)} - ${analysis.entryZone.max.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono block">Optimal: ${analysis.entryZone.optimal.toFixed(2)}</span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-lg">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Take Profit 1</span>
              <span className="text-sm font-extrabold font-mono text-emerald-400">
                ${analysis.targets.tp1.toFixed(2)}
              </span>
              <span className="text-[10px] text-emerald-400/80 font-mono block">
                +{(((analysis.targets.tp1 - currentPrice) / currentPrice) * 100).toFixed(1)}% target
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-lg">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Take Profit 2</span>
              <span className="text-sm font-extrabold font-mono text-teal-400">
                ${analysis.targets.tp2.toFixed(2)}
              </span>
              <span className="text-[10px] text-teal-400/80 font-mono block">
                +{(((analysis.targets.tp2 - currentPrice) / currentPrice) * 100).toFixed(1)}% runner
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-lg">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Hard Stop Loss</span>
              <span className="text-sm font-extrabold font-mono text-rose-400">
                ${analysis.stopLoss.price.toFixed(2)}
              </span>
              <span className="text-[10px] text-rose-400/80 font-mono block">
                -{analysis.stopLoss.percentRisk}% max risk
              </span>
            </div>
          </div>
        </div>
      )}


      {/* Dynamic Quantitative Ensemble Grid (Page 3 Core Engine) */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {analysis && analysis.ensemble ? (
          <div className="space-y-4">
            
            {/* 1-Week Horizon Trend Outlook Card */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all shadow-lg ${
              analysis.ensemble.oneWeekTrend === 'RISE'
                ? 'bg-emerald-950/40 border-emerald-500/35 shadow-emerald-950/20'
                : 'bg-rose-950/40 border-rose-500/35 shadow-rose-950/20'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl border shrink-0 ${
                  analysis.ensemble.oneWeekTrend === 'RISE'
                    ? 'bg-emerald-900/30 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-900/30 border-rose-500/20 text-rose-400'
                }`}>
                  {analysis.ensemble.oneWeekTrend === 'RISE' ? (
                    <TrendingUp className="w-6 h-6 animate-pulse" />
                  ) : (
                    <TrendingDown className="w-6 h-6 animate-pulse" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">1-Week Trend Outlook</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-black font-mono tracking-tight ${
                      analysis.ensemble.oneWeekTrend === 'RISE' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {analysis.ensemble.oneWeekTrend === 'RISE' ? '📈 BULLISH RISE' : '📉 BEARISH FALL'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-350">
                      (Ensemble Conviction: <strong>{analysis.ensemble.oneWeekConfidence}%</strong>)
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-lg font-mono">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">DMN Engine:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                  analysis.verdict.includes('BUY') ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                  analysis.verdict.includes('SELL') ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                  'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {analysis.verdict.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* High-Precision Ensemble Models Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              
              {/* Card 1: Linear Regression & SVR Bounds */}
              <div className="bg-slate-950/80 border border-cyan-900/40 p-3.5 rounded-xl shadow-md space-y-2">
                <h4 className="font-extrabold text-cyan-300 text-xs flex items-center gap-1.5 border-b border-cyan-950 pb-2 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  Linear Regression & SVR
                </h4>
                <div className="space-y-2.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 font-semibold">Regr Price Target</span>
                    <span className="text-cyan-400 font-bold">${analysis.ensemble.linearRegressionTarget}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 font-semibold">SVR Margin Tube</span>
                    <span className="text-slate-200 font-bold">${analysis.ensemble.svrLowerBound} - ${analysis.ensemble.svrUpperBound}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Random Forest Ensemble Vote */}
              <div className="bg-slate-950/80 border border-purple-900/40 p-3.5 rounded-xl shadow-md space-y-2">
                <h4 className="font-extrabold text-purple-300 text-xs flex items-center gap-1.5 border-b border-purple-950 pb-2 mb-2">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  Random Forest (100 Trees)
                </h4>
                <div className="space-y-2.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 font-semibold">Tree Vote Outcome</span>
                    <span className={`font-bold ${analysis.ensemble.randomForestForecast === 'RISE' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {analysis.ensemble.randomForestForecast}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 font-semibold">Tree Probability</span>
                    <span className="text-slate-200 font-bold">{analysis.ensemble.randomForestConfidence}%</span>
                  </div>
                </div>
              </div>

              {/* Card 3: XGBoost Volatility Gradient */}
              <div className="bg-slate-950/80 border border-amber-900/40 p-3.5 rounded-xl shadow-md space-y-2">
                <h4 className="font-extrabold text-amber-300 text-xs flex items-center gap-1.5 border-b border-amber-950 pb-2 mb-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  XGBoost Classifier
                </h4>
                <div className="space-y-2.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 font-semibold">Gradient Signal</span>
                    <span className={`font-bold ${analysis.ensemble.xgboostSignal === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {analysis.ensemble.xgboostSignal}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 font-semibold">Breakout Probability</span>
                    <span className="text-slate-200 font-bold">{analysis.ensemble.xgboostBreakoutProb}%</span>
                  </div>
                </div>
              </div>

              {/* Card 4: K-Nearest Neighbors (KNN) */}
              <div className="bg-slate-950/80 border border-teal-900/40 p-3.5 rounded-xl shadow-md space-y-2">
                <h4 className="font-extrabold text-teal-300 text-xs flex items-center gap-1.5 border-b border-teal-950 pb-2 mb-2">
                  <BrainCircuit className="w-3.5 h-3.5 text-teal-400" />
                  K-Nearest Neighbors (K=5)
                </h4>
                <div className="space-y-2.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 font-semibold">KNN Return Bias</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                      analysis.ensemble.knnSignal === 'BUY' ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-900/35' :
                      analysis.ensemble.knnSignal === 'SELL' ? 'text-rose-400 bg-rose-950/50 border border-rose-900/35' :
                      'text-slate-400 bg-slate-900'
                    }`}>
                      {analysis.ensemble.knnSignal}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 font-semibold">Validation Accuracy</span>
                    <span className="text-slate-200 font-bold">{analysis.ensemble.knnAccuracy}%</span>
                  </div>
                </div>
              </div>

              {/* Card 5: Neural LSTM Sequence Model */}
              <div className="bg-slate-950/80 border border-indigo-900/40 p-3.5 rounded-xl shadow-md space-y-2">
                <h4 className="font-extrabold text-indigo-300 text-xs flex items-center gap-1.5 border-b border-indigo-950 pb-2 mb-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Long Short-Term Memory
                </h4>
                <div className="space-y-2.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 font-semibold">1W Return Estimate</span>
                    <span className={`font-bold ${analysis.ensemble.lstmReturnEstimate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {analysis.ensemble.lstmReturnEstimate >= 0 ? `+${analysis.ensemble.lstmReturnEstimate}` : analysis.ensemble.lstmReturnEstimate}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 font-semibold">Regime (K-Means)</span>
                    <span className="text-slate-350 font-bold text-[10px] truncate max-w-[120px]" title={analysis.ensemble.kmeansRegime}>
                      {analysis.ensemble.kmeansRegime.split(' ')[0]} {analysis.ensemble.kmeansRegime.includes('High') ? '🔥' : '❄️'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 6: Q-Learning Timing & Catalysts */}
              <div className="bg-slate-950/80 border border-emerald-900/40 p-3.5 rounded-xl shadow-md space-y-2">
                <h4 className="font-extrabold text-emerald-300 text-xs flex items-center gap-1.5 border-b border-emerald-950 pb-2 mb-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Q-Learning Timing & News
                </h4>
                <div className="space-y-2.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 font-semibold">Execution Timing</span>
                    <span className={`font-extrabold ${
                      analysis.ensemble.qlearningAction === 'ACCUMULATE' ? 'text-emerald-400' :
                      analysis.ensemble.qlearningAction === 'DISTRIBUTE' ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {analysis.ensemble.qlearningAction}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 font-semibold">Catalyst Impact Score</span>
                    <span className="text-amber-400 font-bold">{analysis.ensemble.newsCatalystImpact}/10</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Invalidation & Warnings footer log */}
            <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-lg text-[10px] font-mono text-slate-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-350">Risk Warning:</strong> {analysis.riskWarning}
                <div className="mt-1"><strong className="text-slate-350">Invalidation Trigger:</strong> {analysis.invalidationLevel}</div>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
            <Sparkles className="w-8 h-8 text-emerald-400 mb-2 animate-bounce" />
            <p className="font-semibold text-slate-200">AI Intelligence Engine Initializing</p>
            <p className="text-xs text-slate-500 mt-1">Analyzing multi-timeframe candles, order book depth, and technical indicators...</p>
          </div>
        )}
      </div>

      {/* Custom LLM Prompt Input Footer */}
      <div className="bg-slate-950 p-3 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customPromptInput.trim()) {
              onTriggerAnalysis();
            }
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={customPromptInput}
            onChange={(e) => setCustomPromptInput(e.target.value)}
            placeholder="Ask AI or instruct custom strategy (e.g. 'Look for 5m RSI bull divergence')..."
            className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-slate-800 hover:bg-slate-700 text-cyan-400 p-2 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
            title="Send Custom Directive to Model"
          >
            <SendHorizontal className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
