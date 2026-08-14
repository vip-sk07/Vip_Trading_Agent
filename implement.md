# Stock Market AI — Full Implementation Guide
### For Antigravity Agent | Author: Karan | OS: Parrot OS

---

## PROJECT PATHS (NEVER CHANGE THESE)

```
PROJECT_ROOT : /home/karan/Data/Academics/AI models/Stock-Market/
DATASET_ROOT : /home/karan/Data/Academics/AI models/Dataset/
LLAMA_CPP    : /home/karan/llama.cpp/
```

## DATASET INVENTORY

```
Dataset/
├── 1_sensex_nifty_historical/       OHLCV — Sensex & Nifty 27+ years
├── 2_nifty50_ohlcv_fundamentals/    Nifty50 price + PE/EPS/Revenue (1999–2026)
├── 3_nse200_ohlc_daily/             NSE 200 stocks daily OHLC (2000–2022)
├── 4_economic_times_news/           ET India headlines 2022–2025
├── 5_macro_global_india/            USD/INR, crude oil, gold, interest rates
├── 6_financial_phrasebank_sentiment/ Labeled financial sentiment phrases
├── 7_unified_sentiment/             Financial + social media sentiment
├── 8_corporate_actions/             Splits & dividends per Nifty50 ticker
├── 9_sector_labels/                 Sector/industry labels for 50 stocks
├── 10_fii_dii_flows/                FII/DII latest flow data
├── 11_rbi_rates/                    RBI repo rate 2012–2026 (daily)
└── Stock-datasets/                  ← UNKNOWN — MUST ANALYSE FIRST (see Phase 0)
```

---

## PHASE 0 — ENVIRONMENT SETUP & UNKNOWN DATASET ANALYSIS
### Priority: FIRST — Do this before anything else

### Step 0.1 — Create project folder structure
```bash
mkdir -p "/home/karan/Data/Academics/AI models/Stock-Market"
cd "/home/karan/Data/Academics/AI models/Stock-Market"

mkdir -p src/{data,features,models,evaluation,dashboard,utils}
mkdir -p notebooks
mkdir -p outputs/{models,reports,plots,predictions}
mkdir -p logs
touch README.md
```

### Step 0.2 — Install ALL required Python libraries
```bash
pip install pandas numpy scikit-learn xgboost lightgbm \
    ta yfinance matplotlib seaborn plotly dash \
    transformers torch sentence-transformers \
    mlflow shap optuna imbalanced-learn \
    mlxtend pyarrow fastapi uvicorn \
    joblib tqdm colorlog \
    --break-system-packages
```

### Step 0.3 — ANALYSE the Unknown Stock-datasets folder
**This is critical — it may contain GB of valuable data.**

Create and run this script: `src/data/analyse_stock_datasets.py`

```python
"""
Analyse the unknown Stock-datasets folder.
Produces: outputs/reports/stock_datasets_report.txt
"""
import os, pandas as pd
from pathlib import Path

FOLDER = "/home/karan/Data/Academics/AI models/Dataset/Stock-datasets"
REPORT = "/home/karan/Data/Academics/AI models/Stock-Market/outputs/reports/stock_datasets_report.txt"

os.makedirs(os.path.dirname(REPORT), exist_ok=True)
lines = []

def log(msg=""):
    print(msg)
    lines.append(msg)

log("=" * 70)
log("  STOCK-DATASETS FOLDER ANALYSIS")
log("=" * 70)

all_files = list(Path(FOLDER).rglob("*.csv")) + \
            list(Path(FOLDER).rglob("*.xlsx")) + \
            list(Path(FOLDER).rglob("*.parquet"))

log(f"\nTotal files found: {len(all_files)}")
total_mb = sum(f.stat().st_size for f in all_files) / (1024*1024)
log(f"Total size: {total_mb:.1f} MB")

for f in all_files[:50]:  # Inspect first 50 files
    size_mb = f.stat().st_size / (1024*1024)
    log(f"\n{'─'*60}")
    log(f"FILE : {f.name}  ({size_mb:.2f} MB)")
    log(f"PATH : {f}")
    try:
        if f.suffix == ".csv":
            df = pd.read_csv(f, nrows=3)
        elif f.suffix == ".parquet":
            df = pd.read_parquet(f).head(3)
        else:
            df = pd.read_excel(f, nrows=3)
        log(f"SHAPE: {df.shape}")
        log(f"COLS : {list(df.columns)}")
        log(f"DTYPES:\n{df.dtypes.to_string()}")
        log(f"SAMPLE:\n{df.head(2).to_string()}")
    except Exception as e:
        log(f"ERROR reading file: {e}")

# VERDICT SECTION
log("\n" + "=" * 70)
log("VERDICT — Is Stock-datasets useful?")
log("=" * 70)
log("""
Check for these columns to determine usefulness:
- USEFUL if contains: Date, Open, High, Low, Close, Volume, Symbol/Ticker
- USEFUL if contains: PE_ratio, EPS, Revenue, Debt (fundamentals)
- USEFUL if contains: Sentiment, headline, news_date
- SKIP if contains: only index-level data already in folder 1
- SKIP if duplicate of folders 1-3 (same date ranges, same stocks)

ACTION: If useful → copy relevant files to appropriate Dataset subfolders.
        If duplicate → skip and note in README.
""")

with open(REPORT, "w") as fp:
    fp.write("\n".join(lines))
log(f"\nReport saved to: {REPORT}")
```

**Based on the report output:**
- If `Stock-datasets` contains individual NSE stock CSVs → use as supplement to folder 3
- If it contains fundamentals → merge with folder 2
- If duplicate → ignore it

---

## PHASE 1 — DATA PREPROCESSING
### Timeline: Week 1–2 | Scripts in `src/data/`

### Step 1.1 — Inspect & audit all datasets

Create `src/data/01_inspect_datasets.py`:

```python
"""
Inspect all datasets — generate audit report showing:
date ranges, columns, missing %, data types, row counts
"""
import pandas as pd, os, glob
from pathlib import Path

DATASET_ROOT = "/home/karan/Data/Academics/AI models/Dataset"
REPORT_PATH  = "/home/karan/Data/Academics/AI models/Stock-Market/outputs/reports/dataset_audit.csv"

os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
results = []

dataset_map = {
    "sensex_nifty"    : "1_sensex_nifty_historical",
    "nifty50_fund"    : "2_nifty50_ohlcv_fundamentals",
    "nse200"          : "3_nse200_ohlc_daily",
    "et_news"         : "4_economic_times_news",
    "macro"           : "5_macro_global_india",
    "phrasebank"      : "6_financial_phrasebank_sentiment",
    "unified_sent"    : "7_unified_sentiment",
    "corp_actions"    : "8_corporate_actions",
    "sector_labels"   : "9_sector_labels",
    "fii_dii"         : "10_fii_dii_flows",
    "rbi_rates"       : "11_rbi_rates",
}

for name, folder in dataset_map.items():
    path = os.path.join(DATASET_ROOT, folder)
    csv_files = glob.glob(f"{path}/**/*.csv", recursive=True)
    for csv in csv_files[:3]:  # Sample first 3 CSVs per folder
        try:
            df = pd.read_csv(csv, low_memory=False)
            date_col = next((c for c in df.columns
                             if any(x in c.lower() for x in ["date","time","dt"])), None)
            date_min = str(df[date_col].min()) if date_col else "N/A"
            date_max = str(df[date_col].max()) if date_col else "N/A"
            results.append({
                "dataset"     : name,
                "file"        : os.path.basename(csv),
                "rows"        : len(df),
                "cols"        : len(df.columns),
                "columns"     : str(list(df.columns)),
                "missing_pct" : round(df.isnull().mean().mean() * 100, 2),
                "date_min"    : date_min,
                "date_max"    : date_max,
                "size_mb"     : round(os.path.getsize(csv) / (1024*1024), 2),
            })
        except Exception as e:
            results.append({"dataset": name, "file": csv, "error": str(e)})

audit_df = pd.DataFrame(results)
audit_df.to_csv(REPORT_PATH, index=False)
print(audit_df.to_string())
print(f"\nAudit saved: {REPORT_PATH}")
```

