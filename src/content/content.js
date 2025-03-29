/**
 * 网页划词翻译扩展
 * 功能：在鼠标选择文本后显示翻译图标，点击后显示翻译弹窗，支持词性解析和语音朗读
 */
class TextTranslator {
	// 模块常量
	static POS_LABELS = {
		noun: '名词',
		verb: '动词',
		adjective: '形容词',
		adverb: '副词',
		preposition: '介词',
		conjunction: '连词',
		pronoun: '代词',
		interjection: '感叹词'
	};

	// 模块状态
	constructor() {
		this.translatePopup = null;
		this.translateIcon = null;
		this.lastSelectedText = '';
		this.initEventListeners();
	}

	// 初始化事件监听
	initEventListeners() {
		document.addEventListener('mousedown', this.handleDocumentMouseDown);
		document.addEventListener('mouseup', this.handleDocumentMouseUp);
	}

	// 事件处理器：鼠标按下
	handleDocumentMouseDown = (event) => {
		if (this.isUIElementClicked(event.target)) return;
		this.hideUIElements();
	}

	// 事件处理器：鼠标释放
	handleDocumentMouseUp = (event) => {
		const selection = window.getSelection().toString().trim();

		if (selection) {
			this.lastSelectedText = selection;
			this.showTranslationIcon(event.clientX, event.clientY);
		}
	}

	getIconSVG() {
		return `
      <svg width='20' height='20' viewBox='0 0 24 24' fill='#4285f4'>
        <path d='M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z'/>
      </svg>
    `;
	}

	/* ========== UI 组件管理 ========== */
	// 创建翻译图标
	createTranslationIcon() {
		const icon = document.createElement('div');
		icon.id = 'translate-icon';
		icon.innerHTML = this.getIconSVG();
		icon.addEventListener('click', this.handleIconClick);
		document.body.appendChild(icon);
		return icon;
	}

	// 新增错误提示方法
	showErrorMessage() {
		this.translatePopup.innerHTML = `<div class='translation-error'>翻译失败</div>`;
	}


	// 创建翻译弹窗
	createTranslationPopup() {
		const popup = document.createElement('div');
		popup.className = 'translate-popup';
		document.body.appendChild(popup);
		return popup;
	}

	// 显示翻译图标
	showTranslationIcon(x, y) {
		if (!this.translateIcon) {
			this.translateIcon = this.createTranslationIcon();
		}

		Object.assign(this.translateIcon.style, {
			left: `${x - 14}px`,
			top: `${y + 10}px`,
			display: 'flex',
			opacity: '1',
			transform: 'translateY(0)'
		});
	}

	// 更新弹窗内容
	updatePopupContent(translationResult, originalText) {
		this.translatePopup.innerHTML = `
      <div class="translation-header ${translationResult.hasPartsOfSpeech ? 'with-parts' : ''}">
        ${this.createHeaderContent(originalText, translationResult.text)}
      </div>
      ${translationResult.hasPartsOfSpeech ? this.createPartsOfSpeechHTML(translationResult.partsOfSpeech) : ''}
    `;

		this.addSpeechHandler(originalText);
	}

	/* ========== 核心功能 ========== */
	// 处理翻译图标点击
	handleIconClick = async (event) => {
		event.preventDefault();
		event.stopPropagation();

		const text = this.lastSelectedText;
		if (!text) return;

		this.translateIcon.style.display = 'none';
		await this.showTranslation(text, event.clientX, event.clientY + 10);
	}

	// 显示翻译弹窗
	async showTranslation(text, x, y) {
		if (!this.translatePopup) {
			this.translatePopup = this.createTranslationPopup();
		}

		this.initializePopupPosition(x, y);

		try {
			const translationResult = await this.fetchTranslation(text);
			this.updatePopupContent(translationResult, text);
		} catch (error) {
			this.showErrorMessage();
		}
	}

