-- Database initialization script for PakSentiment
-- Run this with: psql -U postgres -f scripts/init-database.sql
-- Or: psql -U postgres -c "CREATE DATABASE paksentiment;"

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE paksentiment'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'paksentiment')\gexec

-- Note: TypeORM will automatically create all tables when synchronize: true is enabled
-- Tables that will be created:
-- - users
-- - identities
-- - user_preferences
-- - user_activities
-- - api_keys
-- - system_configs

