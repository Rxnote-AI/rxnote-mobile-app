package expo.modules.rxrecording

import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlin.concurrent.thread

class RxRecordingModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RxRecording")

    // Start the mic foreground service. Called on the Record tap (app in foreground)
    // so Android permits starting a microphone-type FGS.
    Function("startService") {
      val context = appContext.reactContext
      if (context != null) {
        val intent = Intent(context, RecordingService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
      }
    }

    Function("stopService") {
      val context = appContext.reactContext
      if (context != null) {
        context.stopService(Intent(context, RecordingService::class.java))
      }
    }

    // Encode a raw s16le PCM file to AAC/.m4a off the JS thread. Resolves with the
    // output path, or rejects so JS can fall back to uploading the WAV.
    AsyncFunction("encodeToM4a") { pcmPath: String, outPath: String, sampleRate: Int, channels: Int, bitRate: Int, promise: Promise ->
      thread {
        try {
          AudioEncoder.encodePcmToM4a(pcmPath, outPath, sampleRate, channels, bitRate)
          promise.resolve(outPath)
        } catch (e: Exception) {
          promise.reject("ENCODE_FAILED", e.message ?: "AAC encoding failed", e)
        }
      }
    }
  }
}