### Step 1.2 — Build Master Price Dataset

Create `src/data/02_build_price_master.py`:

```python
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
            df["symbol"] = Path(f).stem.upper().replace("_EQ","")
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
```

### Step 1.3 — Build Macro & RBI Dataset

Create `src/data/03_build_macro_master.py`:

```python
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
# NOTE: Column mapping will depend on actual file contents from audit report
# Adjust column names below after running Step 1.1 audit

macro_master = rbi.copy()
macro_master.to_parquet(f"{OUTPUT}/macro_master.parquet", index=False)
print(f"✅ Macro master: {macro_master.shape}")
print(f"   Columns: {list(macro_master.columns)}")
```

---

## PHASE 2 — FEATURE ENGINEERING
### Timeline: Week 2–3 | Scripts in `src/features/`

### Step 2.1 — Technical Indicators

Create `src/features/01_technical_indicators.py`:

```python
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
```

### Step 2.2 — Sentiment Features

Create `src/features/02_sentiment_features.py`:

```python
"""
Generate daily sentiment scores from news headlines.
Uses FinBERT (finance-specific BERT) for accurate financial sentiment.
Input  : 4_economic_times_news + 6_financial_phrasebank + 7_unified_sentiment
Output : outputs/features_sentiment.parquet
"""
import pandas as pd, os, glob
from transformers import pipeline
from tqdm import tqdm

DATASET = "/home/karan/Data/Academics/AI models/Dataset"
OUTPUT  = "/home/karan/Data/Academics/AI models/Stock-Market/outputs"

print("Loading FinBERT model...")
# ProsusAI FinBERT — purpose-built for financial text
sentiment_pipe = pipeline(
    "text-classification",
    model="ProsusAI/finbert",
    tokenizer="ProsusAI/finbert",
    max_length=512,
    truncation=True,
    device=-1  # CPU; change to 0 for GPU
)

def batch_sentiment(texts, batch_size=32):
    results = []
    for i in tqdm(range(0, len(texts), batch_size), desc="Sentiment"):
        batch = texts[i:i+batch_size]
        preds = sentiment_pipe(batch)
        for p in preds:
            score = p["score"] if p["label"] == "positive" else \
                   -p["score"] if p["label"] == "negative" else 0
            results.append({"label": p["label"], "score": score})
    return results

# ── Load ET News ───────────────────────────────────────────────────────────
news_files = glob.glob(f"{DATASET}/4_economic_times_news/**/*.csv", recursive=True)
news_dfs = []
for f in news_files:
    df = pd.read_csv(f)
    df.columns = df.columns.str.lower().str.strip()
    news_dfs.append(df)

news = pd.concat(news_dfs, ignore_index=True)

# Find the headline and date columns (adjust names from audit)
headline_col = next((c for c in news.columns if "headline" in c or "title" in c or "text" in c), news.columns[0])
date_col     = next((c for c in news.columns if "date" in c or "time" in c), None)

news["date"] = pd.to_datetime(news[date_col], errors="coerce", dayfirst=True)
news = news.dropna(subset=["date"])
news["text"] = news[headline_col].fillna("").astype(str)

# Score each headline
scores = batch_sentiment(news["text"].tolist())
news["sentiment_label"] = [s["label"] for s in scores]
news["sentiment_score"] = [s["score"] for s in scores]

# Aggregate to daily level
daily_sentiment = news.groupby(news["date"].dt.date).agg(
    sentiment_mean   = ("sentiment_score", "mean"),
    sentiment_std    = ("sentiment_score", "std"),
    positive_count   = ("sentiment_label", lambda x: (x=="positive").sum()),
    negative_count   = ("sentiment_label", lambda x: (x=="negative").sum()),
    neutral_count    = ("sentiment_label", lambda x: (x=="neutral").sum()),
    total_news       = ("sentiment_score", "count"),
).reset_index()

daily_sentiment.columns.name = None
daily_sentiment["date"] = pd.to_datetime(daily_sentiment["date"])
daily_sentiment["sentiment_ratio"] = (
    daily_sentiment["positive_count"] - daily_sentiment["negative_count"]
) / daily_sentiment["total_news"]

daily_sentiment.to_parquet(f"{OUTPUT}/features_sentiment.parquet", index=False)
print(f"✅ Daily sentiment: {daily_sentiment.shape}")
```

### Step 2.3 — Create Target Variable & Master Feature Set

Create `src/features/03_build_master_features.py`:

```python
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
```

---

## PHASE 3 — ML ANALYSIS (ALL TECHNIQUES)
### Timeline: Week 3–5 | Scripts in `src/models/`

### Step 3.1 — Classification Models

Create `src/models/01_classification.py`:

