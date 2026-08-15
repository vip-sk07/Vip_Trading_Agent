import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8050;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini Client server-side with telemetry
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
  });
});

// Proxy Yahoo Finance Chart API for live candles & metadata
app.get('/api/market/chart', async (req, res) => {
  const { symbol = 'NVDA', timeframe = '5m' } = req.query;
  const symStr = String(symbol);
  
  const indianTickers = new Set([
    'RELIANCE', 'TCS', 'INFY', 'SBIN', 'ITC', 'HDFCBANK', 'ICICIBANK', 'BHARTIARTL',
    'LICI', 'SBI', 'HDFCLIFE', 'AXISBANK', 'KOTAKBANK', 'HINDUNILVR',
    'LT', 'BAJFINANCE', 'BAJAJFINSV', 'MARUTI', 'TATASTEEL', 'JSWSTEEL',
    'POWERGRID', 'NTPC', 'ONGC', 'COALINDIA', 'ADANIENT', 'ADANIPORTS',
    'SUNPHARMA', 'CIPLA', 'DRREDDY', 'APOLLOHOSP', 'DIVISLAB', 'ULTRACEMCO',
    'GRASIM', 'SHREECEM', 'HEROMOTOCO', 'M&M', 'EICHERMOT', 'TATAMOTORS',
    'BPCL', 'IOC', 'HINDPETRO', 'WIPRO', 'TECHM', 'HCLTECH', 'LTIM',
    'ASIANPAINT', 'BERGERPAINT', 'BRITANNIA', 'NESTLEIND'
  ]);
  
  let ticker = symStr;
  if (indianTickers.has(symStr.toUpperCase()) && !symStr.includes('.')) {
    ticker = `${symStr.toUpperCase()}.NS`;
  }
  
  try {
    let range = '1mo';
    let interval = '5m';
    
    switch (timeframe) {
      case '1m':
        range = '1d';
        interval = '1m';
        break;
      case '5m':
        range = '5d';
        interval = '5m';
        break;
      case '15m':
        range = '5d';
        interval = '15m';
        break;
      case '1h':
        range = '1mo';
        interval = '1h';
        break;
      case '1D':
        range = '1y';
        interval = '1d';
        break;
      case '1W':
        range = '2y';
        interval = '1wk';
        break;
    }
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance API returned status ${response.status}`);
    }
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) {
      throw new Error("No chart result found in response");
    }
    
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const adjClose = result.indicators?.adjclose?.[0]?.adjclose || [];
    
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];
    const volumes = quote.volume || [];
    
    const candles: any[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (
        opens[i] === null || opens[i] === undefined ||
        closes[i] === null || closes[i] === undefined ||
        highs[i] === null || highs[i] === undefined ||
        lows[i] === null || lows[i] === undefined
      ) {
        continue;
      }
      
      candles.push({
        time: timestamps[i] * 1000,
        open: Number(opens[i].toFixed(2)),
        high: Number(highs[i].toFixed(2)),
        low: Number(lows[i].toFixed(2)),
        close: Number((adjClose[i] || closes[i]).toFixed(2)),
        volume: Number(volumes[i] || 0)
      });
    }
    
    if (candles.length === 0) {
      throw new Error("No valid candles extracted");
    }
    
    const meta = result.meta || {};
    const latestCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2] || latestCandle;
    const change = Number((latestCandle.close - prevCandle.close).toFixed(2));
    const changePercent = Number(((change / prevCandle.close) * 100).toFixed(2));
    
    const quoteDetails = {
      name: meta.shortName || meta.longName || symStr,
      sector: indianTickers.has(symStr.toUpperCase()) ? 'NSE Equities' : 'General Equities',
      price: latestCandle.close,
      change,
      changePercent,
      previousClose: prevCandle.close,
      open: latestCandle.open,
      high: Math.max(...candles.map(c => c.high)),
      low: Math.min(...candles.map(c => c.low)),
      volume: latestCandle.volume,
      avgVolume: meta.averageDailyVolume3Month || 35000000,
      marketCap: meta.marketCap ? `$${(meta.marketCap / 1e12).toFixed(2)}T` : '$100B',
      peRatio: meta.trailingPE || 25.5,
      high52: meta.fiftyTwoWeekHigh || latestCandle.close * 1.2,
      low52: meta.fiftyTwoWeekLow || latestCandle.close * 0.8
    };
    
    return res.json({
      success: true,
      candles,
      quote: quoteDetails
    });
    
  } catch (err: any) {
    console.error("YFinance proxy error:", err);
    return res.status(502).json({
      success: false,
      error: err.message
    });
  }
});

// Test local Ollama / LM Studio connection
app.post('/api/ai/local-test', async (req, res) => {
  const { endpoint = 'http://localhost:11434', provider = 'ollama' } = req.body;
  try {
    const cleanUrl = endpoint.replace(/\/+$/, '');
    const testUrl = provider === 'ollama' ? `${cleanUrl}/api/tags` : `${cleanUrl}/models`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(testUrl, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const models = data?.models?.map((m: any) => m.name || m.id) || [];
      return res.json({ success: true, models, message: `Connected successfully to ${provider} at ${cleanUrl}` });
    } else {
      return res.json({ success: false, message: `Endpoint returned HTTP ${response.status}: ${response.statusText}` });
    }
  } catch (err: any) {
    return res.json({
      success: false,
      message: `Could not reach ${endpoint}. Verify your local LLM server is running. (${err.message})`
    });
  }
});

// Proxy to Local LLM (Ollama / LM Studio)
app.post('/api/ai/local-proxy', async (req, res) => {
  const { symbol, price, indicators, orderBook, news, recentPrices, config } = req.body;
  const endpoint = config?.ollamaEndpoint || 'http://localhost:11434';
  const modelName = config?.ollamaModel || 'llama3.3';
  const persona = config?.persona || 'day_trader';
  const customPrompt = config?.customStrategyPrompt || '';

  const systemPrompt = `You are a Senior Quantitative Hedge Fund Trader and Technical Analyst executing institutional stock analysis.
Analyze the live market data for ${symbol} and determine the technical trend regime: BULLISH, BEARISH, or NEUTRAL.
Apply strict technical rules:
1. Trend Profile (Verdict determination):
   - STRONG_BUY / BUY (Bullish): Price is above EMA20 and EMA50, and EMA20 > EMA50. RSI is holding above 50 (or oversold below 30 with bullish divergence). MACD histogram is positive or showing bullish crossover.
   - STRONG_SELL / SELL (Bearish): Price is below EMA20 and EMA50, and EMA20 < EMA50. RSI is holding below 50 (or overbought above 70 with bearish divergence). MACD histogram is negative or showing bearish crossover.
   - NEUTRAL: Price is trading between EMA20 and EMA50, moving averages are flat/intertwined, or RSI is oscillating around 50 without trend.
2. Volatility & Risk:
   - Calculate targets and stop losses using ATR (Average True Range). Stop loss should be at least 1.5x to 2x ATR away from entry.
   - Check Bollinger Bands: Riding the upper band confirms bullish strength; riding the lower band confirms bearish breakdown.
3. Order Flow:
   - Incorporate Buyer Dominance percentage from the Level 2 depth book. Higher buyer dominance (>55%) supports long entries; lower supports shorts.

Return ONLY a valid JSON object matching this exact schema:
{
  "symbol": "${symbol}",
  "verdict": "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL",
  "confidence": number (50-98),
  "timeHorizon": string,
  "recommendedAction": string,
  "entryZone": { "min": number, "max": number, "optimal": number },
  "targets": { "tp1": number, "tp2": number, "tp3": number },
  "stopLoss": { "price": number, "percentRisk": number, "type": "HARD" },
  "riskRewardRatio": number,
  "recommendedPositionSizePct": number (2-20),
  "summary": string,
  "technicalCatalyst": string,
  "orderFlowMomentum": string,
  "newsSentimentInsight": string,
  "invalidationLevel": string,
  "riskWarning": string,
  "keyDrivers": string[]
}`;

  const userPrompt = `Live Market Data for ${symbol}:
- Current Price: $${price}
- Moving Averages:
  - EMA 9: $${indicators?.ema9}
  - EMA 20: $${indicators?.ema20}
  - EMA 50: $${indicators?.ema50}
  - EMA 200: $${indicators?.ema200}
- Momentum & Trend Indicators:
  - RSI(14): ${indicators?.rsi} (${indicators?.rsiSignal})
  - MACD Line: ${indicators?.macd?.macdLine}, Signal: ${indicators?.macd?.signalLine}, Histogram: ${indicators?.macd?.histogram} (Trend: ${indicators?.macd?.trend})
  - ADX (14) Trend Strength: ${indicators?.adx}
  - Average True Range (ATR): $${indicators?.atr}
  - VWAP: $${indicators?.vwap}
- Support & Resistance Pivot Levels:
  - R2: $${indicators?.pivotPoints?.r2}
  - R1: $${indicators?.pivotPoints?.r1}
  - Pivot: $${indicators?.pivotPoints?.pivot}
  - S1: $${indicators?.pivotPoints?.s1}
  - S2: $${indicators?.pivotPoints?.s2}
- Order Flow Depth:
  - Spread: $${orderBook?.spread} (${orderBook?.spreadPercent}%)
  - Buyer Dominance: ${orderBook?.buyerDominance}%
- Market Catalysts & Sentiment:
  - News headlines: ${JSON.stringify(news || [])}
- Strategy Persona Profile: ${persona}
- User Strategy Directives: ${customPrompt}

Provide your technical verdict, confidence, entry zones, targets, stop-loss, and a concise quantitative thesis. Respond in pure JSON format only.`;

  try {
    const cleanUrl = endpoint.replace(/\/+$/, '');
    let targetUrl = `${cleanUrl}/api/generate`;
    let bodyPayload: any = {
      model: modelName,
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      stream: false,
      format: 'json'
    };

    if (config?.provider === 'lmstudio') {
      targetUrl = `${cleanUrl}/chat/completions`;
      bodyPayload = {
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: config?.temperature || 0.2
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const localRes = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!localRes.ok) {
      throw new Error(`Local LLM responded with HTTP ${localRes.status}`);
    }

    const rawData = await localRes.json();
    let textResponse = '';
    if (rawData.response) {
      textResponse = rawData.response;
    } else if (rawData.choices?.[0]?.message?.content) {
      textResponse = rawData.choices[0].message.content;
    }

    // Extract JSON
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return res.json(parsed);
    }

    throw new Error('Could not parse structured JSON from local model');
  } catch (err: any) {
    return res.status(502).json({
      error: `Local LLM generation failed: ${err.message}`,
      fallback: true
    });
  }
});

// Proxy chat queries to local Ollama, Gemini, or Anthropic chat APIs
app.post('/api/ai/chat', async (req, res) => {
  const { messages, systemPrompt, config } = req.body;
  const provider = config?.provider || 'ollama';
  const modelName = config?.modelName || config?.ollamaModel || 'llama3';
  const apiKey = config?.apiKey || '';
  const endpoint = config?.ollamaEndpoint || 'http://localhost:11434';

  try {
    if (provider === 'gemini') {
      const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            ...messages.map((m: any) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            }))
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return res.json({ success: true, message: text });
      } else {
        const errText = await response.text();
        return res.status(500).json({ success: false, message: `Gemini API returned error: ${errText}` });
      }
    } else if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelName,
          system: systemPrompt,
          messages: messages.map((m: any) => ({
            role: m.role,
            content: m.content
          })),
          max_tokens: 1024
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text || '';
        return res.json({ success: true, message: text });
      } else {
        const errText = await response.text();
        return res.status(500).json({ success: false, message: `Anthropic API returned error: ${errText}` });
      }
    } else {
      // Default: Ollama
      const cleanUrl = endpoint.replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({ success: true, message: data.message?.content || '' });
      } else {
        return res.status(500).json({ success: false, message: `Ollama returned error status ${response.status}` });
      }
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: `API Proxy failed: ${err.message}` });
  }
});

// Fetch local Ollama downloaded models list
app.get('/api/ai/local-models', async (req, res) => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      const uniqueNames = Array.from(new Set((data.models || []).map((m: any) => m.name)));
      return res.json({ success: true, models: uniqueNames });
    }
  } catch (err: any) {
    console.warn('Ollama tags endpoint unreachable:', err.message);
  }
  return res.json({ success: false, models: [] });
});

// Server-side Gemini 3.7 Flash AI Analysis
app.post('/api/ai/analyze', async (req, res) => {
  const { symbol, name, price, indicators, orderBook, news, recentPrices, config } = req.body;

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'Gemini API key not configured on server', fallback: true });
  }

  const model = config?.geminiModel || 'gemini-3.7-flash';
  const persona = config?.persona || 'day_trader';
  const customPrompt = config?.customStrategyPrompt || '';

  const systemInstruction = `You are an elite quantitative hedge fund trader and technical analysis AI engine.
Your task is to analyze real-time market data for ${symbol} (${name}) and provide a high-conviction, actionable trading decision (STRONG_BUY, BUY, NEUTRAL, SELL, STRONG_SELL).
Apply strict technical rules:
1. Trend Profile (Verdict determination):
   - STRONG_BUY / BUY (Bullish): Price is above EMA20 and EMA50, and EMA20 > EMA50. RSI is holding above 50 (or oversold below 30 with bullish divergence). MACD histogram is positive or showing bullish crossover.
   - STRONG_SELL / SELL (Bearish): Price is below EMA20 and EMA50, and EMA20 < EMA50. RSI is holding below 50 (or overbought above 70 with bearish divergence). MACD histogram is negative or showing bearish crossover.
   - NEUTRAL: Price is trading between EMA20 and EMA50, moving averages are flat/intertwined, or RSI is oscillating around 50 without trend.
2. Volatility & Risk:
   - Calculate targets and stop losses using ATR (Average True Range). Stop loss should be at least 1.5x to 2x ATR away from entry.
   - Check Bollinger Bands: Riding the upper band confirms bullish strength; riding the lower band confirms bearish breakdown.
3. Order Flow:
   - Incorporate Buyer Dominance percentage from the Level 2 depth book. Higher buyer dominance (>55%) supports long entries; lower supports shorts.

Tailor your strategy to the "${persona}" profile.`;

  const promptContent = `Symbol: ${symbol} (${name})
Current Price: $${price}
Key Indicators:
- RSI (14): ${indicators?.rsi} [${indicators?.rsiSignal}]
- Moving Averages: EMA9=$${indicators?.ema9}, EMA20=$${indicators?.ema20}, EMA50=$${indicators?.ema50}, EMA200=$${indicators?.ema200}
- MACD: Line=${indicators?.macd?.macdLine}, Signal=${indicators?.macd?.signalLine}, Histogram=${indicators?.macd?.histogram}, Trend=${indicators?.macd?.trend}
- Bollinger Bands: Upper=$${indicators?.bollinger?.upper}, Middle=$${indicators?.bollinger?.middle}, Lower=$${indicators?.bollinger?.lower}
- VWAP: $${indicators?.vwap} | ATR: $${indicators?.atr} | ADX: ${indicators?.adx}
- Pivot Levels: Pivot=$${indicators?.pivotPoints?.pivot}, R1=$${indicators?.pivotPoints?.r1}, R2=$${indicators?.pivotPoints?.r2}, S1=$${indicators?.pivotPoints?.s1}, S2=$${indicators?.pivotPoints?.s2}
- Order Book: Spread=$${orderBook?.spread}, Buyer Dominance=${orderBook?.buyerDominance}%
- Catalysts & News: ${JSON.stringify(news || [])}
- User Strategy Directives: ${customPrompt}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: promptContent,
      config: {
        systemInstruction,
        temperature: config?.temperature ?? 0.2,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            symbol: { type: Type.STRING },
            verdict: {
              type: Type.STRING,
              description: 'One of STRONG_BUY, BUY, NEUTRAL, SELL, STRONG_SELL'
            },
            confidence: { type: Type.NUMBER, description: 'Percentage between 50 and 98' },
            timeHorizon: { type: Type.STRING },
            recommendedAction: { type: Type.STRING },
            entryZone: {
              type: Type.OBJECT,
              properties: {
                min: { type: Type.NUMBER },
                max: { type: Type.NUMBER },
                optimal: { type: Type.NUMBER }
              },
              required: ['min', 'max', 'optimal']
            },
            targets: {
              type: Type.OBJECT,
              properties: {
                tp1: { type: Type.NUMBER },
                tp2: { type: Type.NUMBER },
                tp3: { type: Type.NUMBER }
              },
              required: ['tp1', 'tp2', 'tp3']
            },
            stopLoss: {
              type: Type.OBJECT,
              properties: {
                price: { type: Type.NUMBER },
                percentRisk: { type: Type.NUMBER },
                type: { type: Type.STRING }
              },
              required: ['price', 'percentRisk', 'type']
            },
            riskRewardRatio: { type: Type.NUMBER },
            recommendedPositionSizePct: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            technicalCatalyst: { type: Type.STRING },
            orderFlowMomentum: { type: Type.STRING },
            newsSentimentInsight: { type: Type.STRING },
            invalidationLevel: { type: Type.STRING },
            riskWarning: { type: Type.STRING },
            keyDrivers: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: [
            'symbol',
            'verdict',
            'confidence',
            'timeHorizon',
            'recommendedAction',
            'entryZone',
            'targets',
            'stopLoss',
            'riskRewardRatio',
            'recommendedPositionSizePct',
            'summary',
            'technicalCatalyst',
            'orderFlowMomentum',
            'newsSentimentInsight',
            'invalidationLevel',
            'riskWarning',
            'keyDrivers'
          ]
        }
      }
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      return res.json(parsed);
    }
    throw new Error('Empty response from Gemini');
  } catch (err: any) {
    console.error('Gemini API execution error:', err);
    return res.status(500).json({ error: err.message, fallback: true });
  }
});

// Setup Vite dev server or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Live Stock Analysis & AI Trading Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
