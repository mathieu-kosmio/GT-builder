#!/bin/bash
# =============================================================================
# GT-builder - bootstrap base : extensions + role applicatif (soumis au RLS)
# S'execute au premier demarrage de Postgres (docker-entrypoint-initdb.d).
# Utilise les variables APP_DB_USER / APP_DB_PASSWORD injectees au conteneur.
# =============================================================================
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Extensions
    CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector (recherche semantique / RAG)
    CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- chiffrement (cles API LLM)

    -- Role applicatif : NON superuser, NON BYPASSRLS -> le RLS s'applique a lui
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_DB_USER}') THEN
        CREATE ROLE ${APP_DB_USER} LOGIN PASSWORD '${APP_DB_PASSWORD}'
          NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
      END IF;
    END
    \$\$;

    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${APP_DB_USER};
    GRANT USAGE ON SCHEMA public TO ${APP_DB_USER};
EOSQL
