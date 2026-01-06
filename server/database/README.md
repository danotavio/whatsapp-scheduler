# Database Setup - Guia de Configuração

## 📋 Arquivos Disponíveis

1. **`schema.sql`** - Schema básico inicial (atualizado para ser idempotente)
2. **`schema_complete.sql`** - Schema completo com todos os campos (RECOMENDADO)
3. **`migration_add_email_whatsapp.sql`** - Migração para adicionar email e whatsapp_number

## 🚀 Como Configurar

### Opção 1: Banco Novo (Recomendado)

Se você está criando o banco do zero, use o schema completo:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo de `schema_complete.sql`
4. Execute (botão Run ou F5)

Este script é **idempotente** - pode ser executado múltiplas vezes sem erro.

### Opção 2: Banco Existente

Se você já tem o schema básico criado:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo de `migration_add_email_whatsapp.sql`
4. Execute

Este script adiciona apenas os campos `email` e `whatsapp_number` se não existirem.

### Opção 3: Atualizar Schema Existente

Se você recebeu o erro "type message_status already exists":

1. Use o arquivo `schema_complete.sql` que já trata esse caso
2. Ou execute apenas a migração `migration_add_email_whatsapp.sql`

## ✅ Verificar se Funcionou

Após executar o script, verifique:

1. **No Supabase Dashboard → Table Editor:**
   - Deve ver a tabela `users` com colunas:
     - id
     - username
     - email (novo)
     - password
     - whatsapp_number (novo)
     - created_at
   
   - Deve ver a tabela `messages` com todas as colunas

2. **No SQL Editor, execute:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'users';
   ```

## 🔧 Troubleshooting

### Erro: "type message_status already exists"

**Solução:** Use o arquivo `schema_complete.sql` que já trata esse caso, ou execute apenas a migração.

### Erro: "column already exists"

**Solução:** O script já verifica se a coluna existe antes de criar. Se ainda assim der erro, significa que a coluna já existe e está tudo certo.

### Erro: "relation does not exist"

**Solução:** Execute o `schema_complete.sql` primeiro para criar as tabelas.

## 📝 Estrutura Final das Tabelas

### Tabela `users`
- `id` - SERIAL PRIMARY KEY
- `username` - VARCHAR(255) UNIQUE NOT NULL
- `email` - VARCHAR(255) (opcional, único se preenchido)
- `password` - VARCHAR(255) NOT NULL
- `whatsapp_number` - VARCHAR(50) (opcional)
- `created_at` - TIMESTAMP DEFAULT NOW()

### Tabela `messages`
- `id` - SERIAL PRIMARY KEY
- `user_id` - INTEGER (FK para users)
- `contact_name` - VARCHAR(255) NOT NULL
- `phone_number` - VARCHAR(50) NOT NULL
- `message_content` - TEXT NOT NULL
- `scheduled_at` - TIMESTAMP NOT NULL
- `status` - message_status ENUM (SCHEDULED, SENT, CANCELED, FAILED)
- `created_at` - TIMESTAMP DEFAULT NOW()

## 🎯 Próximos Passos

Após configurar o banco:

1. Configure o `.env` no servidor com `DATABASE_URL`
2. Inicie o servidor: `npm start`
3. Teste a interface da extensão Chrome