```python
"""
Train multiple classifiers for Buy/Hold/Avoid prediction.
Models: XGBoost, LightGBM, Random Forest, SVM, Logistic Regression
Metrics: Accuracy, Precision, Recall, F1, ROC-AUC
Output: outputs/models/classification_results.csv
"""
import pandas as pd, numpy as np, os, joblib, mlflow
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.preprocessing import RobustScaler
from sklearn.metrics import (classification_report, roc_auc_score,
                              confusion_matrix, f1_score)
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from imblearn.over_sampling import SMOTE

OUTPUT = "/home/karan/Data/Academics/AI models/Stock-Market/outputs"
os.makedirs(f"{OUTPUT}/models", exist_ok=True)

df = pd.read_parquet(f"{OUTPUT}/master_features.parquet")

with open(f"{OUTPUT}/feature_columns.txt") as fp:
    FEATURES = [f.strip() for f in fp.readlines()]

TARGET = "target_30d_binary"

# Split (time-based — never random)
train = df[df["split"] == "train"]
val   = df[df["split"] == "val"]
test  = df[df["split"] == "test"]

X_train = train[FEATURES].fillna(0)
y_train = train[TARGET]
X_val   = val[FEATURES].fillna(0)
y_val   = val[TARGET]
X_test  = test[FEATURES].fillna(0)
y_test  = test[TARGET]

# Handle class imbalance
smote = SMOTE(random_state=42)
X_train_bal, y_train_bal = smote.fit_resample(X_train, y_train)

scaler = RobustScaler()
X_train_sc = scaler.fit_transform(X_train_bal)
X_val_sc   = scaler.transform(X_val)
X_test_sc  = scaler.transform(X_test)

MODELS = {
    "XGBoost": XGBClassifier(
        n_estimators=500, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        use_label_encoder=False, eval_metric="logloss",
        random_state=42, n_jobs=-1
    ),
    "LightGBM": LGBMClassifier(
        n_estimators=500, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        random_state=42, n_jobs=-1, verbose=-1
    ),
    "RandomForest": RandomForestClassifier(
        n_estimators=200, max_depth=10, random_state=42, n_jobs=-1
    ),
    "LogisticRegression": LogisticRegression(
        max_iter=1000, random_state=42, C=0.1
    ),
    "SVM": SVC(probability=True, kernel="rbf", C=1.0, random_state=42),
}

results = []
mlflow.set_experiment("StockMarket_Classification")

for name, model in MODELS.items():
    print(f"\n{'='*50}")
    print(f"  Training: {name}")
    X_tr = X_train_sc if name in ["LogisticRegression","SVM"] else X_train_bal
    y_tr = y_train_bal

    with mlflow.start_run(run_name=name):
        model.fit(X_tr, y_tr)
        X_v = X_val_sc if name in ["LogisticRegression","SVM"] else X_val

        preds  = model.predict(X_v)
        probas = model.predict_proba(X_v)[:,1]

        f1  = f1_score(y_val, preds, average="weighted")
        auc = roc_auc_score(y_val, probas)

        print(f"  F1 (val): {f1:.4f} | AUC: {auc:.4f}")
        print(classification_report(y_val, preds))

        mlflow.log_metric("f1_val", f1)
        mlflow.log_metric("auc_val", auc)

        # Save model
        joblib.dump(model, f"{OUTPUT}/models/{name.lower()}_classifier.pkl")
        results.append({"model": name, "f1_val": f1, "auc_val": auc})

results_df = pd.DataFrame(results).sort_values("auc_val", ascending=False)
results_df.to_csv(f"{OUTPUT}/models/classification_results.csv", index=False)
print("\n🏆 Classification Leaderboard:")
print(results_df.to_string(index=False))

# Save scaler
joblib.dump(scaler, f"{OUTPUT}/models/scaler.pkl")
```

### Step 3.2 — Clustering Analysis

Create `src/models/02_clustering.py`:

```python
"""
Cluster stocks by behaviour patterns.
Algorithms: K-Means, DBSCAN, Hierarchical, Gaussian Mixture Model
Use case: Group stocks with similar price patterns/risk profiles
Output: outputs/stock_clusters.csv + cluster plots
"""
import pandas as pd, numpy as np, os, joblib
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score

OUTPUT = "/home/karan/Data/Academics/AI models/Stock-Market/outputs"
os.makedirs(f"{OUTPUT}/plots", exist_ok=True)

df = pd.read_parquet(f"{OUTPUT}/master_features.parquet")

# Build per-stock feature summary (mean values across full history)
CLUSTER_FEATURES = [
    "rsi_14","macd","bb_width","atr_14","vol_30d",
    "daily_return","dist_sma50","adx","vol_ratio","roc_10"
]

avail = [c for c in CLUSTER_FEATURES if c in df.columns]
stock_profile = df.groupby("symbol")[avail].mean().dropna()

scaler = StandardScaler()
X = scaler.fit_transform(stock_profile)

# ── PCA for visualisation ──────────────────────────────────────────────────
pca = PCA(n_components=2)
X_2d = pca.fit_transform(X)

# ── K-Means ────────────────────────────────────────────────────────────────
# Find optimal k using elbow + silhouette
inertia, sil_scores = [], []
for k in range(2, 12):
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    km.fit(X)
    inertia.append(km.inertia_)
    sil_scores.append(silhouette_score(X, km.labels_))

optimal_k = sil_scores.index(max(sil_scores)) + 2
print(f"Optimal K (silhouette): {optimal_k}")

km_final = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
km_labels = km_final.fit_predict(X)

# ── DBSCAN ────────────────────────────────────────────────────────────────
db = DBSCAN(eps=0.8, min_samples=3)
db_labels = db.fit_predict(X)

# ── Hierarchical ──────────────────────────────────────────────────────────
hier = AgglomerativeClustering(n_clusters=optimal_k)
hier_labels = hier.fit_predict(X)

# ── GMM ───────────────────────────────────────────────────────────────────
gmm = GaussianMixture(n_components=optimal_k, random_state=42)
gmm_labels = gmm.fit_predict(X)

# ── Save cluster assignments ───────────────────────────────────────────────
clusters = pd.DataFrame({
    "symbol"         : stock_profile.index,
    "kmeans_cluster" : km_labels,
    "dbscan_cluster" : db_labels,
    "hier_cluster"   : hier_labels,
    "gmm_cluster"    : gmm_labels,
    "pca_x"          : X_2d[:,0],
    "pca_y"          : X_2d[:,1],
})
clusters = clusters.merge(
    pd.read_csv(f"/home/karan/Data/Academics/AI models/Dataset/9_sector_labels/nifty50_sectors.csv")[["symbol","sector"]],
    on="symbol", how="left"
)
clusters.to_csv(f"{OUTPUT}/stock_clusters.csv", index=False)

# ── Cluster characterisation ───────────────────────────────────────────────
cluster_profile = stock_profile.copy()
cluster_profile["cluster"] = km_labels
char = cluster_profile.groupby("cluster").mean()
char.to_csv(f"{OUTPUT}/cluster_characteristics.csv")

print("✅ Cluster characteristics:")
print(char.to_string())

# ── Plot ───────────────────────────────────────────────────────────────────
plt.figure(figsize=(12,6))
plt.subplot(1,2,1)
scatter = plt.scatter(X_2d[:,0], X_2d[:,1], c=km_labels, cmap="tab10", s=60, alpha=0.8)
for i, sym in enumerate(stock_profile.index):
    plt.annotate(sym, (X_2d[i,0], X_2d[i,1]), fontsize=6)
plt.title(f"K-Means Clusters (k={optimal_k})")
plt.xlabel("PCA Component 1")
plt.ylabel("PCA Component 2")

plt.subplot(1,2,2)
elbow_k = range(2, 12)
plt.plot(elbow_k, sil_scores, "bo-")
plt.axvline(x=optimal_k, color="red", linestyle="--")
plt.title("Silhouette Score vs K")
plt.xlabel("Number of Clusters")
plt.ylabel("Silhouette Score")

plt.tight_layout()
plt.savefig(f"{OUTPUT}/plots/clustering.png", dpi=150)
plt.close()
print(f"✅ Cluster plot saved: {OUTPUT}/plots/clustering.png")
```

### Step 3.3 — Regression Models

Create `src/models/03_regression.py`:

