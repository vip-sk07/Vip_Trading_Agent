import React, { useRef, useState, useEffect } from 'react';
import {
  BarChart2,
  Maximize2,
  Minimize2,
  TrendingUp,
  Layers,
  Eye,
  EyeOff,
  Crosshair,
  Sparkles,
  ShieldAlert,
  Target
} from 'lucide-react';
import { AIAnalysisResult, Candle, ChartType, TechnicalIndicators, TimeFrame } from '../types';

interface StockChartProps {
  symbol: string;
  candles: Candle[];
  timeframe: TimeFrame;
  indicators: TechnicalIndicators;
  aiAnalysis?: AIAnalysisResult | null;
  onTimeframeChange: (tf: TimeFrame) => void;
}

export const StockChart: React.FC<StockChartProps> = ({
  symbol,
  candles,
  timeframe,
  indicators,
  aiAnalysis,
  onTimeframeChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [showEma, setShowEma] = useState(true);
  const [showBollinger, setShowBollinger] = useState(true);
  const [showVwap, setShowVwap] = useState(true);
  const [showAiTargets, setShowAiTargets] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Redraw canvas whenever candles or overlay states change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 30, right: 75, bottom: showVolume ? 60 : 30, left: 15 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear background
    ctx.fillStyle = '#090d16'; // Deep terminal black-slate
    ctx.fillRect(0, 0, width, height);

    // Compute min & max prices across visible candles
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    candles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    // Expand bounds for Bollinger Bands and AI levels if enabled
    if (showBollinger && indicators.bollinger) {
      if (indicators.bollinger.upper > maxPrice) maxPrice = indicators.bollinger.upper * 1.002;
      if (indicators.bollinger.lower < minPrice) minPrice = indicators.bollinger.lower * 0.998;
    }
    if (showAiTargets && aiAnalysis) {
      if (aiAnalysis.targets.tp2 > maxPrice) maxPrice = aiAnalysis.targets.tp2 * 1.005;
      if (aiAnalysis.stopLoss.price < minPrice) minPrice = aiAnalysis.stopLoss.price * 0.995;
    }

    const priceBuffer = (maxPrice - minPrice) * 0.08 || 1;
    minPrice -= priceBuffer;
    maxPrice += priceBuffer;
    const priceRange = maxPrice - minPrice || 1;

    const getX = (index: number) => padding.left + (index + 0.5) * (chartWidth / candles.length);
    const getY = (price: number) => padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

    // 1. Grid Lines & Right Price Axis
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const numYGrid = 6;
    for (let i = 0; i <= numYGrid; i++) {
      const p = minPrice + (i / numYGrid) * priceRange;
      const y = getY(p);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Price label on right margin
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`$${p.toFixed(2)}`, width - padding.right + 6, y + 3);
    }
    ctx.setLineDash([]);

    // 2. Bollinger Bands Shading & Boundary Lines
    if (showBollinger && candles.length > 5) {
      const bbUpper = indicators.bollinger.upper;
      const bbLower = indicators.bollinger.lower;
      const bbMiddle = indicators.bollinger.middle;

      const yUpper = getY(bbUpper);
      const yLower = getY(bbLower);
      const yMid = getY(bbMiddle);

      // Shaded cloud
      ctx.fillStyle = 'rgba(56, 189, 248, 0.04)';
      ctx.fillRect(padding.left, yUpper, chartWidth, yLower - yUpper);

      // Upper band
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, yUpper);
      ctx.lineTo(width - padding.right, yUpper);
      ctx.stroke();

      // Lower band
      ctx.beginPath();
      ctx.moveTo(padding.left, yLower);
      ctx.lineTo(width - padding.right, yLower);
      ctx.stroke();

      // Middle band
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(padding.left, yMid);
      ctx.lineTo(width - padding.right, yMid);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Volume Sub-chart (Bottom)
    if (showVolume && maxVol > 0) {
      const volHeight = 45;
      const volBaseY = height - padding.bottom + volHeight;
      const barWidth = Math.max(1.5, (chartWidth / candles.length) * 0.7);

      candles.forEach((c, i) => {
        const x = getX(i);
        const vHeight = (c.volume / maxVol) * volHeight;
        const isUp = c.close >= c.open;
        ctx.fillStyle = isUp ? 'rgba(34, 197, 94, 0.25)' : 'rgba(244, 63, 94, 0.25)';
        ctx.fillRect(x - barWidth / 2, volBaseY - vHeight, barWidth, vHeight);
      });
    }

    // 4. Candlesticks or Line Area
    const candleWidth = Math.max(2.5, (chartWidth / candles.length) * 0.72);

    if (chartType === 'candlestick') {
      candles.forEach((c, i) => {
        const x = getX(i);
        const openY = getY(c.open);
        const closeY = getY(c.close);
        const highY = getY(c.high);
        const lowY = getY(c.low);

        const isBullish = c.close >= c.open;
        const color = isBullish ? '#22c55e' : '#f43f5e';

        // High-Low Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Real Body
        const topY = Math.min(openY, closeY);
        const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
        ctx.fillStyle = color;
        ctx.fillRect(x - candleWidth / 2, topY, candleWidth, bodyHeight);
      });
    } else {
      // Line/Area Chart
      ctx.beginPath();
      candles.forEach((c, i) => {
        const x = getX(i);
        const y = getY(c.close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Area fill gradient
      const lastX = getX(candles.length - 1);
      const firstX = getX(0);
      const bottomY = getY(minPrice);
      ctx.lineTo(lastX, bottomY);
      ctx.lineTo(firstX, bottomY);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, padding.top, 0, bottomY);
      gradient.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
      gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // 5. Moving Average Overlays (EMA 20, 50)
    if (showEma && candles.length > 10) {
      // EMA 20 line
      ctx.beginPath();
      ctx.strokeStyle = '#06b6d4'; // Cyan
      ctx.lineWidth = 1.5;
      let ema = candles[0].close;
      const k = 2 / (20 + 1);
      candles.forEach((c, i) => {
        ema = c.close * k + ema * (1 - k);
        const x = getX(i);
        const y = getY(ema);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // 6. VWAP line
    if (showVwap && indicators.vwap) {
      const yVwap = getY(indicators.vwap);
      ctx.strokeStyle = '#eab308'; // Yellow
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, yVwap);
      ctx.lineTo(width - padding.right, yVwap);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#eab308';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('VWAP', width - padding.right + 6, yVwap + 3);
    }

    // 7. AI Target Lines (Entry, TP1, TP2, Stop Loss)
    if (showAiTargets && aiAnalysis) {
      const drawLevel = (price: number, label: string, color: string, bg: string) => {
        const y = getY(price);
        if (y < padding.top || y > height - padding.bottom) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Right side badge
        ctx.fillStyle = bg;
        ctx.fillRect(width - padding.right + 2, y - 8, 70, 16);
        ctx.fillStyle = color;
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.fillText(`${label}: $${price.toFixed(2)}`, width - padding.right + 5, y + 3);
      };

      drawLevel(aiAnalysis.entryZone.optimal, 'ENTRY', '#06b6d4', 'rgba(6, 182, 212, 0.15)');
      drawLevel(aiAnalysis.targets.tp1, 'TP1', '#22c55e', 'rgba(34, 197, 94, 0.15)');
      drawLevel(aiAnalysis.targets.tp2, 'TP2', '#10b981', 'rgba(16, 185, 129, 0.15)');
      drawLevel(aiAnalysis.stopLoss.price, 'STOP', '#f43f5e', 'rgba(244, 63, 94, 0.15)');
    }

    // 8. Crosshair & Hover Tooltip
    if (mousePos && mousePos.x >= padding.left && mousePos.x <= width - padding.right) {
      const candleIndex = Math.floor(((mousePos.x - padding.left) / chartWidth) * candles.length);
      const activeCandle = candles[Math.max(0, Math.min(candles.length - 1, candleIndex))];

      if (activeCandle) {
        // Vertical crosshair line
        const cx = getX(candleIndex);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(cx, padding.top);
        ctx.lineTo(cx, height - padding.bottom);
        ctx.stroke();

        // Horizontal crosshair line
        ctx.beginPath();
        ctx.moveTo(padding.left, mousePos.y);
        ctx.lineTo(width - padding.right, mousePos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Hover price badge on right axis
        const hoverPrice = maxPrice - ((mousePos.y - padding.top) / chartHeight) * priceRange;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(width - padding.right + 2, mousePos.y - 8, 68, 16);
        ctx.fillStyle = '#090d16';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillText(`$${hoverPrice.toFixed(2)}`, width - padding.right + 6, mousePos.y + 4);
      }
    }

    // 9. Current Live Price Tag Pulse on Right Axis
    const currentPrice = candles[candles.length - 1]?.close || 0;
    const curY = getY(currentPrice);
    const isUp = (candles[candles.length - 1]?.close || 0) >= (candles[candles.length - 1]?.open || 0);

    ctx.fillStyle = isUp ? '#22c55e' : '#f43f5e';
    ctx.fillRect(width - padding.right + 2, curY - 9, 70, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.fillText(`$${currentPrice.toFixed(2)}`, width - padding.right + 6, curY + 4);

  }, [candles, chartType, showEma, showBollinger, showVwap, showAiTargets, showVolume, mousePos, indicators, aiAnalysis]);

  // Handle Canvas Resize
  useEffect(() => {
    const resizeCanvas = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const canvasWrapper = canvas.parentElement;
      const canvasHeight = isFullscreen 
        ? window.innerHeight - 100 
        : (canvasWrapper && canvasWrapper.clientHeight > 0 ? canvasWrapper.clientHeight : 380);

      canvas.width = container.clientWidth * window.devicePixelRatio;
      canvas.height = canvasHeight * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [isFullscreen]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const padding = { left: 15, right: 75 };
    const chartWidth = canvas.width / window.devicePixelRatio - padding.left - padding.right;
    const candleIndex = Math.floor(((x - padding.left) / chartWidth) * candles.length);
    if (candleIndex >= 0 && candleIndex < candles.length) {
      setHoveredCandle(candles[candleIndex]);
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setHoveredCandle(null);
  };

  const currentCandle = hoveredCandle || candles[candles.length - 1];

  return (
    <div
      ref={containerRef}
      className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 bg-slate-950/95 backdrop-blur-md' : 'relative w-full h-full flex-1'
      }`}
    >
      {/* Chart Top Toolbar */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Timeframe Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          {(['1m', '5m', '15m', '1h', '1D', '1W'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2 py-1 rounded font-semibold transition-all ${
                timeframe === tf
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Chart Style Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setChartType('candlestick')}
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
              chartType === 'candlestick' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Candlestick Chart"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Candle</span>
          </button>
          <button
            onClick={() => setChartType('area')}
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
              chartType === 'area' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Area Line Chart"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Area</span>
          </button>
        </div>

        {/* Indicator Overlays Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowEma(!showEma)}
            className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
              showEma ? 'bg-cyan-950/70 border-cyan-700/80 text-cyan-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle EMA 20 / 50 Overlays"
          >
            EMA (20/50)
          </button>

          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
              showBollinger ? 'bg-sky-950/70 border-sky-700/80 text-sky-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle Bollinger Bands (20, 2)"
          >
            BB (20,2)
          </button>

          <button
            onClick={() => setShowVwap(!showVwap)}
            className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
              showVwap ? 'bg-amber-950/70 border-amber-700/80 text-amber-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle VWAP Anchor"
          >
            VWAP
          </button>

          <button
            onClick={() => setShowAiTargets(!showAiTargets)}
            className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors flex items-center gap-1 ${
              showAiTargets ? 'bg-emerald-950/70 border-emerald-600/90 text-emerald-300 font-bold shadow-sm' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle AI Recommended Entry, Take Profit & Stop Loss Level Lines"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            AI Targets
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Chart'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* OHLCV Dynamic Data Bar */}
      {currentCandle && (
        <div className="bg-slate-950/90 px-3 py-1 border-b border-slate-800/80 flex items-center gap-4 text-[11px] font-mono text-slate-400 overflow-x-auto">
          <span className="text-slate-300 font-bold">{symbol} ({timeframe})</span>
          <span>O: <strong className="text-white">${currentCandle.open.toFixed(2)}</strong></span>
          <span>H: <strong className="text-emerald-400">${currentCandle.high.toFixed(2)}</strong></span>
          <span>L: <strong className="text-rose-400">${currentCandle.low.toFixed(2)}</strong></span>
          <span>C: <strong className="text-white">${currentCandle.close.toFixed(2)}</strong></span>
          <span>Vol: <strong className="text-slate-300">{currentCandle.volume.toLocaleString()}</strong></span>
          <span className={currentCandle.close >= currentCandle.open ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            Chg: {(((currentCandle.close - currentCandle.open) / currentCandle.open) * 100).toFixed(2)}%
          </span>
        </div>
      )}

      {/* Canvas Area */}
      <div className="relative flex-1 bg-[#090d16] min-h-[360px]">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full block cursor-crosshair"
          style={{ height: isFullscreen ? 'calc(100vh - 120px)' : '100%', width: '100%' }}
        />
      </div>

      {/* Footer Info / Indicator Legend */}
      <div className="bg-slate-950 px-3 py-1.5 border-t border-slate-800/90 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-mono">
            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block"></span> EMA20: ${indicators.ema20.toFixed(2)}
          </span>
          <span className="flex items-center gap-1 font-mono">
            <span className="w-2.5 h-0.5 bg-purple-400 inline-block"></span> EMA50: ${indicators.ema50.toFixed(2)}
          </span>
          <span className="flex items-center gap-1 font-mono">
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span> VWAP: ${indicators.vwap.toFixed(2)}
          </span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono hidden sm:block">
          Click & drag to inspect price candles • Live Tick Synced
        </div>
      </div>
    </div>
  );
};
