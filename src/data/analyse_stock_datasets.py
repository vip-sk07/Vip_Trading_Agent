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
total_mb = sum(f.stat().st_size for f in all_files) / (1024*1024) if all_files else 0
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
