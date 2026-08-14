import React, { useState } from 'react';
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle,
  XCircle,
  ShieldCheck,
  History,
  Trash2,
  Percent,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { PortfolioState, Position } from '../types';

interface PortfolioPositionsProps {
  portfolio: PortfolioState;
  onClosePosition: (positionId: string) => void;
  onPartialClosePosition: (positionId: string, fraction: number) => void;
  onMoveSlToBreakeven: (positionId: string) => void;
  onCloseAllPositions: () => void;
  onResetPortfolio: () => void;
}

export const PortfolioPositions: React.FC<PortfolioPositionsProps> = ({
  portfolio,
  onClosePosition,
  onPartialClosePosition,
  onMoveSlToBreakeven,
  onCloseAllPositions,
  onResetPortfolio
}) => {
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');

  const winRate = portfolio.totalTrades > 0
    ? ((portfolio.winningTrades / portfolio.totalTrades) * 100).toFixed(1)
    : '0.0';

  const isTotalPnlPositive = (portfolio.equity - portfolio.startingBalance) >= 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
      {/* Portfolio Top Bar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-emerald-400" />
          <h3 className="font-extrabold text-sm text-white">Paper Trading Portfolio</h3>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1 text-slate-400">
            <span>Win Rate:</span>
            <strong className="text-emerald-400 font-bold">{winRate}%</strong>
            <span className="text-[10px] text-slate-500">({portfolio.winningTrades}W / {portfolio.losingTrades}L)</span>
          </div>

          <div className="h-3 w-px bg-slate-800"></div>

          <div className="flex items-center gap-1 text-slate-400">
            <span>Realized:</span>
            <strong className={`font-bold ${portfolio.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {portfolio.realizedPnL >= 0 ? '+' : ''}${portfolio.realizedPnL.toFixed(2)}
            </strong>
          </div>

          <button
            onClick={onResetPortfolio}
            className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-200"
            title="Reset Paper Account to $100,000"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-950/90 px-4 flex items-center justify-between border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('positions')}
            className={`py-2 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'positions' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>Open Positions ({portfolio.positions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'history' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Order History ({portfolio.orderHistory.length})</span>
          </button>
        </div>

        {portfolio.positions.length > 0 && activeTab === 'positions' && (
          <button
            onClick={onCloseAllPositions}
            className="text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded transition-colors"
          >
            Close All ({portfolio.positions.length})
          </button>
        )}
      </div>

      {/* Tab Body */}
      <div className="p-3 flex-1 overflow-x-auto min-h-[160px]">
        {activeTab === 'positions' ? (
          portfolio.positions.length > 0 ? (
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-[10px] text-slate-500 font-semibold uppercase border-b border-slate-800">
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Side</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Entry</th>
                  <th className="pb-2">Mark Price</th>
                  <th className="pb-2">Unrealized P&L</th>
                  <th className="pb-2">TP / SL</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {portfolio.positions.map((pos) => {
                  const isProfit = pos.unrealizedPnL >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 font-bold text-white flex items-center gap-1">
                        {pos.symbol}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          pos.side === 'LONG' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {pos.side}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-200">{pos.shares}</td>
                      <td className="py-2.5 text-slate-300">${pos.entryPrice.toFixed(2)}</td>
                      <td className="py-2.5 font-bold text-white">${pos.currentPrice.toFixed(2)}</td>
                      <td className={`py-2.5 font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfit ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} ({isProfit ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(2)}%)
                      </td>
                      <td className="py-2.5 text-[10px] text-slate-400">
                        <div>TP: {pos.takeProfit ? `$${pos.takeProfit.toFixed(2)}` : 'None'}</div>
                        <div>SL: {pos.stopLoss ? `$${pos.stopLoss.toFixed(2)}` : 'None'}</div>
                      </td>
                      <td className="py-2.5 text-right space-x-1">
                        <button
                          onClick={() => onMoveSlToBreakeven(pos.id)}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded"
                          title="Move Stop Loss to Entry Price (Risk-Free)"
                        >
                          SL Breakeven
                        </button>
                        <button
                          onClick={() => onPartialClosePosition(pos.id, 0.5)}
                          className="px-1.5 py-0.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10px] rounded"
                          title="Lock in 50% Profit"
                        >
                          Take 50%
                        </button>
                        <button
                          onClick={() => onClosePosition(pos.id)}
                          className="px-2 py-0.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] rounded font-bold"
                          title="Market Close Position"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              No open positions. Select a ticker and execute an AI-guided trade.
            </div>
          )
        ) : (
          /* Order History Log */
          portfolio.orderHistory.length > 0 ? (
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-[10px] text-slate-500 font-semibold uppercase border-b border-slate-800">
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Side</th>
                  <th className="pb-2">Shares</th>
                  <th className="pb-2">Fill Price</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Thesis / Strategy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {portfolio.orderHistory.slice(-10).reverse().map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/40">
                    <td className="py-2 text-[10px] text-slate-400">
                      {new Date(ord.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 font-bold text-white">{ord.symbol}</td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        ord.side === 'BUY' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                      }`}>
                        {ord.side}
                      </span>
                    </td>
                    <td className="py-2 text-slate-200">{ord.shares}</td>
                    <td className="py-2 text-white font-bold">${ord.filledPrice?.toFixed(2) || '-'}</td>
                    <td className="py-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950 text-emerald-400 font-semibold">
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-400 text-[10px] truncate max-w-xs">{ord.reasoning || 'Market Order'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              No previous orders recorded in this session.
            </div>
          )
        )}
      </div>
    </div>
  );
};
