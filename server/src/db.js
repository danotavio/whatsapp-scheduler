require('dotenv').config();
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const sql = postgres(connectionString, {
  // Configurações recomendadas para Supabase
  max: 10, // máximo de conexões no pool
  idle_timeout: 20, // tempo em segundos antes de fechar conexões idle
  connect_timeout: 10, // tempo em segundos para timeout de conexão
});

module.exports = sql;

