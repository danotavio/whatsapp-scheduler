# WhatsApp Scheduler - Chrome Extension

Extensão Chrome para agendar mensagens do WhatsApp com entrega automática via backend.

## 🏗️ Estrutura do Projeto

```
.
├── client/          # Extensão Chrome (Manifest V3)
│   ├── public/      # Manifest e HTML
│   ├── src/         # Código React
│   └── service-worker.js
│
└── server/          # Backend API & Automação
    ├── src/         # Código do servidor
    ├── prisma/      # Schema e migrações do banco
    └── package.json
```

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase ([criar conta](https://app.supabase.com))
- NPM ou Yarn

### Configuração do Backend

1. **Configure o Supabase** (veja [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) para instruções detalhadas)

2. **Instale as dependências do servidor:**
   ```bash
   cd server
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   # Edite .env com suas credenciais do Supabase
   ```

4. **Configure o schema do banco:**
   - Acesse o Supabase Dashboard → SQL Editor
   - Copie e execute o conteúdo de `server/database/schema.sql`
   - Ou veja instruções detalhadas em [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

5. **Inicie o servidor:**
   ```bash
   npm start
   ```

O servidor estará rodando em `http://localhost:3000`

### Configuração do Client (Extensão Chrome)

1. **Instale as dependências:**
   ```bash
   cd client
   npm install
   ```

2. **Carregue a extensão no Chrome:**
   - Abra `chrome://extensions/`
   - Ative "Modo do desenvolvedor"
   - Clique em "Carregar sem compactação"
   - Selecione a pasta `client/`

## 📚 Documentação

- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Guia completo de configuração do Supabase
- **[TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)** - Documentação técnica detalhada

## 🛠️ Tecnologias

- **Backend:**
  - Node.js + Express
  - postgres (biblioteca oficial do Supabase)
  - Supabase (PostgreSQL)
  - Playwright (automação WhatsApp)
  - JWT (autenticação)

- **Frontend:**
  - React
  - Chrome Extension API (Manifest V3)

## 📝 Variáveis de Ambiente

Crie um arquivo `.env` em `server/` com:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"
JWT_SECRET="sua-chave-secreta-jwt"
PORT=3000
```

## 🔧 Scripts Disponíveis

### Server
```bash
npm start    # Inicia o servidor
npm run dev   # Modo desenvolvimento
```

### Client
```bash
npm run build  # Compila a extensão
```

## 📦 Banco de Dados

O projeto usa Supabase (PostgreSQL) com a biblioteca `postgres`. O schema está definido em `server/database/schema.sql`.

**Tabelas:**
- `User` - Usuários do sistema
- `Message` - Mensagens agendadas

## 🔐 Segurança

- Senhas são hasheadas com bcrypt
- Autenticação via JWT
- Validação de dados no backend
- CORS configurado

## ⚠️ Avisos Importantes

- Este projeto usa automação do WhatsApp Web, o que pode violar os Termos de Serviço do WhatsApp
- Use apenas para fins educacionais ou com autorização
- O projeto é um MVP e não está pronto para produção sem melhorias de segurança e escalabilidade

## 📄 Licença

ISC
