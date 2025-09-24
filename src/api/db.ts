import { Database, Statement } from 'bun:sqlite'; // Import Statement

export class Db {
  private dbInstance: Database | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  public connect(): Database {
    if (!this.dbInstance || !this.dbInstance.open) {
      try {
        this.dbInstance = new Database(this.dbPath);
      } catch (error: any) {
        console.error(`[DB] Error connecting to database: ${error.message}`);
        throw error; // Re-throw to be handled by caller
      }
    }
    return this.dbInstance;
  }

  public close(): void {
    if (this.dbInstance && this.dbInstance.open) {
      this.dbInstance.close();
      this.dbInstance = null;
      console.log('[DB] Database connection closed.');
    }
  }

  // --- New Utility Methods ---

  /**
   * Executes a SQL statement that does not return rows (e.g., CREATE, ALTER, INSERT, UPDATE, DELETE).
   * @param sql The SQL query string.
   * @param params Optional parameters for the query.
   */
  public run(sql: string, params?: any): Statement {
    const db = this.connect();
    const stmt = db.prepare(sql);
    return stmt.run(params);
  }

  /**
   * Executes a SQL statement that returns all rows.
   * @param sql The SQL query string.
   * @param params Optional parameters for the query.
   * @returns An array of rows.
   */
  public all(sql: string, params?: any): any[] {
    const db = this.connect();
    const stmt = db.prepare(sql);
    return stmt.all(params);
  }

  /**
   * Executes a SQL statement that returns a single row.
   * @param sql The SQL query string.
   * @param params Optional parameters for the query.
   * @returns A single row object, or undefined if no row is found.
   */
  public get(sql: string, params?: any): any {
    const db = this.connect();
    const stmt = db.prepare(sql);
    return stmt.get(params);
  }

  /**
   * Executes a SQL statement that does not return rows (e.g., CREATE, ALTER, DROP).
   * This is typically for DDL statements.
   * @param sql The SQL query string.
   */
  public exec(sql: string): void {
    const db = this.connect();
    db.exec(sql);
  }

  /**
   * Prepares a SQL statement for later execution.
   * @param sql The SQL query string.
   * @returns A prepared Statement object.
   */
  public prepare(sql: string): Statement {
    const db = this.connect();
    return db.prepare(sql);
  }

  public async runMigrations(migrationsDir: string): Promise<void> {
    const db = this.connect();
    const { readdir } = await import('node:fs/promises');
    const { join } = await import('node:path');

    const migrationFiles = (await readdir(migrationsDir))
      .filter(file => file.endsWith('.ts') && file.startsWith('0'))
      .sort();

    for (const file of migrationFiles) {
      const migration = await import(join(process.cwd(), migrationsDir, file));
      if (migration.up && typeof migration.up === 'function') {
        console.log(`[DB] Running migration UP: ${file}`);
        await migration.up(this);
      } else {
        console.warn(`[DB] Migration file ${file} does not export an 'up' function.`);
      }
    }
    console.log('[DB] All migrations applied.');
  }
}