```python
"""
Predict actual return percentage (regression task).
Models: XGBoost Regressor, LightGBM, Ridge, ElasticNet, SVR
Metrics: RMSE, MAE, R², Directional Accuracy
Output: outputs/models/regression_results.csv
"""
import pandas as pd, numpy as np, os, joblib
from sklearn.linear_model import Ridge, ElasticNet
from sklearn.svm import SVR
from sklearn.preprocessing import RobustScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

OUTPUT = "/home/karan/Data/Academics/AI models/Stock-Market/outputs"

df = pd.read_parquet(f"{OUTPUT}/master_features.parquet")
with open(f"{OUTPUT}/feature_columns.txt") as fp:
    FEATURES = [f.strip() for f in fp.readlines()]

TARGET = "target_30d_return"

train = df[df["split"] == "train"].dropna(subset=[TARGET])
val   = df[df["split"] == "val"].dropna(subset=[TARGET])
test  = df[df["split"] == "test"].dropna(subset=[TARGET])

X_train = train[FEATURES].fillna(0)
y_train = train[TARGET].clip(-0.5, 0.5)  # Cap extreme outliers
X_val   = val[FEATURES].fillna(0)
y_val   = val[TARGET].clip(-0.5, 0.5)
X_test  = test[FEATURES].fillna(0)
y_test  = test[TARGET].clip(-0.5, 0.5)

scaler = RobustScaler()
X_train_sc = scaler.fit_transform(X_train)
X_val_sc   = scaler.transform(X_val)

REGRESSORS = {
    "XGBoost_Reg": XGBRegressor(
        n_estimators=500, max_depth=5, learning_rate=0.03,
        subsample=0.8, colsample_bytree=0.8,
        random_state=42, n_jobs=-1
    ),
    "LightGBM_Reg": LGBMRegressor(
        n_estimators=500, max_depth=5, learning_rate=0.03,
        random_state=42, n_jobs=-1, verbose=-1
    ),
    "Ridge": Ridge(alpha=1.0),
    "ElasticNet": ElasticNet(alpha=0.1, l1_ratio=0.5, max_iter=2000),
}

results = []
for name, model in REGRESSORS.items():
    print(f"\nTraining: {name}")
    X_tr = X_train_sc if name in ["Ridge","ElasticNet","SVR"] else X_train
    X_v  = X_val_sc   if name in ["Ridge","ElasticNet","SVR"] else X_val

    model.fit(X_tr, y_train)
    preds = model.predict(X_v)

    rmse  = np.sqrt(mean_squared_error(y_val, preds))
    mae   = mean_absolute_error(y_val, preds)
    r2    = r2_score(y_val, preds)
    # Directional accuracy — did we predict the sign correctly?
    dir_acc = (np.sign(preds) == np.sign(y_val)).mean()

    print(f"  RMSE={rmse:.4f} | MAE={mae:.4f} | R²={r2:.4f} | DirAcc={dir_acc:.4f}")
    joblib.dump(model, f"{OUTPUT}/models/{name.lower()}_regressor.pkl")
    results.append({"model":name,"rmse":rmse,"mae":mae,"r2":r2,"dir_acc":dir_acc})

pd.DataFrame(results).sort_values("rmse").to_csv(
    f"{OUTPUT}/models/regression_results.csv", index=False)
print("✅ Regression models saved.")
```

### Step 3.4 — Association Rule Mining

Create `src/models/04_association_rules.py`:

```python
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
```

### Step 3.5 — SHAP Feature Importance & Model Selection

Create `src/models/05_model_explainability.py`:

```python
"""
SHAP analysis — explain which features drive predictions.
Walk-forward validation for robust backtesting.
Output: outputs/plots/shap_*.png + outputs/walk_forward_results.csv
"""
import pandas as pd, numpy as np, os, joblib, shap
import matplotlib.pyplot as plt
from xgboost import XGBClassifier
from sklearn.metrics import roc_auc_score

OUTPUT = "/home/karan/Data/Academics/AI models/Stock-Market/outputs"
os.makedirs(f"{OUTPUT}/plots", exist_ok=True)

df = pd.read_parquet(f"{OUTPUT}/master_features.parquet")
with open(f"{OUTPUT}/feature_columns.txt") as fp:
    FEATURES = [f.strip() for f in fp.readlines()]

# ── Walk-Forward Validation ────────────────────────────────────────────────
print("Running Walk-Forward Validation...")
df["year"] = pd.to_datetime(df["date"]).dt.year
wf_results = []

for test_year in range(2020, 2026):
    train_df = df[df["year"] < test_year].dropna(subset=["target_30d_binary"])
    test_df  = df[df["year"] == test_year].dropna(subset=["target_30d_binary"])
    if len(test_df) < 100: continue

    X_tr = train_df[FEATURES].fillna(0)
    y_tr = train_df["target_30d_binary"]
    X_te = test_df[FEATURES].fillna(0)
    y_te = test_df["target_30d_binary"]

    model = XGBClassifier(n_estimators=300, max_depth=5, learning_rate=0.05,
                          random_state=42, n_jobs=-1, eval_metric="logloss",
                          use_label_encoder=False)
    model.fit(X_tr, y_tr)
    proba = model.predict_proba(X_te)[:,1]
    auc   = roc_auc_score(y_te, proba)
    wf_results.append({"test_year": test_year, "auc": round(auc,4), "n_test": len(y_te)})
    print(f"  Year {test_year}: AUC = {auc:.4f} (n={len(y_te)})")

pd.DataFrame(wf_results).to_csv(f"{OUTPUT}/walk_forward_results.csv", index=False)

# ── SHAP Explainability on best model ─────────────────────────────────────
print("\nComputing SHAP values...")
best_model = joblib.load(f"{OUTPUT}/models/xgboost_classifier.pkl")
train_sample = df[df["split"]=="train"][FEATURES].fillna(0).sample(1000, random_state=42)

explainer = shap.TreeExplainer(best_model)
shap_values = explainer.shap_values(train_sample)

# Summary plot
plt.figure(figsize=(12,8))
shap.summary_plot(shap_values, train_sample, plot_type="bar", show=False, max_display=20)
plt.tight_layout()
plt.savefig(f"{OUTPUT}/plots/shap_feature_importance.png", dpi=150, bbox_inches="tight")
plt.close()

# Beeswarm plot
plt.figure(figsize=(12,8))
shap.summary_plot(shap_values, train_sample, show=False, max_display=20)
plt.tight_layout()
plt.savefig(f"{OUTPUT}/plots/shap_beeswarm.png", dpi=150, bbox_inches="tight")
plt.close()
print(f"✅ SHAP plots saved: {OUTPUT}/plots/")
```

---

## PHASE 4 — LLAMA.CPP INTEGRATION (Domain Expert AI)
### Timeline: Week 5–6

### Step 4.1 — Download a Finance-Tuned Model

```bash
cd /home/karan/llama.cpp

# Option A: FinLlama (finance tuned) — recommended
wget https://huggingface.co/TheBloke/finance-LLM-GGUF/resolve/main/finance-llm.Q4_K_M.gguf \
     -O models/finance-llm.Q4_K_M.gguf

# Option B: Llama 3.1 8B (general, strong reasoning)
wget https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf \
     -O models/llama3.1-8b-instruct.Q4_K_M.gguf
```

### Step 4.2 — Build the Domain Expert AI Backend

Create `src/models/06_domain_expert_ai.py`:

