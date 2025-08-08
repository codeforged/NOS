const crypto = require("crypto");

// Tambah: load sysconfig.js untuk user auth

module.exports = {
  instanceName: "__scpd",
  version: "1.21",
  name: "NOS Secure Copy Server (scpd)",
  needRoot: true,
  main: function (nos) {
    this.shell.loadDevices(
      [
        { name: __APP.defaultComm, objectName: "mqtnl" },
        { name: "bfsAccess", objectName: "fa" },
      ],
      this
    );
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
  },
};
