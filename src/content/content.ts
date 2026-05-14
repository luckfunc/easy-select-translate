import { translateWithDeepSeek } from '../shared/deepseek-translate';
import { getDeepSeekSettings } from '../shared/deepseek-settings';
import { translateWithGoogle, type TranslationResult } from '../shared/google-translate';
import contentStyles from './content.css?raw';

type PopupAnchor = {
  x: number;
  y: number;
};

const collapsedOriginalTextLength = 120;
const collapsedOriginalTextLines = 2;
const translationIconSize = 24;
const translationIconMargin = 8;
const translationIconXOffset = 14;
const translationIconYOffset = 10;
const popupViewportMargin = 16;
const popupAnchorGap = 12;

class TextTranslator {
  private static readonly POS_LABELS: Record<string, string> = {
    noun: '名词',
    verb: '动词',
    adjective: '形容词',
    adverb: '副词',
    preposition: '介词',
    conjunction: '连词',
    pronoun: '代词',
    interjection: '感叹词',
  };

  private readonly host: HTMLElement;
  private readonly shadowRoot: ShadowRoot;
  private translatePopup: HTMLDivElement | null = null;
  private translateIcon: HTMLDivElement | null = null;
  private lastSelectedText = '';
  private lastPopupAnchor: PopupAnchor | null = null;

  constructor() {
    const { host, shadowRoot } = this.createShadowRoot();

    this.host = host;
    this.shadowRoot = shadowRoot;
    this.initEventListeners();
  }

  private createShadowRoot(): { host: HTMLElement; shadowRoot: ShadowRoot } {
    const host = document.createElement('easy-select-translate');
    const shadowRoot = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');

    style.textContent = contentStyles;
    shadowRoot.append(style);
    document.documentElement.append(host);

    return { host, shadowRoot };
  }

  private initEventListeners(): void {
    document.addEventListener('mousedown', this.handleDocumentMouseDown);
    document.addEventListener('mouseup', this.handleDocumentMouseUp);
  }

  private readonly handleDocumentMouseDown = (event: MouseEvent): void => {
    if (this.isUIEvent(event)) {
      return;
    }

    this.hideUIElements();
  };

  private readonly handleDocumentMouseUp = (event: MouseEvent): void => {
    if (this.isUIEvent(event)) {
      return;
    }

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

    icon.className = 'est-translate-icon';
    icon.innerHTML = this.getIconSVG();
    icon.addEventListener('click', this.handleIconClick);
    this.shadowRoot.append(icon);

    return icon;
  }

  private showErrorMessage(): void {
    if (!this.translatePopup) {
      return;
    }

    this.translatePopup.innerHTML = `<div class='est-translation-error'>翻译失败</div>`;
    this.repositionPopup();
  }

  private createTranslationPopup(): HTMLDivElement {
    const popup = document.createElement('div');

    popup.className = 'est-translate-popup';
    this.shadowRoot.append(popup);

    return popup;
  }

  private showTranslationIcon(x: number, y: number): void {
    if (!this.translateIcon) {
      this.translateIcon = this.createTranslationIcon();
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const finalX = Math.min(
      Math.max(x - translationIconXOffset, translationIconMargin),
      viewportWidth - translationIconSize - translationIconMargin,
    );
    const finalY = Math.min(
      Math.max(y + translationIconYOffset, translationIconMargin),
      viewportHeight - translationIconSize - translationIconMargin,
    );

    Object.assign(this.translateIcon.style, {
      left: `${finalX}px`,
      top: `${finalY}px`,
      display: 'flex',
      opacity: '1',
      transform: 'translateY(0)',
    });
  }

  private updatePopupContent(translationResult: TranslationResult, originalText: string): void {
    if (!this.translatePopup) {
      return;
    }

    this.translatePopup.innerHTML = this.createTranslationContentHTML(
      translationResult,
      originalText,
    );

    this.addPopupHandlers(originalText, translationResult.text);
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
      const translationResult = await this.translateSelectedText(text);

      this.updatePopupContent(translationResult, text);
    } catch (error) {
      console.error('翻译失败:', error);
      this.showErrorMessage();
    }
  }

  private async translateSelectedText(text: string): Promise<TranslationResult> {
    const { apiKey, model } = await getDeepSeekSettings();

    if (apiKey) {
      const translatedText = await translateWithDeepSeek({
        apiKey,
        model,
        text,
        targetLanguage: 'Simplified Chinese',
      });

      return {
        text: translatedText,
        partsOfSpeech: {},
        hasPartsOfSpeech: false,
      };
    }

    return translateWithGoogle(text, {
      targetLanguage: 'zh-CN',
      includeDictionary: true,
    });
  }

  private getLocalizedPartOfSpeech(pos: string): string {
    return TextTranslator.POS_LABELS[pos.toLowerCase()] || pos;
  }

  private createPartsOfSpeechHTML(parts: Record<string, string[]>): string {
    return Object.entries(parts)
      .map(
        ([pos, meanings]) => `
      <div class='est-pos-section'>
        <div class='est-pos-label'>${this.escapeHTML(this.getLocalizedPartOfSpeech(pos))}</div>
        <div class='est-meanings-container'>
          ${meanings.map((meaning) => `<span class='est-meaning-item'>${this.escapeHTML(meaning)}</span>`).join('')}
        </div>
      </div>
    `,
      )
      .join('');
  }

  private createTranslationContentHTML(
    translationResult: TranslationResult,
    originalText: string,
  ): string {
    return [
      this.createToolbarHTML(),
      this.createOriginalTextHTML(originalText),
      this.createTranslatedTextHTML(translationResult.text),
      this.createPartsOfSpeechSectionHTML(translationResult),
    ].join('');
  }

