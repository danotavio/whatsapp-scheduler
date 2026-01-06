-- Migração: Adicionar campos email e whatsapp_number na tabela users
-- Execute este script no Supabase SQL Editor se você já tem a tabela criada
-- Este script é idempotente - pode ser executado múltiplas vezes sem erro

-- Adicionar coluna email (opcional, pode ser NULL)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email'
    ) THEN
        ALTER TABLE users ADD COLUMN email VARCHAR(255);
    END IF;
END $$;

-- Adicionar coluna whatsapp_number (opcional, pode ser NULL)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'whatsapp_number'
    ) THEN
        ALTER TABLE users ADD COLUMN whatsapp_number VARCHAR(50);
    END IF;
END $$;

-- Criar índice único para email (se não existir)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;

-- Criar índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_whatsapp_number ON users(whatsapp_number);

-- Comentários nas colunas
COMMENT ON COLUMN users.email IS 'Email do usuário';
COMMENT ON COLUMN users.whatsapp_number IS 'Número do WhatsApp do usuário no formato internacional (ex: +5511999999999)';

