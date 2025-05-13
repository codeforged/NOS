// ============================================
// pkg.js - NOS Package Manager Client (one-shot style)
// ============================================

const path = require("path");
const zlib = require("zlib");

module.exports = {
  name: "pkg",
  version: "0.6",
  needRoot: true,
  main: function (nos) {
    const chaSharekey =
      require(`${this.shell.basePath}/lib/api-shop.js`).chaSharekey;
    const checksig = require(this.shell.basePath + "/lib/pkglib");
    this.shell.loadDevices(
      [
        { name: __APP.defaultComm, objectName: "mqtnl" },
        { name: "fileAccess", objectName: "fa" },
      ],
      this
    );
    function dynamicUnit(size) {
      if (size < 1024 * 1024) return (size / 1024).toFixed(2) + "KB";
      else return (size / (1024 * 1024)).toFixed(2) + "MB";
    }
    function drawProgressBar(percentage) {
      const barLength = 30; // panjang bar
      const filledLength = Math.round((percentage / 100) * barLength);
      const emptyLength = barLength - filledLength;
      const bar =
        "[" +
        "#".repeat(filledLength) +
        "-".repeat(emptyLength) +
        `] ${percentage}%`;
      return bar;
    }
    let port = 406; // Default port
    const args = this.shell.parseCommand(this.shell.lastCmd);
    const host = args.params._ ? args.params._[0] : null;
    const cmd = args.params._ ? args.params._[1] : null;
    const targetPackage = args.params._ ? args.params._[2] : null;

    if (args.params && args.params.p) {
      port = parseInt(args.params.p);
    }
    // console.log(JSON.stringify(args));
    // return;

    // const args = this.shell.lastCmd.split(" ");
    // const host = args[1];
    // const cmd = args[2];
    // const targetPackage = args[3];

    if (!host || !cmd) {
      this.crt.textOut("❌ Gunakan: pkg <host> list | install <package>");
      this.shell.terminate();
      return;
    }
    const publicKey = this.fa.readFileSync(`/opt/conf/public.pem`, "utf8");

    let cha = nos.__CORE.encryption.addInstance(
      "pkg",
      "chacha20-poly1305",
      nos.sysConfig.chacha20poly.key
    );
    const conn = new this.mqtnl.mqtnlConnection(
      this.mqtnl.connMgr,
      this.mqtnl.connMgr.ports.allocateRandomPort(1000, 65000),
      null,
      true
    );
    conn.onPacketReceive((packet, key) => {
      if (packet.header.packetHeaderFlag != 1234) return;
      const { packetCount, packetIndex } = packet.header;

      if (packetCount > 0) {
        const percent = Math.floor(((packetIndex + 1) / packetCount) * 100);
        const progressBar = drawProgressBar(percent);
        this.crt.write(`\r${progressBar}`);
        // if (packetIndex == 0) {
        //   this.crt.textOut(
        //     `\rDownloading file ...                              `
        //   );
        // }
        if (percent === 100) {
          console.log(""); // pindah baris kalau selesai
          // this.crt.textOut(`\nWritting file ...`);
        }
      }
    });

    const stack = new chaSharekey(conn);
    const dst = { address: host, port: parseInt(port) };
    const crypto = require("crypto");
    const mySecretKey = crypto.randomBytes(32);
    // this.crt.textOut("Shared key front: " + mySecretKey.toString("hex"));
    cha.setKey(mySecretKey);
    stack.negotiateKeyExchangeAsClient(
      dst,
      () => mySecretKey.toString("hex"),
      (sharedKey, src) => {
        const session = stack.getSession(src);
        session.cha = cha;
        cha.agentName = `pkg${session.id}`;
        stack.setAgentFor(src, session.cha);
        stack.setTTLFor(src, 60000 * 5);
        stack.activeSession = stack.getSession(src);
        // this.crt.textOut(`✅ Secure session established to ${host}`);

        if (cmd === "list") {
          stack.send(dst, JSON.stringify({ type: "list" }));

          stack.onDecryptedMessage(async (payload, src) => {
            try {
              const data = JSON.parse(payload);
              if (data.type === "list-reply" && Array.isArray(data.packages)) {
                const signerFP = data.fingerPrintRepository;
                // console.log(`signerFP: ${signerFP}`);
                let trustedSource =
                  nos.sysConfig.packageManager.trustedSigners.includes(
                    signerFP
                  );
                if (!trustedSource) {
                  this.crt.textOut(
                    `⚠️ Signature is valid, but the signer is not on your trusted list.\nFingerprint: ${signerFP}`
                  );
                } else {
                  this.crt.textOut(
                    `✅ Signature is valid and was signed by a trusted host.`
                  );
                }
                if (data.packageSignatureStatus === true)
                  this.crt.textOut(`✅ Metadata signature status valid`);
                else this.crt.textOut(`❌ Metadata signature status invalid`);
                this.crt.textOut("📦 Available Packages:");
                data.packages.forEach((pkg) => {
                  this.crt.textOut(
                    `- ${pkg.name} (${pkg.version}) by ${pkg.author}\n  ${pkg.description}\n  ${pkg.status} signature\n ` +
                    ` ${pkg.isPackageSafe || trustedSource
                      ? "✅ This package does not modify system files or run scripts automatically."
                      : "❌ This package may contain scripts that can affect your system. Please review before installing!"
                    }\n`
                  );
                });
              } else {
                this.crt.textOut("⚠️ Format list invalid.");
              }
              this.shell.terminate();
            } catch (e) {
              this.crt.textOut(`❌ Error parsing list: ${e}`);
              this.shell.terminate();
            }
          });
        } else if (cmd === "install" && targetPackage) {
          stack.send(
            dst,
            JSON.stringify({ type: "get", package: targetPackage })
          );

          let pendingFiles = 0;

          async function receiveFiles() {
            stack.onDecryptedMessage(async (payload, src) => {
              try {
                const data = JSON.parse(payload);
                if (data.type === "preparing") {
                  this.crt.textOut("Downloading ...");
                } else if (data.type === "file") {
                  const compressedBuffer = Buffer.from(data.data, "base64");
                  const fileBuffer = zlib.inflateSync(compressedBuffer);
                  const dstPath = data.filename;
                  const dstDir = path.dirname(this.shell.basePath + dstPath);
                  // this.crt.textOut("xxx" + dstDir);
                  try {
                    this.fa.mkdirSync(dstDir, { recursive: true });
                  } catch (e) {
                    console.log(e);
                  }
                  // this.crt.textOut("Writting ...");
                  this.fa.writeFileSync(dstPath, fileBuffer, true);
                  // this.crt.textOut(`dstPath: ${dstPath}\n fileBuffer: ${fileBuffer}`)
                  this.crt.textOut(
                    `📂 Saved file: ${data.filename} (${dynamicUnit(
                      fileBuffer.length
                    )})`
                  );
                  pendingFiles++;
                } else if (data.type === "done") {

                  if (typeof data.onAfterDownload != "undefined") {
                    this.crt.textOut(`Executing installation script ...` + data.onAfterDownload);
                    // let args = this.shell.lastCmd.split(" ");
                    // let fullPath = this.find(args[0], this.envPath);
                    const path = require("path");
                    const directory = path.dirname(data.onAfterDownload);
                    const fileName = path.basename(data.onAfterDownload);

                    let errorLevel = nos.executeModule(
                      this.shell.basePath + directory,
                      fileName,
                      () => { },
                      this.shell,
                      this.shell.rootActive,
                      this.shell.lastCmd
                    );
                  }
                  this.crt.textOut(
                    `✅ Install selesai. ${pendingFiles} file diunduh.`
                  );

                  this.shell.terminate();
                }
              } catch (e) {
                this.crt.textOut(`❌ Error parsing/installing file: ${JSON.stringify(e)}`);
                // throw {
                //   code: 2,
                //   message: `pkg error: ${e.message}\n${e.stack}`,
                // };
                this.shell.terminate();
              }
            });
          }

          receiveFiles.call(this); // supaya this tetap ke module.exports
        } else {
          this.crt.textOut(
            "❓ Unknown command. Gunakan 'list' atau 'install <package>'."
          );
          this.shell.terminate();
        }
      }
    );
  },
};
