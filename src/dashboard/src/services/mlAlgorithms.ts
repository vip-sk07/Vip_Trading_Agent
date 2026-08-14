import { Candle, TechnicalIndicators } from '../types';

export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  predictedPrice: number;
  trend: 'UPWARD' | 'DOWNWARD' | 'FLAT';
}

export interface NaiveBayesResult {
  regime: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  probabilities: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
}

/**
 * Fits a Linear Regression line (y = mx + c) using Least Squares on price history
 */
export function calculateLinearRegression(prices: number[]): RegressionResult {
  const n = prices.length;
  if (n < 2) {
    return { slope: 0, intercept: 0, r2: 0, predictedPrice: prices[0] || 0, trend: 'FLAT' };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += prices[i];
    sumXY += i * prices[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R2 (Coefficient of Determination)
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yPred = slope * i + intercept;
    ssTot += Math.pow(prices[i] - meanY, 2);
    ssRes += Math.pow(prices[i] - yPred, 2);
  }

  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  const predictedPrice = Number((slope * n + intercept).toFixed(2));

  let trend: 'UPWARD' | 'DOWNWARD' | 'FLAT' = 'FLAT';
  const percentChange = (slope / meanY) * 100;
  if (percentChange > 0.01) {
    trend = 'UPWARD';
  } else if (percentChange < -0.01) {
    trend = 'DOWNWARD';
  }

  return {
    slope: Number(slope.toFixed(4)),
    intercept: Number(intercept.toFixed(2)),
    r2: Number(r2.toFixed(3)),
    predictedPrice,
    trend
  };
}

/**
 * A Naive Bayes Classifier that trains on historical candle features
 * and classifies the current market regime (BULLISH, BEARISH, NEUTRAL).
 */
export function predictRegimeNaiveBayes(
  candles: Candle[],
  ema20: number,
  vwap: number
): NaiveBayesResult {
  if (candles.length < 20) {
    return {
      regime: 'NEUTRAL',
      probabilities: { bullish: 0.33, bearish: 0.33, neutral: 0.34 }
    };
  }

  const closes = candles.map(c => c.close);
  
  interface TrainingInstance {
    rsiFeature: 'OVERSOLD' | 'OVERBOUGHT' | 'NORMAL';
    emaFeature: 'ABOVE' | 'BELOW';
    vwapFeature: 'ABOVE' | 'BELOW';
    label: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  }

  const dataset: TrainingInstance[] = [];

  // 1. Build training set retrospectively from history
  for (let i = 14; i < candles.length - 3; i++) {
    const currentClose = closes[i];
    const futureClose = closes[i + 3];
    const priceChangePct = ((futureClose - currentClose) / currentClose) * 100;

    let label: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (priceChangePct > 0.25) label = 'BULLISH';
    else if (priceChangePct < -0.25) label = 'BEARISH';

    const subsetCloses = closes.slice(0, i + 1);
    
    // EMA20 approximation
    const k = 2 / (20 + 1);
    let tempEma = subsetCloses[0];
    for (let j = 1; j < subsetCloses.length; j++) {
      tempEma = subsetCloses[j] * k + tempEma * (1 - k);
    }

    const emaFeature = currentClose >= tempEma ? 'ABOVE' : 'BELOW';
    
    // VWAP approximation
    const subsetCandles = candles.slice(Math.max(0, i - 14), i + 1);
    let tempCumTypicalVol = 0;
    let tempCumVol = 0;
    for (const c of subsetCandles) {
      const typical = (c.high + c.low + c.close) / 3;
      tempCumTypicalVol += typical * c.volume;
      tempCumVol += c.volume;
    }
    const tempVwap = tempCumTypicalVol / (tempCumVol || 1);
    const vwapFeature = currentClose >= tempVwap ? 'ABOVE' : 'BELOW';

    // RSI approximation
    let gains = 0;
    let losses = 0;
    for (let j = i - 13; j <= i; j++) {
      const diff = closes[j] - closes[j - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const tempRsi = 100 - (100 / (1 + (gains / 14) / ((losses / 14) || 0.0001)));
    const rsiFeature = tempRsi > 60 ? 'OVERBOUGHT' : tempRsi < 40 ? 'OVERSOLD' : 'NORMAL';

    dataset.push({ rsiFeature, emaFeature, vwapFeature, label });
  }

  if (dataset.length === 0) {
    return {
      regime: 'NEUTRAL',
      probabilities: { bullish: 0.33, bearish: 0.33, neutral: 0.34 }
    };
  }

  // 2. Frequency counting
  let countBullish = 0;
  let countBearish = 0;
  let countNeutral = 0;

  const rsiFreq: Record<string, number> = {};
  const emaFreq: Record<string, number> = {};
  const vwapFreq: Record<string, number> = {};

  dataset.forEach(inst => {
    if (inst.label === 'BULLISH') countBullish++;
    else if (inst.label === 'BEARISH') countBearish++;
    else countNeutral++;

    const rsiKey = `${inst.rsiFeature}|${inst.label}`;
    const emaKey = `${inst.emaFeature}|${inst.label}`;
    const vwapKey = `${inst.vwapFeature}|${inst.label}`;

    rsiFreq[rsiKey] = (rsiFreq[rsiKey] || 0) + 1;
    emaFreq[emaKey] = (emaFreq[emaKey] || 0) + 1;
    vwapFreq[vwapKey] = (vwapFreq[vwapKey] || 0) + 1;
  });

  const totalInstances = dataset.length;
  const pBullish = countBullish / totalInstances;
  const pBearish = countBearish / totalInstances;
  const pNeutral = countNeutral / totalInstances;

  // 3. Current feature calculation
  const latestClose = closes[closes.length - 1];
  
  let currentGains = 0;
  let currentLosses = 0;
  for (let j = closes.length - 14; j < closes.length; j++) {
    const diff = closes[j] - closes[j - 1];
    if (diff >= 0) currentGains += diff;
    else currentLosses += Math.abs(diff);
  }
  const currentRsi = 100 - (100 / (1 + (currentGains / 14) / ((currentLosses / 14) || 0.0001)));

  const currentRsiFeature = currentRsi > 60 ? 'OVERBOUGHT' : currentRsi < 40 ? 'OVERSOLD' : 'NORMAL';
  const currentEmaFeature = latestClose >= ema20 ? 'ABOVE' : 'BELOW';
  const currentVwapFeature = latestClose >= vwap ? 'ABOVE' : 'BELOW';

  const getLikelihood = (freqMap: Record<string, number>, value: string, label: 'BULLISH' | 'BEARISH' | 'NEUTRAL', classCount: number, numStates: number) => {
    const count = freqMap[`${value}|${label}`] || 0;
    return (count + 1) / (classCount + numStates);
  };

  const rsiStates = 3;
  const binaryStates = 2;

  // Joint Likelihoods
  const likRsiBull = getLikelihood(rsiFreq, currentRsiFeature, 'BULLISH', countBullish, rsiStates);
  const likEmaBull = getLikelihood(emaFreq, currentEmaFeature, 'BULLISH', countBullish, binaryStates);
  const likVwapBull = getLikelihood(vwapFreq, currentVwapFeature, 'BULLISH', countBullish, binaryStates);

  const likRsiBear = getLikelihood(rsiFreq, currentRsiFeature, 'BEARISH', countBearish, rsiStates);
  const likEmaBear = getLikelihood(emaFreq, currentEmaFeature, 'BEARISH', countBearish, binaryStates);
  const likVwapBear = getLikelihood(vwapFreq, currentVwapFeature, 'BEARISH', countBearish, binaryStates);

  const likRsiNeut = getLikelihood(rsiFreq, currentRsiFeature, 'NEUTRAL', countNeutral, rsiStates);
  const likEmaNeut = getLikelihood(emaFreq, currentEmaFeature, 'NEUTRAL', countNeutral, binaryStates);
  const likVwapNeut = getLikelihood(vwapFreq, currentVwapFeature, 'NEUTRAL', countNeutral, binaryStates);

  // Joint Probabilities
  const postBullish = pBullish * likRsiBull * likEmaBull * likVwapBull;
  const postBearish = pBearish * likRsiBear * likEmaBear * likVwapBear;
  const postNeutral = pNeutral * likRsiNeut * likEmaNeut * likVwapNeut;

  const sumPost = postBullish + postBearish + postNeutral || 0.0001;
  const probBullish = postBullish / sumPost;
  const probBearish = postBearish / sumPost;
  const probNeutral = postNeutral / sumPost;

  let regime: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (probBullish > probBearish && probBullish > probNeutral) {
    regime = 'BULLISH';
  } else if (probBearish > probBullish && probBearish > probNeutral) {
    regime = 'BEARISH';
  }

  return {
    regime,
    probabilities: {
      bullish: Number(probBullish.toFixed(3)),
      bearish: Number(probBearish.toFixed(3)),
      neutral: Number(probNeutral.toFixed(3))
    }
  };
}
