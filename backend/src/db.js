const Database = require("better-sqlite3");
const db = new Database("support_calendar.db");

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      organization TEXT,
      category TEXT,
      start_date TEXT,
      end_date TEXT,
      url TEXT,
      detail_url TEXT,
      status TEXT DEFAULT 'ongoing',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source, title, end_date)
    );
  `);

  //
  // 기존 DB 대응
  //
  const columns = db.prepare(`PRAGMA table_info(notices)`).all();

  const hasDetailUrl = columns.some((c) => c.name === "detail_url");

  if (!hasDetailUrl) {
    db.exec(`
      ALTER TABLE notices
      ADD COLUMN detail_url TEXT
    `);
  }
}

module.exports = {
  db,
  initDb,
};
