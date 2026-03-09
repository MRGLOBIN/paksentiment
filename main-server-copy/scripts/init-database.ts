#!/usr/bin/env ts-node

/**
 * Database initialization script
 * Creates the PostgreSQL database if it doesn't exist
 * Run this before starting the Nest server for the first time
 */

import { Client } from 'pg';

const config = {
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  user: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? 'postgres',
  database: 'postgres', // Connect to default postgres DB to create our DB
};

const targetDb = process.env.POSTGRES_DB ?? 'paksentiment';

async function initDatabase() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDb],
    );

    if (result.rows.length > 0) {
      console.log(`Database "${targetDb}" already exists`);
    } else {
      // Create database
      await client.query(`CREATE DATABASE ${targetDb}`);
      console.log(`Database "${targetDb}" created successfully`);
    }

    await client.end();
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();

