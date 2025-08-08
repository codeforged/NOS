const crypto = require("crypto");

module.exports = {
  name: "passwd",
  version: "1.6",
  description: "Ubah password user yang sedang login dan simpan sysconfig",
  usage: "passwd",
  needRoot: false,
  main: async function (nos) {
    const { formatSysConfig } = bfs.require(this.shell.basePath +
      "/lib/sysconfigFormatter.js");
    this.display = this.shell.crt;
    this.shell.loadDevices([{ name: "bfsAccess", objectName: "fa" }], this);

    const crt = this.crt;
    const username = this.shell.username;
    const users = nos.sysConfig?.rshLogin?.users;

    if (!username || !Array.isArray(users)) {
      crt.textOut(
        "❌ Unable to get active user or user data is invalid.\n"
      );
      this.shell.terminate();
      return;
    }

    const user = users.find((u) => u.username === username);
    if (!user) {
      crt.textOut("❌ User not found.\n");
      this.shell.terminate();
      return;
    }

    const oldPass = await this.shell.userPrompt(
      "🔐 Enter old password: ",
      false
    );
    const hashedInput = crypto.createHash("sha1").update(oldPass).digest("hex");

    if (hashedInput !== user.password) {
      crt.textOut("❌ Old password is incorrect.\n");
      this.shell.terminate();
      return;
    }

    const newPass1 = await this.shell.userPrompt(
      "🆕 Enter new password: ",
      false
    );
    const newPass2 = await this.shell.userPrompt(
      "🆕 Confirm new password: ",
      false
    );

    if (newPass1 !== newPass2) {
      crt.textOut("❌ Confirmation password does not match.\n");
      this.shell.terminate();
      return;
    }

    user.password = crypto.createHash("sha1").update(newPass1).digest("hex");

    const fullPath = "/opt/conf/sysconfig.js";
    const formatted =
      "module.exports = " + formatSysConfig(nos.sysConfig, 0) + ";\n";

    try {
      this.fa.writeFileSync(fullPath, formatted);
      crt.textOut("✅ Password successfully changed and saved.\n");
    } catch (err) {
      crt.textOut("❌ Failed to save password: " + err.message + "\n");
    }

    this.shell.terminate();
  },
};
