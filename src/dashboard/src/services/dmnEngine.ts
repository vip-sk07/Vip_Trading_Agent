export interface DmnInputs {
  rsi: number;
  price: number;
  ema20: number;
  ema50: number;
  vwap: number;
  macdHistogram: number;
  buyerDominance: number;
  bullishNewsCount: number;
  bearishNewsCount: number;
}

export interface DmnRule {
  rsi: string;             // S-FEEL: e.g. "< 35", "> 70", "[35..70]"
  emaRelation: string;     // S-FEEL: "ABOVE", "BELOW", "-"
  vwapRelation: string;    // S-FEEL: "ABOVE", "BELOW", "-"
  buyerDominance: string;  // S-FEEL: "> 55", "< 45", "-"
  macdHistogram: string;   // S-FEEL: "> 0", "< 0", "-"
  newsSentiment: string;   // S-FEEL: "BULLISH", "BEARISH", "-"
  bullishScore: number;
  bearishScore: number;
}

export interface DmnOutput {
  bullishScore: number;
  bearishScore: number;
  rulesMatchedCount: number;
}

/**
 * Standard FEEL (Friendly Enough Expression Language) expression evaluator
 */
export function evaluateFeel(value: any, expression: string): boolean {
  const expr = expression.trim();
  if (expr === '-') return true; // Wildcard matcher

  if (typeof value === 'number') {
    if (expr.startsWith('<=')) return value <= parseFloat(expr.slice(2).trim());
    if (expr.startsWith('>=')) return value >= parseFloat(expr.slice(2).trim());
    if (expr.startsWith('<')) return value < parseFloat(expr.slice(1).trim());
    if (expr.startsWith('>')) return value > parseFloat(expr.slice(1).trim());

    // S-FEEL Range: [35..70]
    const rangeMatch = expr.match(/^\[\s*(\d+(?:\.\d+)?)\s*\.\.\s*(\d+(?:\.\d+)?)\s*\]$/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      return value >= min && value <= max;
    }

    return value === parseFloat(expr);
  }

  if (typeof value === 'boolean') {
    return String(value).toLowerCase() === expr.toLowerCase();
  }

  return String(value).trim() === expr;
}

/**
 * DMN Decision Table definition mapping inputs to score points
 */
export const DMN_DECISION_TABLE: DmnRule[] = [
  // 1. Technical indicator RSI rules
  { rsi: "< 35", emaRelation: "-", vwapRelation: "-", buyerDominance: "-", macdHistogram: "-", newsSentiment: "-", bullishScore: 25, bearishScore: 0 },
  { rsi: "> 70", emaRelation: "-", vwapRelation: "-", buyerDominance: "-", macdHistogram: "-", newsSentiment: "-", bullishScore: 0, bearishScore: 25 },
  { rsi: "[35..50]", emaRelation: "-", vwapRelation: "-", buyerDominance: "-", macdHistogram: "-", newsSentiment: "-", bullishScore: 0, bearishScore: 15 },
  { rsi: "[50..65]", emaRelation: "-", vwapRelation: "-", buyerDominance: "-", macdHistogram: "-", newsSentiment: "-", bullishScore: 15, bearishScore: 0 },

  // 2. Exponential Moving Average crossovers
  { rsi: "-", emaRelation: "ABOVE", vwapRelation: "-", buyerDominance: "-", macdHistogram: "-", newsSentiment: "-", bullishScore: 30, bearishScore: 0 },
  { rsi: "-", emaRelation: "BELOW", vwapRelation: "-", buyerDominance: "-", macdHistogram: "-", newsSentiment: "-", bullishScore: 0, bearishScore: 30 },

  // 3. VWAP Support & Resistance relations
  { rsi: "-", emaRelation: "-", vwapRelation: "ABOVE", buyerDominance: "-", macdHistogram: "-", newsSentiment: "-", bullishScore: 10, bearishScore: 0 },
  { rsi: "-", emaRelation: "-", vwapRelation: "BELOW", buyerDominance: "-", macdHistogram: "-", newsSentiment: "-", bullishScore: 0, bearishScore: 10 },

  // 4. Order Book imbalances
  { rsi: "-", emaRelation: "-", vwapRelation: "-", buyerDominance: "> 55", macdHistogram: "-", newsSentiment: "-", bullishScore: 15, bearishScore: 0 },
  { rsi: "-", emaRelation: "-", vwapRelation: "-", buyerDominance: "< 45", macdHistogram: "-", newsSentiment: "-", bullishScore: 0, bearishScore: 15 },

  // 5. MACD momentum indicators
  { rsi: "-", emaRelation: "-", vwapRelation: "-", buyerDominance: "-", macdHistogram: "> 0", newsSentiment: "-", bullishScore: 20, bearishScore: 0 },
  { rsi: "-", emaRelation: "-", vwapRelation: "-", buyerDominance: "-", macdHistogram: "< 0", newsSentiment: "-", bullishScore: 0, bearishScore: 20 },

  // 6. Macro News Catalysts
  { rsi: "-", emaRelation: "-", vwapRelation: "-", buyerDominance: "-", macdHistogram: "-", newsSentiment: "BULLISH", bullishScore: 8, bearishScore: 0 },
  { rsi: "-", emaRelation: "-", vwapRelation: "-", buyerDominance: "-", macdHistogram: "-", newsSentiment: "BEARISH", bullishScore: 0, bearishScore: 8 }
];

/**
 * Standard DMN Engine decision runner executing FEEL conditions on the Decision Table
 */
export function executeDmnRules(inputs: DmnInputs): DmnOutput {
  let bullishScore = 0;
  let bearishScore = 0;
  let rulesMatchedCount = 0;

  // Prepare input relations
  const emaRelation = inputs.price > inputs.ema20 && inputs.ema20 > inputs.ema50 ? 'ABOVE' :
                     inputs.price < inputs.ema20 && inputs.ema20 < inputs.ema50 ? 'BELOW' : 'MIXED';
  const vwapRelation = inputs.price > inputs.vwap ? 'ABOVE' : 'BELOW';

  for (const rule of DMN_DECISION_TABLE) {
    const rsiMatch = evaluateFeel(inputs.rsi, rule.rsi);
    const emaMatch = evaluateFeel(emaRelation, rule.emaRelation);
    const vwapMatch = evaluateFeel(vwapRelation, rule.vwapRelation);
    const buyerMatch = evaluateFeel(inputs.buyerDominance, rule.buyerDominance);
    const macdMatch = evaluateFeel(inputs.macdHistogram, rule.macdHistogram);
    
    // Evaluate catalysts
    let newsMatch = false;
    if (rule.newsSentiment === 'BULLISH' && inputs.bullishNewsCount > 0) {
      newsMatch = true;
    } else if (rule.newsSentiment === 'BEARISH' && inputs.bearishNewsCount > 0) {
      newsMatch = true;
    } else if (rule.newsSentiment === '-') {
      newsMatch = true;
    }

    if (rsiMatch && emaMatch && vwapMatch && buyerMatch && macdMatch && newsMatch) {
      let bulDelta = rule.bullishScore;
      let bearDelta = rule.bearishScore;
      
      // Multiply score by quantity of matching sentiment articles
      if (rule.newsSentiment === 'BULLISH') bulDelta = rule.bullishScore * inputs.bullishNewsCount;
      if (rule.newsSentiment === 'BEARISH') bearDelta = rule.bearishScore * inputs.bearishNewsCount;

      bullishScore += bulDelta;
      bearishScore += bearDelta;
      rulesMatchedCount++;
    }
  }

  return {
    bullishScore,
    bearishScore,
    rulesMatchedCount
  };
}
