Pod::Spec.new do |s|
  s.name           = 'RxRecording'
  s.version        = '0.1.0'
  s.summary        = 'Background mic hold: iOS AVAudioSession config + (Android) mic foreground service.'
  s.description    = 'Keeps RxNote mic capture alive while backgrounded / screen locked.'
  s.author         = 'RxNote'
  s.homepage       = 'https://rxnote.ai'
  s.platforms      = { :ios => '15.1', :tvos => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
