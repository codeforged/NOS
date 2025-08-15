/**
 * Secure Carrier Library for NOS
 * Provides secure, authenticated transport abstraction over MQTNL
 *
 * Features:
 * - RSA key exchange with fingerprint verification
 * - ChaCha20-Poly1305 session encryption
 * - Username/password authentication
 * - Known hosts management
 * - Protocol-agnostic data transport
 *
 * Author: NOS Team
 * Version: 1.0
 */

const crypto = require("crypto");

/**
 * Base class for secure carrier functionality
 */
class SecureCarrierBase {
  constructor(nosInstance, mqtnlConnection, fileAccess) {
    this.nos = nosInstance;
    this.conn = mqtnlConnection;
    this.fa = fileAccess;
    this.stack = null;
    this.authenticated = false;
    this.onDataCallback = null;
    this.onAuthCallback = null;
    this.onErrorCallback = null;
    this.sessionTTL = 60000 * 5; // 5 minutes default
    this.keepAlive = false; // Keep-alive mode
  }

  /**
   * Set session TTL in seconds (0 = keep-alive/infinite)
   */
  setSessionTTL(seconds) {
    if (seconds === 0) {
      this.keepAlive = true;
      this.sessionTTL = 0;
    } else {
      this.keepAlive = false;
      this.sessionTTL = seconds * 1000; // Convert to milliseconds
    }
  }

  /**
   * Get current TTL setting
   */
  getTTL() {
    return this.keepAlive ? 0 : Math.floor(this.sessionTTL / 1000);
  }

  /**
   * Set callback for received data (after authentication)
   */
  onData(callback) {
    this.onDataCallback = callback;
  }

  /**
   * Set callback for authentication events
   */
  onAuth(callback) {
    this.onAuthCallback = callback;
  }

  /**
   * Set callback for error events
   */
  onError(callback) {
    this.onErrorCallback = callback;
  }

  /**
   * Send data through secure carrier
   */
  send(destination, data) {
    if (!this.authenticated) {
      throw new Error("Cannot send data: not authenticated");
    }
    this.stack.send(destination, data);
  }

  /**
   * Close the secure carrier
   */
  close() {
    if (this.stack) {
      this.stack.close();
    }
  }

  /**
   * Explicitly close connection and cleanup
   */
  closeConnection() {
    this.authenticated = false;
    this.close();
  }
}

/**
 * Secure Carrier Server
 * Accepts incoming secure connections with authentication
 */
class SecureCarrierServer extends SecureCarrierBase {
  constructor(nosInstance, mqtnlConnection, fileAccess, port = 2222) {
    super(nosInstance, mqtnlConnection, fileAccess);
    this.port = port;
    this.sysconfig = null;
    this.connectedClients = new Set();
    this.privateKey = null;
    this.publicKey = null;
    this.fingerprint = null;
  }

  /**
   * Load system configuration for authentication
   */
  loadSysConfig(sysconfig) {
    this.sysconfig = sysconfig;
  }

  /**
   * Load RSA key pair for secure handshake
   */
  loadKeyPair(privateKeyPath, publicKeyPath) {
    try {
      this.privateKey = this.fa.readFileSync(privateKeyPath, {
        encoding: "utf8",
      });
      this.publicKey = this.fa.readFileSync(publicKeyPath, {
        encoding: "utf8",
      });
      this.fingerprint = crypto
        .createHash("sha256")
        .update(this.publicKey)
        .digest("hex");
      return true;
    } catch (error) {
      if (this.onErrorCallback) {
        this.onErrorCallback("Key loading failed", error);
      }
      return false;
    }
  }