```python
"""
Stock Market Domain Specialist AI using llama.cpp.
Combines ML model predictions + LLM reasoning.
Provides: Analysis, recommendation rationale, risk explanation.
"""
import subprocess, json, os, joblib
import pandas as pd, numpy as np

LLAMA_BIN   = "/home/karan/llama.cpp/llama-cli"
MODEL_PATH  = "/home/karan/llama.cpp/models/finance-llm.Q4_K_M.gguf"
OUTPUT      = "/home/karan/Data/Academics/AI models/Stock-Market/outputs"

# Load trained models
xgb_model   = joblib.load(f"{OUTPUT}/models/xgboost_classifier.pkl")
lgb_model   = joblib.load(f"{OUTPUT}/models/lightgbm_classifier.pkl")
scaler      = joblib.load(f"{OUTPUT}/models/scaler.pkl")
clusters    = pd.read_csv(f"{OUTPUT}/stock_clusters.csv")
rules       = pd.read_csv(f"{OUTPUT}/association_rules.csv")

with open(f"{OUTPUT}/feature_columns.txt") as fp:
    FEATURES = [f.strip() for f in fp.readlines()]


def get_ml_signals(stock_data: dict) -> dict:
    """Get prediction signals from ML models."""
    X = pd.DataFrame([stock_data])[FEATURES].fillna(0)

    xgb_prob = xgb_model.predict_proba(X)[0][1]
    lgb_prob = lgb_model.predict_proba(X)[0][1]
    ensemble_prob = (xgb_prob * 0.6 + lgb_prob * 0.4)

    cluster_info = clusters[clusters["symbol"] == stock_data.get("symbol","")]
    cluster_id   = cluster_info["kmeans_cluster"].values[0] if len(cluster_info) > 0 else -1

    if ensemble_prob >= 0.65:
        recommendation = "STRONG BUY"
    elif ensemble_prob >= 0.55:
        recommendation = "BUY"
    elif ensemble_prob >= 0.45:
        recommendation = "HOLD"
    elif ensemble_prob >= 0.35:
        recommendation = "AVOID"
    else:
        recommendation = "STRONG AVOID"

    return {
        "symbol"         : stock_data.get("symbol","UNKNOWN"),
        "recommendation" : recommendation,
        "confidence_pct" : round(ensemble_prob * 100, 1),
        "xgb_prob"       : round(xgb_prob, 3),
        "lgb_prob"       : round(lgb_prob, 3),
        "cluster"        : int(cluster_id),
        "rsi"            : stock_data.get("rsi_14", 0),
        "macd_signal"    : "BULLISH" if stock_data.get("macd",0) > stock_data.get("macd_signal",0) else "BEARISH",
        "above_sma200"   : stock_data.get("close",0) > stock_data.get("sma_200",0),
    }


def ask_domain_expert(question: str, context: dict = None) -> str:
    """
    Ask the LLM for domain expert analysis.
    context: dict with ML signals + current market data
    """
    system_prompt = """You are a senior stock market analyst specializing in Indian markets (NSE/BSE).
You have 20 years of experience analyzing Nifty50 stocks.
You understand technical analysis, fundamental analysis, macroeconomic factors, and quantitative models.
Always provide structured, actionable analysis. Mention risk factors.
Reference Indian market context: RBI policy, FII/DII flows, sector rotation.
Keep responses concise and professional."""

    if context:
        context_str = json.dumps(context, indent=2)
        prompt = f"""
[MARKET CONTEXT]
{context_str}

[ANALYST QUESTION]
{question}

[ANALYSIS]"""
    else:
        prompt = question

    full_prompt = f"<s>[INST] <<SYS>>\n{system_prompt}\n<</SYS>>\n\n{prompt} [/INST]"

    cmd = [
        LLAMA_BIN,
        "-m", MODEL_PATH,
        "-p", full_prompt,
        "-n", "512",          # max tokens
        "--temp", "0.3",      # low temperature for factual analysis
        "--top-p", "0.9",
        "--ctx-size", "4096",
        "--threads", "4",
        "--silent-prompt",
        "-ngl", "0",          # CPU only; set to 35 for GPU layers
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        return "Analysis timeout — reduce model size or increase threads."
    except Exception as e:
        return f"Error: {e}"


def full_stock_analysis(symbol: str, stock_data: dict) -> dict:
    """Complete analysis pipeline for one stock."""
    stock_data["symbol"] = symbol
    signals = get_ml_signals(stock_data)

    question = f"""
Analyse {symbol} stock based on the following signals:
- ML Recommendation: {signals['recommendation']} (Confidence: {signals['confidence_pct']}%)
- RSI(14): {signals['rsi']:.1f}
- MACD: {signals['macd_signal']}
- Price vs 200-day MA: {'ABOVE' if signals['above_sma200'] else 'BELOW'}
- Stock Cluster: {signals['cluster']} (behavioural group)

Provide:
1. Recommendation rationale (2-3 sentences)
2. Key risks to watch
3. Suggested time horizon
4. Stop-loss suggestion based on ATR
"""

    llm_analysis = ask_domain_expert(question, signals)

    return {
        "symbol"      : symbol,
        "signals"     : signals,
        "llm_analysis": llm_analysis,
    }


# ── Example usage ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Test with sample data (replace with live fetched data)
    sample = {
        "rsi_14": 42.5, "macd": 12.3, "macd_signal": 10.1,
        "close": 2850.0, "sma_50": 2780.0, "sma_200": 2650.0,
        "bb_width": 0.08, "atr_14": 45.2, "vol_ratio": 1.2,
        "adx": 28.5, "sentiment_mean": 0.15, "dist_sma200": 0.075,
    }
    result = full_stock_analysis("RELIANCE", sample)
    print(json.dumps(result["signals"], indent=2))
    print("\n📊 LLM Analysis:")
    print(result["llm_analysis"])
```

---

## PHASE 5 — DASHBOARD (Visual AI Analysis)
### Timeline: Week 6–7

### Step 5.1 — Build Interactive Dashboard

Create `src/dashboard/app.py`:

