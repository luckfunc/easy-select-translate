// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translateSelection",
    title: "翻译选中文本",
    contexts: ["selection"]
  });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateSelection") {
    chrome.tabs.sendMessage(tab.id, {
      action: "translate",
      text: info.selectionText
    });
  }
});

// 监听来自 content script 的消息
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
  