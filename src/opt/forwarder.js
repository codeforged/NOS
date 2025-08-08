module.exports = {
  name: "Packet forwarder",
  version: 0.1,
  main: function (nos) {
    const devices = [
      { name: "comm", objectName: "mqtnl" }
    ];
    this.shell.loadDevices(devices, this);
    this.display = this.shell.crt;

    const args = this.shell.parseCommand(this.shell.lastCmd);
    this.showSyntax = () => {
      this.display.textOut(`Syntax: ${args.command} -s <src IP> -d <dst IP>`);
      this.shell.terminate();
    }

    const keys = Object.keys(args.params);
    if (keys.includes('-stop')) {
      if (this.mqtnl.packetForwarder) {
        this.mqtnl.packetForwarder.stopForward();
        this.shell.terminate();
      }
    } else if (keys.includes('-start')) {
      if (this.mqtnl.packetForwarder) {
        this.mqtnl.packetForwarder.startForward();
        this.shell.terminate();
      }
    } else if (keys.includes('s') && keys.includes('d')) {
      const sIP = args.params.s;
      const dIP = args.params.d;
      if (this.mqtnl.packetForwarder) {
        this.display.textOut(`Packet forwarder is already running from ${sIP} to ${dIP}`);
      } else {
        const mqttc = require('mqtt');
        this.mqtnl.packetForwarder = new this.mqtnl.mqtnl.mqttForwarder(sIP, dIP, null, mqttc);
        // this.mqtnl.packetForwarder();
        this.display.textOut(`Packet forwarder is running from ${sIP} to ${dIP}`);
        this.shell.terminate();
      }
    } else {
      this.showSyntax();
    }

  }
}