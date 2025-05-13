function sqlServer(os, config) {
  const mssql = require("mssql");

  this.name = "sqlserver";
  this.os = os;
  this.devClass = "SQL Database";
  this.version = 0.1;
  this.pool = null;
  this.config = config;

  // Connect langsung saat init
  mssql.connect(config).then(p => {
    this.pool = p;
    os.getDevice("syslogger")?.append(`[sqlserver] Connected to ${config.server}/${config.database}`);
  }).catch(err => {
    os.getDevice("syslogger")?.append(`[sqlserver] Connect error: ${err.message}`);
  });

  // General query
  this.query = async (sqlStr) => {
    if (!this.pool) throw new Error("DB not connected.");
    const result = await this.pool.request().query(sqlStr);
    return result.recordset;
  };

  // SELECT
  this.select = async (table, fields = "*", where = "") => {
    const q = `SELECT ${fields} FROM ${table} ${where ? `WHERE ${where}` : ""}`;
    return await this.query(q);
  };

  // INSERT
  this.insert = async (table, obj) => {
    const keys = Object.keys(obj);
    const values = keys.map(k => `'${obj[k]}'`);
    const q = `INSERT INTO ${table} (${keys.join(",")}) VALUES (${values.join(",")})`;
    return await this.query(q);
  };

  // UPDATE
  this.update = async (table, obj, where) => {
    const updates = Object.entries(obj).map(([k, v]) => `${k}='${v}'`).join(",");
    const q = `UPDATE ${table} SET ${updates} WHERE ${where}`;
    return await this.query(q);
  };

  // DELETE
  this.delete = async (table, where) => {
    const q = `DELETE FROM ${table} WHERE ${where}`;
    return await this.query(q);
  };

  // Optional: Reconnect
  this.reconnect = async () => {
    await mssql.close();
    this.pool = await mssql.connect(this.config);
  };
}

module.exports = { sqlServer: sqlServer };
