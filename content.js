let currentPopup = null;

document.addEventListener('mouseup', async (e) => {
  if (e.target.closest('#api-key-input') || e.target.closest('#save-api-key')) {
    return;
  }
  
  const selection = window.getSelection().toString().trim();
  if (!selection) {
    return;
  }

  const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
  
  showPopup("Loading...", rect);
  
  try {
    const simplifiedTextInput = await simplifiedText(selection);
    updatePopupContent(simplifiedTextInput);
  } catch (error) {
    updatePopupContent("Error simplifying text. Please try again shortly.");
    console.error('Extension error:', error);
  }
});

async function simplifiedText(text) {
  const HF_API_KEY = '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';
  
  if (!HF_API_KEY) {
    throw new Error('API key required');
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

function showPopup(content, rect) {
  if (currentPopup) {
    currentPopup.remove();
  }

  currentPopup = document.createElement('div');
  currentPopup.innerHTML = `
  <link rel="stylesheet" href="popup.css">  
  <div class="popup-container">
  <div class="popup-content">${content}</div>
  </div>
    
  `;
  currentPopup.className = 'popup-container';
  currentPopup.style.top = `${window.scrollY + rect.bottom + 5}px`;
  currentPopup.style.left = `${window.scrollX + rect.left}px`;
  document.body.appendChild(currentPopup);
}

function updatePopupContent(content) {
  if (currentPopup) {
    currentPopup.innerText = content;
  }
}
