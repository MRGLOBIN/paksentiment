import { Client } from 'pg';
import { MongoClient } from 'mongodb';

const pgConfig = {
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  user: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? 'postgres',
  database: process.env.POSTGRES_DB ?? 'paksentiment',
};

const mongoUrl = process.env.MONGO_URI ?? 'mongodb://localhost:27017';
const mongoDbName = process.env.MONGO_DB ?? 'paksentiment';

async function resetDatabase() {
  console.log('Starting Database Reset...');

  // 1. Reset PostgreSQL
  const pgClient = new Client(pgConfig);
  try {
    await pgClient.connect();
    console.log('[PG] Connected to PostgreSQL');

    // List of tables to truncate. Order matters for constraints, or use CASCADE.
    // 'users' is referenced by others.
    const tables = [
      'user_activities',
      'api_keys',
      'user_preferences',
      'users',
      'system_configs',
    ];

    console.log('[PG] Truncating tables...');
    for (const table of tables) {
      try {
        // We use CASCADE to handle foreign keys automatically
        await pgClient.query(`TRUNCATE TABLE "${table}" CASCADE`);
        console.log(`[PG] Truncated ${table}`);
      } catch (err) {
        console.warn(`[PG] Failed to truncate ${table}: ${err.message}`);
        // Continue to next table
      }
    }
    await pgClient.end();
  } catch (e) {
    console.error('[PG] Error connecting to Postgres:', e.message);
  }

  // 2. Reset MongoDB
  const mongoClient = new MongoClient(mongoUrl);
  try {
    await mongoClient.connect();
    console.log('[Mongo] Connected to MongoDB');

    const db = mongoClient.db(mongoDbName);

    // Easier to just drop database? Or collections?
    // "replace them with current schema" -> Schema is in code. Dropping DB forces TypeORM/Nest to recreate.
    // Ensure we don't drop something system critical if any. Paksentiment DB should be owned by us.

    await db.dropDatabase();
    console.log(`[Mongo] Dropped database: ${mongoDbName}`);

    await mongoClient.close();
  } catch (e) {
    console.error('[Mongo] Error resetting Mongo:', e.message);
  }

  console.log(
    'Database Reset Complete. Please restart the backend to recreate schemas.',
  );
}

resetDatabase();
