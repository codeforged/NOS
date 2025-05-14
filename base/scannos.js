module.exports = {
  name: "NOS Broadcast Scan",
  version: 0.1,
  main: function (os) {
    var devices = [
      { name: __APP.defaultComm, objectName: "mqtnl" },
    ];
    this.shell.loadDevices(devices, this);
    this.display = this.shell.crt;

    // Reset sequence
    this.mqtnl.connMgr.pingResetSequence();
    // Buat controller scan broadcast (timeout 2000ms)
    this.controller = this.mqtnl.connMgr.scanBroadcastController(2000);

    this.display.textOut("Scanning NOS nodes via broadcast...");
    function isJSONParsable(str) {
      try {
        JSON.parse(str);
        return true;
      } catch (e) {
        return false;
      }
    }
    this.controller.nmap().then((results) => {
      if (!results.length) {
        this.display.textOut("No NOS node found.");
      } else {
        this.display.textOut(`Found ${results.length} node(s):`);
        results.forEach((node, idx) => {
          let info;
          if (isJSONParsable(node.info))
            info = ` | UUID: ${JSON.parse(node.info).uuid}`; else
            info = " (encrypted)";
          this.display.textOut(
            // `${idx + 1}. ${node.srcAddress} `
            `${idx + 1}. ${node.srcAddress}${info}`
          );
        });
      }
      this.shell.terminate();
    }).catch((err) => {
      this.display.textOut("Scan error: " + err);
      this.shell.terminate();
    });

    this.shell.interruptSignalListener.push(() => {
      this.controller.interrupt();
      this.display.textOut("Scan interrupted.");
      this.shell.terminate();
    });
  }
};