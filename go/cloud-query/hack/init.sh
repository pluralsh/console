#!/usr/bin/env bash
set -e

# Set default values if not provided
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_DB=${POSTGRES_DB:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-}

configure_pg_hba() {
    local pg_hba="${PGDATA}/pg_hba.conf"
    local has_ipv4_rule=false
    local has_ipv6_rule=false

    # Allow container-to-container TCP connections.
    while IFS= read -r line; do
        case "$line" in
            "host all all 0.0.0.0/0 scram-sha-256")
                has_ipv4_rule=true
                ;;
            "host all all ::/0 scram-sha-256")
                has_ipv6_rule=true
                ;;
        esac
    done < "$pg_hba"

    if [ "$has_ipv4_rule" = false ]; then
        echo "host all all 0.0.0.0/0 scram-sha-256" >> "$pg_hba"
    fi
    if [ "$has_ipv6_rule" = false ]; then
        echo "host all all ::/0 scram-sha-256" >> "$pg_hba"
    fi
}

# Initialize database if not already done (PGDATA is set by the base image)
if [ ! -s "${PGDATA}/PG_VERSION" ]; then
    echo "ENTRYPOINT: Initializing database..."
    initdb --username="$POSTGRES_USER"
fi
configure_pg_hba

# Start PostgreSQL in background (uses PGDATA from env)
postgres &
PG_PID=$!

# Wait for PostgreSQL to be ready
until pg_isready -U "$POSTGRES_USER"; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 2
done

echo "PostgreSQL is ready. Creating extensions..."

if [ -n "$POSTGRES_PASSWORD" ]; then
    psql -v ON_ERROR_STOP=1 \
      --set=postgres_user="$POSTGRES_USER" \
      --set=postgres_password="$POSTGRES_PASSWORD" \
      --username "$POSTGRES_USER" \
      --dbname postgres <<-'EOSQL'
      SELECT format('ALTER USER %I WITH PASSWORD %L', :'postgres_user', :'postgres_password') \gexec
EOSQL
fi

# Create database if it doesn't exist (connect to postgres to avoid PGDATABASE override)
DB_EXISTS=$(psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$POSTGRES_DB'")
if [ "$DB_EXISTS" != "1" ]; then
  createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
  echo "Database '$POSTGRES_DB' created successfully."
else
  echo "Database '$POSTGRES_DB' already exists."
fi

if psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE EXTENSION IF NOT EXISTS steampipe_postgres_aws;
  CREATE EXTENSION IF NOT EXISTS steampipe_postgres_azure;
  CREATE EXTENSION IF NOT EXISTS steampipe_postgres_gcp;
  CREATE SCHEMA IF NOT EXISTS extensions;
  CREATE EXTENSION IF NOT EXISTS ltree WITH SCHEMA extensions;
EOSQL
then
    echo "Extensions created successfully."
else
    PSQL_EXIT_CODE=$?
    echo "ERROR: psql failed with exit code $PSQL_EXIT_CODE"
    kill $PG_PID
    exit $PSQL_EXIT_CODE
fi

# Keep PostgreSQL running in foreground
wait $PG_PID