```python
"""
Stock Market AI Dashboard — Plotly Dash
Features:
  - Real-time stock price charts with indicators
  - ML model recommendations with confidence scores
  - Cluster visualisation
  - Sentiment trend chart
  - Association rules display
  - Domain expert AI chat interface
  - Backtesting performance charts
Run: python3 src/dashboard/app.py
Access: http://localhost:8050
"""
import dash
from dash import dcc, html, Input, Output, State, dash_table
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd, numpy as np, os, joblib, json
import yfinance as yf
from datetime import datetime, timedelta

# Import domain expert
import sys
sys.path.append("/home/karan/Data/Academics/AI models/Stock-Market/src/models")
from domain_expert_ai import full_stock_analysis, get_ml_signals

OUTPUT = "/home/karan/Data/Academics/AI models/Stock-Market/outputs"

# ── Load data ──────────────────────────────────────────────────────────────
clusters   = pd.read_csv(f"{OUTPUT}/stock_clusters.csv")
rules      = pd.read_csv(f"{OUTPUT}/association_rules.csv")
wf_results = pd.read_csv(f"{OUTPUT}/walk_forward_results.csv")
sector_df  = pd.read_csv("/home/karan/Data/Academics/AI models/Dataset/9_sector_labels/nifty50_sectors.csv")

NIFTY50_SYMBOLS = sector_df["symbol"].tolist()
TICKERS = [f"{s}.NS" for s in NIFTY50_SYMBOLS]

# ── App Layout ─────────────────────────────────────────────────────────────
app = dash.Dash(__name__, title="Stock Market AI")

app.layout = html.Div([

    # ── Header ──────────────────────────────────────────────────────────
    html.Div([
        html.H1("📈 Stock Market AI Dashboard", style={"color":"#00d4ff","margin":"0"}),
        html.P("Nifty50 — ML-Powered Recommendations + Domain Expert AI",
               style={"color":"#888","margin":"0"}),
    ], style={"background":"#0a0a0a","padding":"20px 40px","borderBottom":"1px solid #222"}),

    # ── Stock selector + controls ────────────────────────────────────────
    html.Div([
        html.Div([
            html.Label("Select Stock", style={"color":"#ccc"}),
            dcc.Dropdown(
                id="stock-selector",
                options=[{"label":f"{s} (.NS)","value":f"{s}.NS"} for s in NIFTY50_SYMBOLS],
                value="RELIANCE.NS",
                style={"background":"#1a1a1a","color":"#000"},
            ),
        ], style={"width":"25%","marginRight":"20px"}),

        html.Div([
            html.Label("Time Period", style={"color":"#ccc"}),
            dcc.RadioItems(
                id="period-selector",
                options=[
                    {"label":"3M","value":"3mo"},
                    {"label":"6M","value":"6mo"},
                    {"label":"1Y","value":"1y"},
                    {"label":"2Y","value":"2y"},
                    {"label":"5Y","value":"5y"},
                ],
                value="1y",
                inline=True,
                style={"color":"#ccc","marginTop":"8px"},
                inputStyle={"marginRight":"5px","marginLeft":"10px"},
            ),
        ], style={"width":"40%"}),

        html.Div([
            html.Button("🔍 Analyse", id="analyse-btn", n_clicks=0,
                       style={"background":"#00d4ff","color":"#000","border":"none",
                              "padding":"10px 25px","borderRadius":"5px",
                              "cursor":"pointer","fontWeight":"bold","marginTop":"20px"}),
        ], style={"width":"15%"}),

    ], style={"display":"flex","alignItems":"flex-end","padding":"20px 40px",
              "background":"#111"}),

    # ── Recommendation Card ──────────────────────────────────────────────
    html.Div(id="recommendation-card", style={"padding":"0 40px"}),

    # ── Main Charts ──────────────────────────────────────────────────────
    html.Div([

        # Price chart with indicators
        html.Div([
            html.H3("Price & Technical Indicators", style={"color":"#ccc","marginBottom":"10px"}),
            dcc.Graph(id="price-chart", style={"height":"500px"}),
        ], style={"width":"68%","background":"#111","padding":"20px",
                  "borderRadius":"10px","marginRight":"2%"}),

        # Right panel — RSI, MACD, Volume
        html.Div([
            html.H3("Oscillators", style={"color":"#ccc","marginBottom":"10px"}),
            dcc.Graph(id="rsi-chart", style={"height":"150px"}),
            dcc.Graph(id="macd-chart", style={"height":"150px"}),
            dcc.Graph(id="volume-chart", style={"height":"150px"}),
        ], style={"width":"28%","background":"#111","padding":"20px","borderRadius":"10px"}),

    ], style={"display":"flex","padding":"20px 40px"}),

    # ── Sentiment + Cluster + Rules ──────────────────────────────────────
    html.Div([
        html.Div([
            html.H3("Market Sentiment Trend", style={"color":"#ccc"}),
            dcc.Graph(id="sentiment-chart", style={"height":"280px"}),
        ], style={"width":"48%","background":"#111","padding":"20px","borderRadius":"10px","marginRight":"2%"}),

        html.Div([
            html.H3("Stock Clusters (PCA)", style={"color":"#ccc"}),
            dcc.Graph(id="cluster-chart", style={"height":"280px"}),
        ], style={"width":"48%","background":"#111","padding":"20px","borderRadius":"10px"}),
    ], style={"display":"flex","padding":"0 40px 20px"}),

    # ── Model Performance ────────────────────────────────────────────────
    html.Div([
        html.H3("Walk-Forward Validation — Model AUC by Year", style={"color":"#ccc"}),
        dcc.Graph(id="wf-chart", style={"height":"250px"}),
    ], style={"background":"#111","padding":"20px","margin":"0 40px 20px","borderRadius":"10px"}),

    # ── Association Rules Table ──────────────────────────────────────────
    html.Div([
        html.H3("Top Profitable Signal Combinations (Association Rules)",
                style={"color":"#ccc","marginBottom":"10px"}),
        dash_table.DataTable(
            id="rules-table",
            data=rules.head(15).to_dict("records"),
            columns=[{"name":c,"id":c} for c in rules.columns],
            style_table={"overflowX":"auto"},
            style_cell={"background":"#1a1a1a","color":"#ccc","border":"1px solid #333",
                        "fontSize":"12px","padding":"8px"},
            style_header={"background":"#222","color":"#00d4ff","fontWeight":"bold"},
            page_size=10,
        ),
    ], style={"background":"#111","padding":"20px","margin":"0 40px 20px","borderRadius":"10px"}),

    # ── AI Chat ──────────────────────────────────────────────────────────
    html.Div([
        html.H3("🤖 Domain Expert AI Chat", style={"color":"#00d4ff"}),
        html.Div(id="chat-history", style={
            "height":"300px","overflowY":"auto","background":"#0a0a0a",
            "padding":"15px","borderRadius":"5px","border":"1px solid #333",
            "marginBottom":"15px","fontFamily":"monospace","color":"#ccc","fontSize":"13px"
        }),
        html.Div([
            dcc.Input(id="chat-input", type="text",
                     placeholder="Ask: Should I buy RELIANCE now? What is the market outlook?",
                     style={"width":"80%","padding":"12px","background":"#1a1a1a",
                            "color":"#fff","border":"1px solid #444","borderRadius":"5px",
                            "fontSize":"14px"}),
            html.Button("Send", id="chat-send", n_clicks=0,
                       style={"width":"15%","marginLeft":"2%","padding":"12px",
                              "background":"#00d4ff","color":"#000","border":"none",
                              "borderRadius":"5px","cursor":"pointer","fontWeight":"bold"}),
        ], style={"display":"flex"}),
    ], style={"background":"#111","padding":"20px","margin":"0 40px 20px","borderRadius":"10px"}),

    # Hidden state
    dcc.Store(id="current-stock-data"),

], style={"background":"#0d0d0d","minHeight":"100vh","fontFamily":"'Segoe UI',sans-serif"})


# ── Callbacks ──────────────────────────────────────────────────────────────
@app.callback(
    [Output("price-chart","figure"),
     Output("rsi-chart","figure"),
     Output("macd-chart","figure"),
     Output("volume-chart","figure"),
     Output("recommendation-card","children"),
     Output("current-stock-data","data")],
    [Input("analyse-btn","n_clicks")],
    [State("stock-selector","value"),
     State("period-selector","value")],
    prevent_initial_call=False
)
def update_charts(n_clicks, ticker, period):
    import ta

    # Fetch live data
    stock = yf.Ticker(ticker)
    df = stock.history(period=period)
    df = df.reset_index()
    df.columns = df.columns.str.lower()
    symbol = ticker.replace(".NS","")

    # Compute indicators
    df["rsi"]         = ta.momentum.rsi(df["close"])
    macd_obj          = ta.trend.MACD(df["close"])
    df["macd"]        = macd_obj.macd()
    df["macd_signal"] = macd_obj.macd_signal()
    df["macd_hist"]   = macd_obj.macd_diff()
    df["sma_20"]      = ta.trend.sma_indicator(df["close"], 20)
    df["sma_50"]      = ta.trend.sma_indicator(df["close"], 50)
    df["sma_200"]     = ta.trend.sma_indicator(df["close"], 200)
    bb                = ta.volatility.BollingerBands(df["close"])
    df["bb_upper"]    = bb.bollinger_hband()
    df["bb_lower"]    = bb.bollinger_lband()

    # ── Price Chart ──────────────────────────────────────────────────────
    price_fig = go.Figure()
    price_fig.add_trace(go.Candlestick(
        x=df["date"], open=df["open"], high=df["high"],
        low=df["low"], close=df["close"], name="OHLC",
        increasing_line_color="#00d4ff", decreasing_line_color="#ff4444",
    ))
    price_fig.add_trace(go.Scatter(x=df["date"], y=df["sma_20"], name="SMA20",
                                   line=dict(color="#ffd700", width=1)))
    price_fig.add_trace(go.Scatter(x=df["date"], y=df["sma_50"], name="SMA50",
                                   line=dict(color="#ff8c00", width=1.5)))
    price_fig.add_trace(go.Scatter(x=df["date"], y=df["sma_200"], name="SMA200",
                                   line=dict(color="#ff4444", width=2)))
    price_fig.add_trace(go.Scatter(x=df["date"], y=df["bb_upper"], name="BB Upper",
                                   line=dict(color="#888", width=1, dash="dot"), fill=None))
    price_fig.add_trace(go.Scatter(x=df["date"], y=df["bb_lower"], name="BB Lower",
                                   line=dict(color="#888", width=1, dash="dot"),
                                   fill="tonexty", fillcolor="rgba(100,100,100,0.1)"))
    price_fig.update_layout(
        paper_bgcolor="#111", plot_bgcolor="#111",
        font_color="#ccc", xaxis_rangeslider_visible=False,
        legend=dict(orientation="h", yanchor="bottom", y=1.02),
        margin=dict(l=10, r=10, t=30, b=10),
    )

    # ── RSI Chart ────────────────────────────────────────────────────────
    rsi_fig = go.Figure()
    rsi_fig.add_trace(go.Scatter(x=df["date"], y=df["rsi"], name="RSI",
                                 line=dict(color="#00d4ff", width=1.5)))
    rsi_fig.add_hline(y=70, line_color="#ff4444", line_dash="dash", line_width=1)
    rsi_fig.add_hline(y=30, line_color="#00ff88", line_dash="dash", line_width=1)
    rsi_fig.update_layout(paper_bgcolor="#111", plot_bgcolor="#111", font_color="#ccc",
                          margin=dict(l=10,r=10,t=20,b=10), showlegend=False,
                          yaxis=dict(range=[0,100]))

    # ── MACD Chart ───────────────────────────────────────────────────────
    colors = ["#00ff88" if v >= 0 else "#ff4444" for v in df["macd_hist"].fillna(0)]
    macd_fig = go.Figure()
    macd_fig.add_trace(go.Bar(x=df["date"], y=df["macd_hist"], name="Histogram",
                              marker_color=colors))
    macd_fig.add_trace(go.Scatter(x=df["date"], y=df["macd"], name="MACD",
                                  line=dict(color="#00d4ff", width=1)))
    macd_fig.add_trace(go.Scatter(x=df["date"], y=df["macd_signal"], name="Signal",
                                  line=dict(color="#ff8c00", width=1)))
    macd_fig.update_layout(paper_bgcolor="#111", plot_bgcolor="#111", font_color="#ccc",
                           margin=dict(l=10,r=10,t=20,b=10), showlegend=False)

    # ── Volume Chart ─────────────────────────────────────────────────────
    vol_fig = go.Figure()
    vol_fig.add_trace(go.Bar(x=df["date"], y=df["volume"], name="Volume",
                             marker_color="#4444ff"))
    vol_fig.update_layout(paper_bgcolor="#111", plot_bgcolor="#111", font_color="#ccc",
                          margin=dict(l=10,r=10,t=20,b=10), showlegend=False)

    # ── Recommendation Card ───────────────────────────────────────────────
    last = df.iloc[-1]
    rsi_val = last["rsi"] if not pd.isna(last["rsi"]) else 50
    macd_bull = last["macd"] > last["macd_signal"]
    above_200 = last["close"] > last["sma_200"] if not pd.isna(last["sma_200"]) else False
    change_pct = ((last["close"] - df.iloc[-2]["close"]) / df.iloc[-2]["close"]) * 100

    # Simple rule-based signal (replace with ML model output)
    bull_signals = sum([rsi_val < 60, macd_bull, above_200])
    if bull_signals >= 2 and rsi_val < 65:
        rec, rec_color, confidence = "BUY", "#00ff88", "68%"
    elif bull_signals == 0 or rsi_val > 70:
        rec, rec_color, confidence = "AVOID", "#ff4444", "71%"
    else:
        rec, rec_color, confidence = "HOLD", "#ffd700", "55%"

    card = html.Div([
        html.Div([
            html.Div([
                html.H2(symbol, style={"color":"#fff","margin":"0"}),
                html.P(f"₹{last['close']:.2f}  "
                       f"{'▲' if change_pct >= 0 else '▼'} "
                       f"{abs(change_pct):.2f}%",
                       style={"color":"#00ff88" if change_pct >= 0 else "#ff4444",
                              "fontSize":"18px","margin":"5px 0"}),
            ]),
            html.Div([
                html.H2(rec, style={"color":rec_color,"margin":"0","fontSize":"28px"}),
                html.P(f"Confidence: {confidence}", style={"color":"#888","margin":"0"}),
            ], style={"textAlign":"center","borderLeft":"2px solid #333","paddingLeft":"30px"}),
            html.Div([
                html.Div([html.Span("RSI  ", style={"color":"#888"}),
                          html.Span(f"{rsi_val:.1f}",
                                    style={"color":"#ff4444" if rsi_val>70 else
                                                   "#00ff88" if rsi_val<30 else "#ccc"})]),
                html.Div([html.Span("MACD ", style={"color":"#888"}),
                          html.Span("BULLISH" if macd_bull else "BEARISH",
                                    style={"color":"#00ff88" if macd_bull else "#ff4444"})]),
                html.Div([html.Span("Trend", style={"color":"#888"}),
                          html.Span(" ABOVE 200MA" if above_200 else " BELOW 200MA",
                                    style={"color":"#00ff88" if above_200 else "#ff4444"})]),
            ], style={"borderLeft":"2px solid #333","paddingLeft":"30px","fontSize":"14px"}),
        ], style={"display":"flex","gap":"40px","alignItems":"center"}),
    ], style={"background":"#1a1a1a","padding":"20px 40px","borderRadius":"10px",
              "margin":"10px 40px","border":f"1px solid {rec_color}"})

    stock_data = {
        "symbol": symbol,
        "rsi_14": rsi_val,
        "macd": float(last["macd"]) if not pd.isna(last["macd"]) else 0,
        "macd_signal": float(last["macd_signal"]) if not pd.isna(last["macd_signal"]) else 0,
        "close": float(last["close"]),
        "sma_200": float(last["sma_200"]) if not pd.isna(last["sma_200"]) else 0,
    }

    return price_fig, rsi_fig, macd_fig, vol_fig, card, json.dumps(stock_data)


@app.callback(
    Output("cluster-chart","figure"),
    Input("stock-selector","value"),
)
def update_cluster_chart(ticker):
    symbol = ticker.replace(".NS","")
    fig = px.scatter(
        clusters, x="pca_x", y="pca_y",
        color="kmeans_cluster", text="symbol",
        hover_data=["sector","kmeans_cluster"],
        title="",
        color_continuous_scale="viridis"
    )
    # Highlight selected stock
    selected = clusters[clusters["symbol"] == symbol]
    if len(selected):
        fig.add_trace(go.Scatter(
            x=selected["pca_x"], y=selected["pca_y"],
            mode="markers+text", text=[symbol],
            marker=dict(size=16, color="#00d4ff", symbol="star"),
            name="Selected", showlegend=False
        ))
    fig.update_layout(
        paper_bgcolor="#111", plot_bgcolor="#111",
        font_color="#ccc", coloraxis_showscale=False,
        margin=dict(l=10,r=10,t=10,b=10)
    )
    fig.update_traces(textfont_size=8)
    return fig


@app.callback(
    Output("wf-chart","figure"),
    Input("stock-selector","value"),
)
def update_wf_chart(_):
    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=wf_results["test_year"], y=wf_results["auc"],
        marker_color=["#00ff88" if v >= 0.6 else "#ffd700" if v >= 0.55 else "#ff4444"
                      for v in wf_results["auc"]],
        text=[f"{v:.3f}" for v in wf_results["auc"]],
        textposition="outside",
    ))
    fig.add_hline(y=0.6, line_color="#00ff88", line_dash="dash",
                  annotation_text="Target AUC=0.60")
    fig.update_layout(
        paper_bgcolor="#111", plot_bgcolor="#111", font_color="#ccc",
        yaxis=dict(range=[0.4, 0.85]), margin=dict(l=10,r=10,t=20,b=30),
        xaxis_title="Test Year", yaxis_title="AUC Score"
    )
    return fig


@app.callback(
    Output("chat-history","children"),
    Input("chat-send","n_clicks"),
    [State("chat-input","value"),
     State("chat-history","children"),
     State("current-stock-data","data")],
    prevent_initial_call=True
)
def chat_with_ai(n_clicks, question, history, stock_data_json):
    if not question:
        return history

    context = json.loads(stock_data_json) if stock_data_json else {}

    # Import here to avoid circular imports
    from domain_expert_ai import ask_domain_expert
    answer = ask_domain_expert(question, context)

    new_entry = html.Div([
        html.Div(f"👤 You: {question}",
                 style={"color":"#00d4ff","marginBottom":"5px","fontWeight":"bold"}),
        html.Div(f"🤖 AI: {answer}",
                 style={"color":"#ccc","marginBottom":"15px","lineHeight":"1.6",
                        "whiteSpace":"pre-wrap"}),
        html.Hr(style={"border":"1px solid #222"}),
    ])

    existing = history if isinstance(history, list) else []
    return existing + [new_entry]


if __name__ == "__main__":
    print("🚀 Starting Stock Market AI Dashboard...")
    print("📊 Access at: http://localhost:8050")
    app.run(debug=False, host="0.0.0.0", port=8050)
```

