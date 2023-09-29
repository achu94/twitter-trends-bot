import { Database } from "bun:sqlite";
import chalk from "chalk";

class DatabaseManager {
  public db: Database | null;
  private dbName = "twitter_trends.db";

  constructor() {
    this.db = null;
  }

  async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this.db = new Database(this.dbName, { create: true });
        resolve();
      } catch (err) {
        console.log(err, chalk.blue("Error connecting to database"));
        reject(err);
      }

      console.log(
        chalk.bgGreen("Connected to the SQLite database:", this.dbName)
      );
    });
  }

  async createTablesIfNotExists(): Promise<void> {
    console.log("IN");

    if (!this.db) {
      throw new Error(chalk.bgRed("Database is not connected."));
    }

    // Define SQL statements for creating five tables here
    const createTableQueries = [
      `
      CREATE TABLE IF NOT EXISTS main_data (
        id INTEGER PRIMARY KEY,
        date TEXT,
        title TEXT,
        totalPosts REAL,
        pos INTEGER,
        theme TEXT
      );
      `,
      `
        CREATE TABLE IF NOT EXISTS trend (
          id INTEGER PRIMARY KEY,
          postName
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY,
          postName
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY,
          person,
          content,
          likes
        );
      `,
    ];

    for (const query of createTableQueries) {
      this.db.exec(query);
    }

    console.log(chalk.bgGreen("Tables created or already exist.", this.dbName));
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      console.log("Closed the SQLite database.");
    }
  }

  async finalize(): Promise<void> {
    await this.close();
  }
}

class MainTable extends DatabaseManager {
  constructor() {
    super();
    this.connect();
  }

  async insertData(title: string, totalPosts: string, pos: number, theme: string) {
    if (!this.db) {
      throw new Error(chalk.bgRed("Database is not connected."));
    }

    console.log(chalk.bgGreen("Start inserting data"));
    const query =
      `
        INSERT INTO main_data (date, title, totalPosts, pos, theme)
        values(DATETIME('now'), ?, ?, ?, ?)
      `;
    
    return new Promise<void>((resolve, reject) => {
      try {
        this.db?.run(query, [title, totalPosts, pos, theme]);
        resolve();
      } catch(err){
        console.error(chalk.bgRed("Error inserting data"), err);
      } finally {
        this.finalize();
      }
    });
  }

  async getAllData() {
    if (!this.db) {
      throw new Error(chalk.bgRed("Database is not connected."));
    }

    const query = "SELECT * FROM main_data";
    const result = this.db.query(query);
    return result;
  }
}

// Example usage
(async () => {
  const dbManager = new DatabaseManager();

  try {
    await dbManager.connect();
    await dbManager.createTablesIfNotExists();
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    dbManager.close();
  }
})();

export { MainTable };