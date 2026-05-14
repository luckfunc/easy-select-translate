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
  setSavedState(Boolean(apiKey));
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
  setSavedState(true, '已保存');
}

async function clearSavedApiKey(): Promise<void> {
  await clearDeepSeekApiKey();
  apiKeyInput.value = '';
  setSavedState(false, '已清除');
}

function getSelectedDeepSeekModel(): DeepSeekModel {
  const value = modelSelect.value;

  return deepseekModels.includes(value as DeepSeekModel)
    ? (value as DeepSeekModel)
    : 'deepseek-v4-flash';
}

function setSavedState(saved: boolean, message = ''): void {
  keyState.textContent = saved ? 'SAVED' : 'EMPTY';
  keyState.classList.toggle('saved', saved);
  statusMessage.textContent = message;
}

function queryRequired<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Missing popup element: ${selector}`);
  }

  return element;
}
