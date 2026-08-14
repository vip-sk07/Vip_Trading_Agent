import React, { useState } from 'react';
import { Bell, X, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PriceAlert, StockQuote } from '../types';

interface PriceAlertModalProps {
  isOpen: boolean;
  quote: StockQuote;
  alerts: PriceAlert[];
  onClose: () => void;
  onCreateAlert: (alert: Omit<PriceAlert, 'id' | 'triggered' | 'createdAt'>) => void;
  onDeleteAlert: (id: string) => void;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  isOpen,
  quote,
  alerts,
  onClose,
  onCreateAlert,
  onDeleteAlert
}) => {
  const [targetPrice, setTargetPrice] = useState<number>(Number((quote.price * 1.02).toFixed(2)));
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [indicatorCondition, setIndicatorCondition] = useState<string>('NONE');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateAlert({
      symbol: quote.symbol,
      targetPrice,
      condition,
      indicatorCondition: indicatorCondition !== 'NONE' ? (indicatorCondition as any) : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-amber-400" />
            <h2 className="font-extrabold text-sm text-white">Price & Technical Alerts ({quote.symbol})</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center justify-between font-mono">
            <span className="text-slate-400">Current Price:</span>
            <span className="font-extrabold text-white text-sm">${quote.price.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
              >
                <option value="ABOVE">Price Rises Above (&gt;=)</option>
                <option value="BELOW">Price Drops Below (&lt;=)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Target Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono font-bold text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Technical Indicator Trigger (Optional)</label>
            <select
              value={indicatorCondition}
              onChange={(e) => setIndicatorCondition(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
            >
              <option value="NONE">None (Price Trigger Only)</option>
              <option value="RSI_OVERBOUGHT">RSI Overbought (&gt; 70)</option>
              <option value="RSI_OVERSOLD">RSI Oversold (&lt; 30)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create Live Alert</span>
          </button>
        </form>

        {/* Existing Alerts List */}
        <div className="px-6 pb-6 space-y-2 border-t border-slate-800/80 pt-4">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Alerts:</h4>
          {alerts.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-mono ${
                    a.triggered
                      ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div>
                    <span className="font-bold text-white">{a.symbol}</span> {a.condition} ${a.targetPrice.toFixed(2)}
                    {a.indicatorCondition && (
                      <span className="text-[10px] text-cyan-400 block">{a.indicatorCondition}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {a.triggered && (
                      <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded">
                        TRIGGERED
                      </span>
                    )}
                    <button
                      onClick={() => onDeleteAlert(a.id)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No alerts configured for this session.</p>
          )}
        </div>
      </div>
    </div>
  );
};
