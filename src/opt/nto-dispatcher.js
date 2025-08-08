module.exports = {
  name: "nto-dispatcher",
  description: "Dispatcher Service NOS, simpel dan realtime!",
  main: function () {
    this.shell.loadDevices([
      { name: "nimbus", objectName: "nimbus" }
    ], this);
    const ntoMgr = bfs.require("/lib/nto-mgr.js");
    const nto = new ntoMgr.ntoManager();
    // Ambil data sensor dari iot-dashboard.json
    const server_configuration = JSON.parse(bfs.readFileSync("/opt/conf/senslite-server.json")).server_configuration;
    this.ws = this.shell.getDevice(server_configuration.websocket_device || "websocket");
    if (server_configuration.data_dictionary && Array.isArray(server_configuration.data_dictionary)) {
      server_configuration.data_dictionary.forEach(entry => {
        nto.addNTO(entry.id, entry.name, entry.data_type);
      });
    }
    const listeners = [];
    this.nimbus.subscribe("sensor.data", d => {
      const n = nto.getNTOById(d.id);
      if (n) n.pushValue(d.value);
      listeners.forEach(uuid => this.ws.sendMessage(`senslite/${uuid}`, { type: "sensorUpdate", payload: `${d.id}=${d.value}` }));
    });
    this.ws.remoteFunction.nto = {
      registerSensorListener: ([uuid]) => { if (uuid && !listeners.includes(uuid)) listeners.push(uuid); },
      unregisterSensorListener: ([uuid]) => { const i = listeners.indexOf(uuid); if (i !== -1) listeners.splice(i, 1); },
      getData: (p) => p[0] === "all"
        ? (server_configuration.data_dictionary || []).map(entry => `${entry.id}=${nto.getNTOById(entry.id)?.getLastValue().value || 0}`).join(";")
        : (nto.getNTOById(p[0])?.getLastValue() || null),
      getList: () => nto.getNTOList().map(n => ({ id: n.id, name: n.name, type: n.dataType }))
    };
    this.crt.textOut(`✅ NTO Dispatcher starting`);
  }
};
