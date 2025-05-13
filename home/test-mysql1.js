module.exports = {
  version: "1.2",
  author: "Canding & ChatGPT",
  description: "NCS+ MySQL test script dengan terminate",

  main: async function (nos) {
    this.shell.loadDevices([{ name: "mysql", objectName: "db" }], this);

    try {
      const rows = await this.db.query(`SELECT concat(Date(pushtimestamp)," ",Time(pushtimestamp)) as "timestamp", sensor_id,	sensor_value FROM t_sensor_data  order by timestamp desc LIMIT 10`);

      if (rows.length === 0) {
        this.crt.textOut("📭 Data kosong.");
      } else {
        //this.crt.textOut(`📦 Ditemukan ${rows.length} baris:\n`);
        rows.forEach((row, i) => {
          const line = `[${i + 1}] ${row.timestamp} Sensor ID: ${row.sensor_id.toString().padEnd(3)} | Sensor Value: ${row.sensor_value.toString().padEnd(3)}`;
          this.crt.textOut(line);
        });
      }
    } catch (err) {
      this.crt.textOut("❌ Query gagal: " + err.message);
    }

    this.shell.terminate(); // 🚪 Balik ke prompt NOS
  },

  exitSignal: function () {
    // Kosong tapi wajib untuk NCS
  }
};
