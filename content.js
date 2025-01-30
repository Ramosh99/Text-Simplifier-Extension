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

document.addEventListener('mouseup', async (e) => {
  const selection = window.getSelection().toString().trim();
  if (!selection) {
    removePopup();
    return;
  }

  const rect = getSelectionRect();
  if (!rect) return;

  showLoadingPopup(rect);
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: "simplify",
      text: selection
    });
    
    if (response?.text) {
      updatePopupContent(response.text, rect);
    }
  } catch (error) {
    updatePopupContent("Error simplifying text. Please try again.", rect);
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
  
  let top = rect.top + window.scrollY - popup.offsetHeight - 10;
  let left = rect.left + window.scrollX + (rect.width / 2) - (popupWidth / 2);

  // Ensure popup stays within viewport
  if (top < 10) top = rect.bottom + window.scrollY + 10;
  if (left + popupWidth > viewport.width) left = viewport.width - popupWidth - 10;
  if (left < 10) left = 10;

  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
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
window.addEventListener('scroll', removePopup);
window.addEventListener('resize', removePopup);