let translatePopup = null;
let translateIcon = null;
let isSelecting = false;
let lastSelectedText = ''; // 存储选中的原始文本

// 创建翻译图标
function createIcon() {
  const icon = document.createElement('div');
  icon.id = 'translate-icon';
  icon.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#4285f4">
      <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
    </svg>
  `;
  
  // 设置初始样式
  icon.style.position = 'fixed';
  icon.style.background = 'white';
  icon.style.borderRadius = '50%';
  icon.style.width = '28px';
  icon.style.height = '28px';
  icon.style.display = 'none';
  icon.style.alignItems = 'center';
  icon.style.justifyContent = 'center';
  icon.style.cursor = 'pointer';
  icon.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
  icon.style.zIndex = '999999';
  icon.style.pointerEvents = 'auto';
  icon.style.opacity = '0';
  icon.style.transform = 'translateY(-10px)';
  icon.style.transition = 'all 0.2s ease';

  icon.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const textToTranslate = lastSelectedText || window.getSelection().toString().trim();
    if (textToTranslate) {
      icon.style.display = 'none'; // 隐藏图标
      await showTranslation(textToTranslate, e.clientX + window.scrollX, e.clientY + window.scrollY + 10);
    }
  });

  document.body.appendChild(icon);
  return icon;
}

// 创建翻译弹窗
function createPopup() {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position: fixed;
    background: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 20px rgba(0,0,0,0.1);
    z-index: 999999;
    max-width: 300px;
    min-width: 200px;
    min-height: 50px;
    display: none;
    pointer-events: auto;
    font-size: 14px;
    line-height: 1.5;
    border: 1px solid #e0e0e0;
    color: #333;
  `;
  document.body.appendChild(popup);
  return popup;
}

