# Server - WhatsApp Scheduler Backend

Backend API e serviço de automação para o WhatsApp Scheduler.

## Configuração Inicial

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure o Supabase:**
   - Veja [../SUPABASE_SETUP.md](../SUPABASE_SETUP.md) para instruções detalhadas
   - Copie `.env.example` para `.env`
   - Preencha as variáveis de ambiente

3. **Configure o schema do banco:**
   - Acesse o Supabase Dashboard → SQL Editor
   - Execute o conteúdo de `database/schema.sql`
   - Se já tem a tabela criada, execute `database/migration_add_email_whatsapp.sql`

4. **Inicie o servidor:**
   ```bash
   npm start
   ```

## Estrutura

```
server/
├── src/
│   ├── server.js          # API Express principal
│   ├── scheduler.js        # Agendador de mensagens
│   ├── db.js              # Conexão com banco (postgres)
│   └── automation/
│       └── whatsapp_worker.js  # Automação Playwright
├── database/
│   ├── schema.sql         # Schema inicial do banco
│   └── migration_add_email_whatsapp.sql  # Migração para adicionar email e whatsapp
└── package.json
```

## Variáveis de Ambiente

Veja `.env.example` para a lista completa de variáveis necessárias.

## API Endpoints

- `GET /health` - Health check
- `POST /api/auth/register` - Criar nova conta
- `POST /api/auth/login` - Login
- `GET /api/user/profile` - Obter perfil do usuário
- `PUT /api/user/profile` - Atualizar perfil (email, whatsapp)
- `POST /api/messages/schedule` - Agendar mensagem
- `GET /api/messages` - Listar mensagens
- `POST /api/messages/cancel/:id` - Cancelar mensagem

## Banco de Dados

O projeto usa a biblioteca `postgres` com Supabase (PostgreSQL). Visualize os dados no Supabase Dashboard → Table Editor.

