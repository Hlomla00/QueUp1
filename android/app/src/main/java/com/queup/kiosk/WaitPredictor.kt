package com.queup.kiosk

import android.content.Context
import android.util.Log
import org.tensorflow.lite.Interpreter
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel

/**
 * WaitPredictor — TFLite edge AI for offline queue wait prediction.
 *
 * Model input : [hour_of_day (float), day_of_week (float), queue_size (float)]
 * Model output: [predicted_wait_minutes (float)]
 *
 * The .tflite model is trained by ml/train_wait_predictor.py and
 * copied into android/app/src/main/assets/wait_predictor.tflite
 */
class WaitPredictor(private val context: Context) {

    companion object {
        private const val TAG = "WaitPredictor"
        private const val MODEL_FILE = "wait_predictor.tflite"
        private const val NUM_INPUT_FEATURES = 3
        private const val NUM_OUTPUT_FEATURES = 1
    }

    private var interpreter: Interpreter? = null
    private var isLoaded = false

    // ── Load model from assets ────────────────────────────────────────────────
    fun load(): Boolean {
        return try {
            val modelBuffer = loadModelFile()
            val options = Interpreter.Options().apply {
                setNumThreads(2)
                setUseXNNPACK(true)
            }
            interpreter = Interpreter(modelBuffer, options)
            isLoaded = true
            Log.i(TAG, "TFLite model loaded successfully: $MODEL_FILE")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load TFLite model: ${e.message}")
            isLoaded = false
            false
        }
    }

    /**
     * Predict wait time in minutes.
     *
     * @param hourOfDay  0-23
     * @param dayOfWeek  0=Monday … 6=Sunday
     * @param queueSize  current number of people waiting
     * @return predicted wait in minutes, or -1 if model not loaded
     */
    fun predict(hourOfDay: Int, dayOfWeek: Int, queueSize: Int): Float {
        if (!isLoaded || interpreter == null) {
            Log.w(TAG, "Model not loaded — returning heuristic fallback")
            return heuristicFallback(queueSize)
        }

        return try {
            // Input buffer: 3 floats
            val inputBuffer = ByteBuffer.allocateDirect(NUM_INPUT_FEATURES * 4).apply {
                order(ByteOrder.nativeOrder())
                putFloat(hourOfDay.toFloat())
                putFloat(dayOfWeek.toFloat())
                putFloat(queueSize.toFloat())
                rewind()
            }

            // Output buffer: 1 float
            val outputBuffer = ByteBuffer.allocateDirect(NUM_OUTPUT_FEATURES * 4).apply {
                order(ByteOrder.nativeOrder())
            }

            interpreter!!.run(inputBuffer, outputBuffer)
            outputBuffer.rewind()
            val result = outputBuffer.float

            Log.d(TAG, "Prediction: hour=$hourOfDay day=$dayOfWeek queue=$queueSize → ${result}min")
            result.coerceAtLeast(0f)
        } catch (e: Exception) {
            Log.e(TAG, "Inference error: ${e.message}")
            heuristicFallback(queueSize)
        }
    }

    /** Simple heuristic fallback when model is unavailable */
    private fun heuristicFallback(queueSize: Int): Float {
        return (queueSize * 12).toFloat() // 12 min avg service time
    }

    private fun loadModelFile(): MappedByteBuffer {
        val assetFileDescriptor = context.assets.openFd(MODEL_FILE)
        val fileInputStream = FileInputStream(assetFileDescriptor.fileDescriptor)
        val fileChannel = fileInputStream.channel
        val startOffset = assetFileDescriptor.startOffset
        val declaredLength = assetFileDescriptor.declaredLength
        return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)
    }

    fun close() {
        interpreter?.close()
        interpreter = null
        isLoaded = false
        Log.i(TAG, "TFLite interpreter closed")
    }

    fun isReady() = isLoaded
}