---

## PHASE 6 — RUN ORDER
### Execute in this exact sequence

```bash
cd "/home/karan/Data/Academics/AI models/Stock-Market"

# Phase 0 — Setup
python3 src/data/analyse_stock_datasets.py        # Analyse unknown folder
python3 -c "import os; os.makedirs('outputs/reports', exist_ok=True)"

# Phase 1 — Preprocessing
python3 src/data/01_inspect_datasets.py            # Audit all datasets
python3 src/data/02_build_price_master.py          # Build master OHLCV
python3 src/data/03_build_macro_master.py          # Build macro dataset

# Phase 2 — Features
python3 src/features/01_technical_indicators.py   # Compute indicators
python3 src/features/02_sentiment_features.py     # Compute sentiment (slow — runs FinBERT)
python3 src/features/03_build_master_features.py  # Merge everything + targets

# Phase 3 — ML Models
python3 src/models/01_classification.py           # XGBoost, LightGBM, RF, SVM, LR
python3 src/models/02_clustering.py               # K-Means, DBSCAN, Hierarchical, GMM
python3 src/models/03_regression.py               # Return regression
python3 src/models/04_association_rules.py        # Apriori signal mining
python3 src/models/05_model_explainability.py     # SHAP + walk-forward validation

# Phase 4 — LLM Integration
# (Download model first — see Step 4.1)
python3 src/models/06_domain_expert_ai.py         # Test domain expert AI

# Phase 5 — Dashboard
python3 src/dashboard/app.py                      # Launch dashboard → http://localhost:8050
```

