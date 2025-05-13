module.exports = {
  instanceName: "ntoservice",
  name: "NTO Service",
  version: 0.3,
  main: function (os) {
    var devices = [
      { name: "websocket", objectName: "ws" },
      //{ name: "mysql", objectName: "db" }
    ];
    this.failed = !this.shell.loadDevices(devices, this);
    if (this.failed) {
      this.shell.terminate();
      return;
    }
    const path = require("path");
    const ntoMgr = require(this.shell.basePath + "/lib/nto-mgr.js");

    this.ntoManager = new ntoMgr.ntoManager();
    this.allowAccepting = true;

    this.ntoManager.addNTO("01", "Temperature", "number");
    this.ntoManager.addNTO("02", "Humidity", "number");
    this.ntoManager.addNTO("03", "Lightintensity", "number");

    let args = this.shell.lastCmd.split(" ");
    if (args.length < 3) {
      this.crt.textOut(
        `\r\nSyntax: ${args[0]} <communication device> <port>\r\n`
      );
      this.shell.terminate();
      return;
    }
    this.mqtnl = this.shell.getDevice(args[1]);
    const conn1 = new this.mqtnl.mqtnlConnection(
      this.mqtnl.connMgr,
      parseInt(args[2]),
      (data, sender) => {
        if (this.mqtnl.ESPIOT_enabled === true) {
          // this.crt.textOut(`Incoming from "${sender}": ${data.payload}`);
          if (data.payload.length > 0) {
            let arrPayload = data.payload.split("=");
            let id = arrPayload[0];
            let value = arrPayload[1];
            this.pushData(id, value);
            conn1.reply(`OK!`, sender);
          } else {
            conn1.reply(`Invalid key!, data rejected.`, sender);
          }
        }
      }
    );

    this.mqtnl.ESPIOT_enabled = true;
    this.msg = `✅ NTO Service starting`;
    this.crt.textOut(this.msg);
    this.ws.remoteFunction.nto = {}; // Create a namespace

    this.pushData = async (id, value) => {
      const cleanValue = value.replace(/\0/g, "").trim();

      // Simpan ke memory NTO
      const nto = this.ntoManager.getNTOById(id);
      if (!nto) {
        this.crt.textOut("ID not found!");
        return;
      }

      nto.pushValue(cleanValue);
      /*
      // Simpan ke database
      const query = `
        INSERT INTO t_sensor_data (pushtimestamp, sensor_id, sensor_value, devic
e_id)
        VALUES (CURRENT_TIMESTAMP, ?, ?, ?)
      `;
      const params = [parseInt(id), parseInt(cleanValue), 1]; // 🧠 sementara de
vice_id = 1

      await this.db.query(
        "INSERT INTO t_sensor_data (pushtimestamp, sensor_id, sensor_value, devi
ce_id) VALUES (CURRENT_TIMESTAMP, ?, ?, ?)",
        [id, cleanValue, id]
      ).catch((err) => {
        this.crt.textOut(`❌ DB Error: ${err.message}`);
      });*/
    };


    // Define remote functions
    this.ws.remoteFunction.nto.getData = (params) => {

      let id = params[0];
      let nto = this.ntoManager.getNTOById(id);
      if (nto != null) {
        let lastValue = nto.getLastValue();

        const now = Date.now();
        const age = now - lastValue.timeStamp;
        return lastValue;
      } else
        return null;
    };
    this.ws.remoteFunction.nto.getList = () => {
      return this.ntoManager.getNTOList().map((n) => {
        return {
          id: n.id,
          name: n.name,
          type: n.dataType,
        };
      });
    };
    // this.shell.terminate();
  },
  // 🎖️ exitSignal pakai Promise
  exitSignal: function () {
    return new Promise((resolve, reject) => {
      // Simulasi cleanup dengan delay (misal: koordinasi network, log)
      setTimeout(() => {
        if (this.mqtnl) this.mqtnl.ESPIOT_enabled = false;

        resolve(); // Wajib panggil resolve biar core tahu selesai
      }, 500); // simulasi delay
    });
  },
};
