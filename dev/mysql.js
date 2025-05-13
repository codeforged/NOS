function mysqlDriver(os, config) {
  const mysql = require("mysql2/promise");

  this.name = "mysql";
  this.os = os;
  this.devClass = "SQL Database";
  this.version = 0.2;
  this.pool = mysql.createPool(config);  // langsung simpan pool (bukan pakai .then)

  // this.query = async (sqlStr) => {
  //   if (!this.pool) throw new Error("DB not connected.");
  //   const [rows] = await this.pool.query(sqlStr);
  //   return rows;
  // };

  this.query = async function (sql, params = []) {
    const [rows] = await this.pool.execute(sql, params);
    return rows;
  };


  this.select = async (table, fields = "*", where = "", params = []) => {
    const q = `SELECT ${fields} FROM \`${table}\`${where ? ` WHERE ${where}` : ""}`;
    return await this.query(q, params);
  };

  this.insert = async (table, obj) => {
    const keys = Object.keys(obj);
    const placeholders = keys.map(() => "?").join(",");
    const values = keys.map(k => obj[k]);

    const q = `INSERT INTO \`${table}\` (${keys.join(",")}) VALUES (${placeholders})`;
    return await this.query(q, values);
  };

  this.update = async (table, obj, where = "", whereParams = []) => {
    const keys = Object.keys(obj);
    const assignments = keys.map(k => `\`${k}\`=?`).join(",");
    const values = keys.map(k => obj[k]);

    const q = `UPDATE \`${table}\` SET ${assignments}${where ? ` WHERE ${where}` : ""}`;
    return await this.query(q, [...values, ...whereParams]);
  };

  this.delete = async (table, where = "", params = []) => {
    const q = `DELETE FROM \`${table}\`${where ? ` WHERE ${where}` : ""}`;
    return await this.query(q, params);
  };


  this.reconnect = async () => {
    this.pool = mysql.createPool(config);
  };
}

module.exports = { mysqlDriver: mysqlDriver };
