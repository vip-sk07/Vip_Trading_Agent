"""
Merge OHLCV data from folders 1, 2, 3 into a single master price CSV.
- Adjust prices for splits/dividends using folder 8 (corporate actions)
- Standardise column names: date, symbol, open, high, low, close, volume
- Output: outputs/master_price.parquet
"""
import pandas as pd, numpy as np, os, glob
from pathlib import Path

DATASET = "/home/karan/Data/Academics/AI models/Dataset"
OUTPUT  = "/home/karan/Data/Academics/AI models/Stock-Market/outputs"
os.makedirs(OUTPUT, exist_ok=True)

# ── Step 1: Load NSE 200 OHLC ──────────────────────────────────────────────
nse200_files = glob.glob(f"{DATASET}/3_nse200_ohlc_daily/**/*.csv", recursive=True)
dfs = []
for f in nse200_files:
    try:
        df = pd.read_csv(f, low_memory=False)
        # Standardise columns (handle different naming conventions)
        df.columns = df.columns.str.strip().str.lower().str.replace(" ","_")
        # Detect and rename key columns
        rename = {}
        for col in df.columns:
            if col in ["date","timestamp","trade_date"]: rename[col] = "date"
            if col in ["open","open_price"]:              rename[col] = "open"
            if col in ["high","high_price"]:              rename[col] = "high"
            if col in ["low","low_price"]:                rename[col] = "low"
            if col in ["close","close_price","ltp"]:      rename[col] = "close"
            if col in ["volume","vol","tottrdqty"]:       rename[col] = "volume"
            if col in ["symbol","ticker","scrip"]:        rename[col] = "symbol"
        df = df.rename(columns=rename)
        # Add symbol from filename if not present
        if "symbol" not in df.columns:
            df["symbol"] = Path(f).stem.upper().replace("_EQ","").replace("_MINUTE", "").replace("_PROCESSED", "")
        dfs.append(df)
    except Exception as e:
        print(f"Error {f}: {e}")

# ── Step 2: Load Nifty50 fundamentals ─────────────────────────────────────
fund_files = glob.glob(f"{DATASET}/2_nifty50_ohlcv_fundamentals/**/*.csv", recursive=True)
fund_dfs = []
for f in fund_files:
    try:
        df = pd.read_csv(f, low_memory=False)
        df.columns = df.columns.str.strip().str.lower().str.replace(" ","_")
        fund_dfs.append(df)
    except: pass

# ── Step 3: Merge & clean ──────────────────────────────────────────────────
master = pd.concat(dfs, ignore_index=True)

# Parse dates
master["date"] = pd.to_datetime(master["date"], errors="coerce", dayfirst=True)
master = master.dropna(subset=["date"])

# Keep only required columns that exist
keep = [c for c in ["date","symbol","open","high","low","close","volume"] if c in master.columns]
master = master[keep].copy()

# Remove duplicates
master = master.drop_duplicates(subset=["date","symbol"])

# Sort
master = master.sort_values(["symbol","date"]).reset_index(drop=True)

# Filter to 2012+
master = master[master["date"] >= "2012-01-01"]

# ── Step 4: Adjust for corporate actions ──────────────────────────────────
actions_path = f"{DATASET}/8_corporate_actions"
action_files = glob.glob(f"{actions_path}/*.csv")
for af in action_files:
    symbol = os.path.basename(af).replace("_actions.csv","")
    try:
        act = pd.read_csv(af, index_col=0, parse_dates=True)
        # Apply split adjustments
        splits = act[act["Stock Splits"] != 0] if "Stock Splits" in act.columns else pd.DataFrame()
        for date, row in splits.iterrows():
            ratio = row["Stock Splits"]
            mask = (master["symbol"] == symbol) & (master["date"] < str(date))
            master.loc[mask, ["open","high","low","close"]] /= ratio
            master.loc[mask, "volume"] *= ratio
    except: pass

# Save
master.to_parquet(f"{OUTPUT}/master_price.parquet", index=False)
print(f"✅ Master price dataset: {master.shape}")
print(f"   Symbols: {master['symbol'].nunique()}")
print(f"   Date range: {master['date'].min()} → {master['date'].max()}")
print(f"   Saved: {OUTPUT}/master_price.parquet")
