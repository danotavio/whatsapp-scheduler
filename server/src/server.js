const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const {
  scheduleMessage,
  getScheduledMessages,
  cancelMessage,
  startScheduler
} = require('./scheduler');

const app = express();

/**
 * IMPORTANTE PARA RAILWAY
 * Nunca fixe porta manualmente.
 */
const PORT = process.env.PORT || 3000;

/**
 * ⚠️ Em produção:
 * - mover para variável de ambiente
 * - usar segredo longo
 */
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-mvp';

app.use(bodyParser.json());

/**
 * Healthcheck obrigatório (Railway / observabilidade)
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * --- Mock Database (MVP) ---
 */
const users = {}; // { username: { id, username, password } }
let messageIdCounter = 1;
const messages = [];

/**
 * --- Middleware JWT ---
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

/**
 * --- Auth ---
 * Login / Signup simples (MVP)
 */
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: 'Username and password are required'
    });
  }

  let user = users[username];

  if (!user) {
    const userId = Object.keys(users).length + 1;
    user = { id: userId, username, password };
    users[username] = user;
  } else if (user.password !== password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token });
});

/**
 * --- Schedule message ---
 */
app.post('/api/messages/schedule', authenticateToken, (req, res) => {
  const {
    contactName,
    phoneNumber,
    scheduledDateTime,
    messageContent
  } = req.body;

  if (!contactName || !phoneNumber || !scheduledDateTime || !messageContent) {
    return res.status(400).json({
      message: 'All message fields are required'
    });
  }

  const newMessage = {
    id: messageIdCounter++,
    userId: req.user.id,
    contactName,
    phoneNumber,
    scheduledDateTime: new Date(scheduledDateTime),
    messageContent,
    status: 'Scheduled'
  };

  messages.push(newMessage);
  scheduleMessage(newMessage);

  res.status(201).json({
    message: 'Message scheduled',
    id: newMessage.id
  });
});

/**
 * --- List messages ---
 */
app.get('/api/messages', authenticateToken, (req, res) => {
  const userMessages = messages
    .filter(msg => msg.userId === req.user.id)
    .sort((a, b) => b.scheduledDateTime - a.scheduledDateTime);

  res.json({ messages: userMessages });
});

/**
 * --- Cancel message ---
 */
app.post('/api/messages/cancel/:id', authenticateToken, (req, res) => {
  const messageId = Number(req.params.id);

  const message = messages.find(
    msg => msg.id === messageId && msg.userId === req.user.id
  );

  if (!message) {
    return res.status(404).json({
      message: 'Message not found or unauthorized'
    });
  }

  if (message.status !== 'Scheduled') {
    return res.status(400).json({
      message: `Cannot cancel message with status ${message.status}`
    });
  }

  message.status = 'Canceled';
  cancelMessage(message);

  res.json({ message: 'Message canceled successfully' });
});

/**
 * --- Start server ---
 */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend API running on port ${PORT}`);
  startScheduler(messages);
});
