const vm = require("vm");

module.exports = {
  name: "keygen",
  version: "2.3",
  needRoot: true,
  main: function (nos) {
    const { formatSysConfig, formatObjectToHex } = bfs.require(this.shell.basePath +
      "/lib/sysconfigFormatter.js");
    this.display = this.shell.crt;
    this.shell.loadDevices([{ name: "bfsAccess", objectName: "fa" }], this);

    const defaultPath = "/opt/conf/sysconfig.js";
    const args = this.shell.parseCommand(this.shell.lastCmd);
    const cmd = args.params._ ? args.params._[0] : null;
    const keyPath = args.params._ ? args.params._[1] : null;
    const forceOverwrite = !!(args.params["-force"] || args.params.force);
    // console.log("args.params =", JSON.stringify(args.params));
    // console.log("args._ =", JSON.stringify(args.params._));
    // console.log("xxx" + forceOverwrite)
    // return

    if (!cmd) {
      this.display.textOut(
        "❌ Gunakan: keygen list atau keygen create <keypath> [--force]"
      );
      this.display.textOut("Contoh:");
      this.display.textOut("   keygen create chacha20poly.esp32key --force");
      this.shell.terminate();
      return;
    }

    const fullPath = defaultPath;

    if (cmd === "list") {
      try {
        const configText = this.fa.readFileSync(fullPath, "utf8");
        const sandbox = { module: { exports: {} } };
        vm.createContext(sandbox);
        vm.runInContext(configText, sandbox);
        const sysconfig = sandbox.module.exports;

        this.display.textOut("🔑 Daftar Key di sysconfig.js:");

        function walk(obj, currentPath) {
          for (const k in obj) {
            const v = obj[k];
            const newPath = currentPath ? currentPath + "." + k : k;
            if (
              Array.isArray(v) &&
              v.every((item) => typeof item === "number")
            ) {
              this.display.textOut(`- ${newPath} [${v.length} bytes]`);
              const formatted = formatObjectToHex(v, 1);
              this.display.textOut(formatted);
            } else if (typeof v === "object" && v !== null) {
              walk.call(this, v, newPath);
            }
          }
        }

        walk.call(this, sysconfig, "");
      } catch (err) {
        this.display.textOut("❌ Gagal membaca sysconfig.js: " + err.message);
      }
      this.shell.terminate();
      return;
    } else if (cmd === "create") {
      if (!keyPath) {
        this.display.textOut("❌ Gunakan: keygen create <keypath> [--force]");
        this.shell.terminate();
        return;
      }

      let configText;
      try {
        configText = this.fa.readFileSync(fullPath, "utf8");
      } catch (err) {
        this.display.textOut("❌ Gagal membaca sysconfig.js: " + err.message);
        this.shell.terminate();
        return;
      }

      const sandbox = { module: { exports: {} } };
      vm.createContext(sandbox);
      try {
        vm.runInContext(configText, sandbox);
      } catch (err) {
        this.display.textOut("❌ Error parsing sysconfig.js: " + err.message);
        this.shell.terminate();
        return;
      }
      const sysconfig = sandbox.module.exports;

      const keyPathParts = keyPath.split(".");
      let current = sysconfig;
      for (let i = 0; i < keyPathParts.length - 1; i++) {
        const part = keyPathParts[i];
        if (!current[part]) current[part] = {};
        current = current[part];
      }
      const lastPart = keyPathParts[keyPathParts.length - 1];

      if (current[lastPart] && !forceOverwrite) {
        this.display.textOut(
          "❌ Key sudah ada. Gunakan --force untuk overwrite."
        );
        this.shell.terminate();
        return;
      }

      const newKey = [];
      for (let i = 0; i < 32; i++) {
        newKey.push(Math.floor(Math.random() * 256));
      }
      current[lastPart] = newKey;

      const formatted =
        "module.exports = " + formatSysConfig(sysconfig, 0) + ";\n";
      this.fa.writeFileSync(fullPath, formatted);

      this.display.textOut(
        `✅ Key '${keyPath}' berhasil dibuat dan sysconfig.js disimpan.`
      );
      this.shell.terminate();
      return;
    } else {
      this.display.textOut(
        "❌ Perintah tidak dikenali. Gunakan: list atau create."
      );
      this.shell.terminate();
      return;
    }
  },
};
