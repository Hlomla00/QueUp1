"""
QueUp — Wait Time Predictor Training Script
===========================================
Trains RandomForestRegressor and GradientBoostingRegressor on a synthetic
South African government queue dataset. Exports the best model as:
  - ml/wait_predictor.json    — model parameters for direct use in TS/JS
  - ml/wait_predictor.pkl     — joblib serialised sklearn model
  - ml/wait_predictor.tflite  — TFLite quantised model (if TF is available)

Features: hour_of_day, day_of_week, queue_size
Target:   wait_minutes

Usage:
    python ml/train_wait_predictor.py

Completes in < 30 seconds on any modern laptop.
"""

import time
import os
import json
import warnings

warnings.filterwarnings("ignore")

START = time.time()

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

print("=" * 60)
print("  QueUp — Wait Predictor Training Script")
print("  MICT SETA National Finals Demo")
print("=" * 60)

# ── 1. Generate synthetic SA queue dataset ─────────────────────────
np.random.seed(42)
N = 2000

print(f"\n[1/6] Generating {N} sample SA queue dataset...")

hour_of_day = np.random.randint(7, 17, N).astype(np.float32)
day_of_week = np.random.randint(0, 5, N).astype(np.float32)
queue_size  = np.random.randint(1, 80, N).astype(np.float32)

def wait_formula(hour, dow, queue):
    # Realistic SA govt service time: 4 min/person (baseline)
    base = queue * 4.0
    # Peak hour multiplier
    peak = np.where((hour >= 9) & (hour <= 11), 1.3,
           np.where((hour >= 13) & (hour <= 15), 1.2, 1.0))
    # Monday (0) and Friday (4) are busier
    day_factor = np.where((dow == 0) | (dow == 4), 1.15, 1.0)
    noise = np.random.normal(0, 3, len(hour))
    return np.clip(base * peak * day_factor + noise, 2, 180)

wait_minutes = wait_formula(hour_of_day, day_of_week, queue_size)

X = np.column_stack([hour_of_day, day_of_week, queue_size])
y = wait_minutes

print(f"  Dataset shape : X={X.shape}, y={y.shape}")
print(f"  Wait range    : {y.min():.1f} – {y.max():.1f} min  |  mean: {y.mean():.1f} min")

# ── 2. Train / test split ──────────────────────────────────────────
print("\n[2/6] Splitting dataset (80/20)...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# ── 3. Train both models ──────────────────────────────────────────
print("\n[3/6] Training RandomForestRegressor vs GradientBoostingRegressor...")

rf = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)
gb = GradientBoostingRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42)

t0 = time.time(); rf.fit(X_train, y_train); rf_time = time.time() - t0
t0 = time.time(); gb.fit(X_train, y_train); gb_time = time.time() - t0

def evaluate(model, name, train_t):
    y_pred = model.predict(X_test)
    mae  = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2   = r2_score(y_test, y_pred)
    print(f"\n  [{name}]  (trained in {train_t:.2f}s)")
    print(f"    MAE  : {mae:.2f} min")
    print(f"    RMSE : {rmse:.2f} min")
    print(f"    R²   : {r2:.4f}")
    return mae, rmse, r2

rf_mae, rf_rmse, rf_r2 = evaluate(rf, "RandomForest", rf_time)
gb_mae, gb_rmse, gb_r2 = evaluate(gb, "GradientBoosting", gb_time)

best_model = rf if rf_mae <= gb_mae else gb
best_name  = "RandomForest" if rf_mae <= gb_mae else "GradientBoosting"
best_mae   = min(rf_mae, gb_mae)
best_rmse  = min(rf_rmse, gb_rmse)
best_r2    = max(rf_r2, gb_r2)
print(f"\n  Winner: {best_name} (MAE {best_mae:.2f} min)")

# ── 4. Export model parameters to JSON (for TS queue-intelligence) ─
print("\n[4/6] Exporting model parameters to JSON...")

os.makedirs("ml", exist_ok=True)

