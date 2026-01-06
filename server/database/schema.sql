-- Schema inicial do banco de dados
-- Execute este script no Supabase SQL Editor ou via migração
-- Este script é idempotente - pode ser executado múltiplas vezes sem erro

-- Criar enum para status das mensagens (se não existir)
DO $$ BEGIN
    CREATE TYPE message_status AS ENUM ('SCHEDULED', 'SENT', 'CANCELED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255) NOT NULL,
  whatsapp_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  message_content TEXT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  status message_status DEFAULT 'SCHEDULED',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_scheduled_at ON messages(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_whatsapp_number ON users(whatsapp_number);

