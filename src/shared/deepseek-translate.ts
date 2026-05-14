import type { DeepSeekModel } from './deepseek-settings';

export type DeepSeekTranslateOptions = {
  apiKey: string;
  model: DeepSeekModel;
  text: string;
  targetLanguage: string;
};

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

const deepseekChatCompletionsUrl = 'https://api.deepseek.com/chat/completions';

export async function translateWithDeepSeek({
  apiKey,
  model,
  text,
  targetLanguage,
}: DeepSeekTranslateOptions): Promise<string> {
  const response = await fetch(deepseekChatCompletionsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: [
            'You are a translation engine.',
            `Translate user text into ${targetLanguage}.`,
            'Return only the translated text.',
            'Do not add explanations, quotes, markdown, or alternatives.',
          ].join(' '),
        },
        {
          role: 'user',
          content: text,
        },
      ],
      thinking: {
        type: 'disabled',
      },
      temperature: 0.2,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed with HTTP ${response.status}`);
  }

  const data = (await response.json()) as DeepSeekChatResponse;
  const translatedText = data.choices?.[0]?.message?.content;

  if (typeof translatedText !== 'string' || !translatedText.trim()) {
    throw new Error('DeepSeek returned an empty translation');
  }

  return translatedText.trim();
}