  /**
   * Start the secure carrier server
   */
  start() {
    if (!this.privateKey || !this.publicKey) {
      throw new Error("RSA key pair not loaded. Call loadKeyPair() first.");
    }

    if (!this.sysconfig) {
      throw new Error("System config not loaded. Call loadSysConfig() first.");
    }

    const { chaSharekey } = bfs.require("/lib/api-shop.js");
    this.stack = new chaSharekey(this.conn);

    const rsaKeyPair = {
      publicKey: this.publicKey,
      privateKey: this.privateKey,
    };

    // Setup key exchange with fingerprint
    this.stack.negotiateKeyExchangeAsServer = (rsaKeyPair, onGotSharedKey) => {
      this.stack._sharedKeyHandler = (type, src, payload) => {
        if (type === "request") {
          this.stack.send(
            src,
            `__pubkey::${rsaKeyPair.publicKey}::${this.fingerprint}`
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
          this.stack.send(src, "__status::done");
          if (onGotSharedKey) {
            onGotSharedKey(sharedKey.toString("hex"), src);
          }
        }
      };
    };

    // Handle successful key exchange
    const onKeyExchangeSuccess = (sharedKey, client) => {
      this.connectedClients.add(client);
      const session = this.stack.getSession(client);
      const secretKey = Buffer.from(sharedKey, "hex");

      // Setup ChaCha20 encryption
      session.cha = this.nos.__CORE.encryption.addInstance(
        `scarrier-server-${session.id}`,
        "chacha20-poly1305",
        secretKey
      );

      this.stack.setAgentFor(client, session.cha);

      // Set TTL based on configuration
      if (!this.keepAlive && this.sessionTTL > 0) {
        this.stack.setTTLFor(client, this.sessionTTL);
      }
      // If keepAlive is true, don't set TTL (infinite session)

      let clientAuthenticated = false;

      // Handle incoming messages
      this.stack.onDecryptedMessage(async (payload, src) => {
        let msg;
        try {
          msg = JSON.parse(payload);
        } catch (e) {
          // If not JSON, treat as raw data (only if authenticated)
          if (clientAuthenticated && this.onDataCallback) {
            this.onDataCallback(payload, src);
          }
          return;
        }

        // Authentication handling
        if (!clientAuthenticated && msg.type === "auth") {
          const authResult = await this.authenticateUser(
            msg.username,
            msg.password
          );

          if (authResult.success) {
            clientAuthenticated = true;
            this.authenticated = true;
            this.stack.send(src, JSON.stringify({ type: "auth_ok" }));

            if (this.onAuthCallback) {
              this.onAuthCallback(true, msg.username, src);
            }
          } else {
            this.stack.send(
              src,
              JSON.stringify({
                type: "auth_fail",
                message: authResult.message,
              })
            );

            if (this.onAuthCallback) {
              this.onAuthCallback(false, msg.username, src);
            }
          }
          return;
        }

        // Require authentication for other messages
        if (!clientAuthenticated) {
          this.stack.send(
            src,
            JSON.stringify({
              type: "auth_fail",
              message: "Authentication required",
            })
          );
          return;
        }

        // Handle disconnect
        if (msg.type === "bye") {
          this.stack.send(src, JSON.stringify({ type: "bye" }));
          this.connectedClients.delete(src);
          // Delete session to prevent stale encrypted messages
          this.stack.deleteSession(src);
          return;
        }

        // Forward authenticated data to application
        if (this.onDataCallback) {
          this.onDataCallback(payload, src);
        }
      });
    };

    // Start key exchange server
    this.stack.negotiateKeyExchangeAsServer(rsaKeyPair, onKeyExchangeSuccess);
    return true;
  }

  /**
   * Authenticate user against system configuration
   */
  async authenticateUser(username, password) {
    const users = this.sysconfig.rshLogin?.users || [];
    const user = users.find((u) => u.username === username);

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Handle empty password cases
    if (!user.password && !password) {
      return { success: true, message: "Authentication successful" };
    }

    if (user.password && password) {
      const hash = crypto.createHash("sha1").update(password).digest("hex");
      if (user.password === hash) {
        return { success: true, message: "Authentication successful" };
      }
    }

    return { success: false, message: "Invalid credentials" };
  }

  /**
   * Broadcast message to all authenticated clients
   */
  broadcast(data) {
    for (const client of this.connectedClients) {
      try {
        this.stack.send(client, data);
      } catch (error) {
        if (this.onErrorCallback) {
          this.onErrorCallback("Broadcast failed", error);
        }
      }
    }
  }

  /**
   * Close connection to specific client
   */
  closeClient(clientAddress, reason = "Connection closed by server") {
    if (this.connectedClients.has(clientAddress)) {
      try {
        this.stack.send(
          clientAddress,
          JSON.stringify({
            type: "bye",
            message: reason,
          })
        );
      } catch (error) {
        // Ignore errors during disconnect
      }

      this.connectedClients.delete(clientAddress);

      // Close session for this client
      const session = this.stack.getSession(clientAddress);
      if (session && session.cha) {
        // this.nos.__CORE.encryption.removeInstance(session.cha.id);
      }
    }
  }

  /**
   * Get list of connected clients
   */
  getConnectedClients() {
    return Array.from(this.connectedClients);
  }

  /**
   * Stop the server and disconnect all clients
   */
  stop() {
    for (const client of this.connectedClients) {
      try {
        this.stack.send(
          client,
          JSON.stringify({
            type: "bye",
            message: "Server shutting down",
          })
        );
      } catch (error) {
        // Ignore errors during shutdown
      }
    }

    this.close();
    this.connectedClients.clear();
    this.authenticated = false;
  }
}

/**
 * Secure Carrier Client
 * Initiates secure connections to servers
 */
class SecureCarrierClient extends SecureCarrierBase {
  constructor(nosInstance, mqtnlConnection, fileAccess, shell) {
    super(nosInstance, mqtnlConnection, fileAccess);
    this.shell = shell;
    this.knownHostsPath = "/home/.nos_known_hosts";
    this.destination = null;
  }

