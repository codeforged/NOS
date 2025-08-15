module.exports = {
  name: "chat-client",
  version: "0.01",
  needRoot: false,
  main: async function (nos) {
    // Load devices sesuai pattern NOS
    this.shell.loadDevices(
      [
        { name: __APP.defaultComm, objectName: "mqtnl" },
        { name: "bfsAccess", objectName: "fa" },
      ],
      this
    );

    // Parse command arguments using NOS pattern
    const args = this.shell.parseCommand(this.shell.lastCmd);

    let host = "localhost";
    let port = 3000;
    let username;
    let password;

    if (args.params && args.params.h) host = args.params.h;
    if (args.params && args.params.p) port = parseInt(args.params.p);
    if (args.params && args.params.u) username = args.params.u;
    if (args.params && args.params.w) password = args.params.w;

    // Import scarrier library
    const { SecureCarrierClient } = bfs.require("/lib/scarrier.js");

    // Create connection and client
    const conn = new this.mqtnl.mqtnlConnection(this.mqtnl.connMgr, 0, null, 0);
    const client = new SecureCarrierClient(nos, conn, this.fa, this.shell);

    // Set keep-alive
    client.setSessionTTL(25);

    // Handle server responses
    client.onData((data, server) => {
      console.log(`Server says: ${data}`);
    });

    try {
      // Connect to server

      console.log(`Connecting to ${host}:${port} as ${username}...`);
      await client.connect(host, port, username, password);
      console.log("✅ Connected successfully!");

      // Send some test messages
      client.sendMessage("Hello from client!");

      setTimeout(() => {
        client.sendMessage("This is second message");
      }, 2000);

      setTimeout(() => {
        client.sendMessage("Goodbye!");
        setTimeout(() => {
          console.log("🔌 Disconnecting from server...");
          try {
            client.disconnect("Client finished");
          } catch (e) {
            this.crt.textOut(e);
          }
          this.terminate();
        }, 1000);
      }, 5000);
    } catch (error) {
      console.error("❌ Connection failed:", error.message);
      this.terminate();
    }
  },
};
