const translateButton = document.querySelector<HTMLButtonElement>('#translate');
const inputElement = document.querySelector<HTMLTextAreaElement>('#input');
const resultElement = document.querySelector<HTMLParagraphElement>('#result');

if (!translateButton || !inputElement || !resultElement) {
  throw new Error('Popup UI failed to initialize.');
}

translateButton.addEventListener('click', async () => {
  const text = inputElement.value.trim();

  resultElement.style.display = 'none';

  if (!text) {
    return;
  }

  try {
    const translated = await fetchTranslation(text);

    if (translated) {
      resultElement.textContent = translated;
      resultElement.style.display = 'block';
    }
  } catch (error) {
    console.error('Translation failed:', error);
  }
});

async function fetchTranslation(text: string): Promise<string> {
  const response = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`
  );
  const result: unknown = await response.json();

  return parseTranslationText(result);
}

function parseTranslationText(apiResponse: unknown): string {
  if (!Array.isArray(apiResponse)) {
    return '';
  }

  const translations = apiResponse[0];
  if (!Array.isArray(translations)) {
    return '';
  }

  const firstTranslation = translations[0];
  if (!Array.isArray(firstTranslation)) {
    return '';
  }

  return typeof firstTranslation[0] === 'string' ? firstTranslation[0] : '';
}
