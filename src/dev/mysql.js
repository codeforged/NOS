class mySQLDriver {
  constructor(os, config) {
    const mysql = require("mysql2/promise");
    this.name = "mysql";
    this.os = os;
    this.devClass = "SQL Database";
    this.version = 0.2;
    this.pool = mysql.createPool(config);
  }

  async query(sql, params = []) {
    const [rows] = await this.pool.execute(sql, params);
    return rows;
  }

  async select(table, fields = "*", where = "", params = []) {
    const q = `SELECT ${fields} FROM \`${table}\`${where ? ` WHERE ${where}` : ""}`;
    return await this.query(q, params);
  }

  async insert(table, obj) {
    const keys = Object.keys(obj);
    const placeholders = keys.map(() => "?").join(",");
    const values = keys.map(k => obj[k]);
    const q = `INSERT INTO \`${table}\` (${keys.join(",")}) VALUES (${placeholders})`;
    return await this.query(q, values);
  }

  async update(table, obj, where = "", whereParams = []) {
    const keys = Object.keys(obj);
    const assignments = keys.map(k => `\`${k}\`=?`).join(",");
    const values = keys.map(k => obj[k]);
    const q = `UPDATE \`${table}\` SET ${assignments}${where ? ` WHERE ${where}` : ""}`;
    return await this.query(q, [...values, ...whereParams]);
  }

  async delete(table, where = "", params = []) {
    const q = `DELETE FROM \`${table}\`${where ? ` WHERE ${where}` : ""}`;
    return await this.query(q, params);
  }

  async reconnect(config) {
    const mysql = require("mysql2/promise");
    this.pool = mysql.createPool(config);
  }
}

module.exports = { mySQLDriver };