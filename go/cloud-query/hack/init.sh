#!/usr/bin/env bash
set -e

# Set default values if not provided
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_DB=${POSTGRES_DB:-postgres}

# Initialize database if not already done (PGDATA is set by the base image)
if [ ! -s "${PGDATA}/PG_VERSION" ]; then
    echo "ENTRYPOINT: Initializing database..."
    initdb --username="$POSTGRES_USER"
fi

# Start PostgreSQL in background (uses PGDATA from env)
postgres &
PG_PID=$!

# Wait for PostgreSQL to be ready
until pg_isready -U "$POSTGRES_USER"; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 2
done

echo "PostgreSQL is ready. Creating extensions..."

# Create database if it doesn't exist (connect to postgres to avoid PGDATABASE override)
DB_EXISTS=$(psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$POSTGRES_DB'")
[ "$DB_EXISTS" != "1" ] && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"

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
