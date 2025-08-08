const crypto = require("crypto");

module.exports = {
  instanceName: "__airtermd",
  version: "1.4", // Increment version
  name: "Remote Shell Server",
  needRoot: true,
  main: function (nos) {
    this.shell.loadDevices(
      [
        { name: __APP.defaultComm, objectName: "mqtnl" },
        { name: "bfsAccess", objectName: "fa" },
      ],
      this
    );

    let port = 25;
    let activeShell = "/base/microShell";

    const args = this.shell.parseCommand(this.shell.lastCmd);
    const keys = Object.keys(args.params);
    if (keys.includes("p")) port = parseInt(args.params.p);
    if (keys.includes("s")) activeShell = args.params.s;

    const { chaSharekey } = bfs.require(`/lib/api-shop.js`);
    const { Shell } = bfs.require(activeShell);

    const privateKey = this.fa.readFileSync(`/opt/conf/private.pem`, "utf8");
    const publicKey = this.fa.readFileSync(`/opt/conf/public.pem`, "utf8");
    const rsaKeyPair = { publicKey, privateKey };
    const pubFingerprint = crypto.createHash("sha256").update(publicKey).digest("hex");

    const conn = new this.mqtnl.mqtnlConnection(this.mqtnl.connMgr, port);
    const stack = new chaSharekey(conn);

    // Simpan semua client yang sudah terkoneksi
    const connectedClients = new Set(); // <<<< ADD: untuk collect client

    const onKeyExchangeSuccess = (sharedKey, client) => {
      // Setelah sukses key exchange, tambahkan client ke daftar connected
      connectedClients.add(client); // <<<< ADD: daftarkan client yang sukses handshake
      const session = stack.getSession(client);
      stack.onSessionExpired = (client) => {
        stack.send(client, "\n⏱️  Session timeout, disconnected.\n");
        stack.send(client, "!exit!");
        connectedClients.delete(client); // <<<< REMOVE: bersihkan kalau expired
      };
      let secretKey = Buffer.from(sharedKey, "hex");
      session.cha = nos.__CORE.encryption.addInstance(
        `airtermd${session.id}`, // Nama instan sekuriti agen
        "chacha20-poly1305", // Nama agen yang dipilih, di register di cryptoconf.js
        secretKey
        // "reverse", ""
      );
      // session.cha.setKey(secretKey);
      stack.setAgentFor(client, session.cha);
      stack.setTTLFor(client, 60000 * 5);
      handleIncomingShellMessages();
    };

    const createRemoteShellSession = (client) => {
      const session = stack.getSession(client);
      session.remoteShell = new Shell(
        `^%hostname:%pwd %username%roottag `,
        "Remote Shell",
        nos,
        (output) => {
          if (session.remoteShell.transmittActive) stack.send(client, output);
        },
        true // true: with authentication
      );

      session.remoteShell.termUtil.history = [...this.shell.termUtil.history];
      session.remoteShell.termUtil.autoCompletionList = [
        ...this.shell.termUtil.autoCompletionList,
      ];
      session.remoteShell.pwd = "/home/";
      session.remoteShell.envPath = this.shell.envPath;

      try {
        nos.executeModule(
          `/opt`,
          "historylogger",
          null,
          session.remoteShell
        );
      } catch (e) {
        this.crt.textOut("Error loading history logger module: " + e.message);
      }

      session.remoteShell.parentShell = this.shell;
      //console.log("** D")
      session.remoteShell.greeting(() => {
        try {
          //console.log("** E")
          const sacredPhrases = bfs.require("/lib/sacredPhrases");
          // console.log(Math.random() * sacredPhrases.length);
          const phrase =
            sacredPhrases[parseInt(Math.random() * sacredPhrases.length)];

          const greetingText = `Welcome NOS Shell, ${nos.codeName}, ${nos.version}\r\n--= "${phrase}" =--\n`;
          session.remoteShell.crt.textOut(greetingText);
        } catch (e) {
          this.crt.textOut(e);
        }
      });

      session.remoteShell.onExit = () => {
        stack.send(client, "Bye...\r\n");
        stack.send(client, "!exit!");
        connectedClients.delete(client); // <<<< REMOVE: kalau client keluar manual
      };
    };

    const handleIncomingShellMessages = () => {
      stack.onDecryptedMessage((payload, src) => {
        let session = stack.getSession(src);
        let msg;
        try {
          msg = JSON.parse(payload);
        } catch (e) {
          return; // Ignore non-JSON payloads
        }
        if (msg.payload.startsWith("__termresize")) {
          let rc = msg.payload.substring(14).split(",");
          const rows = parseInt(rc[0]);
          const cols = parseInt(rc[1]);
          if (session.remoteShell) {
            session.remoteShell.resizeScreenSize(rows, cols);
          }
        }
        switch (msg.payload) {
          case "requestConnect":
            stack.send(src, "!connectAccept!");
            createRemoteShellSession(src);
            break;
          case "io":
            try {
              session.remoteShell.pushIOKey(msg.io);
            } catch (e) {
              this.crt.textOut("Session timeout");
            }
            break;

          default:
            break;
        }
      });
    };

    // PATCH: handshake recognition - send pubkey with fingerprint
    stack.negotiateKeyExchangeAsServer = function (rsaKeyPair, onGotSharedKey = null) {
      this._sharedKeyHandler = (type, src, payload) => {
        if (type === "request") {
          // Kirim public key + fingerprint agar client bisa verifikasi
          this.send(src, `__pubkey::${rsaKeyPair.publicKey}::${pubFingerprint}`);
        } else if (type === "secretkey") {
          const encrypted = payload.split("::")[1];
          const sharedKey = crypto.privateDecrypt(
            {
              key: rsaKeyPair.privateKey,
              padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            },
            Buffer.from(encrypted, "hex")
          );
          this.send(src, `__status::done`);
          if (onGotSharedKey) onGotSharedKey("" + sharedKey.toString("hex"), src);
        }
      };
    };

    stack.negotiateKeyExchangeAsServer(rsaKeyPair, onKeyExchangeSuccess);

    this.crt.textOut(`✅ Airtermd Listening on port ${port} ...`);

    // PATCHED exitSignal
    this.exitSignal = () => {
      // this.crt.textOut("⛔ Stopping Airtermd, notifying clients...");

      for (const client of connectedClients) {
        try {
          stack.send(client, "\n⏱️  Remote terminal server terminating ...\n");
          stack.send(client, "!exit!");
        } catch (e) {
          // Mungkin client sudah disconnected, abaikan error
        }
      }

      stack.close((sessionObj) => {
        try {
          stack.send(sessionObj, "__session::timeout");
        } catch (e) {
          // Ignore
        }
      });

      connectedClients.clear(); // Kosongkan set
      this.crt.textOut("✅ Airtermd Remote Terminal Server stopped.");
    };
    /*************************************************/
    scpdServer = () => {
      const sysconfig = bfs.require("/opt/conf/sysconfig.js");

      let port = 2222;
      const args = this.shell.parseCommand(this.shell.lastCmd);
      if (args.params && args.params.p) port = parseInt(args.params.p);

      const { chaSharekey } = bfs.require(`/lib/api-shop.js`);
      const privateKey = this.fa.readFileSync(`/opt/conf/private.pem`, { "encoding": "utf8" });
      const publicKey = this.fa.readFileSync(`/opt/conf/public.pem`, { "encoding": "utf8" });
      const rsaKeyPair = { publicKey, privateKey };
      const pubFingerprint = crypto
        .createHash("sha256")
        .update(publicKey)
        .digest("hex");

      const conn = new this.mqtnl.mqtnlConnection(this.mqtnl.connMgr, port);
      const stack = new chaSharekey(conn);
      const connectedClients = new Set();

      function saveFileToBFS(fa, dstPath, buffer) {
        fa.writeFileSync(dstPath, buffer);
      }

      const onKeyExchangeSuccess = (sharedKey, client) => {
        connectedClients.add(client);
        const session = stack.getSession(client);
        let secretKey = Buffer.from(sharedKey, "hex");
        session.cha = nos.__CORE.encryption.addInstance(
          `scpd${session.id}`,
          "chacha20-poly1305",
          secretKey
        );
        stack.setAgentFor(client, session.cha);
        stack.setTTLFor(client, 60000 * 5);
        let authed = false;
        stack.onDecryptedMessage(async (payload, src) => {
          let msg;
          try {
            msg = JSON.parse(payload);
          } catch (e) {
            stack.send(
              src,
              JSON.stringify({ status: "error", message: "Invalid payload" })
            );
            return;
          }
          // === AUTH HANDLING ===
          if (!authed && msg.type === "auth") {
            // Ambil user dari sysconfig.js
            const users =
              sysconfig.rshLogin && sysconfig.rshLogin.users
                ? sysconfig.rshLogin.users
                : [];
            const user = users.find((u) => u.username === msg.username);
            let passOk = false;
            if (user) {
              // Jika password kosong, izinkan login tanpa password
              if (!user.password && !msg.password) passOk = true;
              else if (user.password && msg.password) {
                // Hash password input dan bandingkan
                const hash = crypto
                  .createHash("sha1")
                  .update(msg.password)
                  .digest("hex");
                if (user.password === hash) passOk = true;
              }
            }
            if (user && passOk) {
              authed = true;
              stack.send(src, JSON.stringify({ type: "auth_ok" }));
            } else {
              stack.send(src, JSON.stringify({ type: "auth_fail" }));
              return;
            }
            return;
          }
          if (!authed) {
            stack.send(
              src,
              JSON.stringify({ type: "auth_fail", message: "Not authenticated" })
            );
            return;
          }
          // === END AUTH HANDLING ===
          if (msg.type === "file" && msg.filename && msg.data) {
            try {
              const fileBuffer = Buffer.from(msg.data, "base64");
              saveFileToBFS(this.fa, msg.filename, fileBuffer);
              stack.send(
                src,
                JSON.stringify({
                  status: "ok",
                  message: `File ${msg.filename} received.`,
                })
              );
            } catch (e) {
              stack.send(
                src,
                JSON.stringify({ status: "error", message: e.message })
              );
            }
          } else if (msg.type === "getfile" && msg.filename) {
            try {
              const fileBuffer = this.fa.readBinaryFileSync(msg.filename);
              const base64Data = fileBuffer.toString("base64");
              stack.send(
                src,
                JSON.stringify({
                  type: "file",
                  filename: msg.filename,
                  data: base64Data,
                })
              );
            } catch (e) {
              stack.send(
                src,
                JSON.stringify({ status: "error", message: e.message })
              );
            }
          } else if (msg.type === "bye") {
            stack.send(src, JSON.stringify({ status: "bye" }));
            connectedClients.delete(src);
          }
        });
      };

      // PATCH: handshake recognition - send pubkey with fingerprint
      stack.negotiateKeyExchangeAsServer = function (
        rsaKeyPair,
        onGotSharedKey = null
      ) {
        this._sharedKeyHandler = (type, src, payload) => {
          if (type === "request") {
            this.send(
              src,
              `__pubkey::${rsaKeyPair.publicKey}::${pubFingerprint}`
            );
          } else if (type === "secretkey") {
            const encrypted = payload.split("::")[1];
            const sharedKey = crypto.privateDecrypt(
              {
                key: rsaKeyPair.privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
              },
              Buffer.from(encrypted, "hex")
            );
            this.send(src, `__status::done`);
            if (onGotSharedKey)
              onGotSharedKey("" + sharedKey.toString("hex"), src);
          }
        };
      };

      stack.negotiateKeyExchangeAsServer(rsaKeyPair, onKeyExchangeSuccess);

      this.crt.textOut(`✅ SCPD Listening on port ${port} ...`);

      this.exitSignal = () => {
        for (const client of connectedClients) {
          try {
            stack.send(
              client,
              JSON.stringify({ status: "bye", message: "Server shutting down" })
            );
          } catch (e) { }
        }
        stack.close();
        connectedClients.clear();
        this.crt.textOut("✅ SCPD server stopped.");
      };
    }

    scpdServer();
    /*************************************************/
  },
};
