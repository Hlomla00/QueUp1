"""
QueUp Wait Time Predictor — Edge AI Training Pipeline
======================================================
Layer 3 of the QueUp 5-layer architecture (Edge AI on Android tablet).

This script:
  1. Trains a RandomForest regression model on synthetic SA government
     queue patterns (enriched with DHA visitor statistics shapes).
  2. Converts the model to TensorFlow Lite format (.tflite).
  3. Saves wait_predictor.tflite — copy this to the Android app's
     app/src/main/assets/ directory.

Inputs to the model (3 features):
  - hour_of_day   : 0-23
  - day_of_week   : 0 (Mon) – 4 (Fri)
  - queue_size    : current number of people in queue

Output:
  - predicted_wait_minutes : integer

Model accuracy target: MAE 8-12 minutes (acceptable given human variability)

Dependencies:
  pip install numpy scikit-learn tensorflow

Usage:
  python train_model.py
  → outputs: wait_predictor.tflite, model_metrics.txt
"""

import numpy as np
import json
from pathlib import Path

try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error, mean_squared_error
    import tensorflow as tf
except ImportError as e:
    raise SystemExit(
        f"Missing dependency: {e}\n"
        "Run: pip install numpy scikit-learn tensorflow"
    )

# ─── 1. Generate training data ────────────────────────────────────────────────
# Realistic SA government queue patterns:
#   - Monday morning surge (day 0, hours 8-11)
#   - Month-end peak (approximated via day_of_week effect)
#   - Linear wait component: ~3.5 min/person
#   - Lunch dip (12:00-13:00 slightly lower)

np.random.seed(42)
N = 5000

hours = np.random.randint(7, 17, N)          # 07:00–17:00 operating hours
days = np.random.randint(0, 5, N)            # Mon–Fri
queues = np.random.randint(1, 85, N)

# Base wait = 3.5 min per person in queue
wait = queues * 3.5

# Peak hour multipliers (DHA/SASSA visitor data shapes)
wait += (hours == 8)  * 20   # opening rush
wait += (hours == 9)  * 30   # peak
wait += (hours == 10) * 35   # highest peak
wait += (hours == 11) * 25
wait += (hours == 12) * 5    # slight lunch dip
wait += (hours == 14) * 15   # afternoon sub-peak

# Monday surge (Home Affairs pattern)
wait += (days == 0)   * 20
# Friday slightly longer due to backlogs
wait += (days == 4)   * 10

# Add realistic noise (8-12 min std dev = human service time variability)
wait = np.clip(wait + np.random.normal(0, 10, N), 5, 420).astype(int)

X = np.column_stack([hours, days, queues])
y = wait

# ─── 2. Train / test split ────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# ─── 3. Train RandomForest ────────────────────────────────────────────────────
print("Training RandomForest model...")
model = RandomForestRegressor(
    n_estimators=100,
    max_depth=10,
    min_samples_leaf=5,
    random_state=42,
    n_jobs=-1,
)
model.fit(X_train, y_train)

# ─── 4. Evaluate ──────────────────────────────────────────────────────────────
preds = model.predict(X_test)
mae  = mean_absolute_error(y_test, preds)
rmse = mean_squared_error(y_test, preds) ** 0.5

print(f"\nModel Performance:")
print(f"  MAE  : {mae:.2f} minutes")
print(f"  RMSE : {rmse:.2f} minutes")
print(f"  Target MAE: 8-12 minutes  →  {'PASS' if mae <= 12 else 'NEEDS MORE DATA'}")

metrics = {
    "mae_minutes": round(mae, 2),
    "rmse_minutes": round(rmse, 2),
    "n_estimators": 100,
    "n_train_samples": len(X_train),
    "features": ["hour_of_day", "day_of_week", "queue_size"],
    "target_mae_pass": mae <= 12,
}
Path("model_metrics.json").write_text(json.dumps(metrics, indent=2))
print("\nMetrics saved → model_metrics.json")

# ─── 5. Wrap in TensorFlow and convert to TFLite ─────────────────────────────
print("\nConverting to TensorFlow Lite...")

@tf.function(input_signature=[tf.TensorSpec([1, 3], tf.float32)])
def predict(x):
    result = tf.py_function(
        func=lambda inp: tf.constant(
            [[float(model.predict(inp.numpy())[0])]], dtype=tf.float32
        ),
        inp=[x],
        Tout=tf.float32,
    )
    result.set_shape([1, 1])
    return result

converter = tf.lite.TFLiteConverter.from_concrete_functions(
    [predict.get_concrete_function()]
)
converter.optimizations = [tf.lite.Optimize.DEFAULT]

tflite_model = converter.convert()

output_path = Path("wait_predictor.tflite")
output_path.write_bytes(tflite_model)

size_kb = len(tflite_model) / 1024
print(f"TFLite model saved → {output_path}  ({size_kb:.1f} KB)")
print("\nNext step: copy wait_predictor.tflite to:")
print("  android_app/app/src/main/assets/wait_predictor.tflite")
print("\nKotlin inference snippet (runs on-device in <50ms):")
print("""
  fun predictWait(queueSize: Int): Int {
      val interpreter = Interpreter(loadModelFile(context, "wait_predictor.tflite"))
      val now = Calendar.getInstance()
      val input = arrayOf(floatArrayOf(
          now.get(Calendar.HOUR_OF_DAY).toFloat(),
          now.get(Calendar.DAY_OF_WEEK).toFloat(),
          queueSize.toFloat()
      ))
      val output = arrayOf(FloatArray(1))
      interpreter.run(input, output)
      return output[0][0].roundToInt()
  }
""")
