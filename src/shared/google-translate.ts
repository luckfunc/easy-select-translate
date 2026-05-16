export type TranslationResult = {
  text: string;
  partsOfSpeech: Record<string, string[]>;
  hasPartsOfSpeech: boolean;
};

type GoogleTranslateOptions = {
  targetLanguage: string;
  includeDictionary?: boolean;
  sourceLanguage?: string;
};

const googleTranslateUrl = 'https://translate.googleapis.com/translate_a/single';

export async function translateWithGoogle(
  text: string,
  { targetLanguage, includeDictionary = false, sourceLanguage = 'auto' }: GoogleTranslateOptions,
): Promise<TranslationResult> {
  const response = await fetch(
    buildGoogleTranslateUrl(text, targetLanguage, {
      includeDictionary,
      sourceLanguage,
    }),
  );

  if (!response.ok) {
    throw new Error(`Google Translate request failed with HTTP ${response.status}`);
  }

  return parseGoogleTranslateResponse(await response.json());
}

function buildGoogleTranslateUrl(
  text: string,
  targetLanguage: string,
  {
    includeDictionary,
    sourceLanguage,
  }: {
    includeDictionary: boolean;
    sourceLanguage: string;
  },
): string {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: sourceLanguage,
    tl: targetLanguage,
    q: text,
  });

  params.append('dt', 't');

  if (includeDictionary) {
    params.append('dt', 'rm');
    params.append('dt', 'bd');
  }

  return `${googleTranslateUrl}?${params.toString()}`;
}

function parseGoogleTranslateResponse(apiResponse: unknown): TranslationResult {
  const response = Array.isArray(apiResponse) ? apiResponse : [];
  const translations = Array.isArray(response[0]) ? response[0] : [];
  const firstTranslation = Array.isArray(translations[0]) ? translations[0] : [];
  const text = typeof firstTranslation[0] === 'string' ? firstTranslation[0].trim() : '';
  const partsOfSpeech: Record<string, string[]> = {};
  const dictionary = Array.isArray(response[1]) ? response[1] : [];

  if (!text) {
    throw new Error('Google Translate returned an empty translation');
  }

  dictionary.forEach((entry) => {
    if (!Array.isArray(entry)) {
      return;
    }

    const [partOfSpeech, meanings] = entry;

    if (typeof partOfSpeech !== 'string' || !Array.isArray(meanings)) {
      return;
    }

    const filteredMeanings = meanings.filter(
      (meaning): meaning is string => typeof meaning === 'string',
    );

    if (filteredMeanings.length > 0) {
      partsOfSpeech[partOfSpeech] = filteredMeanings;
    }
  });

  return {
    text,
    partsOfSpeech,
    hasPartsOfSpeech: Object.keys(partsOfSpeech).length > 0,
  };
}
