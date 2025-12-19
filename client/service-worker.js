// Service Worker (Background Script) - Manifest V3

const API_BASE_URL = "http://localhost:3000/api"; // Placeholder for backend URL

// Function to handle API requests with JWT authentication
async function fetchWithAuth(endpoint, options = {}) {
  const tokenData = await chrome.storage.local.get('jwtToken');
  const token = tokenData.jwtToken;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: headers
  });

  if (response.status === 401) {
    // Handle unauthorized access - clear token and notify popup
    chrome.storage.local.remove('jwtToken');
    // A more robust implementation would send a message to the popup to force a logout
  }

  return response;
}

// Listener for messages from the popup UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "apiFetch") {
    fetchWithAuth(request.endpoint, request.options)
      .then(response => response.json().then(data => sendResponse({ success: true, data: data })))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates that sendResponse will be called asynchronously
  } else if (request.action === "setToken") {
    chrome.storage.local.set({ jwtToken: request.token })
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === "getToken") {
    chrome.storage.local.get('jwtToken')
      .then(data => sendResponse({ success: true, token: data.jwtToken }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Minimal usage of chrome.alarms to keep the service worker alive for short periods if needed,
// but the core scheduling is on the backend.
chrome.alarms.create('keepAlive', { periodInMinutes: 4.5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    console.log('Service Worker kept alive by alarm.');
  }
});
