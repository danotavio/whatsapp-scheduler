const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const { scheduleMessage, getScheduledMessages, cancelMessage, startScheduler } = require('./scheduler');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'super-secret-key-for-mvp'; // **WARNING: Replace with a secure, long, environment variable in production**

app.use(bodyParser.json());

// --- Mock Database (In-Memory for MVP) ---
const users = {}; // { username: { id, password, token } }
let messageIdCounter = 1;
const messages = []; // [{ id, userId, contactName, phoneNumber, scheduledDateTime, messageContent, status }]

// --- Middleware for JWT Authentication ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Authentication Endpoints ---

// Simple login/signup. If user exists, log in. If not, sign up.
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send({ message: 'Username and password are required' });
  }

  let user = users[username];

  if (!user) {
    // Sign Up (Mock)
    const userId = Object.keys(users).length + 1;
    user = { id: userId, username, password }; // In production, hash the password
    users[username] = user;
    console.log(`New user signed up: ${username}`);
  } else if (user.password !== password) {
    // Login Failed (Mock)
    return res.status(401).send({ message: 'Invalid credentials' });
  }

  // Generate JWT
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// --- Message Scheduling Endpoints ---

// Schedule a new message
app.post('/api/messages/schedule', authenticateToken, (req, res) => {
  const { contactName, phoneNumber, scheduledDateTime, messageContent } = req.body;

  if (!contactName || !phoneNumber || !scheduledDateTime || !messageContent) {
    return res.status(400).send({ message: 'All message fields are required' });
  }

  const newMessage = {
    id: messageIdCounter++,
    userId: req.user.id,
    contactName,
    phoneNumber,
    scheduledDateTime: new Date(scheduledDateTime),
    messageContent,
    status: 'Scheduled',
  };

  messages.push(newMessage);
  scheduleMessage(newMessage); // Pass to the scheduler
  res.status(201).json({ message: 'Message scheduled', id: newMessage.id });
});

// Get all scheduled messages for the user
app.get('/api/messages', authenticateToken, (req, res) => {
  const userMessages = messages
    .filter(msg => msg.userId === req.user.id)
    .sort((a, b) => b.scheduledDateTime - a.scheduledDateTime); // Sort by newest first

  res.json({ messages: userMessages });
});

// Cancel a scheduled message
app.post('/api/messages/cancel/:id', authenticateToken, (req, res) => {
  const messageId = parseInt(req.params.id);
  const messageIndex = messages.findIndex(msg => msg.id === messageId && msg.userId === req.user.id);

  if (messageIndex === -1) {
    return res.status(404).send({ message: 'Message not found or unauthorized' });
  }

  const message = messages[messageIndex];
  if (message.status !== 'Scheduled') {
    return res.status(400).send({ message: `Cannot cancel a message with status: ${message.status}` });
  }

  message.status = 'Canceled';
  cancelMessage(message); // Notify scheduler/worker to stop if in progress
  res.json({ message: 'Message canceled successfully' });
});

// --- Start Server and Scheduler ---
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
  startScheduler(messages); // Start the job scheduler
});
