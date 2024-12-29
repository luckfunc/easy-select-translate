document.getElementById('translate').addEventListener('click', async () => {
  const text = document.getElementById('input').value.trim();
  const resultElement = document.getElementById('result');
  
  // 初始化时隐藏结果区域
  resultElement.style.display = 'none';
  
  if (text) {
    try {
      const translated = await fetchTranslation(text);
      if (translated) {
        resultElement.textContent = translated;
        resultElement.style.display = 'block'; // 有结果时才显示
      }
    } catch (error) {
      console.error('Translation failed:', error);
    }
  }
});

async function fetchTranslation(text) {
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`);
  const result = await response.json();
  return result[0][0][0];
}
  