# Extract interpretable peak/day multipliers by sampling the model
# across representative inputs — these calibrate the TS heuristic engine.
sample_inputs = []
sample_labels = []
for hour in range(7, 17):
    for dow in range(5):
        for q in [5, 15, 30, 50, 70]:
            sample_inputs.append([hour, dow, q])

sample_inputs = np.array(sample_inputs, dtype=np.float32)
sample_preds  = best_model.predict(sample_inputs)

# Compute average service time (mins per person) from baseline (non-peak, midweek)
baseline_mask = (
    (sample_inputs[:, 0] == 12) &
    (sample_inputs[:, 1] == 2)
)
baseline_inputs = sample_inputs[baseline_mask]
baseline_preds  = best_model.predict(baseline_inputs)
avg_service_time = float(np.mean(baseline_preds / baseline_inputs[:, 2]))

# Peak multipliers derived from model
peak_morning_inputs = sample_inputs[(sample_inputs[:, 0] == 10) & (sample_inputs[:, 1] == 2)]
peak_afternoon_inputs = sample_inputs[(sample_inputs[:, 0] == 14) & (sample_inputs[:, 1] == 2)]
base_inputs           = sample_inputs[(sample_inputs[:, 0] == 12) & (sample_inputs[:, 1] == 2)]

pm = float(np.mean(best_model.predict(peak_morning_inputs) / best_model.predict(base_inputs)))
pa = float(np.mean(best_model.predict(peak_afternoon_inputs) / best_model.predict(base_inputs)))

# Monday/Friday multiplier
mon_inputs = sample_inputs[(sample_inputs[:, 0] == 10) & (sample_inputs[:, 1] == 0)]
wed_inputs = sample_inputs[(sample_inputs[:, 0] == 10) & (sample_inputs[:, 1] == 2)]
dm = float(np.mean(best_model.predict(mon_inputs) / best_model.predict(wed_inputs)))

model_params = {
    "model_name": best_name,
    "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "dataset_size": N,
    "metrics": {
        "mae_minutes": round(best_mae, 3),
        "rmse_minutes": round(best_rmse, 3),
        "r2_score": round(best_r2, 4)
    },
    "parameters": {
        "avg_service_time_minutes": round(avg_service_time, 2),
        "peak_morning_multiplier": round(pm, 3),    # 09:00–11:00
        "peak_afternoon_multiplier": round(pa, 3),  # 13:00–15:00
        "busy_day_multiplier": round(dm, 3),        # Mon & Fri
        "peak_morning_hours": [9, 10, 11],
        "peak_afternoon_hours": [13, 14, 15],
        "busy_days": [0, 4]
    },
    "feature_names": ["hour_of_day", "day_of_week", "queue_size"],
    "target_name": "wait_minutes"
}

json_path = os.path.join("ml", "wait_predictor.json")
with open(json_path, "w") as f:
    json.dump(model_params, f, indent=2)
print(f"  Saved: {json_path}")

pkl_path = os.path.join("ml", "wait_predictor.pkl")
joblib.dump(best_model, pkl_path, compress=3)
print(f"  Saved: {pkl_path}  ({os.path.getsize(pkl_path)/1024:.0f} KB)")

# ── 5. TFLite conversion via native Keras NN ──────────────────────
print("\n[5/6] Training Keras neural network + TFLite conversion...")
tflite_available = False
nn_mae = None

