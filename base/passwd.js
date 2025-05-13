const crypto = require("crypto");

module.exports = {
  name: "passwd",
  version: "1.5",
  description: "Ubah password user yang sedang login dan simpan sysconfig",
  usage: "passwd",
  needRoot: false,
  main: async function (nos) {
    const { formatSysConfig } = require(this.shell.basePath +
      "/lib/sysconfigFormatter.js");
    this.display = this.shell.crt;
    this.shell.loadDevices([{ name: "fileAccess", objectName: "fa" }], this);

    const crt = this.crt;
    const username = this.shell.username;
    const users = nos.sysConfig?.rshLogin?.users;

    if (!username || !Array.isArray(users)) {
      crt.textOut(
        "❌ Tidak bisa mendapatkan user aktif atau data user tidak valid.\n"
      );
      this.shell.terminate();
      return;
    }

    const user = users.find((u) => u.username === username);
    if (!user) {
      crt.textOut("❌ User tidak ditemukan.\n");
      this.shell.terminate();
      return;
    }

    const oldPass = await this.shell.userPrompt(
      "🔐 Masukkan password lama: ",
      false
    );
    const hashedInput = crypto.createHash("sha1").update(oldPass).digest("hex");

    if (hashedInput !== user.password) {
      crt.textOut("❌ Password lama salah.\n");
      this.shell.terminate();
      return;
    }

    const newPass1 = await this.shell.userPrompt(
      "🆕 Masukkan password baru: ",
      false
    );
    const newPass2 = await this.shell.userPrompt(
      "🆕 Ulangi password baru: ",
      false
    );

    if (newPass1 !== newPass2) {
      crt.textOut("❌ Password baru tidak cocok.\n");
      this.shell.terminate();
      return;
    }

    user.password = crypto.createHash("sha1").update(newPass1).digest("hex");

    const fullPath = "/opt/conf/sysconfig.js";
    const formatted =
      "module.exports = " + formatSysConfig(nos.sysConfig, 0) + ";\n";

    try {
      this.fa.writeFileSync(fullPath, formatted);
      crt.textOut("✅ Password berhasil diubah dan sysconfig.js disimpan.\n");
    } catch (err) {
      crt.textOut("❌ Gagal menyimpan sysconfig.js: " + err.message + "\n");
    }

    this.shell.terminate();
  },
};
