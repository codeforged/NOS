module.exports = {
  name: "pkg-signer",
  version: "1.1",
  needRoot: true,
  description: "Signing file packages.json with RSA",
  main: function (nos) {
    const fs = require("fs");
    const crypto = require("crypto");
    const path = require("path");

    this.shell.loadDevices([{ name: "fileAccess", objectName: "fa" }], this);

    const args = this.shell.lastCmd.trim().split(/\s+/);
    const inputFile = args[1];
    const outputFile = args[2];

    if (!inputFile || !outputFile) {
      this.crt.textOut(
        "❌ Use: pkg-signer <input_file.json> <output_file.signed>"
      );
      this.shell.terminate();
      return;
    }

    const hasPriv = this.fa.existsSync("/opt/conf/private.pem");
    const hasPub = this.fa.existsSync("/opt/conf/public.pem");
    if (!hasPriv || !hasPub) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
      });
      this.fa.writeFileSync(
        "/opt/conf/private.pem",
        privateKey.export({ type: "pkcs1", format: "pem" })
      );
      this.fa.writeFileSync(
        "/opt/conf/public.pem",
        publicKey.export({ type: "pkcs1", format: "pem" })
      );
    }

    const privateKey = this.fa.readFileSync("/opt/conf/private.pem", "utf8");
    const publicKey = this.fa.readFileSync("/opt/conf/public.pem", "utf8");

    let raw;
    try {
      raw = this.fa.readFileSync(inputFile, "utf8");
    } catch (err) {
      this.crt.textOut("❌ Failed to read file: " + err.message);
      this.shell.terminate();
      return;
    }

    let pkgData;
    try {
      pkgData = JSON.parse(raw).packages;
    } catch (err) {
      this.crt.textOut("❌ Invalid JSON format: " + err.message);
      this.shell.terminate();
      return;
    }

    for (const pkg of pkgData) {
      if (Array.isArray(pkg.items)) {
        for (const item of pkg.items) {
          try {
            const content = this.fa.readFileSync(
              "/" + item.src.replace(/^\/+/, "")
            );
            const hash = crypto.createHash("sha256").update(content).digest();
            item.signature = crypto
              .sign("sha256", hash, privateKey)
              .toString("base64");
          } catch (err) {
            this.crt.textOut(
              `⚠️  Cannot read file: ${item.src} (${err.message})`
            );
            item.hash = null;
          }
        }
      }
    }

    const serialized = JSON.stringify(pkgData);
    const hash = crypto.createHash("sha256").update(serialized).digest();
    const signature = crypto
      .sign("sha256", hash, privateKey)
      .toString("base64");

    const signed = {
      packages: pkgData,
      signature: signature,
      publicKey: publicKey,
    };

    try {
      this.fa.writeFileSync(outputFile, JSON.stringify(signed, null, 2));
      this.crt.textOut(
        `✅ The file was successfully signed and saved to ${outputFile}`
      );
    } catch (err) {
      this.crt.textOut("❌ Failed to write, output file: " + err.message);
    }

    this.shell.terminate();
  },
};