try:
    import tensorflow as tf
    os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

    # Normalise inputs to [0,1] for stable training
    X_min = X_train.min(axis=0)
    X_max = X_train.max(axis=0)
    X_range = X_max - X_min + 1e-8

    X_train_n = ((X_train - X_min) / X_range).astype(np.float32)
    X_test_n  = ((X_test  - X_min) / X_range).astype(np.float32)
    y_train_n = (y_train / 180.0).astype(np.float32)   # scale target to [0,1]

    # Shallow NN: 3 → 32 → 16 → 1
    nn_model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(3,)),
        tf.keras.layers.Dense(32, activation="relu"),
        tf.keras.layers.Dense(16, activation="relu"),
        tf.keras.layers.Dense(1,  activation="sigmoid"),   # output ∈ [0,1]
    ], name="wait_predictor_nn")

    nn_model.compile(optimizer=tf.keras.optimizers.Adam(0.005),
                     loss="mse", metrics=["mae"])

    nn_model.fit(
        X_train_n, y_train_n,
        epochs=60, batch_size=64,
        validation_split=0.1,
        verbose=0
    )

    # Evaluate NN (rescale predictions back to minutes)
    nn_raw = nn_model.predict(X_test_n, verbose=0).flatten() * 180.0
    nn_mae  = mean_absolute_error(y_test, nn_raw)
    nn_rmse = np.sqrt(mean_squared_error(y_test, nn_raw))
    nn_r2   = r2_score(y_test, nn_raw)
    print(f"  [KerasNN]")
    print(f"    MAE  : {nn_mae:.2f} min")
    print(f"    RMSE : {nn_rmse:.2f} min")
    print(f"    R²   : {nn_r2:.4f}")

    # Save normalisation constants in a TF SavedModel wrapper
    class WaitPredictorExport(tf.Module):
        def __init__(self, keras_model, x_min, x_range):
            self.model = keras_model
            self.x_min   = tf.constant(x_min,   dtype=tf.float32)
            self.x_range = tf.constant(x_range, dtype=tf.float32)

        @tf.function(input_signature=[tf.TensorSpec(shape=[None, 3], dtype=tf.float32)])
        def predict(self, x):
            x_norm = (x - self.x_min) / self.x_range
            return self.model(x_norm) * 180.0   # returns minutes

    export_module = WaitPredictorExport(nn_model, X_min, X_range)

    converter = tf.lite.TFLiteConverter.from_concrete_functions(
        [export_module.predict.get_concrete_function()],
        trackable_obj=export_module
    )
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()

    tflite_path = os.path.join("ml", "wait_predictor.tflite")
    with open(tflite_path, "wb") as f:
        f.write(tflite_model)
    tflite_available = True
    print(f"  TFLite saved: {tflite_path}  ({len(tflite_model)/1024:.1f} KB)")

    # Validate TFLite vs Keras
    interp = tf.lite.Interpreter(model_path=tflite_path)
    interp.allocate_tensors()
    inp_d = interp.get_input_details()
    out_d = interp.get_output_details()
    sample = X_test[:5].astype(np.float32)
    keras_preds  = (nn_model.predict(((sample - X_min) / X_range).astype(np.float32),
                                      verbose=0).flatten() * 180.0)
    tflite_preds = []
    for row in sample:
        interp.set_tensor(inp_d[0]['index'], row.reshape(1, 3))
        interp.invoke()
        tflite_preds.append(float(interp.get_tensor(out_d[0]['index']).flat[0]))
    tflite_preds = np.array(tflite_preds)
    diff = np.abs(keras_preds - tflite_preds)
    print(f"  Keras vs TFLite max diff : {diff.max():.4f} min — "
          f"{'PASSED ✓' if diff.max() < 5 else 'WARNING'}")

    # also save norm constants to JSON for Android
    model_params["tflite"] = {
        "x_min": X_min.tolist(),
        "x_range": X_range.tolist(),
        "output_scale": 180.0
    }
    model_params["nn_metrics"] = {
        "mae_minutes": round(float(nn_mae), 3),
        "rmse_minutes": round(float(nn_rmse), 3),
        "r2_score": round(float(nn_r2), 4)
    }
    with open(json_path, "w") as f:
        json.dump(model_params, f, indent=2)

except ImportError:
    print("  TensorFlow not available — skipping TFLite (model saved as JSON + pkl)")
    print("  Queue intelligence uses JSON parameters via queue-intelligence.ts")

# ── 6. Scatter plot ────────────────────────────────────────────────
print("\n[6/6] Generating performance plot...")

