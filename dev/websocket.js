function webSocket(nos, port) {
  const WebSocket = require("ws");
  this.name = "websocket";
  this.nos = nos;
  this.devClass = "Web Socket";
  this.version = 0.12;
  this.port = port;

  this.WebSocket = require("ws");
  this.wss = new WebSocket.Server({ port: this.port });
  this.clientList = [];
  this.remoteFunction = {}; // tetap

  this.listenerRegistry = {}; // MID ➜ socket

  this.read = (data) => {};

  this.setRFCObject = (o) => {
    this.remoteFunction = o;
  };

  this._read = (raw, ws) => {
    try {
      const o = JSON.parse(raw);

      // === RFC Classic (eval style) ===
      if (o.callType === "function" && o.name && Array.isArray(o.params)) {
        const fn = `this.remoteFunction.${o.name}(${JSON.stringify(o.params)})`;
        const r = eval(fn);

        if (r !== 0 && typeof r !== "undefined") {
          const reply = {
            id: o.id,
            protocol: "RFC",
            ret: r,
          };
          this.write(JSON.stringify(reply));
        }
      }

      // === MSG Listener Registration ===
      else if (
        o.protocol === "MSG" &&
        o.type === "registerListener" &&
        o.msgChannel
      ) {
        this.listenerRegistry[o.msgChannel] = ws;
        nos
          .getDevice("syslogger")
          .append(`✅ MID listener registered: ${o.msgChannel}`);
      }
    } catch (e) {
      nos.getDevice("syslogger").append(`❌ WebSocket error: ${e.message}`);
    }
  };

  this.write = (data) => {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  };

  this.sendMessage = (msgChannel, payload) => {
    const target = this.listenerRegistry[msgChannel];
    if (target && target.readyState === WebSocket.OPEN) {
      const msg = {
        protocol: "MSG",
        msgChannel: msgChannel,
        data: payload,
      };
      target.send(JSON.stringify(msg));
    }
  };

  this.wss.on("connection", (ws, req) => {
    const ip = req.socket.remoteAddress;
    this.clientList.push({ ip, socket: ws });

    ws.on("message", (raw) => {
      this._read(raw, ws); // pasangkan sender-nya
    });
  });
}

module.exports = { webSocket };

// function webSocket(nos, port) {
//   const WebSocket = require("ws");
//   this.name = "websocket";
//   this.nos = nos;
//   this.devClass = "Web Socket";
//   this.version = 0.09;
//   this.port = port;

//   this.WebSocket = require("ws");
//   this.wss = new WebSocket.Server({ port: this.port });
//   this.clientList = [];

//   this.getMethods = (obj) => {
//     let properties = new Set();
//     let currentObj = obj;
//     do {
//       Object.getOwnPropertyNames(currentObj).map((item) =>
//         properties.add(item)
//       );
//     } while ((currentObj = Object.getPrototypeOf(currentObj)));
//     return [...properties.keys()].filter(
//       (item) => typeof obj[item] === "function"
//     );
//   };

//   this.read = (data) => {
//     // console.log(">> "+data)
//   };
//   this.remoteFunction = {};
//   this.setRFCObject = (o) => {
//     this.remoteFunction = o;
//   };
//   this._read = (data) => {
//     this.read(data);
//     try {
//       var o = JSON.parse(data);
//       if (o.callType == "function") {
//         // console.log("eval = "+"var r = this.remoteFunction."+o.name+"("+JSON.stringify(o.params)+")");
//         eval(
//           "var r = this.remoteFunction." +
//             o.name +
//             "(" +
//             JSON.stringify(o.params) +
//             ")"
//         );
//         // console.log("r: "+JSON.stringify(r));
//         if (r != 0 && typeof r != "undefined") {
//           // console.log("kadieu")
//           var callBackReturn = {
//             id: o.id,
//             protocol: "RFC",
//             ret: r,
//           };
//           this.write(JSON.stringify(callBackReturn));
//         }
//       }
//     } catch (e) {
//       // send to system log if something fault
//       nos
//         .getDevice("syslogger")
//         .append(`Device ${this.name}: ${e.message} ${e.stack}`);
//       var callBackReturn = {
//         id: o.id,
//         protocol: "RFC",
//         ret: e.message,
//       };
//       this.write(JSON.stringify(callBackReturn));
//       // console.error(e);
//     }
//   };

//   this.wss.on("connection", (ws, req) => {
//     let ip = req.socket.remoteAddress;
//     //ip = req.headers['x-forwarded-for'].split(',')[0].trim();
//     ws.on("message", this._read);
//     this.clientList.push({ ip: ip, socket: ws });
//   });

//   this.write = (data) => {
//     this.wss.clients.forEach(function each(client) {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(data);
//       }
//     });
//   };

//   this.writeToAddress = (ip, data) => {
//     var client = this.getClient(ip);
//     if (client != 0) client.socket.send(data);
//   };

//   this.getList = () => {
//     return this.clientList;
//   };

//   this.getClient = (ip) => {
//     var result = 0;
//     for (var i = 0; i < this.clientList.length; i++) {
//       if (ip == this.clientList[i].ip) {
//         result = this.clientList[i];
//         break;
//       }
//     }
//     return result;
//   };
// }

// module.exports = { webSocket: webSocket };
