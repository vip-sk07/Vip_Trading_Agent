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

import { calculateLinearRegression, predictRegimeNaiveBayes } from '../services/mlAlgorithms';
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

      {/* Tabs Navigation */}
      <div className="bg-slate-950/90 border-b border-slate-800 px-4 flex items-center gap-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('plan')}
          className={`py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'plan' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Action Plan</span>
        </button>

        <button
          onClick={() => setActiveTab('technicals')}
          className={`py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'technicals' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart className="w-3.5 h-3.5" />
          <span>Technicals & Indicators</span>
        </button>

        <button
          onClick={() => setActiveTab('orderflow')}
          className={`py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'orderflow' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Order Flow / DOM</span>
        </button>

        <button
          onClick={() => setActiveTab('news')}
          className={`py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'news' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Catalysts & Sentiment</span>
        </button>

        <button
          onClick={() => setActiveTab('risk')}
          className={`py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'risk' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Risk & Sizing</span>
        </button>

        <button
          onClick={() => setActiveTab('ml')}
          className={`py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'ml' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>ML Models</span>
        </button>
      </div>

      {/* Tab Content Body */}
      <div className="p-4 flex-1 text-xs text-slate-300 min-h-[160px]">
        {analysis ? (
          <div>
            {activeTab === 'plan' && (
              <div className="space-y-3">
                <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Suggested Allocation
                  </span>
                  <p className="text-slate-300 text-xs font-semibold">
                    Allocate <strong className="text-emerald-400">{analysis.recommendedPositionSizePct}%</strong> of portfolio risk parameters for this trade setup.
                  </p>
                </div>

                {/* Key Drivers List */}
                <div className="space-y-1.5 mt-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Key Confirmation Drivers:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {analysis.keyDrivers.map((driver, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-950/60 px-2.5 py-1.5 rounded border border-slate-800/70 text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        <span className="text-slate-300">{driver}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'technicals' && (
              <div className="space-y-3">
                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
                  <h4 className="font-bold text-slate-100 mb-1 text-xs">Technical Catalyst & Momentum Analysis</h4>
                  <p className="text-slate-300 leading-relaxed">{analysis.technicalCatalyst}</p>
                </div>
              </div>
            )}

            {activeTab === 'orderflow' && (
              <div className="space-y-3">
                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
                  <h4 className="font-bold text-slate-100 mb-1 text-xs">Order Flow & Level 2 Depth Dynamics</h4>
                  <p className="text-slate-300 leading-relaxed">{analysis.orderFlowMomentum}</p>
                </div>
              </div>
            )}

            {activeTab === 'news' && (
              <div className="space-y-3">
                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
                  <h4 className="font-bold text-slate-100 mb-1 text-xs">Market Catalyst & Sentiment Evaluation</h4>
                  <p className="text-slate-300 leading-relaxed">{analysis.newsSentimentInsight}</p>
                </div>
              </div>
            )}

            {activeTab === 'risk' && (
              <div className="space-y-3">
                <div className="bg-slate-950/80 border border-rose-900/60 p-3 rounded-lg">
                  <h4 className="font-bold text-rose-300 mb-1 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    Risk Protocol & Capital Preservation
                  </h4>
                  <p className="text-slate-300 leading-relaxed">{analysis.riskWarning}</p>
                </div>
              </div>
            )}

            {activeTab === 'ml' && (
              <div className="space-y-3">
                {(() => {
                  const prices = candles.map(c => c.close);
                  const regression = calculateLinearRegression(prices);
                  const bayes = predictRegimeNaiveBayes(candles, indicators.ema20, indicators.vwap);
                  
                  return (
                    <div className="space-y-3">
                      {/* Naive Bayes Classifier Card */}
                      <div className="bg-slate-950/80 border border-purple-900/40 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-extrabold text-purple-300 text-xs flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-purple-400" />
                            Naive Bayes Regime Classifier
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono ${
                            bayes.regime === 'BULLISH' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            bayes.regime === 'BEARISH' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                            'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {bayes.regime}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-2.5 leading-normal">
                          Retrospectively trained on the past <strong className="text-slate-200">{Math.max(0, candles.length - 17)} instances</strong> using RSI, EMA20 crossover, and VWAP features.
                        </p>
                        
                        {/* Probabilities Bars */}
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-[10px] mb-0.5 text-slate-400 font-mono">
                              <span>Bullish Probability</span>
                              <span>{(bayes.probabilities.bullish * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${bayes.probabilities.bullish * 100}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] mb-0.5 text-slate-400 font-mono">
                              <span>Bearish Probability</span>
                              <span>{(bayes.probabilities.bearish * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${bayes.probabilities.bearish * 100}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] mb-0.5 text-slate-400 font-mono">
                              <span>Neutral Probability</span>
                              <span>{(bayes.probabilities.neutral * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-slate-500 h-1.5 rounded-full" style={{ width: `${bayes.probabilities.neutral * 100}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Linear Regression Trendline Card */}
                      <div className="bg-slate-950/80 border border-cyan-900/40 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-extrabold text-cyan-300 text-xs flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                            Linear Regression Trend Model
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold font-mono ${
                            regression.trend === 'UPWARD' ? 'text-emerald-400 bg-emerald-950/40' :
                            regression.trend === 'DOWNWARD' ? 'text-rose-400 bg-rose-950/40' :
                            'text-slate-400 bg-slate-800/40'
                          }`}>
                            {regression.trend === 'UPWARD' ? '↑ UPWARD' : regression.trend === 'DOWNWARD' ? '↓ DOWNWARD' : '→ FLAT'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-[11px] font-mono leading-relaxed mt-2.5">
                          <div className="bg-slate-900/40 p-2 rounded border border-slate-850">
                            <span className="text-[10px] text-slate-500 block">Slope (m)</span>
                            <span className="text-slate-200 font-bold">{regression.slope > 0 ? `+${regression.slope}` : regression.slope}</span>
                          </div>
                          <div className="bg-slate-900/40 p-2 rounded border border-slate-850">
                            <span className="text-[10px] text-slate-500 block">R² Fit Consistency</span>
                            <span className="text-slate-200 font-bold">
                              {regression.r2} {regression.r2 > 0.7 ? '(Strong)' : regression.r2 < 0.3 ? '(Choppy)' : '(Moderate)'}
                            </span>
                          </div>
                          <div className="bg-slate-900/40 p-2 rounded border border-slate-850">
                            <span className="text-[10px] text-slate-500 block">Predicted Price (Next period)</span>
                            <span className="text-cyan-400 font-bold">${regression.predictedPrice}</span>
                          </div>
                          <div className="bg-slate-900/40 p-2 rounded border border-slate-850">
                            <span className="text-[10px] text-slate-500 block">Regression Equation</span>
                            <span className="text-slate-400">y = {regression.slope}x + {regression.intercept}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
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