y_pred_best = best_model.predict(X_test)
other_model = gb if best_model is rf else rf
other_name  = "GradientBoosting" if best_model is rf else "RandomForest"
y_pred_other = other_model.predict(X_test)

fig, axes = plt.subplots(1, 2, figsize=(14, 6))
fig.patch.set_facecolor("#0A0A0A")

for ax in axes:
    ax.set_facecolor("#111111")
    ax.tick_params(colors="white")
    for spine in ax.spines.values():
        spine.set_color("#333333")
    ax.xaxis.label.set_color("white")
    ax.yaxis.label.set_color("white")
    ax.title.set_color("#C4F135")

# Left: best model actual vs predicted
ax1 = axes[0]
ax1.scatter(y_test, y_pred_best, alpha=0.35, s=8, color="#C4F135", label=f"{best_name} (winner)")
ax1.scatter(y_test, y_pred_other, alpha=0.2, s=5, color="#888888", label=other_name)
lims = [0, y_test.max()]
ax1.plot(lims, lims, "r--", linewidth=1.2, label="Perfect prediction")
ax1.set_xlabel("Actual Wait (min)")
ax1.set_ylabel("Predicted Wait (min)")
ax1.set_title(f"Model Comparison — Actual vs Predicted")
ax1.legend(facecolor="#222", edgecolor="#555", labelcolor="white", fontsize=8)

# Right: model metrics bar chart
ax2 = axes[1]
models_names = ["RandomForest", "GradientBoosting"]
maes  = [rf_mae, gb_mae]
rmses = [rf_rmse, gb_rmse]
x = np.arange(2)
bars1 = ax2.bar(x - 0.2, maes,  0.35, label="MAE (min)",  color="#C4F135", alpha=0.85)
bars2 = ax2.bar(x + 0.2, rmses, 0.35, label="RMSE (min)", color="#FF6B00", alpha=0.85)
ax2.set_xticks(x)
ax2.set_xticklabels(models_names, color="white", fontsize=9)
ax2.set_ylabel("Error (minutes)")
ax2.set_title("MAE & RMSE Comparison")
ax2.legend(facecolor="#222", edgecolor="#555", labelcolor="white", fontsize=8)
for bar in bars1:
    ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
             f"{bar.get_height():.1f}", ha="center", color="white", fontsize=8)
for bar in bars2:
    ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
             f"{bar.get_height():.1f}", ha="center", color="white", fontsize=8)

plt.tight_layout()
plot_path = os.path.join("ml", "wait_predictor_scatter.png")
plt.savefig(plot_path, dpi=120, bbox_inches="tight", facecolor="#0A0A0A")
print(f"  Plot saved: {plot_path}")

# ── Summary ────────────────────────────────────────────────────────
elapsed = time.time() - START
print("\n" + "=" * 60)
print("  RESULTS SUMMARY")
print("=" * 60)
print(f"  Best model               : {best_name}")
print(f"  MAE                      : {best_mae:.2f} min")
print(f"  RMSE                     : {best_rmse:.2f} min")
print(f"  R²                       : {best_r2:.4f}")
print(f"  Avg service time learned : {avg_service_time:.2f} min/person")
print(f"  Peak morning multiplier  : {pm:.3f}x")
print(f"  Peak afternoon multiplier: {pa:.3f}x")
print(f"  Busy day multiplier      : {dm:.3f}x")
if tflite_available:
    print(f"  TFLite model             : ml/wait_predictor.tflite")
else:
    print(f"  Model params (JSON)      : ml/wait_predictor.json")
    print(f"  Model binary (pkl)       : ml/wait_predictor.pkl")
print(f"  Plot                     : ml/wait_predictor_scatter.png")
print(f"  Total runtime            : {elapsed:.1f}s")
print("=" * 60)
if tflite_available:
    print("\n  TFLite ready for Android kiosk:")
    print("  android/app/src/main/assets/wait_predictor.tflite")
else:
    print("\n  Next step: update queue-intelligence.ts with JSON params")
    print("  python ml/apply_params.py  (auto-patches the TS file)")
print()
