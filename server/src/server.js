const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('./generated/prisma');

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

app.use(bodyParser.json());

/* -------------------- HEALTH -------------------- */

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

/* -------------------- AUTH MIDDLEWARE -------------------- */

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.sendStatus(403);
    req.user = payload;
    next();
  });
};

/* -------------------- AUTH -------------------- */

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  let user = await prisma.user.findUnique({
    where: { username }
  });

  // Signup automático (MVP)
  if (!user) {
    const hashedPassword = await bcrypt.hash(password, 10);

    user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword
      }
    });
  } else {
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token });
});

/* -------------------- MESSAGES -------------------- */

// Schedule message
app.post('/api/messages/schedule', authenticateToken, async (req, res) => {
  const { contactName, phoneNumber, scheduledDateTime, messageContent } = req.body;

  if (!contactName || !phoneNumber || !scheduledDateTime || !messageContent) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const message = await prisma.scheduledMessage.create({
    data: {
      userId: req.user.id,
      contactName,
      phoneNumber,
      messageContent,
      scheduledAt: new Date(scheduledDateTime)
    }
  });

  res.status(201).json({ id: message.id });
});

// List messages
app.get('/api/messages', authenticateToken, async (req, res) => {
  const messages = await prisma.scheduledMessage.findMany({
    where: { userId: req.user.id },
    orderBy: { scheduledAt: 'desc' }
  });

  res.json({ messages });
});

// Cancel message
app.post('/api/messages/cancel/:id', authenticateToken, async (req, res) => {
  const messageId = Number(req.params.id);

  const message = await prisma.scheduledMessage.findFirst({
    where: {
      id: messageId,
      userId: req.user.id
    }
  });

  if (!message) {
    return res.status(404).json({ message: 'Message not found' });
  }

  if (message.status !== 'SCHEDULED') {
    return res.status(400).json({
      message: `Cannot cancel message with status ${message.status}`
    });
  }

  await prisma.scheduledMessage.update({
    where: { id: messageId },
    data: { status: 'CANCELED' }
  });

  res.json({ message: 'Canceled successfully' });
});

/* -------------------- SERVER -------------------- */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on port ${PORT}`);
});
