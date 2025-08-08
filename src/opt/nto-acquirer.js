module.exports = {
  name: "nto-acquirer",
  description: "Contoh sederhana: menerima data sensor dan publish ke Nimbus",
  main: function (os) {
    this.shell.loadDevices([
      { name: "nimbus", objectName: "nimbus" }
    ], this);
    const ntoMgr = bfs.require("/lib/nto-mgr.js");
    this.nto = new ntoMgr.ntoManager();
    // Ambil data sensor dari iot-dashboard.json
    const server_configuration = JSON.parse(bfs.readFileSync("/opt/conf/senslite-server.json")).server_configuration;
    if (server_configuration.data_dictionary && Array.isArray(server_configuration.data_dictionary)) {
      server_configuration.data_dictionary.forEach(entry => {
        this.nto.addNTO(entry.id, entry.name, entry.data_type);
      });
    }
    let mq = this.shell.getDevice(server_configuration.mqtnl_device || "comm1");
    new mq.mqtnlConnection(mq.connMgr, server_configuration.incoming_port || 1000, (d, s) => {
      if (!mq.ESPIOT_enabled) return;
      let arr = d.payload.split(";");
      if (arr.length !== 4) return this.crt.textOut("Data tidak valid\n");
      arr.forEach(r => {
        let [id, val] = r.split("=");
        if (!id || !val) return;
        this.nto.getNTOById(id)?.pushValue(val);
        this.nimbus.publish("sensor.data", { id, value: val, timestamp: Date.now() });
      });
    });
    mq.ESPIOT_enabled = true;
    this.crt.textOut(`✅ NTO Acquirer starting`);
  }
};
