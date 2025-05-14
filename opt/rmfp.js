module.exports = {
  instanceName: "del_known_host",
  name: "Delete/List Known Host Fingerprint",
  version: "1.2",
  main: function (nos) {
    const devices = [
      { name: "fileAccess", objectName: "fa" },
    ];
    this.shell.loadDevices(devices, this);

    const args = this.shell.parseCommand(this.shell.lastCmd);
    const knownHostsPath = "/home/.nos_known_hosts";

    // List mode
    if (args.params.l || args.params.list) {
      if (!this.fa.fileExistsSync(knownHostsPath)) {
        this.crt.textOut("No known_hosts file found.");
        this.shell.terminate();
        return;
      }
      let lines = this.fa.readFileSync(knownHostsPath).split("\n").filter(Boolean);
      if (lines.length === 0) {
        this.crt.textOut("No entries in known_hosts.");
      } else {
        this.crt.textOut("Known hosts:");
        lines.forEach(line => this.crt.textOut("  " + line));
      }
      this.shell.terminate();
      return;
    }

    // Delete mode
    let host = null;
    let port = 25;
    if (args.params._) {
      if (args.params._.length > 0)
        host = args.params._[0];
      if (args.params._.length > 1)
        port = args.params._[1];
    }

    if (!host) {
      this.crt.textOut("Syntax: del-known-host <host> [port]");
      this.crt.textOut("  or: del-known-host -l");
      this.shell.terminate();
      return;
    }
    if (!this.fa.fileExistsSync(knownHostsPath)) {
      this.crt.textOut("No known_hosts file found.");
      this.shell.terminate();
      return;
    }
    const hostport = `${host}:${port}`;
    let lines = this.fa.readFileSync(knownHostsPath).split("\n");
    let filtered = lines.filter(line => !line.startsWith(hostport + " "));
    if (filtered.length === lines.length) {
      this.crt.textOut(`No entry found for ${hostport}`);
    } else {
      this.fa.writeFileSync(knownHostsPath, filtered.filter(Boolean).join("\n") + "\n");
      this.crt.textOut(`Entry for ${hostport} deleted.`);
    }
    this.shell.terminate();
  }
};