  private createToolbarHTML(): string {
    return `
      <div class='est-popup-toolbar'>
        <span class='est-popup-label'>TRANSLATION</span>
        <div class='est-popup-actions'>
          <button class='est-tool-button est-copy-button' type='button' title='复制译文' aria-label='复制译文'>
            ${this.getCopySVG()}
          </button>
          <button class='est-tool-button est-speak-button' type='button' title='朗读原文' aria-label='朗读原文'>
            ${this.getSpeakSVG()}
          </button>
        </div>
      </div>
    `;
  }

  private createOriginalTextHTML(originalText: string): string {
    const shouldCollapseOriginal = this.shouldCollapseOriginalText(originalText);
    const collapsedClassName = shouldCollapseOriginal ? 'est-collapsed' : '';
    const expandButton = shouldCollapseOriginal
      ? "<button class='est-expand-button' type='button'>展开原文</button>"
      : '';

    return `
      <div class='est-original-section'>
        <div class='est-section-label'>SOURCE</div>
        <div class='est-original-text ${collapsedClassName}'>
          ${this.escapeHTML(originalText)}
        </div>
        ${expandButton}
      </div>
    `;
  }

  private createTranslatedTextHTML(translatedText: string): string {
    return `<div class='est-translated-text'>${this.escapeHTML(translatedText)}</div>`;
  }

  private createPartsOfSpeechSectionHTML(translationResult: TranslationResult): string {
    if (!translationResult.hasPartsOfSpeech) {
      return '';
    }

    return `
      <div class='est-pos-list'>
        ${this.createPartsOfSpeechHTML(translationResult.partsOfSpeech)}
      </div>
    `;
  }

  private shouldCollapseOriginalText(text: string): boolean {
    return (
      text.length > collapsedOriginalTextLength ||
      text.split(/\r?\n/).length > collapsedOriginalTextLines
    );
  }

  private isUIEvent(event: MouseEvent): boolean {
    return event.composedPath().some((node) => {
      return node === this.host || node === this.translateIcon || node === this.translatePopup;
    });
  }

  private hideUIElements(): void {
    if (this.translateIcon) {
      this.translateIcon.style.display = 'none';
    }

    if (this.translatePopup) {
      this.translatePopup.style.display = 'none';
    }
  }

  private addPopupHandlers(originalText: string, translatedText: string): void {
    const speakButton = this.translatePopup?.querySelector<HTMLButtonElement>('.est-speak-button');
    const copyButton = this.translatePopup?.querySelector<HTMLButtonElement>('.est-copy-button');
    const expandButton =
      this.translatePopup?.querySelector<HTMLButtonElement>('.est-expand-button');

    if (speakButton) {
      speakButton.addEventListener('click', (event) => {
        event.stopPropagation();
        this.speakText(originalText);
      });
    }

    if (copyButton) {
      copyButton.addEventListener('click', (event) => {
        event.stopPropagation();
        void this.copyText(translatedText, copyButton);
      });
    }

    if (expandButton) {
      expandButton.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggleOriginalText(expandButton);
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

  private async copyText(text: string, button: HTMLButtonElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      button.classList.add('est-done');
      window.setTimeout(() => button.classList.remove('est-done'), 900);
    } catch (error) {
      console.error('复制失败:', error);
    }
  }

  private toggleOriginalText(button: HTMLButtonElement): void {
    const originalText = this.translatePopup?.querySelector<HTMLDivElement>('.est-original-text');

    if (!originalText) {
      return;
    }

    const isCollapsed = originalText.classList.toggle('est-collapsed');
    button.textContent = isCollapsed ? '展开原文' : '收起原文';
    this.repositionPopup();
  }

  private getCopySVG(): string {
    return `
      <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
        <rect x='9' y='9' width='13' height='13' rx='1'/>
        <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'/>
      </svg>
    `;
  }

  private getSpeakSVG(): string {
    return `
      <svg width='15' height='15' viewBox='0 0 24 24' fill='currentColor'>
        <path d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-.77-3.37-2-4.47v8.94c1.23-1.1 2-2.7 2-4.47z'/>
      </svg>
    `;
  }

  private initializePopupPosition(x: number, y: number): void {
    if (!this.translatePopup) {
      return;
    }

    this.translatePopup.style.display = 'block';
    this.translatePopup.style.visibility = 'hidden';
    this.translatePopup.innerHTML = `
      <div class='est-popup-toolbar'>
        <span class='est-popup-label'>TRANSLATING</span>
      </div>
      <div class='est-loading-body'>正在翻译...</div>
    `;

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

    const finalX = Math.min(
      Math.max(x, popupViewportMargin),
      viewportWidth - popupRect.width - popupViewportMargin,
    );
    let finalY = y;

    const fitsBelow = y + popupRect.height <= viewportHeight - popupViewportMargin;
    const fitsAbove = y - popupRect.height - popupAnchorGap >= popupViewportMargin;

    if (!fitsBelow && fitsAbove) {
      finalY = y - popupRect.height - popupAnchorGap;
    } else if (!fitsBelow) {
      finalY = viewportHeight - popupRect.height - popupViewportMargin;
    }

    finalY = Math.min(
      Math.max(finalY, popupViewportMargin),
      viewportHeight - popupRect.height - popupViewportMargin,
    );

    Object.assign(this.translatePopup.style, {
      left: `${finalX}px`,
      top: `${finalY}px`,
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
      "'": '&#039;',
    };

    return value.replace(/[&<>"']/g, (character) => escapeMap[character]);
  }
}

new TextTranslator();
