package expo.modules.rxrecording

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * Microphone-type foreground service. Holds the process + mic access alive so the
 * existing AudioRecord-based PCM capture keeps producing audio while the app is
 * backgrounded or the screen is locked. Shows a persistent, low-priority
 * notification as required by Android for a mic foreground service.
 */
class RecordingService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val channelId = "rx_recording"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (nm.getNotificationChannel(channelId) == null) {
        nm.createNotificationChannel(
          NotificationChannel(channelId, "Recording", NotificationManager.IMPORTANCE_LOW).apply {
            setShowBadge(false)
          }
        )
      }
    }

    val notification: Notification = NotificationCompat.Builder(this, channelId)
      .setContentTitle("RxNote is recording")
      .setContentText("Your consultation is being recorded.")
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
    } else {
      startForeground(NOTIF_ID, notification)
    }
    return START_STICKY
  }

  companion object {
    private const val NOTIF_ID = 4711
  }
}
