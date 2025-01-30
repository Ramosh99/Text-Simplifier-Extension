document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get('hfApiKey', ({ hfApiKey }) => {
    document.getElementById('apiKey').value = hfApiKey || '';
  });

  document.getElementById('save').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    chrome.storage.local.set({ hfApiKey: apiKey }, () => {
      showStatus('API key saved successfully!', 'green');
    });
  });
});

function showStatus(message, color) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.style.color = color;
  setTimeout(() => statusDiv.textContent = '', 2000);
}