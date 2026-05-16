import {
  clearDeepSeekApiKey,
  deepseekModels,
  getDeepSeekSettings,
  saveDeepSeekSettings,
  type DeepSeekModel,
} from '../shared/deepseek-settings';

const settingsForm = queryRequired<HTMLFormElement>('#settings-form');
const apiKeyInput = queryRequired<HTMLInputElement>('#api-key');
const modelSelect = queryRequired<HTMLSelectElement>('#model');
const clearKeyButton = queryRequired<HTMLButtonElement>('#clear-key');
const keyState = queryRequired<HTMLSpanElement>('#key-state');
const providerNote = queryRequired<HTMLParagraphElement>('#provider-note');
const statusMessage = queryRequired<HTMLParagraphElement>('#status-message');

settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  void saveSettings();
});

clearKeyButton.addEventListener('click', () => {
  void clearSavedApiKey();
});

void loadSettings();

async function loadSettings(): Promise<void> {
  const { apiKey, model } = await getDeepSeekSettings();

  apiKeyInput.value = apiKey;
  modelSelect.value = model;
  setProviderState(Boolean(apiKey));
}

async function saveSettings(): Promise<void> {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    await clearSavedApiKey();
    return;
  }

  await saveDeepSeekSettings({
    apiKey,
    model: getSelectedDeepSeekModel(),
  });
  setProviderState(true, '已切换到 DeepSeek');
}

async function clearSavedApiKey(): Promise<void> {
  await clearDeepSeekApiKey();
  apiKeyInput.value = '';
  setProviderState(false, '已切换到 Google fallback');
}

function getSelectedDeepSeekModel(): DeepSeekModel {
  const value = modelSelect.value;

  return deepseekModels.includes(value as DeepSeekModel)
    ? (value as DeepSeekModel)
    : 'deepseek-v4-flash';
}

function setProviderState(useDeepSeek: boolean, message = ''): void {
  keyState.textContent = useDeepSeek ? 'DEEPSEEK' : 'GOOGLE';
  keyState.classList.toggle('saved', useDeepSeek);
  providerNote.textContent = useDeepSeek
    ? '已配置 DeepSeek Key，划词翻译将优先使用 DeepSeek。'
    : '未配置 DeepSeek Key，将自动使用 Google 翻译。';
  statusMessage.textContent = message;
}

function queryRequired<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Missing popup element: ${selector}`);
  }

  return element;
}
