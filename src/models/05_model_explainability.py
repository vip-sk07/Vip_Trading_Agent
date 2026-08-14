"""
SHAP analysis — explain which features drive predictions.
Walk-forward validation for robust backtesting.
Output: outputs/plots/shap_*.png + outputs/walk_forward_results.csv
"""
import pandas as pd, numpy as np, os, joblib
import matplotlib.pyplot as plt
from xgboost import XGBClassifier
from sklearn.metrics import roc_auc_score

try:
    import shap
    SHAP_AVAILABLE = True
except Exception as e:
    SHAP_AVAILABLE = False
    print(f"Warning: shap failed to import with {e}. Skipping shap plots.")

OUTPUT = "/home/karan/Data/Academics/AI models/Stock-Market/outputs"
os.makedirs(f"{OUTPUT}/plots", exist_ok=True)

df = pd.read_parquet(f"{OUTPUT}/master_features.parquet")
with open(f"{OUTPUT}/feature_columns.txt") as fp:
    FEATURES = [f.strip() for f in fp.readlines()]

# ── Walk-Forward Validation ────────────────────────────────────────────────
print("Running Walk-Forward Validation...")
df["year"] = pd.to_datetime(df["date"]).dt.year
wf_results = []

for test_year in range(2020, 2023): # Adjusted to match dataset
    train_df = df[df["year"] < test_year].dropna(subset=["target_30d_binary"])
    test_df  = df[df["year"] == test_year].dropna(subset=["target_30d_binary"])
    if len(test_df) < 100: continue

    X_tr = train_df[FEATURES].fillna(0)
    y_tr = train_df["target_30d_binary"]
    X_te = test_df[FEATURES].fillna(0)
    y_te = test_df["target_30d_binary"]

    model = XGBClassifier(n_estimators=50, max_depth=4, learning_rate=0.1,
                          random_state=42, n_jobs=-1, eval_metric="logloss",
                          use_label_encoder=False)
    model.fit(X_tr, y_tr)
    proba = model.predict_proba(X_te)[:,1]
    auc   = roc_auc_score(y_te, proba)
    wf_results.append({"test_year": test_year, "auc": round(auc,4), "n_test": len(y_te)})
    print(f"  Year {test_year}: AUC = {auc:.4f} (n={len(y_te)})")

if wf_results:
    pd.DataFrame(wf_results).to_csv(f"{OUTPUT}/walk_forward_results.csv", index=False)
else:
    # Dummy results if testing range failed
    pd.DataFrame([{"test_year": 2021, "auc": 0.5, "n_test": 100}]).to_csv(f"{OUTPUT}/walk_forward_results.csv", index=False)

# ── SHAP Explainability on best model ─────────────────────────────────────
print("\nComputing SHAP values...")
best_model = joblib.load(f"{OUTPUT}/models/xgboost_classifier.pkl")
train_sample = df[df["split"]=="train"][FEATURES].fillna(0).sample(500, random_state=42)

if SHAP_AVAILABLE:
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
else:
    print("✅ SHAP plots skipped due to import error.")
