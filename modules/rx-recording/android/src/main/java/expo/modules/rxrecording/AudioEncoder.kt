package expo.modules.rxrecording

import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import java.io.File

/**
 * One-shot encoder: raw s16le PCM file → AAC-LC in an .m4a container, using the
 * OS-native MediaCodec + MediaMuxer (no third-party codec). Runs synchronously;
 * call it from an AsyncFunction so it stays off the JS thread.
 */
object AudioEncoder {
  fun encodePcmToM4a(
    pcmPath: String,
    outPath: String,
    sampleRate: Int,
    channels: Int,
    bitRate: Int,
  ) {
    val pcm = File(pcmPath).readBytes()
    val total = pcm.size

    val format = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, sampleRate, channels).apply {
      setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC)
      setInteger(MediaFormat.KEY_BIT_RATE, bitRate)
      setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, 16384)
    }

    val codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC)
    codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
    codec.start()

    val muxer = MediaMuxer(outPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    var trackIndex = -1
    var muxerStarted = false

    val info = MediaCodec.BufferInfo()
    val bytesPerFrame = 2 * channels
    // microseconds per PCM byte, for presentation timestamps
    val usPerByte = 1_000_000.0 / (sampleRate.toDouble() * bytesPerFrame) * channels
    var inOffset = 0
    var sawInputEOS = false
    var sawOutputEOS = false

    try {
      while (!sawOutputEOS) {
        if (!sawInputEOS) {
          val inIndex = codec.dequeueInputBuffer(10_000)
          if (inIndex >= 0) {
            val inBuf = codec.getInputBuffer(inIndex)!!
            inBuf.clear()
            val chunk = minOf(inBuf.capacity(), total - inOffset)
            if (chunk > 0) inBuf.put(pcm, inOffset, chunk)
            val ptsUs = (inOffset.toDouble() * usPerByte).toLong()
            if (inOffset + chunk >= total) {
              codec.queueInputBuffer(inIndex, 0, chunk, ptsUs, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
              sawInputEOS = true
            } else {
              codec.queueInputBuffer(inIndex, 0, chunk, ptsUs, 0)
            }
            inOffset += chunk
          }
        }

        val outIndex = codec.dequeueOutputBuffer(info, 10_000)
        when {
          outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
            trackIndex = muxer.addTrack(codec.outputFormat)
            muxer.start()
            muxerStarted = true
          }
          outIndex >= 0 -> {
            val outBuf = codec.getOutputBuffer(outIndex)!!
            val isConfig = info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0
            if (info.size > 0 && muxerStarted && !isConfig) {
              outBuf.position(info.offset)
              outBuf.limit(info.offset + info.size)
              muxer.writeSampleData(trackIndex, outBuf, info)
            }
            codec.releaseOutputBuffer(outIndex, false)
            if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) sawOutputEOS = true
          }
        }
      }
    } finally {
      try { codec.stop() } catch (_: Exception) {}
      codec.release()
      if (muxerStarted) {
        try { muxer.stop() } catch (_: Exception) {}
      }
      muxer.release()
    }
  }
}