---

## EXPECTED OUTPUTS

```
Stock-Market/outputs/
├── master_price.parquet               All stocks OHLCV adjusted
├── macro_master.parquet               Macro features daily
├── features_technical.parquet        50+ technical indicator columns
├── features_sentiment.parquet        Daily sentiment scores
├── master_features.parquet           FINAL merged dataset with targets
├── feature_columns.txt               List of feature names
├── stock_clusters.csv                K-Means + DBSCAN + GMM cluster labels
├── cluster_characteristics.csv       Mean profile per cluster
├── association_rules.csv             Signal combinations → profit
├── walk_forward_results.csv          AUC per year (2020–2025)
├── models/
│   ├── xgboost_classifier.pkl
│   ├── lightgbm_classifier.pkl
│   ├── randomforest_classifier.pkl
│   ├── xgboost_regressor.pkl
│   ├── scaler.pkl
│   └── classification_results.csv
├── plots/
│   ├── clustering.png
│   ├── shap_feature_importance.png
│   └── shap_beeswarm.png
└── reports/
    ├── stock_datasets_report.txt      Unknown folder analysis
    └── dataset_audit.csv              All dataset inspection
```

---

## NOTES FOR AGENT

1. **Always run Phase 0 first** — the Stock-datasets folder may contain data that changes the pipeline
2. **Adjust column names** after running `01_inspect_datasets.py` — different CSVs use different naming
3. **Sentiment step is slow** — FinBERT on CPU takes ~30 min for 100k headlines; run overnight
4. **llama.cpp model** — if Finance-LLM download fails, use any GGUF model from HuggingFace
5. **Look-ahead bias check** — every feature must only use data prior to the prediction date; the `shift(-days)` target creation already handles this
6. **MLflow UI** — run `mlflow ui` in terminal to see all experiment results at http://localhost:5000
7. **If memory issues** — reduce `sample(1000)` to `sample(500)` in SHAP step
8. **Dashboard GPU** — if you have GPU, set `device=0` in FinBERT pipeline and `-ngl 35` in llama.cpp
