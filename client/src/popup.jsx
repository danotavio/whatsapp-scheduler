import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// --- API Communication Utility ---
const api = {
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
  setToken: (token) => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "setToken", token }, (response) => {
        if (response.success) resolve();
        else reject(new Error(response.error));
      });
    });
  },
  getToken: () => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "getToken" }, (response) => {
        if (response.success) resolve(response.token);
        else reject(new Error(response.error));
      });
    });
  },
  // API calls
  register: (data) => api.fetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (username, password) => api.fetch('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getProfile: () => api.fetch('/user/profile', { method: 'GET' }),
  updateProfile: (data) => api.fetch('/user/profile', { method: 'PUT', body: JSON.stringify(data) }),
  schedule: (data) => api.fetch('/messages/schedule', { method: 'POST', body: JSON.stringify(data) }),
  getMessages: () => api.fetch('/messages', { method: 'GET' }),
  cancelMessage: (id) => api.fetch(`/messages/cancel/${id}`, { method: 'POST' }),
};

// --- UI Components ---
const WhatsAppGreen = "#075E54";
const WhatsAppLightGreen = "#DCF8C6";

const Button = ({ children, onClick, disabled = false, style = {} }) => (
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
      opacity: disabled ? 0.6 : 1,
      ...style
    }}
  >
    {children}
  </button>
);

const Input = ({ label, ...props }) => (
  <div>
    <label style={{ display: 'block', marginTop: '10px', fontWeight: 'bold', color: WhatsAppGreen }}>
      {label}:
    </label>
    <input
      style={{
        width: '100%',
        padding: '8px',
        margin: '5px 0',
        boxSizing: 'border-box',
        border: `1px solid ${WhatsAppGreen}`,
        borderRadius: '3px',
        fontSize: '14px'
      }}
      {...props}
    />
  </div>
);

const Header = ({ title }) => (
  <h2 style={{ 
    color: WhatsAppGreen, 
    borderBottom: `2px solid ${WhatsAppGreen}`, 
    paddingBottom: '5px',
    marginTop: 0,
    fontSize: '18px'
  }}>
    {title}
  </h2>
);

const ErrorMessage = ({ message }) => (
  <div style={{
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '10px',
    fontSize: '12px'
  }}>
    {message}
  </div>
);

const SuccessMessage = ({ message }) => (
  <div style={{
    backgroundColor: WhatsAppLightGreen,
    color: WhatsAppGreen,
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '10px',
    fontSize: '12px'
  }}>
    {message}
  </div>
);

