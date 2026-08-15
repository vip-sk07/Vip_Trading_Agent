import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, RefreshCw, Sparkles, User, AlertCircle, Sliders } from 'lucide-react';
import { LLMProviderConfig, Candle, TechnicalIndicators, StockQuote } from '../types';

interface VipTradingAgentProps {
  llmConfig: LLMProviderConfig;
  symbol: string;
  quote: StockQuote;
  indicators: TechnicalIndicators;
  candles: Candle[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const VipTradingAgent: React.FC<VipTradingAgentProps> = ({
  llmConfig,
  symbol,
  quote,
  indicators,
  candles
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I am your VIP Trading Agent, connected to local Ollama. Ask me anything about stock setups, support/resistance levels, MACD momentum, or regression forecasts for ${symbol}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Model Engine Settings
  const [provider, setProvider] = useState<'ollama' | 'gemini' | 'anthropic'>('ollama');
  const [modelName, setModelName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [localModels, setLocalModels] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch local models list from server on mount
  useEffect(() => {
    const fetchLocalModels = async () => {
      try {
        const res = await fetch('/api/ai/local-models');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.models && data.models.length > 0) {
            setLocalModels(data.models);
            if (provider === 'ollama') {
              setModelName(data.models[0]);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch local models list:', err);
      }
    };

    fetchLocalModels();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Set default model names when provider changes
  const handleProviderChange = (newProvider: 'ollama' | 'gemini' | 'anthropic') => {
    setProvider(newProvider);
    if (newProvider === 'ollama') {
      if (localModels.length > 0) {
        setModelName(localModels[0]);
      } else {
        setModelName('');
      }
    } else if (newProvider === 'gemini') {
      setModelName('gemini-1.5-pro');
    } else if (newProvider === 'anthropic') {
      setModelName('claude-3-5-sonnet-20241022');
    }
  };

  const systemPrompt = `You are the VIP Trading Agent, an elite automated trading companion built into the Stock Market Terminal.
Analyze the user's message using the active workspace values:
- Active Ticker Symbol: ${symbol} (${quote.name}, Sector: ${quote.sector})
- Live Price: $${quote.price.toFixed(2)} (Day Change: ${quote.changePercent.toFixed(2)}%)
- Technical Indicators:
  - EMA20: $${indicators.ema20.toFixed(2)}
  - VWAP: $${indicators.vwap.toFixed(2)}
  - RSI: ${indicators.rsi.toFixed(1)}
  - MACD Histogram: ${indicators.macd.histogram.toFixed(3)}

You MUST format your entire response using this exact compact template (avoid writing long conversational paragraphs):

🏢 **Company**: ${quote.name} (${symbol})
💵 **Price**: $${quote.price.toFixed(2)} (${quote.changePercent.toFixed(2)}%)
📊 **Technical Verdict**: [BUY / SELL / DO NOT RECOMMEND] - [Brief 1-phrase reason]
🔍 **Quick Setup**: [Target Entry, Stop Loss, and Take Profit levels, or "N/A"]
📝 **Short Rationale**: [One simple sentence describing the technical setup or answer to the user's question]`;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setError(null);

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedMessages = [...messages, { role: 'user' as const, content: userMsg, timestamp }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          systemPrompt,
          config: {
            provider,
            modelName,
            ollamaEndpoint: 'http://localhost:11434', // Default internally
            apiKey
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: data.message,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        } else {
          throw new Error(data.message || 'Model API returned an error');
        }
      } else {
        throw new Error(`Server proxy returned HTTP status ${response.status}`);
      }
    } catch (err: any) {
      setError(err.message || 'Connection error to Ollama instance.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Conversation reset. Active model: ${modelName} (${provider.toUpperCase()}). Ask me any questions about active setups or quantitative models.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setError(null);
    setInput('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-full flex-1">
      {/* Header */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Bot className="w-4 h-4 text-emerald-400" />
          <h3 className="font-extrabold text-xs text-white">VIP Trading Agent</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded transition-colors ${
              showConfig ? 'bg-emerald-950 text-emerald-400' : 'hover:bg-slate-800 text-slate-400'
            }`}
            title="Configure Agent AI Engine"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset Chat"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-emerald-450 flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {provider}: {modelName}
          </span>
        </div>
      </div>

      {/* Slide-down Engine Configuration Bar */}
      {showConfig && (
        <div className="bg-slate-955 bg-slate-950 border-b border-slate-800 p-3 shrink-0 space-y-2.5 transition-all">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Agent Model Configuration
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Provider Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-semibold uppercase">Provider</label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 focus:border-emerald-500 outline-none"
              >
                <option value="ollama">Ollama (Local LLM)</option>
                <option value="gemini">Gemini API (Google Cloud)</option>
                <option value="anthropic">Anthropic API (Claude Cloud)</option>
              </select>
            </div>

            {/* Model Name Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-semibold uppercase">Model Name</label>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 focus:border-emerald-500 outline-none font-mono"
              >
                {provider === 'ollama' && (
                  localModels.length > 0 ? (
                    localModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))
                  ) : (
                    <option value="">Ollama Offline / No Models</option>
                  )
                )}
                {provider === 'gemini' && (
                  ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))
                )}
                {provider === 'anthropic' && (
                  ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))
                )}
              </select>
            </div>

            {/* API Key Input (only when cloud provider is selected) */}
            {provider !== 'ollama' && (
              <div className="flex flex-col gap-1 col-span-2 animate-fadeIn">
                <label className="text-[10px] text-slate-500 font-semibold uppercase">{provider.toUpperCase()} Secret API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${provider === 'gemini' ? 'Gemini' : 'Anthropic'} API key...`}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-250 focus:border-emerald-500 outline-none font-mono"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages Box */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-950/70">
        {messages.map((msg, index) => {
          const isAssistant = msg.role === 'assistant';
          return (
            <div
              key={index}
              className={`flex items-start gap-2.5 max-w-[85%] ${
                isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'
              }`}
            >
              {/* Icon */}
              <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${
                isAssistant ? 'bg-emerald-950 border-emerald-850 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}>
                {isAssistant ? <Sparkles className="w-3 h-3" /> : <User className="w-3 h-3" />}
              </div>

              {/* Bubble */}
              <div className={`rounded-xl p-3 text-xs leading-relaxed ${
                isAssistant 
                  ? 'bg-slate-900 border border-slate-800 text-slate-200 font-medium' 
                  : 'bg-emerald-600 text-slate-950 font-semibold'
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <span className={`text-[9px] block text-right mt-1 font-mono ${
                  isAssistant ? 'text-slate-500' : 'text-emerald-950'
                }`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-start gap-2.5 mr-auto max-w-[85%]">
            <div className="p-1.5 rounded-lg border shrink-0 mt-0.5 bg-emerald-950 border-emerald-850 text-emerald-400 animate-pulse">
              <Bot className="w-3 h-3" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-100"></span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-200"></span>
              <span className="font-mono text-[10px] text-slate-500 ml-1">VIP Agent is reasoning...</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-300 rounded-lg p-2.5 text-[11px] flex items-start gap-2 max-w-[85%] mx-auto">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Agent Model Execution Failed:</span> {error}
              {provider === 'ollama' ? (
                <p className="text-[10px] text-slate-400 mt-1">Make sure Ollama is running locally with `ollama run {modelName}`. The default localhost endpoint is used.</p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1">Please verify your secret API Key and that the model name `{modelName}` is valid.</p>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <form onSubmit={handleSendMessage} className="bg-slate-950 p-2.5 border-t border-slate-800 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask the VIP Trading Agent about ${symbol}...`}
          disabled={isLoading}
          className="flex-1 bg-slate-900 border border-slate-750 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-2 rounded-lg transition-all font-bold disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
