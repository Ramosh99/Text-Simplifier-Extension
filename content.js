let currentPopup = null;

// Store API key in Chrome extension local storage
function setAPIKey(key) {
  chrome.storage.local.set({ hf_api_key: key }, () => {
    console.log("API key saved:", key);
  });
}

// Retrieve API key
function getAPIKey(callback) {
  chrome.storage.local.get(['hf_api_key'], function(result) {
    console.log("Retrieved API key:", result.hf_api_key);
    callback(result.hf_api_key || null); // Ensure null is returned if no key exists
  });
}

// Listen for text selection
document.addEventListener('mouseup', async (e) => {
  if (e.target.closest('#api-key-input') || e.target.closest('#save-api-key')) {
    return;
  }

  const selection = window.getSelection().toString().trim();
  if (!selection) {
    if (currentPopup) currentPopup.remove();
    return;
  }

  const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
  showPopup("Loading...", rect);

  try {
    const simplifiedTextInput = await simplifiedText(selection);
    updatePopupContent(simplifiedTextInput);
  } catch (error) {
    console.error('Extension error:', error);
    if (error.message.includes("API key required")) {
      console.log("Triggering API key prompt...");
      showApiKeyPrompt(true);
    } else {
      updatePopupContent("Error simplifying text. Please try again shortly.");
    }
  }
});
class GeminiClient {
  constructor(apiKey, model = 'gemini-1.5-pro') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;
  }

  async generateContent(prompt) {
    const url = `${this.baseUrl}:generateContent?key=${this.apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Simplify this text in a clear and concise way: ${prompt}`
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }

      const data = await response.json();
      return this._parseResponse(data);

    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  _parseResponse(data) {
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format');
    }
    return data.candidates[0].content.parts[0].text;
  }
}

// Modified simplifiedText function to use GeminiClient
async function simplifiedText(text) {
  return new Promise((resolve, reject) => {
    getAPIKey(async (API_KEY) => {
      if (!API_KEY) {
        console.log("No API key found, prompting user...");
        showApiKeyPrompt();
        reject(new Error('API key required'));
        return;
      }

      try {
        const client = new GeminiClient(API_KEY);
        const simplifiedContent = await client.generateContent(text);
        resolve(simplifiedContent);
      } catch (err) {
        if (err.message.includes('401') || err.message.includes('403')) {
          console.log("Invalid API key detected, removing and prompting user...");
          chrome.storage.local.remove('hf_api_key');
          showApiKeyPrompt(true);
        }
        reject(err);
      }
    });
  });
}

// Display popup
function showPopup(content, rect) {
  if (currentPopup) {
    currentPopup.remove();
  }

  currentPopup = document.createElement('div');
  currentPopup.innerText = content;
  currentPopup.className = 'popup-container';
  currentPopup.style.top = `${window.scrollY + rect.bottom + 5}px`;
  currentPopup.style.left = `${window.scrollX + rect.left}px`;
  document.body.appendChild(currentPopup);
}

// Update popup content
function updatePopupContent(content) {
  if (currentPopup) {
    currentPopup.innerText = content;
  }
}

// Show API key input popup
function showApiKeyPrompt() {
  console.log("Displaying API key prompt...");

  // Remove any existing API key popup
  const existingPopup = document.getElementById('api-key-popup');
  if (existingPopup) existingPopup.remove();

  // Create API key input popup
  const apiPopup = document.createElement('div');
  apiPopup.className = 'popup-key-container';
  apiPopup.id = 'api-key-popup';

  apiPopup.innerHTML = `
    <div >
      <p>Enter your Hugging Face API Key:</p>
      <input type='text' id='api-key-input' placeholder='hf_xxxxxxxxxxxxx' style='width: 100%; padding: 5px; margin: 5px 0; border: 1px solid #ccc;'>
      <button id='save-api-key' >Save</button>
    </div>
  `;

  document.body.appendChild(apiPopup);

  // Save API key when button is clicked
  document.getElementById('save-api-key').addEventListener('click', () => {
    const apiKey = document.getElementById('api-key-input').value.trim();
    if (apiKey) {
      setAPIKey(apiKey);
      apiPopup.remove();
    }
  });
}
