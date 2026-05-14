type SpeakMessage = {
  action?: string;
  text?: unknown;
};

chrome.runtime.onMessage.addListener((request: SpeakMessage) => {
  if (request.action !== 'speak' || typeof request.text !== 'string') {
    return;
  }

  chrome.tts.speak(request.text, {
    lang: 'auto',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    onEvent(event) {
      if (event.type === 'error') {
        console.error('TTS Error:', event);
      }
    }
  });
});
