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
