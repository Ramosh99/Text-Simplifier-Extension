let currentPopup = null;

function createPopupContainer() {
  const existing = document.getElementById('simplify-popup-root');
  if (existing) return existing;
  
  const container = document.createElement('div');
  container.id = 'simplify-popup-root';
  container.style.position = 'relative';
  document.body.appendChild(container);
  return container;
}

function showApiKeyPrompt() {
  // removePopup(); // Only remove existing popups
  console.log('showApiKeyPrompt');
  
  const container = createPopupContainer();
  currentPopup = document.createElement('div');
  currentPopup.className = 'simplify-popup';
  currentPopup.innerHTML = `
    <div class="popup-header">
      <div class="popup-title">API Key Required</div>
      <div class="close-btn" title="Close">&times;</div>
    </div>
    <div class="popup-content">
      <p>Please enter your Hugging Face API key:</p>
      <input type="password" id="api-key-input" placeholder="Enter API key">
      <button id="save-api-key">Save</button>
    </div>
  `;

  // Center the API key prompt
  currentPopup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 300px;
    background: white;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 10000;
  `;

  container.appendChild(currentPopup);
  
  currentPopup.querySelector('.close-btn').addEventListener('click', removePopup);
  currentPopup.querySelector('#save-api-key').addEventListener('click', saveApiKey);
}

document.addEventListener('mouseup', async (e) => {
  if (e.target.closest('#api-key-input') || e.target.closest('#save-api-key')) {
    return;
  }
  const selection = window.getSelection().toString().trim();
  if (!selection) {
    removePopup();
    return;
  }

  const rect = getSelectionRect();
  if (!rect) return;

  showLoadingPopup(rect);
  
  try {
    const simplifiedTextInput = await simplifiedText(selection);
    updatePopupContent(simplifiedTextInput, rect);
  } catch (error) {
    showApiKeyPrompt();
    updatePopupContent("Error simplifying text. Please try again shortly.", rect);
    console.error('Extension error:', error);
  }
});

function getSelectionRect() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;
  
  const range = selection.getRangeAt(0);
  return range.getBoundingClientRect();
}

function showLoadingPopup(rect) {
  removePopup();
  
  const container = createPopupContainer();
  currentPopup = document.createElement('div');
  currentPopup.className = 'simplify-popup';
  currentPopup.innerHTML = `
    <div class="loading">Simplifying text...</div>
  `;
  
  positionPopup(currentPopup, rect);
  container.appendChild(currentPopup);
}

function updatePopupContent(text, rect) {
  if (!currentPopup) return;
  
  currentPopup.innerHTML = `
    <div class="popup-header">
      <div class="popup-title">Simplified Text</div>
      <div class="close-btn" title="Close">&times;</div>
    </div>
    <div class="popup-content">${sanitizeText(text)}</div>
  `;

  currentPopup.querySelector('.close-btn').addEventListener('click', removePopup);
  positionPopup(currentPopup, rect);
}

function sanitizeText(text) {
  const temp = document.createElement('div');
  temp.textContent = text;
  return temp.innerHTML;
}

function positionPopup(popup, rect) {
  const viewport = {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight
  };

  const popupWidth = Math.min(300, viewport.width - 20);
  popup.style.width = `${popupWidth}px`;
  
  // Position in top right corner with some padding
  let top = 20; // Fixed distance from top
  let left = viewport.width - popupWidth - 20; // Right aligned with 20px padding

  // Set the position
  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
  
  // Add fixed positioning to keep it in place while scrolling
  popup.style.position = 'fixed';
}

function removePopup() {
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
}

// Close popup when clicking outside
document.addEventListener('mousedown', (e) => {
  if (currentPopup && !currentPopup.contains(e.target)) {
    removePopup();
  }
});

// Handle scroll/resize
// window.addEventListener('scroll', removePopup);
// window.addEventListener('resize', removePopup);
async function getApiKey() {
  const result = await chrome.storage.local.get('HF_API_KEY');
  return result.HF_API_KEY;
}


async function saveApiKey() {
  const apiKeyInput = document.getElementById('api-key-input');
  if (!apiKeyInput) return;
  
  const apiKey = apiKeyInput.value.trim();
  if (apiKey) {
    await chrome.storage.local.set({ 'HF_API_KEY': apiKey });
    removePopup();
  }
}

async function simplifiedText(text) {
  const HF_API_KEY = await getApiKey();
  showApiKeyPrompt();
  if (!HF_API_KEY) {
    showApiKeyPrompt();
    throw new Error('API key required'); // Don't proceed without key
  }
  
  const response = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-cnn", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: `Simplify this text: ${text}`,
      parameters: {
        max_length: 130,
        min_length: 30,
      }
    })
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const result = await response.json();
  return result[0]?.summary_text || "No summary available";
}