"""
Merge macro data: USD/INR, crude oil, gold, RBI rates, FII/DII
Output: outputs/macro_master.parquet
"""
import pandas as pd, os, glob

DATASET = "/home/karan/Data/Academics/AI models/Dataset"
OUTPUT  = "/home/karan/Data/Academics/AI models/Stock-Market/outputs"

# Load macro files
macro_files = glob.glob(f"{DATASET}/5_macro_global_india/**/*.csv", recursive=True)
macro_dfs = []
for f in macro_files:
    try:
        df = pd.read_csv(f, low_memory=False)
        df.columns = df.columns.str.strip().str.lower().str.replace(" ","_")
        macro_dfs.append(df)
        print(f"  Loaded: {os.path.basename(f)} — {df.shape}")
    except Exception as e:
        print(f"  Error: {e}")

# Load RBI rates
rbi = pd.read_csv(f"{DATASET}/11_rbi_rates/rbi_repo_rate_daily.csv", parse_dates=["date"])

# Load FII/DII
fii = pd.read_csv(f"{DATASET}/10_fii_dii_flows/fii_dii_latest.csv")

# Create a unified macro frame indexed by date
# Adjust column names below after running Step 1.1 audit

daily_market = None
for df in macro_dfs:
    if "usd_inr_close" in df.columns:
        daily_market = df
        break

if daily_market is not None:
    daily_market["date"] = pd.to_datetime(daily_market["date"], errors="coerce")
    rbi["date"] = pd.to_datetime(rbi["date"], errors="coerce")
    macro_master = pd.merge(daily_market, rbi, on="date", how="left")
else:
    macro_master = rbi.copy()

macro_master.to_parquet(f"{OUTPUT}/macro_master.parquet", index=False)
print(f"✅ Macro master: {macro_master.shape}")
print(f"   Columns: {list(macro_master.columns)}")
