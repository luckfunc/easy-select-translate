/**
 * 网页划词翻译扩展
 * 功能：在鼠标选择文本后显示翻译图标，点击后显示翻译弹窗，支持词性解析和语音朗读
 */
type PopupAnchor = {
  x: number;
  y: number;
};

type TranslationResult = {
  text: string;
  partsOfSpeech: Record<string, string[]>;
  hasPartsOfSpeech: boolean;
};

class TextTranslator {
  private static readonly POS_LABELS: Record<string, string> = {
    noun: '名词',
    verb: '动词',
    adjective: '形容词',
    adverb: '副词',
    preposition: '介词',
    conjunction: '连词',
    pronoun: '代词',
    interjection: '感叹词'
  };

  private translatePopup: HTMLDivElement | null = null;
  private translateIcon: HTMLDivElement | null = null;
  private lastSelectedText = '';
  private lastPopupAnchor: PopupAnchor | null = null;

  constructor() {
    this.initEventListeners();
  }

  private initEventListeners(): void {
    document.addEventListener('mousedown', this.handleDocumentMouseDown);
    document.addEventListener('mouseup', this.handleDocumentMouseUp);
  }

  private readonly handleDocumentMouseDown = (event: MouseEvent): void => {
    if (event.target instanceof Node && this.isUIElementClicked(event.target)) {
      return;
    }

    this.hideUIElements();
  };

  private readonly handleDocumentMouseUp = (event: MouseEvent): void => {
    const selection = window.getSelection()?.toString().trim() ?? '';

    if (selection) {
      this.lastSelectedText = selection;
      this.showTranslationIcon(event.clientX, event.clientY);
    }
  };

  private getIconSVG(): string {
    return `
      <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'>
        <path d='M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z'/>
      </svg>
    `;
  }

  private createTranslationIcon(): HTMLDivElement {
    const icon = document.createElement('div');
    icon.id = 'translate-icon';
    icon.innerHTML = this.getIconSVG();
    icon.addEventListener('click', this.handleIconClick);
    document.body.appendChild(icon);

    return icon;
  }

  private showErrorMessage(): void {
    if (!this.translatePopup) {
      return;
    }

    this.translatePopup.innerHTML = `<div class='translation-error'>翻译失败</div>`;
    this.repositionPopup();
  }

  private createTranslationPopup(): HTMLDivElement {
    const popup = document.createElement('div');
    popup.className = 'translate-popup';
    document.body.appendChild(popup);

    return popup;
  }

  private showTranslationIcon(x: number, y: number): void {
    if (!this.translateIcon) {
      this.translateIcon = this.createTranslationIcon();
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const iconSize = 24;
    const margin = 8;
    const finalX = Math.min(Math.max(x - 14, margin), viewportWidth - iconSize - margin);
    const finalY = Math.min(Math.max(y + 10, margin), viewportHeight - iconSize - margin);

    Object.assign(this.translateIcon.style, {
      left: `${finalX}px`,
      top: `${finalY}px`,
      display: 'flex',
      opacity: '1',
      transform: 'translateY(0)'
    });
  }

  private updatePopupContent(translationResult: TranslationResult, originalText: string): void {
    if (!this.translatePopup) {
      return;
    }

    this.translatePopup.innerHTML = `
      <div class='translation-header ${translationResult.hasPartsOfSpeech ? 'with-parts' : ''}'>
        ${this.createHeaderContent(originalText, translationResult.text)}
      </div>
      ${translationResult.hasPartsOfSpeech ? this.createPartsOfSpeechHTML(translationResult.partsOfSpeech) : ''}
    `;

    this.addSpeechHandler(originalText);
    this.repositionPopup();
  }

  private readonly handleIconClick = async (event: MouseEvent): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

    const text = this.lastSelectedText;
    if (!text) {
      return;
    }

    if (this.translateIcon) {
      this.translateIcon.style.display = 'none';
    }

    await this.showTranslation(text, event.clientX, event.clientY + 10);
  };

  private async showTranslation(text: string, x: number, y: number): Promise<void> {
    if (!this.translatePopup) {
      this.translatePopup = this.createTranslationPopup();
    }

    this.lastPopupAnchor = { x, y };
    this.initializePopupPosition(x, y);

    try {
      const translationResult = await this.fetchTranslation(text);
      this.updatePopupContent(translationResult, text);
    } catch (error) {
      console.error('翻译失败:', error);
      this.showErrorMessage();
    }
  }

  private async fetchTranslation(text: string): Promise<TranslationResult> {
    const response = await fetch(this.buildAPIUrl(text));

    if (!response.ok) {
      throw new Error(`HTTP错误 ${response.status}`);
    }

    const apiResponse: unknown = await response.json();
    return this.parseTranslationData(apiResponse);
  }

  private buildAPIUrl(text: string): string {
    return `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&dt=rm&dt=bd&q=${encodeURIComponent(text)}`;
  }

