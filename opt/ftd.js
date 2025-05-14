// =============================================
// ftd.js - NOSPacketStack File Transfer Server
// =============================================

const fs = require("fs");
const path = require("path");

module.exports = {
  name: "ftd",
  version: "1.6",
  needRoot: true,
  main: function (nos) {
    const { chaSharekey } = require(`${this.shell.basePath}/lib/api-shop.js`);
    this.shell.loadDevices(
      [
        { name: __APP.defaultComm, objectName: "mqtnl" },
        { name: "fileAccess", objectName: "fa" },
      ],
      this
    );

    let port = 405;
    let homePath = "/home/ftdir"; // Important!, set this to isolate your shareable directory!
    let passwd = "12345";

    const args = this.shell.parseCommand(this.shell.lastCmd);
    const keys = Object.keys(args.params);
    if (keys.includes("p")) port = parseInt(args.params.p);
    if (keys.includes("h")) homePath = args.params.h;
    if (keys.includes("k")) passwd = args.params.k;

    const privateKey = fs.readFileSync(
      `${this.shell.basePath}/opt/conf/private.pem`,
      "utf8"
    );
    const publicKey = fs.readFileSync(
      `${this.shell.basePath}/opt/conf/public.pem`,
      "utf8"
    );
    const rsaKeyPair = { publicKey, privateKey };

    const conn = new this.mqtnl.mqtnlConnection(this.mqtnl.connMgr, port);
    const stack = new chaSharekey(conn);

    // PATCHED: Simpan semua client yang aktif
    const connectedClients = new Set();

    function subtractPath(fullPath, basePath) {
      if (!fullPath.startsWith(basePath)) {
        return fullPath;
      }
      let result = fullPath.slice(basePath.length);
      if (!result.startsWith("/")) {
        result = "/" + result;
      }
      return result;
    }

    function isParsableJson(data) {
      if (typeof data !== "string") return false;
      try {
        JSON.parse(data);
        return true;
      } catch (e) {
        return false;
      }
    }

    stack.negotiateKeyExchangeAsServer(rsaKeyPair, (sharedKey, src) => {
      const session = stack.getSession(src);
      let secretKey = Buffer.from(sharedKey, "hex");

      session.cha = nos.__CORE.encryption.addInstance(
        `ftd${session.id}`,
        "chacha20-poly1305",
        secretKey
      );
      stack.setAgentFor(src, session.cha);

      stack.setTTLFor(src, 60000 * 1);
      stack.setAuthRequired(src, true);
      stack.setAuthHandler((token) => {
        if (token == passwd) return true;
        else return false;
      });
      stack.onSessionExpired = (src) => {
        stack.send(src, "__session::timeout");
        // stack.send(src, "⏱️  Session timeout, disconnected.");
        session.connected = false;
        connectedClients.delete(src); // Hapus dari daftar kalau expired
      };
      stack.onAuthRequired = (session, src) => {
        stack.send(src, `⚠️ You have to send authentication message first!`);
      };
      stack.onAuthVerified = (session, src, isAuthenticated) => {
        stack.send(
          src,
          `${isAuthenticated ? "✅" : "⚠️ "} Authentication ${
            isAuthenticated ? "success" : "failed"
          }.`
        );
      };
      session.connected = true;

      connectedClients.add(src); // PATCHED: Daftarkan client baru

      stack.onDecryptedMessage((payload, client) => {
        const session = stack.getSession(client);
        if (session) {
          if (session.connected === false) {
            stack.send(
              client,
              `⚠️ Invalid session from ${client.address}:${client.port}, disconnected.`
            );
            return;
          }
        }

        if (isParsableJson(payload)) {
          let json = JSON.parse(payload);
          if (json.mode == "sendfile") {
            const zlib = require("zlib");
            const uncompressedData = zlib.inflateSync(
              Buffer.from(json.content, "base64")
            );
            this.fa.writeFileSync(homePath + json.path, uncompressedData, true);
            // this.fa.writeFileSync(json.path, uncompressedData);
            stack.send(
              client,
              JSON.stringify({
                type: "msg",
                content: "📄 They have written file successfully.",
              })
            );
          }
          return;
        }

        if (!session.cwd) session.cwd = "/";
        // if (!session.cwd) session.cwd = __dirname;

        const [cmd, ...args] = payload.split(" ");
        switch (cmd) {
          case "ls": {
            const dir = homePath + session.cwd;
            this.crt.textOut("Directory: " + session.cwd);
            let output = "";
            try {
              const list = this.fa.readdirSync(dir, { withFileTypes: true });
              const names = list.map((entry) =>
                entry.isDirectory() ? entry.name + "/" : entry.name
              );

              const maxNameLength = Math.max(
                ...names.map((name) => name.length)
              );
              const itemWidth = maxNameLength + 2;
              const screenWidth = this.crt?.columns || 80;
              const colPerRow = Math.max(
                1,
                Math.floor(screenWidth / itemWidth)
              );

              for (let i = 0; i < names.length; i++) {
                output += names[i].padEnd(itemWidth);
                if ((i + 1) % colPerRow === 0) output += "\n";
              }
              if (names.length % colPerRow !== 0) output += "\n";
            } catch (e) {
              output = `❌ ${e.message} `;
            }
            stack.send(
              client,
              JSON.stringify({ type: "msg", content: output })
            );
            break;
          }
          case "get": {
            const filePath = homePath + args[0];
            let content;
            try {
              content = this.fa.readFileSync(filePath, true);
              const zlib = require("zlib");
              const compressedData = zlib
                .deflateSync(content)
                .toString("base64");
              stack.send(
                client,
                JSON.stringify({
                  type: "get",
                  path: subtractPath(filePath, this.shell.basePath),
                  out: args[1]
                    ? args[1]
                    : subtractPath(filePath, this.shell.basePath),
                  content: compressedData,
                })
              );
            } catch (e) {
              content = `❌ ${e.message} `;
              stack.send(
                client,
                JSON.stringify({ type: "msg", content: content })
              );
            }
            break;
          }
          case "put": {
            const [filename, ...filecontent] = args;
            const content = filecontent.join(" ");
            const filePath = path.resolve(homePath + session.cwd, filename);
            try {
              this.crt.textOut(
                `[Listener] >> ` +
                  this.shell.basePath +
                  homePath +
                  filename +
                  " : " +
                  content
              );
              stack.send(client, "✅ File uploaded");
            } catch (e) {
              stack.send(client, `❌ ${e.message} `);
            }
            break;
          }
          case "cd": {
            try {
              let targetPath = session.cwd + args[0];
              if (!targetPath.endsWith("/")) targetPath += "/";
              targetPath = path.normalize(targetPath);
              if (this.fa.existsSync(homePath + targetPath)) {
                session.cwd = targetPath;
                stack.send(
                  client,
                  JSON.stringify({
                    type: "msg",
                    content: `📂 Changed directory to ${targetPath} `,
                  })
                );
              } else {
                stack.send(
                  client,
                  JSON.stringify({
                    type: "msg",
                    content: `❌ ${targetPath} not found!`,
                  })
                );
              }
            } catch (e) {
              stack.send(
                client,
                JSON.stringify({ type: "msg", content: `❌ ${e.message} ` })
              );
            }
            break;
          }
          case "disconnect": {
            stack.deleteSession(client);
            connectedClients.delete(client); // PATCHED: Hapus dari daftar saat manual disconnect
            this.crt.textOut(
              `👋 ${client.address}:${client.port} disconnected.`
            );
            break;
          }
          default:
            stack.send(
              client,
              JSON.stringify({ type: "msg", content: "❓ Unknown command" })
            );
        }
      });
    });

    // PATCHED exitSignal
    this.exitSignal = () => {
      // this.crt.textOut("📢 Stopping FTD Server, notifying clients...");

      for (const client of connectedClients) {
        try {
          stack.send(sessionObj, "__session::timeout");
          stack.send(client, "📢 FTD Server terminating...");
        } catch (e) {
          // Ignore error jika client sudah disconnect
        }
      }

      stack.close((sessionObj) => {
        try {
          stack.send(
            sessionObj,
            JSON.stringify({
              type: "msg",
              content: "📢 FTD Server terminating...",
            })
          );
          stack.send(sessionObj, "__session::timeout");
        } catch (e) {
          // Ignore
        }
      });

      connectedClients.clear(); // Kosongkan daftar client
      this.crt.textOut("⛔ FTD Server stopped.");
    };

    this.crt.textOut("🚀 FTD Server ready!");
  },
};
