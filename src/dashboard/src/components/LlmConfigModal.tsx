import React, { useState } from 'react';
import {
  X,
  Cpu,
  BrainCircuit,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Terminal,
  Layers,
  Sparkles
} from 'lucide-react';
import { LLMProvider, LLMProviderConfig, StrategyPersona } from '../types';

interface LlmConfigModalProps {
  isOpen: boolean;
  config: LLMProviderConfig;
  onClose: () => void;
  onSaveConfig: (newConfig: LLMProviderConfig) => void;
}

export const LlmConfigModal: React.FC<LlmConfigModalProps> = ({
  isOpen,
  config,
  onClose,
  onSaveConfig
}) => {
  const [localConfig, setLocalConfig] = useState<LLMProviderConfig>({ ...config });
  const [testStatus, setTestStatus] = useState<{ testing: boolean; success?: boolean; message?: string; detectedModels?: string[] }>({
    testing: false
  });

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestStatus({ testing: true });
    try {
      const res = await fetch('/api/ai/local-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: localConfig.provider === 'ollama' ? localConfig.ollamaEndpoint : localConfig.lmStudioEndpoint,
          provider: localConfig.provider
        })
      });
      const data = await res.json();
      setTestStatus({
        testing: false,
        success: data.success,
        message: data.message,
        detectedModels: data.models
      });
    } catch (err: any) {
      setTestStatus({
        testing: false,
        success: false,
        message: `Connection failed: ${err.message}`
      });
    }
  };

  const handleStrategyPreset = (prompt: string, persona: StrategyPersona) => {
    setLocalConfig({
      ...localConfig,
      persona,
      customStrategyPrompt: prompt
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-550 to-indigo-500 flex items-center justify-center text-slate-950 font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white">Ollama Local Engine Configuration</h2>
              <p className="text-xs text-slate-400">Configure connection endpoints and model parameters for your local Ollama trading intelligence engine.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs text-slate-300">
          {/* Local LLM Endpoint & Model Settings */}
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3.5">
            <h3 className="font-extrabold text-xs text-white flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-purple-400" />
              Ollama Connection Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Local API Endpoint URL:
                </label>
                <input
                  type="text"
                  value={localConfig.ollamaEndpoint}
                  onChange={(e) => setLocalConfig({ ...localConfig, ollamaEndpoint: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
                  placeholder="http://localhost:11434"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Model Identifier:
                </label>
                <input
                  type="text"
                  value={localConfig.ollamaModel}
                  onChange={(e) => setLocalConfig({ ...localConfig, ollamaModel: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
                  placeholder="llama3"
                />
              </div>
            </div>

            {/* Quick Model Tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-500">Popular Local Models:</span>
              {['llama3', 'llama3.3', 'deepseek-r1', 'qwen2.5-coder', 'mistral'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setLocalConfig({ ...localConfig, ollamaModel: m })}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-900/60 cursor-pointer"
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Test Connection Button & Status */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus.testing}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-700 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testStatus.testing ? 'animate-spin' : ''}`} />
                <span>{testStatus.testing ? 'Testing Endpoint...' : 'Test Connection'}</span>
              </button>

              {testStatus.message && (
                <div className={`flex items-center gap-1.5 text-xs font-medium ${
                  testStatus.success ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {testStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{testStatus.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Strategy Persona & Custom System Directives */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              Strategy Persona & Custom Trading Rules:
            </label>

            {/* Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Scalper Breakout', persona: 'scalper' as StrategyPersona, prompt: 'Focus on 1m/5m fast momentum breakouts with high Level 2 bid dominance and volume spikes.' },
                { label: 'EMA Trend Pullback', persona: 'day_trader' as StrategyPersona, prompt: 'Wait for clean pullbacks to the 20/50 EMA on rising volume with RSI resetting to 45-55.' },
                { label: 'Smart Money / Liquidity', persona: 'institutional' as StrategyPersona, prompt: 'Identify liquidity sweeps at previous session highs/lows and look for institutional absorption.' },
                { label: 'Multi-Day Swing', persona: 'swing_trader' as StrategyPersona, prompt: 'Seek multi-day trend continuations with high risk-to-reward (minimum 1:3) and tight invalidation.' }
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleStrategyPreset(preset.prompt, preset.persona)}
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-[11px] font-semibold text-slate-300 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-amber-400 mb-1" />
                  <div>{preset.label}</div>
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={localConfig.customStrategyPrompt}
              onChange={(e) => setLocalConfig({ ...localConfig, customStrategyPrompt: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg p-3 text-xs font-mono text-slate-200 outline-none"
              placeholder="Enter custom prompt instructions for the AI trader..."
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-6 py-3.5 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSaveConfig(localConfig);
              onClose();
            }}
            className="px-5 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-950/40 transition-colors cursor-pointer"
          >
            Save & Apply Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
