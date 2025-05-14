class SqlServerDriver {
  constructor(os, config) {
    const sql = require("mssql");
    this.name = "sqlserver";
    this.os = os;
    this.devClass = "SQL Database";
    this.version = 0.2;
    this.pool = new sql.ConnectionPool(config);
    this.sql = sql;
    this.connected = false;
  }

  async connect() {
    if (!this.connected) {
      await this.pool.connect();
      this.connected = true;
    }
  }

  async query(sqlStr, params = []) {
    await this.connect();
    const request = this.pool.request();
    params.forEach((val, idx) => {
      request.input(`param${idx + 1}`, val);
    });
    const result = await request.query(sqlStr);
    return result.recordset;
  }

  async select(table, fields = "*", where = "", params = []) {
    const q = `SELECT ${fields} FROM [${table}]${where ? ` WHERE ${where}` : ""}`;
    return await this.query(q, params);
  }

  async insert(table, obj) {
    const keys = Object.keys(obj);
    const placeholders = keys.map((_, i) => `@param${i + 1}`).join(",");
    const values = keys.map(k => obj[k]);
    const q = `INSERT INTO [${table}] (${keys.join(",")}) VALUES (${placeholders})`;
    return await this.query(q, values);
  }

  async update(table, obj, where = "", whereParams = []) {
    const keys = Object.keys(obj);
    const assignments = keys.map((k, i) => `[${k}]=@param${i + 1}`).join(",");
    const values = keys.map(k => obj[k]);
    const q = `UPDATE [${table}] SET ${assignments}${where ? ` WHERE ${where}` : ""}`;
    return await this.query(q, [...values, ...whereParams]);
  }

  async delete(table, where = "", params = []) {
    const q = `DELETE FROM [${table}]${where ? ` WHERE ${where}` : ""}`;
    return await this.query(q, params);
  }

  async reconnect(config) {
    await this.pool.close();
    this.pool = new this.sql.ConnectionPool(config);
    this.connected = false;
    await this.connect();
  }
}

module.exports = { SqlServerDriver };

// function sqlServer(os, config) {
//   const mssql = require("mssql");

//   this.name = "sqlserver";
//   this.os = os;
//   this.devClass = "SQL Database";
//   this.version = 0.1;
//   this.pool = null;
//   this.config = config;

//   // Connect langsung saat init
//   mssql.connect(config).then(p => {
//     this.pool = p;
//     os.getDevice("syslogger")?.append(`[sqlserver] Connected to ${config.server}/${config.database}`);
//   }).catch(err => {
//     os.getDevice("syslogger")?.append(`[sqlserver] Connect error: ${err.message}`);
//   });

//   // General query
//   this.query = async (sqlStr) => {
//     if (!this.pool) throw new Error("DB not connected.");
//     const result = await this.pool.request().query(sqlStr);
//     return result.recordset;
//   };

//   // SELECT
//   this.select = async (table, fields = "*", where = "") => {
//     const q = `SELECT ${fields} FROM ${table} ${where ? `WHERE ${where}` : ""}`;
//     return await this.query(q);
//   };

//   // INSERT
//   this.insert = async (table, obj) => {
//     const keys = Object.keys(obj);
//     const values = keys.map(k => `'${obj[k]}'`);
//     const q = `INSERT INTO ${table} (${keys.join(",")}) VALUES (${values.join(",")})`;
//     return await this.query(q);
//   };

//   // UPDATE
//   this.update = async (table, obj, where) => {
//     const updates = Object.entries(obj).map(([k, v]) => `${k}='${v}'`).join(",");
//     const q = `UPDATE ${table} SET ${updates} WHERE ${where}`;
//     return await this.query(q);
//   };

//   // DELETE
//   this.delete = async (table, where) => {
//     const q = `DELETE FROM ${table} WHERE ${where}`;
//     return await this.query(q);
//   };

//   // Optional: Reconnect
//   this.reconnect = async () => {
//     await mssql.close();
//     this.pool = await mssql.connect(this.config);
//   };
// }

// module.exports = { sqlServer: sqlServer };
