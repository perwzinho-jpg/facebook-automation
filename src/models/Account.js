const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

class Account {
  static initialize() {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/accounts.db');
    this.db = new sqlite3.Database(dbPath);

    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT UNIQUE,
          email TEXT UNIQUE,
          password TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'pending',
          verified BOOLEAN DEFAULT 0,
          business_id TEXT,
          business_name TEXT,
          cnpj TEXT,
          domain TEXT,
          whatsapp_id TEXT,
          cookies TEXT,
          two_fa_secret TEXT,
          notes TEXT
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS account_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER,
          action TEXT,
          status TEXT,
          message TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES accounts(id)
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS sms_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER,
          phone TEXT,
          request_id TEXT,
          service TEXT,
          code TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          used_at DATETIME,
          FOREIGN KEY (account_id) REFERENCES accounts(id)
        )
      `);
    });
  }

  static create(accountData) {
    return new Promise((resolve, reject) => {
      const { uid, email, password, cnpj, businessName } = accountData;

      this.db.run(
        `INSERT INTO accounts (uid, email, password, cnpj, business_name, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [uid, email, password, cnpj, businessName],
        function(err) {
          if (err) {
            logger.error(`Erro ao criar conta: ${err.message}`);
            reject(err);
          } else {
            logger.info(`Conta criada com ID: ${this.lastID}`);
            resolve(this.lastID);
          }
        }
      );
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM accounts WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM accounts WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static findByUID(uid) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM accounts WHERE uid = ?', [uid], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static update(id, data) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(data);
      const values = Object.values(data);
      values.push(id);

      const query = `UPDATE accounts SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;

      this.db.run(query, values, function(err) {
        if (err) {
          logger.error(`Erro ao atualizar conta: ${err.message}`);
          reject(err);
        } else {
          logger.info(`Conta ${id} atualizada`);
          resolve(this.changes);
        }
      });
    });
  }

  static findAll(status = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM accounts';
      const params = [];

      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  static addLog(accountId, action, status, message) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO account_logs (account_id, action, status, message)
         VALUES (?, ?, ?, ?)`,
        [accountId, action, status, message],
        function(err) {
          if (err) {
            logger.error(`Erro ao registrar log: ${err.message}`);
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  static getAccountLogs(accountId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM account_logs WHERE account_id = ? ORDER BY timestamp DESC',
        [accountId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  static saveSMSRecord(accountId, phone, requestId, service, code) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO sms_records (account_id, phone, request_id, service, code)
         VALUES (?, ?, ?, ?, ?)`,
        [accountId, phone, requestId, service, code],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  static close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else {
          logger.info('Banco de dados fechado');
          resolve();
        }
      });
    });
  }
}

module.exports = Account;
