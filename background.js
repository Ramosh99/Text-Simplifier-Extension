chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "simplify") {
      processSimplification(request.text, sendResponse);
      return true; // Keep the message channel open
    }
  });
  
  async function processSimplification(text, sendResponse) {
    try {
      const { hfApiKey } = await chrome.storage.local.get('hfApiKey');
      const simplified = await simplifyWithHF(text, hfApiKey);
      sendResponse({ text: simplified });
    } catch (error) {
      console.error('Simplification error:', error);
      sendResponse({ text: "Could not simplify text" });
    }
  }
  
  async function simplifyWithHF(text, apiKey) {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-70B-Instruct",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          inputs: `Simplify this text for a 12-year-old: ${text}`,
          parameters: {
            max_new_tokens: 300,
            temperature: 0.7,
            repetition_penalty: 1.2
          }
        })
      }
    );
  
    const data = await response.json();
    return data[0]?.generated_text || text;
  }