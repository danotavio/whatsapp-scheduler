#!/bin/bash

# Script de configuração inicial do servidor
# Execute: bash setup.sh

echo "🚀 Configurando servidor WhatsApp Scheduler..."

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env a partir do .env.example..."
    cp .env.example .env
    echo "⚠️  IMPORTANTE: Edite o arquivo .env com suas credenciais do Supabase!"
    echo ""
else
    echo "✅ Arquivo .env já existe"
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Verificar se DATABASE_URL está configurado
if grep -q "DATABASE_URL=\"\"" .env 2>/dev/null || ! grep -q "DATABASE_URL=" .env 2>/dev/null; then
    echo ""
    echo "⚠️  ATENÇÃO: Configure DATABASE_URL no arquivo .env antes de continuar!"
    echo "   Veja SUPABASE_SETUP.md para instruções detalhadas"
    echo ""
    exit 1
fi

# Executar schema SQL
echo "🗄️  Configure o schema do banco de dados no Supabase SQL Editor"
echo "   Execute o arquivo: database/schema.sql"

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "Para iniciar o servidor, execute:"
echo "  npm start"
echo ""

