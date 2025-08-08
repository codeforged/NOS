module.exports = {
  name: "pkg-verify",
  version: "1.1",
  needRoot: false,
  description: "Verifikasi signature seluruh file di packages.signed.json",
  main: function (nos) {
    const crypto = require("crypto");
    const path = require("path");

    this.shell.loadDevices([{ name: "bfsAccess", objectName: "fa" }], this);

    const args = this.shell.parseCommand2(this.shell.lastCmd);
    const isQuiet = Object.keys(args.params).includes('--quiet');
    let inputFile = args.params._ && args.params._[0] ? args.params._[0] : "/opt/conf/packages.signed.json";

    let raw;
    try {
      raw = this.fa.readFileSync(inputFile, "utf8");
    } catch (err) {
      if (!isQuiet) {
        this.crt.textOut("❌ Gagal membaca file: " + err.message);
        this.crt.textOut("Gunakan pkg-signer untuk membuat file packages.signed.json terlebih dahulu.");
        this.shell.terminate();
      }
      return;
    }

    let signed;
    try {
      signed = JSON.parse(raw);
    } catch (err) {
      this.crt.textOut("❌ Format JSON tidak valid: " + err.message);
      this.shell.terminate();
      return;
    }

    const publicKey = signed.publicKey;
    const packages = signed.packages;

    let total = 0, match = 0, mismatch = 0;

    let mismatchFiles = [];
    for (const pkg of packages) {
      if (Array.isArray(pkg.items)) {
        for (const item of pkg.items) {
          total++;
          const filePath = "/" + item.src.replace(/^\/+/, "");
          try {
            const content = this.fa.readBinaryFileSync(filePath);
            const hash = crypto.createHash("sha256").update(content).digest();
            const isValid = crypto.verify(
              "sha256",
              hash,
              publicKey,
              Buffer.from(item.signature, "base64")//
            );
            if (isValid) {
              match++;
            } else {
              mismatch++;
              mismatchFiles.push(`❌ Signature mismatch: ${filePath}`);
            }
          } catch (err) {
            mismatch++;
            mismatchFiles.push(`❌ Tidak bisa baca file: ${filePath} (${err.message})`);
          }
        }
      }
    }

    if (!isQuiet || (isQuiet && mismatch > 0)) {
      mismatchFiles.forEach(msg => this.crt.textOut(msg));
      this.crt.textOut("--- Signature Check Summary ---");
      this.crt.textOut("Total file checked: " + total);
      this.crt.textOut("Match signature: " + match);
      this.crt.textOut("Mismatch signature: " + mismatch);
      this.shell.terminate();
    }
  }
}