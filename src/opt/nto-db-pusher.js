module.exports = {
  name: "nto-mysql-injector",
  description: "Injector sensor data langsung ke MySQL",
  main: async function () {
    this.shell.loadDevices([
      { name: "nimbus", objectName: "nimbus" },
      { name: "mysql", objectName: "db" }
    ], this);

    this.nimbus.subscribe("sensor.data", async d => {
      const id = parseInt(d.id);
      const cleanValue = parseInt(d.value);
      const deviceId = 1; // sementara device_id = 1

      try {
        await this.db.query(
          "INSERT INTO t_sensor_data (pushtimestamp, sensor_id, sensor_value, device_id) VALUES (CURRENT_TIMESTAMP, ?, ?, ?)",
          [id, cleanValue, deviceId]
        );
      } catch (err) {
        this.crt.textOut(`❌ DB Error: ${err.message}`);
      }
    });

    this.crt.textOut(`✅ NTO MySQL Injector starting`);
    this.shell.terminate();
  }
};