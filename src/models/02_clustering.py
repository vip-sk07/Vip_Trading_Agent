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
for k in range(2, 8): # reduced range for speed
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

# Select only numeric columns for mean computation to avoid TypeError
numeric_cols = cluster_profile.select_dtypes(include=[np.number]).columns
char = cluster_profile.groupby("cluster")[numeric_cols].mean()

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
elbow_k = range(2, 8)
plt.plot(elbow_k, sil_scores, "bo-")
plt.axvline(x=optimal_k, color="red", linestyle="--")
plt.title("Silhouette Score vs K")
plt.xlabel("Number of Clusters")
plt.ylabel("Silhouette Score")

plt.tight_layout()
plt.savefig(f"{OUTPUT}/plots/clustering.png", dpi=150)
plt.close()
print(f"✅ Cluster plot saved: {OUTPUT}/plots/clustering.png")
