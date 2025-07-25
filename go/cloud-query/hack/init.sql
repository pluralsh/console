CREATE EXTENSION IF NOT EXISTS steampipe_postgres_aws;
CREATE EXTENSION IF NOT EXISTS steampipe_postgres_azure;
CREATE EXTENSION IF NOT EXISTS steampipe_postgres_gcp;
CREATE SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS ltree WITH SCHEMA extensions;