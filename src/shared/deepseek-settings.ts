export const defaultDeepSeekModel = 'deepseek-v4-flash';

export const deepseekModels = ['deepseek-v4-flash', 'deepseek-v4-pro'] as const;

export type DeepSeekModel = (typeof deepseekModels)[number];

export type DeepSeekSettings = {
  apiKey: string;
  model: DeepSeekModel;
};

const apiKeyStorageKey = 'deepseekApiKey';
const modelStorageKey = 'deepseekModel';

export async function getDeepSeekSettings(): Promise<DeepSeekSettings> {
  const result = await chrome.storage.local.get([apiKeyStorageKey, modelStorageKey]);
  const apiKey =
    typeof result[apiKeyStorageKey] === 'string' ? result[apiKeyStorageKey].trim() : '';
  const model = parseDeepSeekModel(result[modelStorageKey]);

  return { apiKey, model };
}

export async function saveDeepSeekSettings(settings: DeepSeekSettings): Promise<void> {
  await chrome.storage.local.set({
    [apiKeyStorageKey]: settings.apiKey.trim(),
    [modelStorageKey]: settings.model,
  });
}

export async function clearDeepSeekApiKey(): Promise<void> {
  await chrome.storage.local.remove(apiKeyStorageKey);
}

function parseDeepSeekModel(value: unknown): DeepSeekModel {
  return deepseekModels.includes(value as DeepSeekModel)
    ? (value as DeepSeekModel)
    : defaultDeepSeekModel;
}
