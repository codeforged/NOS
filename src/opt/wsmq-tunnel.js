const crypto = require("crypto");

module.exports = {
  name: "wsmq-tunnel",
  version: "0.3",
  needRoot: true,
  main: function (nos) {
    // Store nos reference for use in other methods
    this.nos = nos;
    // Parse arguments
    const args = this.shell.parseCommand2(this.shell.lastCmd);
    const wsDevName = args.params["-w"] || args.params["--ws"] || "websocket1";

    // Load devices
    const devices = [
      { name: wsDevName, objectName: "ws" },
      { name: __APP.defaultComm, objectName: "mqtnl" },
      { name: "bfsAccess", objectName: "fa" },
    ];
    this.shell.loadDevices(devices, this);

    const { chaSharekey } = bfs.require(`/lib/api-shop.js`);
    this.sysconfig = bfs.require("/opt/conf/sysconfig.js");

    const isServer = args.params["--server"];
    const isClient = args.params["--client"];
    const port = args.params["-p"] || args.params["--port"] || 2500;
    const peer = Array.isArray(args.params._) ? args.params._[0] : null;

    // Initialize MQTNL connection
    this.conn = new this.mqtnl.mqtnlConnection(
      this.mqtnl.connMgr,
      port,
      null,
      isServer
    );

    // Initialize secure stack
    this.stack = new chaSharekey(this.conn);
    this.authenticated = false;
    this.keepAliveInterval = null; // Keep-alive timer

    if (isServer) {
      this.setupSecureServer();
    } else if (isClient) {
      this.setupSecureClient(peer, port);
    }
  },

  setupSecureServer() {
    // Load RSA keys
    const privateKey = this.fa.readFileSync(`/opt/conf/private.pem`, {
      encoding: "utf8",
    });
    const publicKey = this.fa.readFileSync(`/opt/conf/public.pem`, {
      encoding: "utf8",
    });
    const rsaKeyPair = { publicKey, privateKey };

    // Track authenticated clients
    this.authenticatedClients = new Set();

    // Handle key exchange success
    const onKeyExchangeSuccess = (sharedKey, client) => {
      const self = this; // Store reference to this
      const session = this.stack.getSession(client);
      let secretKey = Buffer.from(sharedKey, "hex");

      // Setup ChaCha20 encryption
      session.cha = this.nos.__CORE.encryption.addInstance(
        `wsmq-tunnel-${session.id}`,
        "chacha20-poly1305",
        secretKey
      );

      this.stack.setAgentFor(client, session.cha);
      this.stack.setTTLFor(client, 60000 * 10); // Extend to 10 minutes

      let authed = false;

      // Handle authentication and forwarding
      this.stack.onDecryptedMessage(async (payload, src) => {
        let msg;
        try {
          msg = JSON.parse(payload);
        } catch (e) {
          // Raw data forwarding only if authenticated
          if (authed) {
            self.ws.write(payload);
          }
          return;
        }

        // === AUTH HANDLING ===
        if (!authed && msg.type === "auth") {
          const users = self.sysconfig.rshLogin?.users || [];
          const user = users.find((u) => u.username === msg.username);
          let passOk = false;

          if (user) {
            // If no password required
            if (!user.password && !msg.password) passOk = true;
            else if (user.password && msg.password) {
              const hash = crypto
                .createHash("sha1")
                .update(msg.password)
                .digest("hex");
              if (user.password === hash) passOk = true;
            }
          }

          if (user && passOk) {
            authed = true;
            const clientKey = `${src.address}:${src.port}`;
            self.authenticatedClients.add(clientKey);
            self.stack.send(src, JSON.stringify({ type: "auth_ok" }));
            self.crt.textOut(
              `✅ Client ${src.address}:${src.port} authenticated successfully`
            );
          } else {
            self.stack.send(src, JSON.stringify({ type: "auth_fail" }));
            self.crt.textOut(
              `❌ Authentication failed for ${src.address}:${src.port}`
            );
            return;
          }
          return;
        }

        // Handle ping/pong for keep-alive
        if (authed && msg.type === "ping") {
          self.stack.send(src, JSON.stringify({ type: "pong" }));
          return;
        }

        if (!authed) {
          self.stack.send(
            src,
            JSON.stringify({ type: "auth_fail", message: "Not authenticated" })
          );
          return;
        }
        // === END AUTH HANDLING ===

        // Forward authenticated raw data to WebSocket (like server mode in forwarder)
        if (authed) {
          self.ws._read(payload, self.ws);
        }
      });
    };

    // Setup server-side key exchange
    this.stack.negotiateKeyExchangeAsServer(rsaKeyPair, onKeyExchangeSuccess);

    // Handle WebSocket messages -> MQTNL (encrypt)
    this.ws.directTXListener["wsmq-tunnel"] = (raw) => {
      // Find authenticated session to forward to
      for (const clientKey of this.authenticatedClients) {
        const [address, port] = clientKey.split(":");
        const dst = { address, port: parseInt(port) };
        this.stack.send(dst, raw.toString());
        break; // Send to first authenticated client
      }
    };
  },

  async setupSecureClient(peer, port) {
    const dst = { address: peer, port: parseInt(port) };

    // Generate shared key
    const mySecretKey = crypto.randomBytes(32);
    const cha = this.nos.__CORE.encryption.addInstance(
      "wsmq-tunnel-client",
      "chacha20-poly1305"
    );
    cha.setKey(mySecretKey);

    // Perform key exchange
    this.stack.negotiateKeyExchangeAsClient(
      dst,
      () => mySecretKey.toString("hex"),
      async (sharedKey, server) => {
        // Setup session
        const session = this.stack.getSession(server);
        session.cha = cha;
        this.stack.setAgentFor(server, session.cha);
        this.stack.setTTLFor(server, 60000 * 10); // Extend to 10 minutes

        // Authenticate first
        const username = await this.shell.userPrompt("Username: ", true);
        const password = await this.shell.userPrompt("Password: ", false);

        // Send auth request
        this.stack.send(
          server,
          JSON.stringify({ type: "auth", username, password })
        );

        // Wait for auth response
        let authed = false;
        await new Promise((resolve) => {
          this.stack.onDecryptedMessage((payload, src) => {
            let msg;
            try {
              msg = JSON.parse(payload);
            } catch (e) {
              return;
            }

            if (msg.type === "auth_ok") {
              authed = true;
              this.authenticated = true;
              resolve();
            } else if (msg.type === "auth_fail") {
              this.crt.textOut("❌ Authentication failed!");
              this.shell.terminate();
              resolve();
            }
          });
        });

        if (authed) {
          this.setupForwarding(server);
          this.startKeepAlive(server); // Start keep-alive ping
          this.crt.textOut(
            `✅ Secure tunnel established to ${server.address}:${server.port}`
          );
        }
      }
    );
  },

  setupForwarding(server) {
    // WebSocket RX -> MQTNL (like ws-mqtnl-forwarder client mode)
    this.ws.directRXListener["wsmq-tunnel"] = (raw) => {
      if (this.authenticated) {
        this.stack.send(server, raw.toString());
      }
    };

    // MQTNL RX -> WebSocket (decrypt and forward)
    this.stack.onDecryptedMessage((payload, src) => {
      // Skip JSON control messages, forward raw data
      let msg;
      try {
        msg = JSON.parse(payload);
        // If it's a control message, don't forward
        if (
          msg.type === "auth_ok" ||
          msg.type === "auth_fail" ||
          msg.type === "ping" ||
          msg.type === "pong"
        ) {
          return;
        }
      } catch (e) {
        // Not JSON, forward as raw data
      }
      this.ws.write(payload);
    });
  },

  startKeepAlive(server) {
    // Send ping every 2 minutes to maintain session
    this.keepAliveInterval = setInterval(() => {
      if (this.authenticated && this.stack) {
        try {
          this.stack.send(server, JSON.stringify({ type: "ping" }));
        } catch (e) {
          // Connection might be dead, clear interval
          this.stopKeepAlive();
        }
      }
    }, 120000); // 2 minutes

    this.crt.textOut("🔄 Keep-alive started (ping every 2 minutes)");
  },

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      this.crt.textOut("⏸️ Keep-alive stopped");
    }
  },

  exitSignal() {
    this.stopKeepAlive(); // Stop keep-alive before closing
    this.stack.close();
  },
};
