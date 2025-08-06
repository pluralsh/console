#!/usr/bin/env bash
set -e

# Start PostgreSQL in background
/usr/local/bin/docker-entrypoint.sh "$@" &
PG_PID=$!

# Wait for PostgreSQL to be ready
until pg_isready -U "$POSTGRES_USER"; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 2
done

echo "PostgreSQL is ready. Creating extensions..."

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
    # Kill PostgreSQL and exit with error
    kill $PG_PID
    exit $PSQL_EXIT_CODE
fi

# Keep PostgreSQL running in foreground
wait $PG_PID