  /**
   * Send message to connected server
   */
  sendMessage(data) {
    if (!this.authenticated) {
      throw new Error("Cannot send data: not authenticated");
    }
    if (!this.destination) {
      throw new Error("No destination set");
    }
    this.stack.send(this.destination, data);
  }

  /**
   * Load known hosts from file
   */
  getKnownHosts() {
    try {
      if (this.fa.fileExistsSync(this.knownHostsPath)) {
        const lines = this.fa.readFileSync(this.knownHostsPath).split("\n");
        const map = {};
        lines.forEach((line) => {
          const [hostport, fingerprint] = line.trim().split(" ");
          if (hostport && fingerprint) {
            map[hostport] = fingerprint;
          }
        });
        return map;
      }
    } catch (error) {
      if (this.onErrorCallback) {
        this.onErrorCallback("Failed to load known hosts", error);
      }
    }
    return {};
  }

  /**
   * Save host fingerprint to known hosts
   */
  saveKnownHost(host, port, fingerprint) {
    const hostport = `${host}:${port}`;
    let lines = [];

    if (this.fa.fileExistsSync(this.knownHostsPath)) {
      lines = this.fa
        .readFileSync(this.knownHostsPath)
        .split("\n")
        .filter(Boolean)
        .filter((line) => !line.startsWith(hostport + " "));
    }

    lines.push(`${hostport} ${fingerprint}`);
    this.fa.writeFileSync(this.knownHostsPath, lines.join("\n") + "\n");
  }

