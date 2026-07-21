import ExpoModulesCore
import AVFoundation

/**
 * iOS has no foreground service; background capture is enabled by the app's
 * UIBackgroundModes=["audio"] plus an AVAudioSession configured for recording.
 * startService() puts the session into .playAndRecord and activates it so mic
 * capture continues when the screen locks; stopService() deactivates it.
 */
public class RxRecordingModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RxRecording")

    Function("startService") {
      let session = AVAudioSession.sharedInstance()
      try? session.setCategory(
        .playAndRecord,
        mode: .default,
        options: [.allowBluetooth, .defaultToSpeaker, .mixWithOthers]
      )
      try? session.setActive(true)
    }

    Function("stopService") {
      try? AVAudioSession.sharedInstance().setActive(
        false,
        options: [.notifyOthersOnDeactivation]
      )
    }

    // Encode a raw s16le PCM file to AAC/.m4a using AVFoundation's native encoder.
    // AVAudioFile converts our int16 buffers to the file's AAC format on write.
    AsyncFunction("encodeToM4a") { (pcmPath: String, outPath: String, sampleRate: Int, channels: Int, bitRate: Int) -> String in
      let data = try Data(contentsOf: URL(fileURLWithPath: pcmPath))
      guard let inputFormat = AVAudioFormat(
        commonFormat: .pcmFormatInt16,
        sampleRate: Double(sampleRate),
        channels: AVAudioChannelCount(channels),
        interleaved: true
      ) else {
        throw NSError(domain: "RxRecording", code: 1, userInfo: [NSLocalizedDescriptionKey: "Bad PCM format"])
      }

      let settings: [String: Any] = [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVSampleRateKey: sampleRate,
        AVNumberOfChannelsKey: channels,
        AVEncoderBitRateKey: bitRate,
      ]
      let outURL = URL(fileURLWithPath: outPath)
      try? FileManager.default.removeItem(at: outURL)
      let outFile = try AVAudioFile(
        forWriting: outURL,
        settings: settings,
        commonFormat: .pcmFormatInt16,
        interleaved: true
      )

      let bytesPerFrame = 2 * channels
      let totalFrames = data.count / bytesPerFrame
      let chunkFrames = 8192
      var frameOffset = 0

      try data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
        guard let src = raw.baseAddress else { return }
        while frameOffset < totalFrames {
          let framesThis = min(chunkFrames, totalFrames - frameOffset)
          guard let buffer = AVAudioPCMBuffer(
            pcmFormat: inputFormat,
            frameCapacity: AVAudioFrameCount(framesThis)
          ), let dst = buffer.int16ChannelData else {
            throw NSError(domain: "RxRecording", code: 2, userInfo: [NSLocalizedDescriptionKey: "Buffer alloc failed"])
          }
          buffer.frameLength = AVAudioFrameCount(framesThis)
          memcpy(dst[0], src.advanced(by: frameOffset * bytesPerFrame), framesThis * bytesPerFrame)
          try outFile.write(from: buffer)
          frameOffset += framesThis
        }
      }
      return outPath
    }
  }
}
