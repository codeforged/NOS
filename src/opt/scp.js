const crypto = require("crypto");
const zlib = require("zlib");

module.exports = {
  name: "scp",
  version: "1.3",
  needRoot: false,
  main: async function (nos) {
    const NOSPacketStackV2 = bfs.require(`/lib/NOSPacketStackV2.js`);
    const chaSharekey = bfs.require(`/lib/api-shop.js`).chaSharekey;
    this.shell.loadDevices(
      [
        { name: __APP.defaultComm, objectName: "mqtnl" },
        { name: "bfsAccess", objectName: "fa" },
      ],
      this
    );

    const path = this.shell.pathLib; // Assuming nos.path is available and provides posix-like join

    let port = 2222;
    let host = null;
    let srcFile = null;
    let dstFile = null;
    const args = this.shell.parseCommand(this.shell.lastCmd);
    if (args.params && args.params.p) port = parseInt(args.params.p);
    // Tambahkan helper untuk resolve path seperti di cp.js
    const resolvePathHelper = (rawPath) => {
      const homeDirectory = this.shell.home || "/home";
      const currentWorkingDirectory = this.shell.pwd;
      if (rawPath === "~") rawPath = "~/";
      else if (rawPath === ".") rawPath = "./";
      if (rawPath.startsWith("~/")) {
        return path.posix.join(homeDirectory, rawPath.substring(2));
      } else if (rawPath.startsWith("./")) {
        return path.posix.join(currentWorkingDirectory, rawPath.substring(2));
      } else if (rawPath.startsWith("/")) {
        return rawPath;
      } else {
        return path.posix.join(currentWorkingDirectory, rawPath);
      }
    };
    // Flexible argumen parsing: scp host:/path/file ./localfile
    let argHost = null,
      argSrc = null,
      argDst = null;
    if (args.params && args.params._ && args.params._.length >= 2) {
      // Cek jika argumen pertama mengandung host:/path
      const m = args.params._[0].match(/^([^:]+):(.+)$/);
      if (m) {
        argHost = m[1];
        argSrc = m[2];
        argDst = args.params._[1];
      } else if (args.params._.length >= 3) {
        // Mode lama: scp host src dst
        argHost = args.params._[0];
        argSrc = args.params._[1];
        argDst = args.params._[2];
      }
    }
    if (!argHost || !argSrc || !argDst) {
      this.crt.textOut(
        `Syntax: ${args.command} <host>:<srcFile> <dstFile> | <host> <srcFile> <dstFile> [-p port]`
      );
      this.shell.terminate();
      return;
    }
    host = argHost;
    srcFile = resolvePathHelper(argSrc);
    dstFile = resolvePathHelper(argDst);

    const mqtnl = this.mqtnl;
    let srcPort = mqtnl.connMgr.ports.allocateRandomPort(1000, 65000);
    const conn = new mqtnl.mqtnlConnection(mqtnl.connMgr, srcPort, null, true);
    const packetStack = new chaSharekey(conn);
    const dst = { address: host, port: parseInt(port) };
    let cha = __APP.core.encryption.addInstance(
      "scp" + srcPort,
      "chacha20-poly1305"
    );
    const knownHostsPath = "/home/.nos_known_hosts";
    function getKnownHosts(fileAccess, knownHostsPath) {
      try {
        if (fileAccess.fileExistsSync(knownHostsPath)) {
          const lines = fileAccess.readFileSync(knownHostsPath).split("\n");
          const map = {};
          lines.forEach((line) => {
            const [hostport, fingerprint] = line.trim().split(" ");
            if (hostport && fingerprint) map[hostport] = fingerprint;
          });
          return map;
        }
      } catch (e) { }
      return {};
    }
    function saveKnownHost(
      fileAccess,
      knownHostsPath,
      host,
      port,
      fingerprint
    ) {
      const hostport = `${host}:${port}`;
      let lines = [];
      if (fileAccess.fileExistsSync(knownHostsPath)) {
        lines = fileAccess
          .readFileSync(knownHostsPath)
          .split("\n")
          .filter(Boolean);
        lines = lines.filter((line) => !line.startsWith(hostport + " "));
      }
      lines.push(`${hostport} ${fingerprint}`);
      fileAccess.writeFileSync(knownHostsPath, lines.join("\n") + "\n");
    }
    packetStack.negotiateKeyExchangeAsClient = async (
      dst,
      makeSharedKeyFn,
      onFinish
    ) => {
      const sharedKey = makeSharedKeyFn();
      let waiting = true;
      const fileAccess = this.fa;
      const knownHosts = getKnownHosts(fileAccess, knownHostsPath);
      const hostport = `${dst.address}:${dst.port}`;
      const shell = this.shell;
      packetStack._sharedKeyHandler = async (type, src, payload) => {
        if (!waiting) return;
        if (type === "pubkey") {
          let pub, fingerprint;
          if (payload.includes("::")) {
            [, pub, fingerprint] = payload.split("::");
          } else {
            pub = payload;
            fingerprint = crypto.createHash("sha256").update(pub).digest("hex");
          }
          if (knownHosts[hostport] && knownHosts[hostport] !== fingerprint) {
            packetStack.send(dst, "__status::abort");
            shell.crt.textOut(
              `\n🚨 WARNING: Server fingerprint mismatch!\nExpected: ${knownHosts[hostport]}\nReceived: ${fingerprint}\nConnection aborted.\n`
            );
            waiting = false;
            return;
          } else if (!knownHosts[hostport]) {
            shell.crt.textOut(
              `\n🔑 Server fingerprint: ${fingerprint}\nFirst connection to ${hostport}.\n`
            );
            let answer = await shell.userPrompt(
              "Type 'yes' to accept and save this fingerprint: ",
              true
            );
            if (answer.trim().toLowerCase() !== "yes") {
              packetStack.send(dst, "__status::abort");
              shell.crt.textOut("Connection aborted by user.\n");
              waiting = false;
              return;
            }
            saveKnownHost(
              fileAccess,
              knownHostsPath,
              dst.address,
              dst.port,
              fingerprint
            );
            shell.crt.textOut("Fingerprint saved.\n");
          }
          const encrypted = crypto
            .publicEncrypt(
              {
                key: pub,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
              },
              Buffer.from(sharedKey, "hex")
            )
            .toString("hex");
          packetStack.send(dst, `__secretkey::${encrypted}`);
        } else if (type === "done") {
          packetStack.getSession(src).established = true;
          waiting = false;
          if (typeof onFinish === "function") onFinish(sharedKey, dst);
        }
      };
      packetStack.send(dst, "__request::key-exchange");
    };
    let mySecretKey = crypto.randomBytes(32);
    cha.setKey(mySecretKey);
    // Deteksi mode download: srcFile = remote, dstFile = lokal
    // Robust: deteksi mode download tanpa error jika argumen kurang
    const isDownload =
      argSrc &&
      argHost &&
      argHost.length > 0 &&
      argSrc.length > 0 &&
      args.params._[0].includes(":") &&
      !argDst.startsWith(argHost + ":");
    packetStack.negotiateKeyExchangeAsClient(
      dst,
      () => mySecretKey.toString("hex"),
      async (sharedKey, src) => {
        const session = packetStack.getSession(src);
        session.cha = cha;
        cha.agentName = `scp${session.id}`;
        packetStack.setAgentFor(src, session.cha);
        packetStack.setTTLFor(src, 60000 * 5);
        // === Tambah autentikasi username & password ===
        let username =
          args.params.u || (await this.shell.userPrompt("Username: ", true));
        let password =
          args.params.w || (await this.shell.userPrompt("Password: ", false)); // parameter false agar password tidak terlihat
        let authed = false;
        // Kirim auth ke server
        packetStack.send(
          dst,
          JSON.stringify({ type: "auth", username, password })
        );
        // Tunggu respon auth
        await new Promise((resolve) => {
          packetStack.onDecryptedMessage((payload, src) => {
            let msg;
            try {
              msg = JSON.parse(payload);
            } catch (e) {
              return;
            }
            if (msg.type === "auth_ok") {
              authed = true;
              resolve();
            } else if (msg.type === "auth_fail") {
              this.crt.textOut("❌ Authentication failed!\n");
              this.shell.terminate();
              resolve();
            }
          });
        });
        if (!authed) return;
        // === END AUTH ===
        if (isDownload) {
          // MODE DOWNLOAD: minta file dari server
          const reqFile = srcFile.replace(/^[^:]+:/, "");
          const filePacket = {
            type: "getfile",
            filename: reqFile,
          };
          packetStack.send(dst, JSON.stringify(filePacket));
          packetStack.onDecryptedMessage((payload, src) => {
            let msg;
            try {
              msg = JSON.parse(payload);
            } catch (e) {
              this.crt.textOut(payload + "\n");
              return;
            }
            if (msg.type === "file" && msg.filename && msg.data) {
              // Simpan file ke dstFile lokal
              try {
                const buf = Buffer.from(msg.data, "base64");
                this.fa.writeFileSync(dstFile, buf);
                this.crt.textOut(`✅ File diterima: ${dstFile}\n`);
                packetStack.send(dst, JSON.stringify({ type: "bye" }));
                this.shell.terminate();
              } catch (e) {
                this.crt.textOut(`❌ Error menulis file: ${e.message}\n`);
                this.shell.terminate();
              }
            } else if (msg.status === "error") {
              this.crt.textOut(`❌ Error: ${msg.message}\n`);
              this.shell.terminate();
            } else if (msg.status === "bye") {
              this.crt.textOut(`Sesi selesai.\n`);
              this.shell.terminate();
            }
          });
        } else {
          // MODE UPLOAD: kirim file ke server
          let fileBuffer;
          try {
            fileBuffer = this.fa.readBinaryFileSync(srcFile);
          } catch (e) {
            this.crt.textOut(`Gagal membaca file: ${e.message}\n`);
            this.shell.terminate();
            return;
          }
          // Kirim file (base64 agar universal)
          const base64Data = fileBuffer.toString("base64");
          const filePacket = {
            type: "file",
            filename: dstFile,
            data: base64Data,
          };
          packetStack.send(dst, JSON.stringify(filePacket));
          packetStack.onDecryptedMessage((payload, src) => {
            let msg;
            try {
              msg = JSON.parse(payload);
            } catch (e) {
              this.crt.textOut(payload + "\n");
              return;
            }
            if (msg.status === "ok") {
              this.crt.textOut(`✅ File terkirim: ${dstFile}\n`);
              packetStack.send(dst, JSON.stringify({ type: "bye" }));
              this.shell.terminate();
            } else if (msg.status === "error") {
              this.crt.textOut(`❌ Error: ${msg.message}\n`);
              this.shell.terminate();
            } else if (msg.status === "bye") {
              this.crt.textOut(`Sesi selesai.\n`);
              this.shell.terminate();
            }
          });
        }
      }
    );
  },
};