// --- Main Application Logic ---
const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState('login'); // 'login', 'register', 'schedule', 'list', 'profile'
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await api.getToken();
      if (token) {
        const userData = await api.getProfile();
        setUser(userData);
        setIsLoggedIn(true);
        setView('schedule');
      }
    } catch (error) {
      setIsLoggedIn(false);
      setView('login');
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const data = await api.login(username, password);
      await api.setToken(data.token);
      setUser(data.user);
      setIsLoggedIn(true);
      setView('schedule');
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (userData) => {
    try {
      const data = await api.register(userData);
      await api.setToken(data.token);
      setUser(data.user);
      setIsLoggedIn(true);
      setView('schedule');
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    setView('login');
  };

  const renderView = () => {
    if (!isLoggedIn) {
      if (view === 'register') {
        return <Register onRegister={handleRegister} onSwitchToLogin={() => setView('login')} />;
      }
      return <Login onLogin={handleLogin} onSwitchToRegister={() => setView('register')} />;
    }

    switch (view) {
      case 'schedule':
        return <ScheduleMessage setView={setView} />;
      case 'list':
        return <ScheduledList setView={setView} />;
      case 'profile':
        return <Profile user={user} setUser={setUser} setView={setView} />;
      default:
        return <ScheduleMessage setView={setView} />;
    }
  };

  return (
    <div style={{ padding: '15px', width: '400px', minHeight: '500px', fontFamily: 'Arial, sans-serif' }}>
      <Header title="WhatsApp Scheduler" />
      {isLoggedIn && (
        <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <Button 
            onClick={() => setView('schedule')} 
            disabled={view === 'schedule'}
            style={{ flex: 1, fontSize: '12px', padding: '8px' }}
          >
            Agendar
          </Button>
          <Button 
            onClick={() => setView('list')} 
            disabled={view === 'list'}
            style={{ flex: 1, fontSize: '12px', padding: '8px' }}
          >
            Mensagens
          </Button>
          <Button 
            onClick={() => setView('profile')} 
            disabled={view === 'profile'}
            style={{ flex: 1, fontSize: '12px', padding: '8px' }}
          >
            Perfil
          </Button>
          <Button 
            onClick={handleLogout} 
            style={{ backgroundColor: WhatsAppLightGreen, color: WhatsAppGreen, flex: 1, fontSize: '12px', padding: '8px' }}
          >
            Sair
          </Button>
        </div>
      )}
      {renderView()}
    </div>
  );
};

// --- Register Component ---
const Register = ({ onRegister, onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Username e senha são obrigatórios');
      return;
    }

    setIsLoading(true);
    try {
      await onRegister({ username, email, password, whatsappNumber });
    } catch (error) {
      setError(error.message || 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Header title="Criar Conta" />
      {error && <ErrorMessage message={error} />}
      <form onSubmit={handleSubmit}>
        <Input
          label="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Digite seu username"
          required
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com (opcional)"
        />
        <Input
          label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          required
          minLength={6}
        />
        <Input
          label="Número WhatsApp"
          type="tel"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          placeholder="+5511999999999 (opcional)"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Criando conta...' : 'Criar Conta'}
        </Button>
      </form>
      <p style={{ fontSize: '12px', textAlign: 'center', marginTop: '15px', color: '#666' }}>
        Já tem uma conta?{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToLogin(); }} style={{ color: WhatsAppGreen }}>
          Fazer login
        </a>
      </p>
    </div>
  );
};

// --- Login Component ---
const Login = ({ onLogin, onSwitchToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Username e senha são obrigatórios');
      return;
    }

    setIsLoading(true);
    try {
      await onLogin(username, password);
    } catch (error) {
      setError(error.message || 'Credenciais inválidas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Header title="Login" />
      {error && <ErrorMessage message={error} />}
      <form onSubmit={handleSubmit}>
        <Input
          label="Username ou Email"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Digite seu username ou email"
          required
        />
        <Input
          label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Digite sua senha"
          required
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
      <p style={{ fontSize: '12px', textAlign: 'center', marginTop: '15px', color: '#666' }}>
        Não tem uma conta?{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToRegister(); }} style={{ color: WhatsAppGreen }}>
          Criar conta
        </a>
      </p>
    </div>
  );
};

// --- Profile Component ---
const Profile = ({ user, setUser, setView }) => {
  const [email, setEmail] = useState(user?.email || '');
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsappNumber || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setIsLoading(true);
    try {
      const updatedUser = await api.updateProfile({ email, whatsappNumber });
      setUser(updatedUser);
      setSuccess('Perfil atualizado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message || 'Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Header title="Meu Perfil" />
      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}
      <form onSubmit={handleSave}>
        <Input
          label="Username"
          type="text"
          value={user?.username || ''}
          disabled
          style={{ backgroundColor: '#f5f5f5' }}
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
        />
        <Input
          label="Número WhatsApp"
          type="tel"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          placeholder="+5511999999999"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </form>
      <p style={{ fontSize: '11px', color: '#666', marginTop: '15px' }}>
        <strong>Dica:</strong> Configure seu número do WhatsApp para facilitar o agendamento de mensagens.
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!contactName || !phoneNumber || !sendDate || !sendTime || !messageContent) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    const scheduledDateTime = new Date(`${sendDate}T${sendTime}:00`);
    if (scheduledDateTime < new Date()) {
      setError('A data/hora deve ser no futuro');
      return;
    }

    setIsLoading(true);
    try {
      await api.schedule({
        contactName,
        phoneNumber,
        scheduledDateTime: scheduledDateTime.toISOString(),
        messageContent,
      });
      setSuccess('Mensagem agendada com sucesso!');
      // Limpar formulário
      setContactName('');
      setPhoneNumber('');
      setSendDate('');
      setSendTime('');
      setMessageContent('');
      setTimeout(() => {
        setSuccess('');
        setView('list');
      }, 2000);
    } catch (error) {
      setError(error.message || 'Erro ao agendar mensagem');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Header title="Agendar Mensagem" />
      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}
      <form onSubmit={handleSubmit}>
        <Input
          label="Nome do Contato"
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Ex: João Silva"
          required
        />
        <Input
          label="Número do WhatsApp"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+5511999999999"
          required
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Data"
              type="date"
              value={sendDate}
              onChange={(e) => setSendDate(e.target.value)}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <Input
              label="Hora"
              type="time"
              value={sendTime}
              onChange={(e) => setSendTime(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', marginTop: '10px', fontWeight: 'bold', color: WhatsAppGreen }}>
            Mensagem:
          </label>
          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            rows="4"
            style={{
              width: '100%',
              padding: '8px',
              margin: '5px 0',
              boxSizing: 'border-box',
              border: `1px solid ${WhatsAppGreen}`,
              borderRadius: '3px',
              fontSize: '14px',
              fontFamily: 'Arial, sans-serif'
            }}
            placeholder="Digite sua mensagem aqui..."
            required
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Agendando...' : 'Agendar Mensagem'}
        </Button>
      </form>
    </div>
  );
};

// --- Scheduled List Component ---
const ScheduledList = ({ setView }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMessages = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getMessages();
      setMessages(data.messages || []);
    } catch (error) {
      setError(error.message || 'Erro ao carregar mensagens');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Tem certeza que deseja cancelar esta mensagem?')) return;
    try {
      await api.cancelMessage(id);
      fetchMessages();
    } catch (error) {
      alert(`Erro ao cancelar: ${error.message}`);
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
    return <p style={{ textAlign: 'center' }}>Carregando mensagens...</p>;
  }

  if (error) {
    return (
      <div>
        <ErrorMessage message={error} />
        <Button onClick={fetchMessages}>Tentar Novamente</Button>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div>
        <p style={{ textAlign: 'center', color: '#666' }}>
          Nenhuma mensagem agendada.{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); setView('schedule'); }} style={{ color: WhatsAppGreen }}>
            Agendar uma agora
          </a>
        </p>
      </div>
    );
  }

  return (
    <div>
      <Header title="Mensagens Agendadas" />
      <div style={{ maxHeight: '400px', overflowY: 'auto', border: `1px solid ${WhatsAppGreen}`, padding: '10px', borderRadius: '5px' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', fontSize: '13px' }}>
            <p><strong>Para:</strong> {msg.contactName} ({msg.phoneNumber})</p>
            <p><strong>Data/Hora:</strong> {new Date(msg.scheduledDateTime).toLocaleString('pt-BR')}</p>
            <p><strong>Mensagem:</strong> {msg.messageContent.substring(0, 50)}{msg.messageContent.length > 50 ? '...' : ''}</p>
            <p><strong>Status:</strong> <span style={getStatusStyle(msg.status)}>{msg.status}</span></p>
            {msg.status === 'Scheduled' && (
              <button
                onClick={() => handleCancel(msg.id)}
                style={{
                  backgroundColor: 'red',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginTop: '5px'
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        ))}
      </div>
      <Button onClick={fetchMessages} style={{ backgroundColor: '#eee', color: '#333', marginTop: '10px' }}>
        Atualizar Lista
      </Button>
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
