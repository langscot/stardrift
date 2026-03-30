#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  SELECT 'CREATE DATABASE stardrift_live' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'stardrift_live')\gexec
  SELECT 'CREATE DATABASE stardrift_test' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'stardrift_test')\gexec
  GRANT ALL PRIVILEGES ON DATABASE stardrift_live TO stellar;
  GRANT ALL PRIVILEGES ON DATABASE stardrift_test TO stellar;
EOSQL
