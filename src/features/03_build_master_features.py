"""
Merge all features + create target variable.
Target: 1 if stock gains > 5% in next 30 trading days, else 0
Output: outputs/master_features.parquet
"""
import pandas as pd, numpy as np, os

OUTPUT = "/home/karan/Data/Academics/AI models/Stock-Market/outputs"
DATASET = "/home/karan/Data/Academics/AI models/Dataset"

# Load all feature sets
tech   = pd.read_parquet(f"{OUTPUT}/features_technical.parquet")
macro  = pd.read_parquet(f"{OUTPUT}/macro_master.parquet")
sent   = pd.read_parquet(f"{OUTPUT}/features_sentiment.parquet")
sector = pd.read_csv(f"{DATASET}/9_sector_labels/nifty50_sectors.csv")

# Ensure date types
tech["date"]  = pd.to_datetime(tech["date"])
macro["date"] = pd.to_datetime(macro["date"])
sent["date"]  = pd.to_datetime(sent["date"])

# ── Merge macro features ───────────────────────────────────────────────────
df = tech.merge(macro, on="date", how="left")

# ── Merge sentiment features ───────────────────────────────────────────────
df = df.merge(sent, on="date", how="left")

# ── Merge sector labels ────────────────────────────────────────────────────
df = df.merge(sector[["symbol","sector","industry"]], on="symbol", how="left")

# ── Sector one-hot encoding ────────────────────────────────────────────────
df = pd.get_dummies(df, columns=["sector"], prefix="sector", dummy_na=False)

# ── CREATE TARGET VARIABLES (multiple horizons) ────────────────────────────
df = df.sort_values(["symbol","date"])

for days, threshold in [(7,0.03),(30,0.05),(90,0.10)]:
    future_close = df.groupby("symbol")["close"].transform(
        lambda x: x.shift(-days)
    )
    pct_change = (future_close - df["close"]) / df["close"]

    # Binary classification target
    df[f"target_{days}d_binary"] = (pct_change > threshold).astype(int)

    # Regression target (actual return)
    df[f"target_{days}d_return"] = pct_change

    # Multi-class target: Strong Buy(2), Buy(1), Hold(0), Sell(-1)
    df[f"target_{days}d_class"] = pd.cut(
        pct_change,
        bins=[-np.inf, -0.05, -0.01, 0.01, 0.05, np.inf],
        labels=[-2, -1, 0, 1, 2]
    ).astype(float)

# ── Time-based train/val/test split flags ─────────────────────────────────
df["split"] = "train"
df.loc[df["date"] >= "2023-01-01", "split"] = "val"
df.loc[df["date"] >= "2025-01-01", "split"] = "test"

# Remove rows where target is NaN (last 90 days have no future data)
df = df.dropna(subset=["target_30d_binary"])

# ── Feature importance columns list ───────────────────────────────────────
feature_cols = [c for c in df.columns if c not in [
    "date","symbol","open","high","low","close","volume",
    "split","industry",
    "target_7d_binary","target_7d_return","target_7d_class",
    "target_30d_binary","target_30d_return","target_30d_class",
    "target_90d_binary","target_90d_return","target_90d_class",
]]

# Save
df.to_parquet(f"{OUTPUT}/master_features.parquet", index=False)

# Save feature column list
with open(f"{OUTPUT}/feature_columns.txt","w") as fp:
    fp.write("\n".join(feature_cols))

print(f"✅ Master feature set: {df.shape}")
print(f"   Feature columns  : {len(feature_cols)}")
print(f"   Train rows       : {(df['split']=='train').sum()}")
print(f"   Val rows         : {(df['split']=='val').sum()}")
print(f"   Test rows        : {(df['split']=='test').sum()}")
print(f"   Target balance   : {df['target_30d_binary'].value_counts().to_dict()}")
