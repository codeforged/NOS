class WebSocketDriver {
  constructor(nos, port) {
    const WebSocket = require("ws");
    this.name = "websocket";
    this.nos = nos;
    this.devClass = "Web Socket";
    this.version = 0.13;
    this.port = port;

    this.WebSocket = WebSocket;
    this.wss = new WebSocket.Server({ port: this.port });
    this.clientList = [];
    this.remoteFunction = {};
    this.listenerRegistry = {};

    this.wss.on("connection", (ws, req) => {
      const ip = req.socket.remoteAddress;
      this.clientList.push({ ip, socket: ws });

      ws.on("message", (raw) => {
        this._read(raw, ws);
      });
    });
  }

  setRFCObject(o) {
    this.remoteFunction = o;
  }

  _read(raw, ws) {
    try {
      const o = JSON.parse(raw);

      // RFC Classic (eval style)
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
      // MSG Listener Registration
      else if (
        o.protocol === "MSG" &&
        o.type === "registerListener" &&
        o.msgChannel
      ) {
        this.listenerRegistry[o.msgChannel] = ws;
        this.nos
          .getDevice("syslogger")
          .append(`✅ MID listener registered: ${o.msgChannel}`);
      }
    } catch (e) {
      this.nos.getDevice("syslogger").append(`❌ WebSocket error: ${e.message}`);
    }
  }

  write(data) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === this.WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  sendMessage(msgChannel, payload) {
    const target = this.listenerRegistry[msgChannel];
    if (target && target.readyState === this.WebSocket.OPEN) {
      const msg = {
        protocol: "MSG",
        msgChannel: msgChannel,
        data: payload,
      };
      target.send(JSON.stringify(msg));
    }
  }

  getList() {
    return this.clientList;
  }

  getClient(ip) {
    return this.clientList.find((c) => c.ip === ip) || null;
  }
}

module.exports = { webSocket: WebSocketDriver };

// function webSocket(nos, port) {
//   const WebSocket = require("ws");
//   this.name = "websocket";
//   this.nos = nos;
//   this.devClass = "Web Socket";
//   this.version = 0.12;
//   this.port = port;

//   this.WebSocket = require("ws");
//   this.wss = new WebSocket.Server({ port: this.port });
//   this.clientList = [];
//   this.remoteFunction = {}; // tetap

//   this.listenerRegistry = {}; // MID ➜ socket

//   this.read = (data) => { };

//   this.setRFCObject = (o) => {
//     this.remoteFunction = o;
//   };

//   this._read = (raw, ws) => {
//     try {
//       const o = JSON.parse(raw);

//       // === RFC Classic (eval style) ===
//       if (o.callType === "function" && o.name && Array.isArray(o.params)) {
//         const fn = `this.remoteFunction.${o.name}(${JSON.stringify(o.params)})`;
//         const r = eval(fn);

//         if (r !== 0 && typeof r !== "undefined") {
//           const reply = {
//             id: o.id,
//             protocol: "RFC",
//             ret: r,
//           };
//           this.write(JSON.stringify(reply));
//         }
//       }

//       // === MSG Listener Registration ===
//       else if (
//         o.protocol === "MSG" &&
//         o.type === "registerListener" &&
//         o.msgChannel
//       ) {
//         this.listenerRegistry[o.msgChannel] = ws;
//         nos
//           .getDevice("syslogger")
//           .append(`✅ MID listener registered: ${o.msgChannel}`);
//       }
//     } catch (e) {
//       nos.getDevice("syslogger").append(`❌ WebSocket error: ${e.message}`);
//     }
//   };

//   this.write = (data) => {
//     this.wss.clients.forEach((client) => {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(data);
//       }
//     });
//   };

//   this.sendMessage = (msgChannel, payload) => {
//     const target = this.listenerRegistry[msgChannel];
//     if (target && target.readyState === WebSocket.OPEN) {
//       const msg = {
//         protocol: "MSG",
//         msgChannel: msgChannel,
//         data: payload,
//       };
//       target.send(JSON.stringify(msg));
//     }
//   };

//   this.wss.on("connection", (ws, req) => {
//     const ip = req.socket.remoteAddress;
//     this.clientList.push({ ip, socket: ws });

//     ws.on("message", (raw) => {
//       this._read(raw, ws); // pasangkan sender-nya
//     });
//   });
// }

// module.exports = { webSocket };
