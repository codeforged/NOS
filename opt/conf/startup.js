module.exports = {
  startUp: function (nos) {
    require(nos.basePath + "/opt/conf/netconf.js");

    // const __mySQLDriver = require(nos.basePath + "/dev/mysql");
    // const mySQLDriver = new __mySQLDriver.mysqlDriver(nos, {
    //   user: 'user',
    //   password: 'password',
    //   host: 'localhost',
    //   database: 'testdb',
    //   waitForConnections: true,
    //   connectionLimit: 10,
    //   queueLimit: 0
    // });
    // mySQLDriver.devClass = "MySQL Server Driver for NOS";
    // nos.mountDevice(mySQLDriver);

    const __webSockerDriver = require(nos.basePath + "/dev/websocket");
    const webSocketDriver = new __webSockerDriver.webSocket(nos, 8080);
    webSocketDriver.devClass = "Web Socket for ESP32 Sensor";
    nos.mountDevice(webSocketDriver);

    const webSocketDriver2 = new __webSockerDriver.webSocket(nos, 8192);
    webSocketDriver2.devClass = "Web Socket for NOS Desktop";
    nos.mountDevice(webSocketDriver2);

    const __mqtnlDriver = require(nos.basePath + "/dev/mqtnl");

    const transportDefault = __APP.transportLayer.defaultProtocol;

    const mqtnlDriver = new __mqtnlDriver.mqtnlConnMgr(
      nos,
      transportDefault.ip,
      transportDefault.port,
      nos.hostName,
      transportDefault.lib
    );
    mqtnlDriver.devClass = `Connection Manager`;
    mqtnlDriver.description = `${transportDefault.name} Protocol`;
    nos.mountDevice(mqtnlDriver);

    const transportESP32 = __APP.transportLayer.protocols.find(
      (item) => item.name === "mqtt"
    );
    const mqtnlDriver2 = new __mqtnlDriver.mqtnlConnMgr(
      nos,
      transportESP32.ip,
      transportESP32.port,
      "espiot",
      transportESP32.lib
    );
    mqtnlDriver2.devClass = `Connection Manager (ESP32)`;
    mqtnlDriver2.description = `${transportESP32.name} Protocol`;
    nos.mountDevice(mqtnlDriver2);

    let envParams = {
      nos,
      mqtnlDriver,
      mqtnlDriver2,
    };
    const cryptoconf = require(nos.basePath + "/opt/conf/cryptoconf.js")(
      envParams
    );
  },
};
