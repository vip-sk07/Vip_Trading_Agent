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

if len(val) == 0:
    print("Warning: No val set. Using last 20% of train as val")
    split_idx = int(len(train)*0.8)
    val = train.iloc[split_idx:]
    train = train.iloc[:split_idx]

train = train.sample(min(20000, len(train)), random_state=42)
val = val.sample(min(5000, len(val)), random_state=42)

X_train = train[FEATURES].fillna(0)
y_train = train[TARGET].clip(-0.5, 0.5)  # Cap extreme outliers
X_val   = val[FEATURES].fillna(0)
y_val   = val[TARGET].clip(-0.5, 0.5)

scaler = RobustScaler()
X_train_sc = scaler.fit_transform(X_train)
X_val_sc   = scaler.transform(X_val)

REGRESSORS = {
    "XGBoost_Reg": XGBRegressor(
        n_estimators=50, max_depth=4, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        random_state=42, n_jobs=-1
    ),
    "LightGBM_Reg": LGBMRegressor(
        n_estimators=50, max_depth=4, learning_rate=0.05,
        random_state=42, n_jobs=-1, verbose=-1
    ),
    "Ridge": Ridge(alpha=1.0),
    "ElasticNet": ElasticNet(alpha=0.1, l1_ratio=0.5, max_iter=200),
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
