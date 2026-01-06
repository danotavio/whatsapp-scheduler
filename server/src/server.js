require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const sql = require('./db');
const { startScheduler } = require('./scheduler');

const app = express();

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

// Register new user
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, whatsappNumber } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Validar email se fornecido
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  try {
    // Verificar se usuário já existe
    const [existingUser] = await sql`
      SELECT id FROM users WHERE username = ${username} OR email = ${email || ''}
    `;

    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [newUser] = await sql`
      INSERT INTO users (username, email, password, whatsapp_number)
      VALUES (${username}, ${email || null}, ${hashedPassword}, ${whatsappNumber || null})
      RETURNING id, username, email, whatsapp_number
    `;

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ 
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        whatsappNumber: newUser.whatsapp_number
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ message: 'Username or email already exists' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const [user] = await sql`
      SELECT id, username, password, email, whatsapp_number
      FROM users 
      WHERE username = ${username} OR email = ${username}
    `;

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        whatsappNumber: user.whatsapp_number
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* -------------------- USER PROFILE -------------------- */

// Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const [user] = await sql`
      SELECT id, username, email, whatsapp_number, created_at
      FROM users
      WHERE id = ${req.user.id}
    `;

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      whatsappNumber: user.whatsapp_number,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  const { email, whatsappNumber } = req.body;

  try {
    // Validar email se fornecido
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Verificar se email já está em uso por outro usuário
    if (email) {
      const [existingEmail] = await sql`
        SELECT id FROM users WHERE email = ${email} AND id != ${req.user.id}
      `;
      if (existingEmail) {
        return res.status(409).json({ message: 'Email already in use' });
      }
    }

    const [updatedUser] = await sql`
      UPDATE users
      SET 
        email = COALESCE(${email || null}, email),
        whatsapp_number = COALESCE(${whatsappNumber || null}, whatsapp_number)
      WHERE id = ${req.user.id}
      RETURNING id, username, email, whatsapp_number
    `;

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      whatsappNumber: updatedUser.whatsapp_number
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ message: 'Email already in use' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* -------------------- MESSAGES -------------------- */

// Schedule message
app.post('/api/messages/schedule', authenticateToken, async (req, res) => {
  const { contactName, phoneNumber, scheduledDateTime, messageContent } = req.body;

  if (!contactName || !phoneNumber || !scheduledDateTime || !messageContent) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const [message] = await sql`
      INSERT INTO messages (user_id, contact_name, phone_number, message_content, scheduled_at)
      VALUES (${req.user.id}, ${contactName}, ${phoneNumber}, ${messageContent}, ${new Date(scheduledDateTime)})
      RETURNING id
    `;

    res.status(201).json({ id: message.id });
  } catch (error) {
    console.error('Schedule message error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// List messages
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const messages = await sql`
      SELECT 
        id,
        contact_name,
        phone_number,
        message_content,
        scheduled_at,
        status
      FROM messages
      WHERE user_id = ${req.user.id}
      ORDER BY scheduled_at DESC
    `;

    // Transform messages to match frontend expectations
    const transformedMessages = messages.map(msg => ({
      id: msg.id,
      contactName: msg.contact_name,
      phoneNumber: msg.phone_number,
      scheduledDateTime: msg.scheduled_at,
      messageContent: msg.message_content,
      status: msg.status === 'SENT' ? 'Sent successfully' : msg.status === 'SCHEDULED' ? 'Scheduled' : msg.status
    }));

    res.json({ messages: transformedMessages });
  } catch (error) {
    console.error('List messages error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Cancel message
app.post('/api/messages/cancel/:id', authenticateToken, async (req, res) => {
  const messageId = Number(req.params.id);

  try {
    const [message] = await sql`
      SELECT id, status
      FROM messages
      WHERE id = ${messageId} AND user_id = ${req.user.id}
    `;

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.status !== 'SCHEDULED') {
      return res.status(400).json({
        message: `Cannot cancel message with status ${message.status}`
      });
    }

    await sql`
      UPDATE messages
      SET status = 'CANCELED'
      WHERE id = ${messageId}
    `;

    res.json({ message: 'Canceled successfully' });
  } catch (error) {
    console.error('Cancel message error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* -------------------- SERVER -------------------- */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on port ${PORT}`);
  // Start the scheduler when server starts
  startScheduler();
});
