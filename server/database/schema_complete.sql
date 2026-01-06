-- Schema completo e idempotente do banco de dados
-- Execute este script no Supabase SQL Editor
-- Pode ser executado múltiplas vezes sem erro

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
  email VARCHAR(255),
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

-- Adicionar colunas email e whatsapp_number se não existirem (para tabelas já criadas)
DO $$ 
BEGIN
    -- Adicionar email se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email'
    ) THEN
        ALTER TABLE users ADD COLUMN email VARCHAR(255);
    END IF;
    
    -- Adicionar whatsapp_number se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'whatsapp_number'
    ) THEN
        ALTER TABLE users ADD COLUMN whatsapp_number VARCHAR(50);
    END IF;
END $$;

-- Criar índice único para email (se não existir)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_scheduled_at ON messages(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_whatsapp_number ON users(whatsapp_number);

