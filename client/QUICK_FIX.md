# 🔧 Correção Rápida - Erro de Manifest

## Problema
O Chrome não encontra o `manifest.json` porque ele estava em `client/public/` ao invés da raiz.

## ✅ Solução Imediata

### 1. Instalar Dependências de Build

```bash
cd client
npm install
```

### 2. Compilar o React

```bash
npm run build
```

Isso criará o arquivo `popup.js` na raiz de `client/`.

### 3. Criar Ícones (Opcional)

Crie uma pasta `icons/` em `client/` com ícones ou remova a seção `icons` do `manifest.json` temporariamente.

**Para remover temporariamente:**
Edite `client/manifest.json` e remova ou comente as linhas:
```json
"icons": { ... },
"default_icon": { ... }
```

### 4. Carregar no Chrome

1. Abra `chrome://extensions/`
2. Ative "Modo do desenvolvedor"
3. Clique em "Carregar sem compactação"
4. **Selecione a pasta `client/`** (não `client/public`)

## ✅ Estrutura Correta

```
client/
├── manifest.json      ← Agora está aqui (raiz)
├── popup.html        ← Agora está aqui (raiz)
├── popup.js          ← Será criado pelo build
├── service-worker.js ← Já estava aqui
└── src/
    └── popup.jsx     ← Código fonte
```

## ⚠️ Importante

- O Chrome **não pode** executar JSX diretamente
- Você **precisa** executar `npm run build` antes de carregar
- Após mudanças no código, execute `npm run build` novamente

## 🚀 Desenvolvimento com Watch

Para rebuild automático durante desenvolvimento:

```bash
npm run dev
```

Isso recompilará automaticamente quando você salvar mudanças em `popup.jsx`.

