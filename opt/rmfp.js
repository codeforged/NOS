module.exports = {
  instanceName: "del_known_host",
  name: "Delete Known Host Fingerprint",
  version: "1.0",
  main: function (nos) {
    const devices = [
      { name: "fileAccess", objectName: "fa" },
    ];
    this.shell.loadDevices(devices, this);
    let host = null;
    let port = 25;
    const args = this.shell.parseCommand(this.shell.lastCmd);
    if (args.params._) {
      if (args.params._.length > 0)
        host = typeof args.params._[0] ? args.params._[0] : null;
      if (args.params._.length > 1)
        port = typeof args.params._[1] ? args.params._[1] : "25";
    }

    if (!host) {
      this.crt.textOut("Syntax: del-known-host <host> [port]\n");
      this.shell.terminate();
      return;
    }
    const knownHostsPath = "/home/.nos_known_hosts";
    if (!this.fa.fileExistsSync(knownHostsPath)) {
      this.crt.textOut("No known_hosts file found.\n");
      this.shell.terminate();
      return;
    }
    const hostport = `${host}:${port}`;
    let lines = this.fa.readFileSync(knownHostsPath).split("\n");
    let filtered = lines.filter(line => !line.startsWith(hostport + " "));
    if (filtered.length === lines.length) {
      this.crt.textOut(`No entry found for ${hostport}\n`);
    } else {
      this.fa.writeFileSync(knownHostsPath, filtered.filter(Boolean).join("\n") + "\n");
      this.crt.textOut(`Entry for ${hostport} deleted.\n`);
    }
    this.shell.terminate();
  }
};