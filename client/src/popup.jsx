import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// --- API Communication Utility ---
const api = {
  // Wrapper to send a message to the service worker for API calls
  fetch: (endpoint, options) => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "apiFetch", endpoint, options }, (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || "API call failed"));
        }
      });
    });
  },
  // Wrapper to set the JWT token in chrome.storage.local
  setToken: (token) => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "setToken", token }, (response) => {
        if (response.success) resolve();
        else reject(new Error(response.error));
      });
    });
  },
  // Wrapper to get the JWT token from chrome.storage.local
  getToken: () => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "getToken" }, (response) => {
        if (response.success) resolve(response.token);
        else reject(new Error(response.error));
      });
    });
  },
  // Specific API calls (placeholders)
  login: (username, password) => api.fetch('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  schedule: (data) => api.fetch('/messages/schedule', { method: 'POST', body: JSON.stringify(data) }),
  getMessages: () => api.fetch('/messages', { method: 'GET' }),
  cancelMessage: (id) => api.fetch(`/messages/cancel/${id}`, { method: 'POST' }),
};

// --- UI Components ---

const WhatsAppGreen = "#075E54"; // Predominant green color

const Button = ({ children, onClick, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      backgroundColor: WhatsAppGreen,
      color: 'white',
      border: 'none',
      padding: '10px 15px',
      borderRadius: '5px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      width: '100%',
      marginTop: '10px',
      fontWeight: 'bold',
    }}
  >
    {children}
  </button>
);

const Input = (props) => (
  <input
    style={{
      width: '100%',
      padding: '8px',
      margin: '5px 0 10px 0',
      boxSizing: 'border-box',
      border: `1px solid ${WhatsAppGreen}`,
      borderRadius: '3px',
    }}
    {...props}
  />
);

const Header = ({ title }) => (
  <h2 style={{ color: WhatsAppGreen, borderBottom: `2px solid ${WhatsAppGreen}`, paddingBottom: '5px' }}>
    {title}
  </h2>
);

// --- Main Application Logic ---

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState('schedule'); // 'schedule', 'list', 'login'

  useEffect(() => {
    api.getToken().then(token => {
      if (token) {
        setIsLoggedIn(true);
        setView('schedule');
      } else {
        setIsLoggedIn(false);
        setView('login');
      }
    });
  }, []);

  const handleLogin = async (username, password) => {
    try {
      const data = await api.login(username, password);
      await api.setToken(data.token);
      setIsLoggedIn(true);
      setView('schedule');
    } catch (error) {
      alert(`Login failed: ${error.message}`);
    }
  };

  const handleLogout = () => {
    api.setToken(null); // Clear token
    setIsLoggedIn(false);
    setView('login');
  };

  const renderView = () => {
    if (!isLoggedIn) {
      return <Login onLogin={handleLogin} />;
    }

    switch (view) {
      case 'schedule':
        return <ScheduleMessage setView={setView} />;
      case 'list':
        return <ScheduledList setView={setView} />;
      default:
        return <ScheduleMessage setView={setView} />;
    }
  };

  return (
    <div style={{ padding: '10px' }}>
      <Header title="WhatsApp Scheduler" />
      {isLoggedIn && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <Button onClick={() => setView('schedule')} disabled={view === 'schedule'}>Schedule</Button>
          <Button onClick={() => setView('list')} disabled={view === 'list'}>List</Button>
          <Button onClick={handleLogout} style={{ backgroundColor: '#DCF8C6', color: WhatsAppGreen }}>Logout</Button>
        </div>
      )}
      {renderView()}
    </div>
  );
};

// --- Login Component ---
const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    await onLogin(username, password);
    setIsLoading(false);
  };

  return (
    <div>
      <Header title="Login" />
      <label>Username:</label>
      <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
      <label>Password:</label>
      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login / Sign Up'}
      </Button>
      <p style={{ fontSize: '10px', color: '#666', textAlign: 'center', marginTop: '10px' }}>
        Note: If you don't have an account, the backend will attempt to create one.
      </p>
    </div>
  );
};

// --- Schedule Message Component ---
const ScheduleMessage = ({ setView }) => {
  const [contactName, setContactName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sendDate, setSendDate] = useState('');
  const [sendTime, setSendTime] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!contactName || !phoneNumber || !sendDate || !sendTime || !messageContent) {
      alert('All fields are required.');
      return;
    }

    // Combine date and time into a single ISO string for the backend
    const scheduledDateTime = new Date(`${sendDate}T${sendTime}:00`);

    const scheduleData = {
      contactName,
      phoneNumber,
      scheduledDateTime: scheduledDateTime.toISOString(),
      messageContent,
    };

    setIsLoading(true);
    try {
      await api.schedule(scheduleData);
      alert('Message scheduled successfully!');
      setView('list');
    } catch (error) {
      alert(`Scheduling failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Header title="Schedule New Message" />
      <label>Contact Name:</label>
      <Input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g., John Doe" />

      <label>Phone Number (e.g., +12025550104):</label>
      <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+[CountryCode][AreaCode][Number]" />

      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <label>Send Date:</label>
          <Input type="date" value={sendDate} onChange={(e) => setSendDate(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Send Time (Local Time):</label>
          <Input type="time" value={sendTime} onChange={(e) => setSendTime(e.target.value)} />
        </div>
      </div>

      <label>Message Content:</label>
      <textarea
        value={messageContent}
        onChange={(e) => setMessageContent(e.target.value)}
        rows="4"
        style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: `1px solid ${WhatsAppGreen}`, borderRadius: '3px' }}
      />

      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? 'Scheduling...' : 'Schedule Message'}
      </Button>
    </div>
  );
};

// --- Scheduled List Component ---
const ScheduledList = ({ setView }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMessages();
      setMessages(data.messages || []);
    } catch (error) {
      alert(`Failed to fetch messages: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this message?')) return;
    try {
      await api.cancelMessage(id);
      alert('Message canceled.');
      fetchMessages(); // Refresh list
    } catch (error) {
      alert(`Failed to cancel message: ${error.message}`);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Sent successfully': return { color: WhatsAppGreen, fontWeight: 'bold' };
      case 'Failed': return { color: 'red', fontWeight: 'bold' };
      case 'Canceled': return { color: 'orange', fontWeight: 'bold' };
      case 'Scheduled': return { color: 'blue', fontWeight: 'bold' };
      default: return {};
    }
  };

  if (isLoading) {
    return <p>Loading scheduled messages...</p>;
  }

  if (messages.length === 0) {
    return <p>No messages scheduled. <a href="#" onClick={() => setView('schedule')}>Schedule one now.</a></p>;
  }

  return (
    <div>
      <Header title="Scheduled Messages" />
      <div style={{ maxHeight: '300px', overflowY: 'auto', border: `1px solid ${WhatsAppGreen}`, padding: '5px' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ borderBottom: '1px solid #eee', padding: '5px 0' }}>
            <p><strong>To:</strong> {msg.contactName} ({msg.phoneNumber})</p>
            <p><strong>Time:</strong> {new Date(msg.scheduledDateTime).toLocaleString()}</p>
            <p><strong>Status:</strong> <span style={getStatusStyle(msg.status)}>{msg.status}</span></p>
            {msg.status === 'Scheduled' && (
              <button
                onClick={() => handleCancel(msg.id)}
                style={{ backgroundColor: 'red', color: 'white', border: 'none', padding: '5px', borderRadius: '3px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>
      <Button onClick={fetchMessages} style={{ backgroundColor: '#eee', color: '#333' }}>Refresh List</Button>
    </div>
  );
};

// --- Initialization ---
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
} else {
  console.error("Root element not found.");
}