  /**
   * Connect to a secure carrier server
   */
  async connect(host, port = 2222, username = null, password = null) {
    this.destination = { address: host, port: parseInt(port) };

    const { chaSharekey } = bfs.require("/lib/api-shop.js");
    this.stack = new chaSharekey(this.conn);

    // Generate session key
    const mySecretKey = crypto.randomBytes(32);
    const cha = this.nos.__CORE.encryption.addInstance(
      "scarrier-client",
      "chacha20-poly1305"
    );
    cha.setKey(mySecretKey);

    // Setup client-side key exchange with fingerprint verification
    this.stack.negotiateKeyExchangeAsClient = async (
      dst,
      makeSharedKeyFn,
      onFinish
    ) => {
      const sharedKey = makeSharedKeyFn();
      let waiting = true;
      const knownHosts = this.getKnownHosts();
      const hostport = `${dst.address}:${dst.port}`;

      this.stack._sharedKeyHandler = async (type, src, payload) => {
        if (!waiting) return;

        if (type === "pubkey") {
          let pub, fingerprint;
          if (payload.includes("::")) {
            [, pub, fingerprint] = payload.split("::");
          } else {
            pub = payload;
            fingerprint = crypto.createHash("sha256").update(pub).digest("hex");
          }

          // Verify fingerprint
          if (knownHosts[hostport] && knownHosts[hostport] !== fingerprint) {
            this.stack.send(dst, "__status::abort");
            if (this.onErrorCallback) {
              this.onErrorCallback("Fingerprint mismatch", {
                expected: knownHosts[hostport],
                received: fingerprint,
              });
            }
            waiting = false;
            return;
          }

          // Handle first connection
          if (!knownHosts[hostport]) {
            if (this.shell) {
              this.shell.crt.textOut(
                `\n🔑 Server fingerprint: ${fingerprint}\n`
              );
              const answer = await this.shell.userPrompt(
                "Type 'yes' to accept and save this fingerprint: ",
                true
              );

              if (answer.trim().toLowerCase() !== "yes") {
                this.stack.send(dst, "__status::abort");
                if (this.onErrorCallback) {
                  this.onErrorCallback("Connection aborted by user", null);
                }
                waiting = false;
                return;
              }
            }

            this.saveKnownHost(dst.address, dst.port, fingerprint);
          }

          // Send encrypted shared key
          const encrypted = crypto
            .publicEncrypt(
              {
                key: pub,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
              },
              Buffer.from(sharedKey, "hex")
            )
            .toString("hex");

          this.stack.send(dst, `__secretkey::${encrypted}`);
        } else if (type === "done") {
          this.stack.getSession(src).established = true;
          waiting = false;
          if (typeof onFinish === "function") {
            onFinish(sharedKey, dst);
          }
        }
      };

      this.stack.send(dst, "__request::key-exchange");
    };

    // Perform key exchange
    return new Promise((resolve, reject) => {
      this.stack.negotiateKeyExchangeAsClient(
        this.destination,
        () => mySecretKey.toString("hex"),
        async (sharedKey, server) => {
          // Setup session
          const session = this.stack.getSession(server);
          session.cha = cha;
          this.stack.setAgentFor(server, session.cha);

          // Set TTL based on configuration
          if (!this.keepAlive && this.sessionTTL > 0) {
            this.stack.setTTLFor(server, this.sessionTTL);
          }
          // If keepAlive is true, don't set TTL (infinite session)

          // Authenticate
          //   if (username == null)
          //     username = await this.shell.userPrompt("Username: ", true);
          //   if (password == null)
          //     password = await this.shell.userPrompt("Password: ", false); // parameter false agar password tidak terlihat
          const authResult = await this.authenticate(username, password);

          if (authResult) {
            this.authenticated = true;

            // Setup message handler
            this.stack.onDecryptedMessage((payload, src) => {
              let msg;
              try {
                msg = JSON.parse(payload);

                // Skip auth messages
                if (msg.type === "auth_ok" || msg.type === "auth_fail") {
                  return;
                }

                // Handle disconnect
                if (msg.type === "bye") {
                  this.authenticated = false;
                  return;
                }
              } catch (e) {
                // Not JSON, treat as raw data
              }

              // Forward to application
              if (this.onDataCallback) {
                this.onDataCallback(payload, src);
              }
            });

            resolve(true);
          } else {
            reject(new Error("Authentication failed"));
          }
        }
      );
    });
  }

  /**
   * Authenticate with the server
   */
  async authenticate(username = null, password = null) {
    if (!username && this.shell) {
      username = await this.shell.userPrompt("Username: ", true);
    }

    if (!password && this.shell) {
      password = await this.shell.userPrompt("Password: ", false);
    }

    // Send auth request
    this.stack.send(
      this.destination,
      JSON.stringify({
        type: "auth",
        username: username,
        password: password,
      })
    );

    // Wait for auth response
    return new Promise((resolve) => {
      const authHandler = (payload, src) => {
        let msg;
        try {
          msg = JSON.parse(payload);
        } catch (e) {
          return;
        }

        if (msg.type === "auth_ok") {
          if (this.onAuthCallback) {
            this.onAuthCallback(true, username, src);
          }
          resolve(true);
        } else if (msg.type === "auth_fail") {
          if (this.onAuthCallback) {
            this.onAuthCallback(false, username, src);
          }
          resolve(false);
        }
      };

      this.stack.onDecryptedMessage(authHandler);
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(reason = "Client disconnecting") {
    if (this.authenticated && this.destination) {
      try {
        this.stack.send(
          this.destination,
          JSON.stringify({
            type: "bye",
            message: reason,
          })
        );
      } catch (error) {
        // Ignore errors during disconnect
      }
    }

    // Cleanup encryption instance and delete session
    if (this.stack && this.destination) {
      const session = this.stack.getSession(this.destination);
      if (session && session.cha) {
        // this.nos.__CORE.encryption.removeInstance(session.cha.id);
      }
      // Delete session to prevent receiving encrypted garbage
      this.stack.deleteSession(this.destination);
    }

    this.close();
    this.authenticated = false;
    this.destination = null;
  }

  /**
   * Force close connection without graceful goodbye
   */
  forceClose() {
    // Cleanup encryption instance
    if (this.stack && this.destination) {
      const session = this.stack.getSession(this.destination);
      if (session && session.cha) {
        // this.nos.__CORE.encryption.removeInstance(session.cha.id);
      }
    }

    this.close();
    this.authenticated = false;
    this.destination = null;
  }
}

module.exports = {
  SecureCarrierServer,
  SecureCarrierClient,
  SecureCarrierBase,
};
