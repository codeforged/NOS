module.exports = {
  instanceName: "save",
  name: "save",
  version: "1.0",
  main: function (nos) {
    let raw = this.shell.lineBuffer;
    if (!raw || raw.trim() === "") {
      // Mode mandiri: input dari argumen
      const args = this.shell.parseCommand(this.shell.lastCmd);

      if (args.params && args.params._) {
        const keyword = args.params._.join(" ");
        raw = keyword;
      }
    }

    const args = this.shell.parseCommand(this.shell.lastCmd);
    const keys = Object.keys(args.params);
    if (keys.includes("f")) {
      const filename = args.params.f;

      const devices = [{ name: "fileAccess", objectName: "fa" }];
      this.shell.loadDevices(devices, this);
      this.fa.writeFileSync(filename, raw.trim());
      //this.crt.textOut(`content: |${raw.trim()}|`);
    }
  },
};
