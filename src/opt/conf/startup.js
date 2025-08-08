module.exports = {
  startUp: function (nos) {
    bfs.require("/opt/conf/netconf.js");

    const __mySQLDriver = bfs.require("/dev/mysql");
    const mySQLDriver = new __mySQLDriver.mySQLDriver(nos, {
      user: 'canding',
      password: 'bismillah',
      host: 'localhost',
      database: 'testdb',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    mySQLDriver.devClass = "MySQL Server Driver for NOS";
    nos.mountDevice(mySQLDriver);

    // const __SerialPortDriver = bfs.require(nos.basePath + "/dev/serialport");
    // const portname = "/dev/ttyUSB0";
    // const SerialPortDriver = new __SerialPortDriver.SerialPortDriver(nos, portname, 115200);
    // SerialPortDriver.devClass = `Serial Port Driver [${portname}]`;
    // nos.mountDevice(SerialPortDriver);

    const __webSockerDriver = bfs.require("/dev/websocket");
    const webSocketDriver = new __webSockerDriver.webSocket(nos, 8090);
    webSocketDriver.devClass = "Web Socket for ESP32 Sensor";
    nos.mountDevice(webSocketDriver);

    const webSocketDriver2 = new __webSockerDriver.webSocket(nos, 8193);
    webSocketDriver2.devClass = "Web Socket for NOS Desktop";
    nos.mountDevice(webSocketDriver2);

    // ttyModeratorDriver = require(nos.basePath + "/dev/ttymoderator");
    // __ttyModeratorDriver = new ttyModeratorDriver.ttyModerator(nos);
    // nos.mountDevice(__ttyModeratorDriver);

    // HttpServerDriver = require(nos.basePath+"/dev/http");
    // httpServerDriver = new HttpServerDriver.httpServer(nos, 8087);
    // nos.mountDevice(httpServerDriver);
    const __mqtnlDriver = bfs.require("/dev/mqtnl");

    const transportDefault = __APP.transportLayer.defaultProtocol;

    const mqtnlDriver = new __mqtnlDriver.mqtnlConnMgr(
      nos,
      transportDefault.ip,
      transportDefault.port,
      nos.hostName,
      transportDefault.lib,
    );
    mqtnlDriver.devClass = `Connection Manager`;
    mqtnlDriver.description = `${transportDefault.name} Protocol`;
    nos.mountDevice(mqtnlDriver);

    const transportESP32 = __APP.transportLayer.protocols.find(
      (item) => item.name === "mqtt",
    );
    const mqtnlDriver2 = new __mqtnlDriver.mqtnlConnMgr(
      nos,
      transportESP32.ip,
      transportESP32.port,
      "espiot",
      transportESP32.lib,
    );
    mqtnlDriver2.devClass = `Connection Manager (ESP32)`;
    mqtnlDriver2.description = `${transportESP32.name} Protocol`;
    nos.mountDevice(mqtnlDriver2);

    __APP.defaultComm = "comm";
    let envParams = {
      nos,
      mqtnlDriver,
      mqtnlDriver2
    };
    const cryptoconf = bfs.require("/opt/conf/cryptoconf.js")(
      envParams,
    );
  },
};
