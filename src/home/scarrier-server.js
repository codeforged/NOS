module.exports = {
  name: "chat-server",
  version: "0.01",
  needRoot: true,
  main: async function (nos) {
    // Load devices sesuai pattern NOS
    this.shell.loadDevices(
      [
        { name: __APP.defaultComm, objectName: "mqtnl" },
        { name: "bfsAccess", objectName: "fa" },
        { name: "sysconfig", objectName: "sysconfig" },
      ],
      this
    );

    const args = this.shell.parseCommand(this.shell.lastCmd);
    let port = 3000;
    if (args.params && args.params.p) port = parseInt(args.params.p);

    // Import scarrier library
    const { SecureCarrierServer } = bfs.require("/lib/scarrier.js");

    this.crt.textOut(`Starting chat server on port ${port}...`);

    // Create connection and server
    const conn = new this.mqtnl.mqtnlConnection(
      this.mqtnl.connMgr,
      port,
      null,
      1 // Override port if exists
    );
    const server = new SecureCarrierServer(nos, conn, this.fa, port);

    // Load key pair
    server.loadKeyPair("/opt/conf/private.pem", "/opt/conf/public.pem");

    // Load system config for authentication
    this.sysconfig = bfs.require("/opt/conf/sysconfig.js");
    server.loadSysConfig(this.sysconfig);

    // Set keep-alive connections
    server.setSessionTTL(25);

    // Handle incoming messages
    server.onData((data, client) => {
      this.crt.textOut(`Received from ${client.address}: ${data}`);

      // Simple echo server - reply back with prefix
      const reply = `Server echo: ${data}`;
      server.send(client, reply);
    });

    // Handle client authentication
    server.onAuth((success, username, client) => {
      if (success) {
        this.crt.textOut(
          `✅ User ${username} connected from ${client.address}`
        );
        server.send(
          client,
          `Welcome ${username}! You are connected to chat server.`
        );
      } else {
        this.crt.textOut(
          `❌ Authentication failed for ${username} from ${client.address}`
        );
      }
    });

    // Start server
    server.start();
    this.crt.textOut(`Chat server started on port ${port}`);
    this.terminate();
    // Keep server running (don't call this.terminate())
  },
};
