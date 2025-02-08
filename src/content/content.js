let translatePopup = null;
let translateIcon = null;
let isSelecting = false;
let lastSelectedText = ''; // 存储选中的原始文本

// 创建翻译图标
function createIcon() {
  const icon = document.createElement('div');
  icon.id = 'translate-icon';
  icon.innerHTML = `
    <svg width='20' height='20' viewBox='0 0 24 24' fill='#4285f4'>
      <path d='M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z'/>
    </svg>
  `;

  icon.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const textToTranslate = lastSelectedText || window.getSelection().toString().trim();
    if (textToTranslate) {
      icon.style.display = 'none';
      await showTranslation(textToTranslate, e.clientX, e.clientY + 10);
    }
  });

  document.body.appendChild(icon);
  return icon;
}

// 创建翻译弹窗
function createPopup() {
	const popup = document.createElement('div');
	popup.classList.add('translate-popup');
	document.body.appendChild(popup);
  return popup;
}

// 显示翻译结果
async function showTranslation(text, x, y) {
  if (!translatePopup) {
    translatePopup = createPopup();
  }

  translatePopup.style.display = 'block';
  translatePopup.style.visibility = 'hidden';
  translatePopup.innerHTML = '<div>翻译中...</div>';

  // 获取视窗和弹窗尺寸
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const popupRect = translatePopup.getBoundingClientRect();
  const popupWidth = popupRect.width;
  const popupHeight = popupRect.height;

  // 计算最终位置，确保不会溢出屏幕
  let finalX = x;
  let finalY = y;

  // 处理水平方向
  if (x + popupWidth > viewportWidth) {
    finalX = viewportWidth - popupWidth - 20; // 20px 作为右边距
  }
  if (finalX < 0) {
    finalX = 20; // 20px 作为左边距
  }

  // 处理垂直方向
  if (y + popupHeight > viewportHeight) {
    finalY = y - popupHeight - 10; // 向上显示，10px 作为偏移
  }
  if (finalY < 0) {
    finalY = 20; // 20px 作为上边距
  }

  // 应用计算后的位置
  translatePopup.style.left = `${finalX}px`;
  translatePopup.style.top = `${finalY}px`;
  translatePopup.style.visibility = 'visible';

  try {
    const translation = await fetchTranslation(text);

    translatePopup.innerHTML = `
      <div class='translation-header ${Object.keys(translation.partsOfSpeech).length > 0 ? 'with-parts' : ''}'>
        <div class='original-text-container'>
          <div class='original-text'>${text}</div>
          <button id='speak-button'>
            <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
              <path d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-.77-3.37-2-4.47v8.94c1.23-1.1 2-2.7 2-4.47z'/>
            </svg>
          </button>
        </div>
        <div class='translated-text'>${translation.text}</div>
      </div>
      ${Object.keys(translation.partsOfSpeech).length > 0 ? 
        Object.entries(translation.partsOfSpeech).map(([pos, meanings]) => `
          <div class='pos-section'>
            <div class='pos-label'>${getPosLabel(pos)}</div>
            <div class='meanings-container'>
              ${meanings.map(meaning => 
                `<span class='meaning-item'>${meaning}</span>`
              ).join('')}
            </div>
          </div>
        `).join('')
        : ''
      }
    `;

    const speakButton = document.getElementById('speak-button');
    speakButton.addEventListener('click', (e) => {
      e.stopPropagation();
      speakText(text);
    });
  } catch (error) {
    translatePopup.innerHTML = `<div class='translation-error'>翻译失败</div>`;
  }
}

// 翻译功能
async function fetchTranslation(text) {
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&dt=rm&dt=bd&q=${encodeURIComponent(text)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // 解析返回的数据
    const translation = {
      text: result[0][0][0], // 基本翻译
      partsOfSpeech: {} // 按词性分类的翻译
    };

    // 解析词性和对应的翻译（从第1个数组获取）
    if (result[1]) {
      result[1].forEach(item => {
        const pos = item[0]; // 词性
        const meanings = item[1]; // 该词性下的所有含义
        translation.partsOfSpeech[pos] = meanings;
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

  // 直接使用传入的坐标，不做复杂的计算
  translateIcon.style.left = `${x}px`;
  translateIcon.style.top = `${y}px`;
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

    // 获取当前距离
    const iconX = e.clientX - 14;
    const iconY = e.clientY + 10;

    // 显示图标
    showIcon(iconX, iconY);
  }
});

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