// 显示翻译结果
async function showTranslation(text, x, y) {
  if (!translatePopup) {
    translatePopup = createPopup();
  }

  translatePopup.style.left = `${x}px`;
  translatePopup.style.top = `${y}px`;
  translatePopup.style.display = 'block';
  translatePopup.innerHTML = '<div>翻译中...</div>';

  try {
    const translation = await fetchTranslation(text);
    
    translatePopup.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="color: #666;">${text}</div>
        <button id="speak-button" style="display: flex; align-items: center; padding: 3px; font-size: 12px; cursor: pointer; border: none; border-radius: 3px; background-color: transparent; color: #4285f4;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-.77-3.37-2-4.47v8.94c1.23-1.1 2-2.7 2-4.47z"/>
          </svg>
        </button>
        <span style="color: #999;">→</span>
        <div style="color: #333;">${translation.text}</div>
      </div>
      ${translation.definitions.map(def => `
        <div style="margin-top: 12px;">
          <div style="color: #666; font-size: 13px; margin-bottom: 4px;">
            ${getPosLabel(def.pos)}
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${def.meanings.map((meaning, index) => `
              <div>
                <div style="color: #333;">${index + 1}. ${meaning}</div>
                ${def.examples[index] ? `
                  <div style="color: #666; font-size: 12px; margin-top: 4px; font-style: italic;">
                    例：${def.examples[index]}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    `;

    const speakButton = document.getElementById('speak-button');
    speakButton.addEventListener('click', (e) => {
      e.stopPropagation();
      speakText(text);
    });
  } catch (error) {
    translatePopup.innerHTML = '<div>翻译失败</div>';
  }
}

// 翻译功能
async function fetchTranslation(text) {
  try {
    // 添加更多的 dt 参数来获取完整的翻译信息
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&q=${encodeURIComponent(text)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Translation API response:', result);

    // 解析返回的数据
    const translation = {
      text: result[0][0][0], // 基本翻译
      details: [], // 词性详细释义
      definitions: [] // 详细解释
    };

    // 解析词性和释义（从第5个数组获取详细信息）
    if (result[1]) {
      result[1].forEach(item => {
        if (item[0]) {
          translation.details.push({
            pos: item[0], // 词性
            meanings: item[1] // 该词性下的各种含义
          });
        }
      });
    }

    // 解析详细释义（如果存在）
    if (result[12]) {
      result[12].forEach(item => {
        if (item[0]) {
          translation.definitions.push({
            pos: item[0], // 词性
            meanings: item[1], // 释义列表
            examples: item[2] || [] // 示例（如果有）
          });
        }
      });
    }

    return translation;
  } catch (error) {
    console.error('Translation API error:', error);
    throw error;
  }
}

// 朗读文本
function speakText(text) {
  if (!text) return;

  // 停止当前正在播放的语音
  window.speechSynthesis.cancel();

  // 创建语音实例
  const utterance = new SpeechSynthesisUtterance(text);
  
  // 获取可用的语音列表
  const voices = window.speechSynthesis.getVoices();
  
  // 根据文本语言选择合适的语音
  if (/^[\u4e00-\u9fa5]+$/.test(text)) {
    // 如果是中文文本
    const chineseVoice = voices.find(voice => voice.lang.includes('zh'));
    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }
    utterance.lang = 'zh-CN';
  } else {
    // 如果是英文或其他语言
    const englishVoice = voices.find(voice => voice.lang.includes('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    utterance.lang = 'en-US';
  }

  // 设置语音参数
  utterance.rate = 1.0;  // 语速
  utterance.pitch = 1.0; // 音高
  utterance.volume = 1.0; // 音量

  // 播放语音
  window.speechSynthesis.speak(utterance);
}

// 显示翻译图标
function showIcon(x, y) {
  if (!translateIcon) {
    translateIcon = createIcon();
  }

  // 直接设置样式，而不是累加
  translateIcon.style.left = `${Math.max(0, x)}px`;
  translateIcon.style.top = `${Math.max(0, y)}px`;
  translateIcon.style.display = 'flex';
  translateIcon.style.opacity = '1';
  translateIcon.style.transform = 'translateY(0)';
}

// 隐藏所有元素
function hideElements() {
  if (translateIcon) translateIcon.style.display = 'none';
  if (translatePopup) translatePopup.style.display = 'none';
}

// 监听鼠标操作
document.addEventListener('mousedown', (e) => {
  if ((translateIcon && translateIcon.contains(e.target)) || 
      (translatePopup && translatePopup.contains(e.target))) {
    return;
  }
  isSelecting = true;
  hideElements();
});

document.addEventListener('mouseup', (e) => {
  isSelecting = false;
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    lastSelectedText = selectedText;
    // 使用鼠标事件的位置来显示图标
    const iconX = e.pageX - 14; // 图标宽度的一半，使其居中于鼠标位置
    const iconY = e.pageY + 10; // 鼠标下方10px
    showIcon(iconX, iconY);
  }
});

// 消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    showTranslation(request.text, rect.left + window.scrollX, rect.bottom + window.scrollY + 5);
  }
});

// 获取动词形式
function getVerbForms(word) {
  // 这里可以通过API获取动词变形，或者使用预定义的动词表
  // 这是一个简单的示例
  const verbForms = [
    { label: '防止', forms: ['防止', '预防', '阻止', '避免', '制止', '避', '免除', '抵制', '杜', '警告', '戒'] }
  ];

  const matchedVerb = verbForms.find(v => v.label === word);
  if (matchedVerb) {
    return matchedVerb.forms.map(form => 
      `<span style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${form}</span>`
    ).join('');
  }
  return '无相关动词形式';
}

// 词性标签转换
function getPosLabel(pos) {
  const posMap = {
    'noun': '名词',
    'verb': '动词',
    'adjective': '形容词',
    'adverb': '副词',
    'preposition': '介词',
    'conjunction': '连词',
    'pronoun': '代词',
    'interjection': '感叹词'
  };
  return posMap[pos.toLowerCase()] || pos;
}
