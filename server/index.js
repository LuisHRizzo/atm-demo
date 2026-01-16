import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for large CSV uploads

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'atm_user',
  password: process.env.DB_PASSWORD || 'atm_password',
  database: process.env.DB_NAME || 'atm_db',
  multipleStatements: true
};

let pool;

async function initDB() {
  try {
    pool = mysql.createPool(dbConfig);
    console.log('Connected to MySQL.');

    // Initialize Schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
    console.log('Database schema ensured.');
    
    // Migration helper: Add columns if they don't exist (for existing dev containers)
    try {
       await pool.query("ALTER TABLE transactions ADD COLUMN source VARCHAR(20) DEFAULT 'OTHER'");
       console.log("Migration: Added source column.");
    } catch (e) {}

    try {
       await pool.query("ALTER TABLE transactions ADD COLUMN period VARCHAR(20) DEFAULT 'UNKNOWN'");
       console.log("Migration: Added period column.");
    } catch (e) {}

    try {
       await pool.query("ALTER TABLE transactions ADD COLUMN metadata JSON");
       console.log("Migration: Added metadata column.");
    } catch (e) {}

  } catch (err) {
    console.error('Database connection failed. Is Docker running?', err.message);
    process.exit(1);
  }
}

// Routes
app.get('/api/data', async (req, res) => {
  try {
    const [locations] = await pool.query('SELECT * FROM locations');
    const [terminals] = await pool.query('SELECT * FROM terminals');
    const [transactions] = await pool.query('SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 2000');
    
    const mapLoc = l => ({
      id: l.id, name: l.name, city: l.city, state: l.state, zip: l.zip, rentModel: l.rent_model, baseRent: Number(l.base_rent)
    });
    const mapTerm = t => ({
      sn: t.sn, atmId: t.atm_id, locationId: t.location_id, cashOnHand: Number(t.cash_on_hand), lastOnline: t.last_online, status: t.status
    });
    const mapTx = t => ({
      id: t.id, terminalSn: t.terminal_sn, timestamp: t.timestamp, type: t.type, amountCash: Number(t.amount_cash), 
      amountCrypto: Number(t.amount_crypto), exchangePrice: Number(t.exchange_price), markupPercent: Number(t.markup_percent),
      fixedFee: Number(t.fixed_fee), status: t.status, grossProfit: Number(t.gross_profit),
      source: t.source || 'OTHER', period: t.period || 'UNKNOWN',
      metadata: t.metadata || {} 
    });

    res.json({
      locations: locations.map(mapLoc),
      terminals: terminals.map(mapTerm),
      transactions: transactions.map(mapTx)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync', async (req, res) => {
  const { locations, terminals, transactions } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Upsert Locations
    if (locations.length > 0) {
      const locValues = locations.map(l => [l.id, l.name, l.city, l.state, l.zip, l.rentModel, l.baseRent]);
      await connection.query(
        `INSERT INTO locations (id, name, city, state, zip, rent_model, base_rent) VALUES ? 
         ON DUPLICATE KEY UPDATE name=VALUES(name), city=VALUES(city), state=VALUES(state), rent_model=VALUES(rent_model)`,
        [locValues]
      );
    }

    // Upsert Terminals
    if (terminals.length > 0) {
      const termValues = terminals.map(t => [t.sn, t.atmId, t.locationId, t.cashOnHand, new Date(t.lastOnline), t.status]);
      await connection.query(
        `INSERT INTO terminals (sn, atm_id, location_id, cash_on_hand, last_online, status) VALUES ?
         ON DUPLICATE KEY UPDATE cash_on_hand=VALUES(cash_on_hand), last_online=VALUES(last_online), status=VALUES(status)`,
        [termValues]
      );
    }

    // Insert Transactions
    if (transactions.length > 0) {
      const txValues = transactions.map(t => [
        t.id, t.terminalSn, new Date(t.timestamp), t.type, t.amountCash, t.amountCrypto, 
        t.exchangePrice, t.markupPercent, t.fixedFee, t.status, t.grossProfit,
        t.source || 'OTHER', t.period || 'UNKNOWN', JSON.stringify(t.metadata || {})
      ]);
      await connection.query(
        `INSERT IGNORE INTO transactions (id, terminal_sn, timestamp, type, amount_cash, amount_crypto, exchange_price, markup_percent, fixed_fee, status, gross_profit, source, period, metadata) VALUES ?`,
        [txValues]
      );
    }

    await connection.commit();
    res.json({ success: true, message: "Data synced to MySQL" });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: "Failed to sync data" });
  } finally {
    connection.release();
  }
});

const PORT = 3001;
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
  });
});