function cygRFC(ws) {
  this.version = "3.1";
  this.ws = ws;
  this.pendingCalls = {}; // id ➜ callback
  this.listeners = {}; // mid ➜ callback

  this.generateUUIDv4 = () => {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16)
    );
  };

  this.onmessage = undefined;
  this.ws.onmessage = (data) => {
    const raw = data.data.trim();
    // console.log("aaaaa" + raw);
    if (this.onmessage) this.onmessage(raw);
    try {
      const jsdata = JSON.parse(raw);
      if (jsdata.protocol === "RFC") {
        const entry = this.pendingCalls[jsdata.id];
        if (entry) {
          clearTimeout(entry.timer);
          entry.cb(jsdata.ret);
          delete this.pendingCalls[jsdata.id];
        }
      } else if (jsdata.protocol === "MSG") {
        const cb = this.listeners[jsdata.msgChannel];
        if (cb) cb(jsdata.data);
      }
    } catch (e) { }
  };

  this.remoteCall = (param, callBack, timeoutMs = 10000) => {
    if (!param.callType) param.callType = "function";
    const id = this.generateUUIDv4();
    param.id = id;
    param.protocol = "RFC"; // Wajib ada!
    this.pendingCalls[id] = {
      cb: callBack,
      timer: setTimeout(() => {
        if (this.pendingCalls[id]) {
          delete this.pendingCalls[id];
          callBack({ error: "Timeout", id });
        }
      }, timeoutMs),
    };
    this.ws.send(JSON.stringify(param));
    return id;
  };

  this.callRFC = (name, params = [], callBack = {}) => {
    this.remoteCall({ name, params }, callBack);
  };

  this.registerListener = (msgChannel, callback) => {
    this.listeners[msgChannel] = callback;
    this.ws.send(
      JSON.stringify({
        protocol: "MSG",
        type: "registerListener",
        msgChannel: msgChannel,
        label: msgChannel,
      })
    );
    return msgChannel;
  };

  this.unregisterListener = (mid) => {
    delete this.listeners[mid];
  };
}

// function cygRFC(ws) {
//   this.version = "2.1";
//   this.ws = ws;
//   this.pendingCalls = {}; // id -> { cb, timer }

//   this.MQTTonNewMsg = (topic, data) => {
//     // console.log("New message, topic: " + topic + " message: " + data);
//   };

//   this._onmessage = (data) => {
//     const raw = data.data.trim();
//     if (typeof this.onmessage != "undefined") this.onmessage(raw);
//     try {
//       const jsdata = JSON.parse(raw);
//       if (jsdata.protocol == "MQTT") {
//         this.MQTTonNewMsg(jsdata.topic, jsdata.ret);
//       } else if (jsdata.protocol == "RFC") {
//         const entry = this.pendingCalls[jsdata.id];
//         if (entry) {
//           clearTimeout(entry.timer); // cancel timeout
//           entry.cb(jsdata.ret);
//           delete this.pendingCalls[jsdata.id];
//         }
//       }
//     } catch (e) {
//       // bisa tambahkan logging jika mau
//     }
//   };

//   this.ws.onmessage = this._onmessage;

//   this.generateUUIDv4 = () => {
//     return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
//       (
//         c ^
//         (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
//       ).toString(16)
//     );
//   };

//   // remoteCall(param, callback, timeoutMs)
//   this.remoteCall = (param, callBack, timeoutMs = 10000) => {
//     if (typeof param.callType == "undefined") param.callType = "function";
//     const id = this.generateUUIDv4();
//     param.id = id;

//     // Timer: jika timeout, hapus callback
//     const timer = setTimeout(() => {
//       if (this.pendingCalls[id]) {
//         delete this.pendingCalls[id];
//         console.warn(`⚠️ cygRFC: Timeout waiting response for id=${id}`);
//         // Optional: bisa panggil callBack(null) atau callback error
//         callBack({ error: "Timeout", id });
//       }
//     }, timeoutMs);

//     this.pendingCalls[id] = {
//       cb: callBack,
//       timer,
//     };

//     this.ws.send(JSON.stringify(param));
//     return id;
//   };
// }

// function cygRFC(ws) {
//   this.version = "1.5";
//   this.ws = ws;
//   this.remoteCallId = 0;
//   this.remoteCallBack = 0;
//   this.MQTTonNewMsg = (topic, data) => {
//     // console.log("New message, topic: " + topic + " message: " + data);
//   };
//   this._onmessage = (data) => {
//     var raw = data.data.trim();
//     if (typeof this.onmessage != "undefined") this.onmessage(raw);
//     try {
//       var jsdata = JSON.parse(raw);
//       if (jsdata.protocol == "MQTT") {
//         this.MQTTonNewMsg(jsdata.topic, jsdata.ret);
//       } else if (jsdata.protocol == "RFC") {
//         var o = JSON.parse(raw);
//         if (o.id == this.remoteCallId) this.remoteCallBack(o.ret);
//       }
//     } catch (e) {}
//   };

//   this.ws.onmessage = this._onmessage;
//   this.generateUUIDv4 = () => {
//     return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
//       (
//         c ^
//         (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
//       ).toString(16)
//     );
//   };

//   this.remoteCall = (param, callBack) => {
//     if (typeof param.callType == "undefined") param.callType = "function";
//     param.id = this.generateUUIDv4();
//     this.remoteCallId = param.id;
//     this.remoteCallBack = callBack;
//     this.ws.send(JSON.stringify(param));
//     return 0;
//   };
// }

/****** call example ******/
// FC.remoteCall({"name": "abc", "params": [123,"aa"]},
//   function (data) {
//     console.log("reply: "+data);
//   }
// );
