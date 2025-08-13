// ws-mqtnl-forwarder.js - NOS Desktop WebSocket <-> MQtnl Forwarder (server & client)
// Author: Andriansah & Copilot
// Versi awal: tanpa otentikasi/enkripsi, data telanjang

module.exports = {
  name: "ws-mqtnl-forwarder",
  version: "0.1",
  needRoot: false,
  main: function (nos) {
    // Parse argument dari shell
    const args = this.shell.parseCommand2(this.shell.lastCmd);
    const wsDevName = args.params["-w"] || args.params["--ws"] || "websocket1";
    const devices = [
      { name: wsDevName, objectName: "ws" },
      { name: __APP.defaultComm, objectName: "mqtnl" },
      { name: "syslogger", objectName: "syslog" },
    ];
    // Load device driver agar this.ws, this.mqtnl, this.syslog tersedia
    this.shell.loadDevices(devices, this);
    this.failed = !this.shell.loadDevices(devices, this);
    const isServer = args.params["--server"];
    const isClient = args.params["--client"];
    const port = args.params["-p"] || args.params["--port"] || 2500;
    // Positional argumen: args.params._[0] sebagai destination/source
    const peer = Array.isArray(args.params._) ? args.params._[0] : null;

    // Load device driver
    if (isServer) {
      // Mode SERVER: listen MQtnl, forward ke WebSocket
      if (!peer) {
        this.syslog.append("❌ SERVER mode: <destination> harus diisi");
        this.crt.textOut("❌ SERVER mode: <destination> harus diisi");
        this.terminate();
        return;
      }
      this.conn = new this.mqtnl.mqtnlConnection(
        this.mqtnl.connMgr,
        port,
        null,
        true
      );

      this.conn.onReceive((packet, key) => {
        this.ws._read(packet.payload, this.ws);
      });
      // WebSocket RX: forward ke MQtnl
      this.ws.directTXListener["ws-mqtnl-tunnel"] = (raw) => {
        const data = raw;
        const payload = typeof raw === "string" ? raw : raw.toString();
        // console.log(`MQTNL<${raw}`);
        this.conn.write(peer, port, payload);
      };
    } else if (isClient) {
      // Mode CLIENT: listen WebSocket, forward ke MQtnl
      if (!peer) {
        this.syslog.append("❌ CLIENT mode: <source> harus diisi");
        this.crt.textOut("❌ CLIENT mode: <source> harus diisi");
        this.terminate();
        return;
      }
      this.conn = new this.mqtnl.mqtnlConnection(
        this.mqtnl.connMgr,
        port,
        peer,
        false
      );
      // WebSocket RX: forward ke MQtnl
      this.ws.directRXListener["ws-mqtnl-forwarder"] = (raw) => {
        // const payload = typeof raw === "string" ? raw : raw.toString();
        // this.conn.write(peer, port, payload);
        this.conn.write(peer, port, raw.toString());
      };
      // MQtnl RX: forward ke WebSocket

      this.conn.onReceive((packet, key) => {
        let payload = packet.payload;
        this.ws.write(packet.payload);
      });
    } else {
      this.syslog.append("❌ Mode harus --server atau --client");
      this.crt.textOut("❌ Mode harus --server atau --client");
      this.terminate();
      return;
    }

    this.terminate();
  },
  exitSignal: function () {
    this.syslog.append("ws-mqtnl-forwarder stopped");
  },
};