	// 获取翻译结果
	async fetchTranslation(text) {
		try {
			const response = await fetch(this.buildAPIUrl(text));
			if (!response.ok) throw new Error(`HTTP错误 ${response.status}`);
			return this.parseTranslationData(await response.json());
		} catch (error) {
			console.error('翻译失败:', error);
			throw error;
		}
	}

	/* ========== 工具方法 ========== */
	// 构建Google翻译API URL
	buildAPIUrl(text) {
		return `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&dt=rm&dt=bd&q=${encodeURIComponent(text)}`;
	}

	// 解析翻译API响应
	parseTranslationData(apiResponse) {
		const result = {
			text: apiResponse[0][0][0],
			partsOfSpeech: {},
			hasPartsOfSpeech: false
		};

		if (apiResponse[1]) {
			apiResponse[1].forEach(([partOfSpeech, meanings]) => {
				result.partsOfSpeech[partOfSpeech] = meanings;
			});
			result.hasPartsOfSpeech = Object.keys(result.partsOfSpeech).length > 0;
		}

		return result;
	}

	// 获取词性中文标签
	getLocalizedPartOfSpeech(pos) {
		return TextTranslator.POS_LABELS[pos.toLowerCase()] || pos;
	}

	// 创建词性区块HTML
	createPartsOfSpeechHTML(parts) {
		return Object.entries(parts).map(([pos, meanings]) => `
      <div class="pos-section">
        <div class="pos-label">${this.getLocalizedPartOfSpeech(pos)}</div>
        <div class="meanings-container">
          ${meanings.map(m => `<span class="meaning-item">${m}</span>`).join('')}
        </div>
      </div>
    `).join('');
	}

	// 新增缺失的方法
	isUIElementClicked(targetElement) {
		return (
			(this.translateIcon && this.translateIcon.contains(targetElement)) ||
			(this.translatePopup && this.translatePopup.contains(targetElement))
		);
	}

	// 修改后的 hideUIElements 方法
	hideUIElements() {
		if (this.translateIcon) this.translateIcon.style.display = 'none';
		if (this.translatePopup) this.translatePopup.style.display = 'none';
	}

	// 新增语音处理逻辑
	addSpeechHandler(text) {
		const speakButton = this.translatePopup.querySelector('#speak-button');
		if (speakButton) {
			speakButton.addEventListener('click', (e) => {
				e.stopPropagation();
				this.speakText(text);
			});
		}
	}

	// 新增语音朗读功能
	speakText(text) {
		if (!text) return;
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		window.speechSynthesis.speak(utterance);
	}

	// 新增弹窗头部内容生成
	createHeaderContent(originalText, translatedText) {
		return `
      <div class='original-text-container'>
        <div class='original-text'>${originalText}</div>
        <button id='speak-button'>
          <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
            <path d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-.77-3.37-2-4.47v8.94c1.23-1.1 2-2.7 2-4.47z'/>
          </svg>
        </button>
      </div>
      <div class='translated-text'>${translatedText}</div>
    `;
	}

	// 修正弹窗位置初始化
	initializePopupPosition(x, y) {
		this.translatePopup.style.display = 'block';
		this.translatePopup.style.visibility = 'hidden';
		this.translatePopup.innerHTML = '<div>翻译中...</div>';

		// 延迟获取正确尺寸
		requestAnimationFrame(() => {
			const popupRect = this.translatePopup.getBoundingClientRect();
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			// 位置计算逻辑
			let finalX = x;
			let finalY = y;

			if (x + popupRect.width > viewportWidth) {
				finalX = viewportWidth - popupRect.width - 20;
			}
			finalX = Math.max(20, finalX);

			if (y + popupRect.height > viewportHeight) {
				finalY = y - popupRect.height - 10;
			}
			finalY = Math.max(20, finalY);

			Object.assign(this.translatePopup.style, {
				left: `${finalX}px`,
				top: `${finalY}px`,
				visibility: 'visible'
			});
		});
	}
}

// 初始化翻译器实例
new TextTranslator();