  private parseTranslationData(apiResponse: unknown): TranslationResult {
    const response = Array.isArray(apiResponse) ? apiResponse : [];
    const translations = Array.isArray(response[0]) ? response[0] : [];
    const firstTranslation = Array.isArray(translations[0]) ? translations[0] : [];
    const text = typeof firstTranslation[0] === 'string' ? firstTranslation[0] : '';
    const partsOfSpeech: Record<string, string[]> = {};
    const dictionary = Array.isArray(response[1]) ? response[1] : [];

    dictionary.forEach((entry) => {
      if (!Array.isArray(entry)) {
        return;
      }

      const [partOfSpeech, meanings] = entry;

      if (typeof partOfSpeech !== 'string' || !Array.isArray(meanings)) {
        return;
      }

      const filteredMeanings = meanings.filter((meaning): meaning is string => typeof meaning === 'string');

      if (filteredMeanings.length > 0) {
        partsOfSpeech[partOfSpeech] = filteredMeanings;
      }
    });

    return {
      text,
      partsOfSpeech,
      hasPartsOfSpeech: Object.keys(partsOfSpeech).length > 0
    };
  }

  private getLocalizedPartOfSpeech(pos: string): string {
    return TextTranslator.POS_LABELS[pos.toLowerCase()] || pos;
  }

  private createPartsOfSpeechHTML(parts: Record<string, string[]>): string {
    return Object.entries(parts).map(([pos, meanings]) => `
      <div class='pos-section'>
        <div class='pos-label'>${this.escapeHTML(this.getLocalizedPartOfSpeech(pos))}</div>
        <div class='meanings-container'>
          ${meanings.map((meaning) => `<span class='meaning-item'>${this.escapeHTML(meaning)}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }

  private isUIElementClicked(targetElement: Node): boolean {
    return Boolean(
      (this.translateIcon && this.translateIcon.contains(targetElement)) ||
      (this.translatePopup && this.translatePopup.contains(targetElement))
    );
  }

  private hideUIElements(): void {
    if (this.translateIcon) {
      this.translateIcon.style.display = 'none';
    }

    if (this.translatePopup) {
      this.translatePopup.style.display = 'none';
    }
  }

  private addSpeechHandler(text: string): void {
    const speakButton = this.translatePopup?.querySelector<HTMLButtonElement>('#speak-button');

    if (speakButton) {
      speakButton.addEventListener('click', (event) => {
        event.stopPropagation();
        this.speakText(text);
      });
    }
  }

  private speakText(text: string): void {
    if (!text) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }

  private createHeaderContent(originalText: string, translatedText: string): string {
    return `
      <div class='original-text-container'>
        <div class='original-text'>${this.escapeHTML(originalText)}</div>
        <button id='speak-button' type='button'>
          <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
            <path d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-.77-3.37-2-4.47v8.94c1.23-1.1 2-2.7 2-4.47z'/>
          </svg>
        </button>
      </div>
      <div class='translated-text'>${this.escapeHTML(translatedText)}</div>
    `;
  }

  private initializePopupPosition(x: number, y: number): void {
    if (!this.translatePopup) {
      return;
    }

    this.translatePopup.style.display = 'block';
    this.translatePopup.style.visibility = 'hidden';
    this.translatePopup.innerHTML = '<div>翻译中...</div>';

    requestAnimationFrame(() => {
      this.positionPopup(x, y);

      if (this.translatePopup) {
        this.translatePopup.style.visibility = 'visible';
      }
    });
  }

  private positionPopup(x: number, y: number): void {
    if (!this.translatePopup) {
      return;
    }

    const popupRect = this.translatePopup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 16;
    const gap = 12;

    const finalX = Math.min(Math.max(x, margin), viewportWidth - popupRect.width - margin);
    let finalY = y;

    const fitsBelow = y + popupRect.height <= viewportHeight - margin;
    const fitsAbove = y - popupRect.height - gap >= margin;

    if (!fitsBelow && fitsAbove) {
      finalY = y - popupRect.height - gap;
    } else if (!fitsBelow) {
      finalY = viewportHeight - popupRect.height - margin;
    }

    finalY = Math.min(Math.max(finalY, margin), viewportHeight - popupRect.height - margin);

    Object.assign(this.translatePopup.style, {
      left: `${finalX}px`,
      top: `${finalY}px`
    });
  }

  private repositionPopup(): void {
    if (!this.lastPopupAnchor) {
      return;
    }

    requestAnimationFrame(() => {
      if (!this.lastPopupAnchor) {
        return;
      }

      this.positionPopup(this.lastPopupAnchor.x, this.lastPopupAnchor.y);
    });
  }

  private escapeHTML(value: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };

    return value.replace(/[&<>"']/g, (character) => escapeMap[character]);
  }
}

new TextTranslator();
