document.getElementById("translate").addEventListener("click", async () => {
    const text = document.getElementById("input").value.trim();
    if (text) {
      const translated = await fetchTranslation(text);
      document.getElementById("result").textContent = translated;
    }
  });
  
  async function fetchTranslation(text) {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`);
    const result = await response.json();
    return result[0][0][0];
  }
  