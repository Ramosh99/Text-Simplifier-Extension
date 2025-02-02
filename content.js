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

// Fetch simplified text from API
async function simplifiedText(text) {
  return new Promise((resolve, reject) => {
    getAPIKey(async (HF_API_KEY) => {
      if (!HF_API_KEY) {
        console.log("No API key found, prompting user...");
        showApiKeyPrompt();
        reject(new Error('API key required'));
        return;
      }

      try {
        const response = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-cnn", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            inputs: `Simplify this text: ${text}`,
            parameters: { max_length: 130, min_length: 30 }
          })
        });

        if (!response.ok) {
          if (response.status === 401) {
            console.log("Invalid API key detected, removing and prompting user...");
            chrome.storage.local.remove('hf_api_key'); // Clear invalid key
            showApiKeyPrompt(true);
          }
          reject(new Error(`API request failed: ${response.status}`));
          return;
        }

        const result = await response.json();
        resolve(result[0]?.summary_text || "No summary available");
      } catch (err) {
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
function showApiKeyPrompt(invalid = false) {
  console.log("Displaying API key prompt...");

  // Remove any existing API key popup
  const existingPopup = document.getElementById('api-key-popup');
  if (existingPopup) existingPopup.remove();

  // Create API key input popup
  const apiPopup = document.createElement('div');
  apiPopup.className = 'popup-container';
  apiPopup.id = 'api-key-popup';

  apiPopup.innerHTML = `
    <div style="background: white; padding: 10px; border: 1px solid black; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999;">
      <p>Enter your Hugging Face API Key:</p>
      <input type='text' id='api-key-input' placeholder='hf_xxxxxxxxxxxxx' style='width: 100%; padding: 5px; margin: 5px 0; border: 1px solid #ccc;'>
      ${invalid ? '<p style="color: red;">Invalid API key, please enter a valid one.</p>' : ''}
      <button id='save-api-key' style='margin-top: 5px; padding: 5px 10px;'>Save</button>
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
