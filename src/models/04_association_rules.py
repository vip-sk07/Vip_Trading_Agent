"""
Association Rule Mining on stock market patterns.
Goal: Find which technical indicator combinations lead to profitable trades.
Algorithm: Apriori via mlxtend
Output: outputs/association_rules.csv
"""
import pandas as pd, numpy as np, os
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder

OUTPUT  = "/home/karan/Data/Academics/AI models/Stock-Market/outputs"
os.makedirs(OUTPUT, exist_ok=True)

df = pd.read_parquet(f"{OUTPUT}/master_features.parquet")
df = df[df["split"] == "train"].dropna(subset=["target_30d_binary"])

# Sampling for speed
df = df.sample(min(10000, len(df)), random_state=42)

# ── Discretise continuous indicators into binary signals ───────────────────
signals = pd.DataFrame()
signals["RSI_oversold"]     = (df["rsi_14"] < 35).astype(bool)    # potential buy
signals["RSI_overbought"]   = (df["rsi_14"] > 65).astype(bool)    # potential sell
signals["MACD_bullish"]     = (df["macd"] > df["macd_signal"]).astype(bool)
signals["Above_SMA50"]      = (df["close"] > df["sma_50"]).astype(bool)
signals["Above_SMA200"]     = (df["close"] > df["sma_200"]).astype(bool)
signals["Golden_cross"]     = (df["golden_cross"] == 1).astype(bool)
signals["High_volume"]      = (df["vol_ratio"] > 1.5).astype(bool)
signals["Low_volatility"]   = (df["vol_30d"] < df["vol_30d"].quantile(0.33)).astype(bool)
signals["Positive_sentiment"] = (df.get("sentiment_mean", pd.Series(0, index=df.index)) > 0).astype(bool)
signals["ADX_trending"]     = (df["adx"] > 25).astype(bool)
signals["BB_squeeze"]       = (df["bb_width"] < df["bb_width"].quantile(0.25)).astype(bool)
signals["Profitable"]       = (df["target_30d_binary"] == 1).astype(bool)

# ── Run Apriori ────────────────────────────────────────────────────────────
print("Running Apriori algorithm...")
freq_items = apriori(signals, min_support=0.05, use_colnames=True, verbose=1)

rules = association_rules(freq_items, metric="lift", min_threshold=1.2)
rules = rules.sort_values("lift", ascending=False)

# Filter rules where consequent is "Profitable"
profit_rules = rules[rules["consequents"].apply(lambda x: "Profitable" in x)]

profit_rules = profit_rules[["antecedents","consequents","support","confidence","lift"]]
profit_rules["antecedents"] = profit_rules["antecedents"].apply(lambda x: str(list(x)))
profit_rules["consequents"] = profit_rules["consequents"].apply(lambda x: str(list(x)))

profit_rules.to_csv(f"{OUTPUT}/association_rules.csv", index=False)
print(f"✅ Found {len(profit_rules)} rules predicting profitable trades")
print("\nTop 10 Rules:")
print(profit_rules.head(10).to_string(index=False))
