// 只保留 TTS 相关的功能
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'speak') {
    // 使用 Chrome TTS API
    chrome.tts.speak(request.text, {
      lang: 'auto',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      onEvent: function(event) {
        if (event.type === 'error') {
          console.error('TTS Error:', event);
        }
      }
    });
  }
});
  