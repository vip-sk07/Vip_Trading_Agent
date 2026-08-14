"""
Compute all technical indicators using the `ta` library.
Input  : outputs/master_price.parquet
Output : outputs/features_technical.parquet
"""
import pandas as pd, numpy as np
import ta
from tqdm import tqdm

INPUT  = "/home/karan/Data/Academics/AI models/Stock-Market/outputs/master_price.parquet"
OUTPUT = "/home/karan/Data/Academics/AI models/Stock-Market/outputs/features_technical.parquet"

df = pd.read_parquet(INPUT)
df = df.sort_values(["symbol","date"])

results = []

for symbol, grp in tqdm(df.groupby("symbol"), desc="Computing indicators"):
    g = grp.copy().reset_index(drop=True)

    # ── Trend ──────────────────────────────────────────────────────────
    g["sma_20"]   = ta.trend.sma_indicator(g["close"], window=20)
    g["sma_50"]   = ta.trend.sma_indicator(g["close"], window=50)
    g["sma_200"]  = ta.trend.sma_indicator(g["close"], window=200)
    g["ema_12"]   = ta.trend.ema_indicator(g["close"], window=12)
    g["ema_26"]   = ta.trend.ema_indicator(g["close"], window=26)

    macd = ta.trend.MACD(g["close"])
    g["macd"]          = macd.macd()
    g["macd_signal"]   = macd.macd_signal()
    g["macd_hist"]     = macd.macd_diff()

    g["adx"]      = ta.trend.adx(g["high"], g["low"], g["close"])

    # ── Momentum ───────────────────────────────────────────────────────
    g["rsi_14"]   = ta.momentum.rsi(g["close"], window=14)
    g["rsi_7"]    = ta.momentum.rsi(g["close"], window=7)
    stoch = ta.momentum.StochasticOscillator(g["high"], g["low"], g["close"])
    g["stoch_k"]  = stoch.stoch()
    g["stoch_d"]  = stoch.stoch_signal()
    g["williams_r"] = ta.momentum.williams_r(g["high"], g["low"], g["close"])
    g["roc_10"]   = ta.momentum.roc(g["close"], window=10)

    # ── Volatility ─────────────────────────────────────────────────────
    bb = ta.volatility.BollingerBands(g["close"])
    g["bb_upper"] = bb.bollinger_hband()
    g["bb_middle"]= bb.bollinger_mavg()
    g["bb_lower"] = bb.bollinger_lband()
    g["bb_width"] = (g["bb_upper"] - g["bb_lower"]) / g["bb_middle"]
    g["bb_pct"]   = bb.bollinger_pband()
    g["atr_14"]   = ta.volatility.average_true_range(g["high"], g["low"], g["close"])

    # ── Volume ─────────────────────────────────────────────────────────
    if "volume" in g.columns:
        g["obv"]         = ta.volume.on_balance_volume(g["close"], g["volume"])
        g["vwap"]        = ta.volume.volume_weighted_average_price(
                               g["high"], g["low"], g["close"], g["volume"])
        g["vol_ma_20"]   = g["volume"].rolling(20).mean()
        g["vol_ratio"]   = g["volume"] / g["vol_ma_20"]

    # ── Price-derived features ─────────────────────────────────────────
    g["daily_return"]   = g["close"].pct_change()
    g["log_return"]     = np.log(g["close"] / g["close"].shift(1))
    g["hl_range"]       = (g["high"] - g["low"]) / g["close"]
    g["gap"]            = (g["open"] - g["close"].shift(1)) / g["close"].shift(1)

    # 7d / 30d rolling volatility
    g["vol_7d"]  = g["daily_return"].rolling(7).std()
    g["vol_30d"] = g["daily_return"].rolling(30).std()

    # Price vs moving averages (distance)
    g["dist_sma20"]  = (g["close"] - g["sma_20"])  / g["sma_20"]
    g["dist_sma50"]  = (g["close"] - g["sma_50"])  / g["sma_50"]
    g["dist_sma200"] = (g["close"] - g["sma_200"]) / g["sma_200"]

    # Golden/Death cross signal
    g["golden_cross"] = (g["sma_50"] > g["sma_200"]).astype(int)

    results.append(g)

features = pd.concat(results, ignore_index=True)
features.to_parquet(OUTPUT, index=False)
print(f"✅ Technical features: {features.shape}")
print(f"   New columns: {[c for c in features.columns if c not in ['date','symbol','open','high','low','close','volume']]}")
