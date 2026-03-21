import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { DATABASE_NAME } from "@/config/constants";
import { bootstrapSql } from "@/services/database/migrations";

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function openDatabase() {
  const database = await openDatabaseAsync(DATABASE_NAME);
  await database.execAsync(bootstrapSql);
  return database;
}

export async function initializeDatabase() {
  if (!databasePromise) {
    databasePromise = openDatabase();
  }

  await databasePromise;
}

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = openDatabase();
  }

  return databasePromise;
}
