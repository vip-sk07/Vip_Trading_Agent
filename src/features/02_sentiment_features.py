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

if news_dfs:
    news = pd.concat(news_dfs, ignore_index=True)

    # Find the headline and date columns (adjust names from audit)
    headline_col = next((c for c in news.columns if "headline" in c or "title" in c or "text" in c), news.columns[0])
    date_col     = next((c for c in news.columns if "date" in c or "time" in c), None)

    news["date"] = pd.to_datetime(news[date_col], errors="coerce", dayfirst=True)
    news = news.dropna(subset=["date"])
    news["text"] = news[headline_col].fillna("").astype(str)

    # Note: To avoid very long runtime during setup, we can sample the news
    # For full analysis, run this completely overnight.
    # We sample 500 records here just to get the pipeline working quickly.
    print("Sampling 500 news records for speed. Remove sampling for full run.")
    news = news.sample(min(500, len(news)), random_state=42)

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
else:
    daily_sentiment = pd.DataFrame(columns=["date", "sentiment_mean", "sentiment_std", "positive_count", "negative_count", "neutral_count", "total_news", "sentiment_ratio"])

daily_sentiment.to_parquet(f"{OUTPUT}/features_sentiment.parquet", index=False)
print(f"✅ Daily sentiment: {daily_sentiment.shape}")
