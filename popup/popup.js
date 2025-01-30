document.getElementById('simplifyBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }, () => {
      document.getElementById('status').textContent = 'Processing...';
      setTimeout(() => {
        document.getElementById('status').textContent = '';
      }, 2000);
    });
  });