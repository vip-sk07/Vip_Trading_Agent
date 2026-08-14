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
# Note: For speed, we sample training data if it's too large
# Actually the dates in the sample data were older, so let's adjust split if needed.
train = df[df["split"] == "train"]
val   = df[df["split"] == "val"]
test  = df[df["split"] == "test"]

if len(val) == 0:
    print("Warning: No val set. Using last 20% of train as val")
    split_idx = int(len(train)*0.8)
    val = train.iloc[split_idx:]
    train = train.iloc[:split_idx]

# Subsample for faster setup (remove for real run)
print("Subsampling data for speed...")
train = train.sample(min(20000, len(train)), random_state=42)
val = val.sample(min(5000, len(val)), random_state=42)

X_train = train[FEATURES].fillna(0)
y_train = train[TARGET]
X_val   = val[FEATURES].fillna(0)
y_val   = val[TARGET]

# Handle class imbalance
smote = SMOTE(random_state=42)
X_train_bal, y_train_bal = smote.fit_resample(X_train, y_train)

scaler = RobustScaler()
X_train_sc = scaler.fit_transform(X_train_bal)
X_val_sc   = scaler.transform(X_val)

MODELS = {
    "XGBoost": XGBClassifier(
        n_estimators=50, max_depth=4, learning_rate=0.1,  # reduced for speed
        subsample=0.8, colsample_bytree=0.8,
        use_label_encoder=False, eval_metric="logloss",
        random_state=42, n_jobs=-1
    ),
    "LightGBM": LGBMClassifier(
        n_estimators=50, max_depth=4, learning_rate=0.1, # reduced for speed
        subsample=0.8, colsample_bytree=0.8,
        random_state=42, n_jobs=-1, verbose=-1
    ),
    "RandomForest": RandomForestClassifier(
        n_estimators=50, max_depth=6, random_state=42, n_jobs=-1 # reduced
    ),
    "LogisticRegression": LogisticRegression(
        max_iter=500, random_state=42, C=0.1
    ),
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
