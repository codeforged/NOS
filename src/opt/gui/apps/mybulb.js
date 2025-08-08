module.exports = {
  application: (uuid) => {
    const appName = "mybulb";
    const appTitle = "Felica Smartbulb";
    const bulbCount = 11;
    return {
      header: {
        appName,
        appTitle,
        version: "1.1",
        uuid,
        active: true,
        icon: "/opt/gui/images/bulbon.png",
        iconSmall: "icon_16_app.png",
        iconMedium: "icon_22_app.png",
        iconLarge: "icon_32_app.png",
        resizable: true,
        width: 430,
        height: 550
      },

      content: `
        <style type="text/css">
          .main-container {
            position: relative;
            width: 400px;      /* ukuran original container */
            height: 500px;     /* ukuran original container */
            transform: scale(0.75);
            transform-origin: top left;
          }
          .bulb {
            position: absolute;
            width: 30px;
            cursor: pointer;
          }
        </style>
        <div class="main-container" data-app="${appName}" data-uuid="${uuid}">
          <img class="image1" />
          ${[...Array(bulbCount)].map((_, i) => `<img id="bulb_${i}" class="bulb" />`).join('\n')}
        </div>`,

      main: (sender, nos) => {
        sender.ws.remoteFunction.mybulb = {}; // create namespace mybulb

        sender.ws.remoteFunction.mybulb.getImage = (params) => {
          let index = params[0];
          let pic = {
            imagePath: "",
            imageData: null,
            imageMime: ""
          };

          if (index === 0) pic.imagePath = "/opt/gui/images/layoutrumah.png";
          else if (index === 1) pic.imagePath = "/opt/gui/images/bulboff.png";
          else if (index === 2) pic.imagePath = "/opt/gui/images/bulbon.png";

          if (pic.imagePath && sender.fa.existsSync(pic.imagePath)) {
            pic.imageData = sender.fa.readBinaryFileSync(pic.imagePath).toString('base64');
            const ext = pic.imagePath.split('.').pop().toLowerCase();
            const mimeTypes = {
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'png': 'image/png',
              'gif': 'image/gif',
              'webp': 'image/webp'
            };
            pic.imageMime = mimeTypes[ext] || 'image/jpeg';
            return btoa(JSON.stringify(pic));
          }
        };

        sender.ws.remoteFunction.mybulb.setBulb = (params) => {
          let index = params[0];
          let value = params[1];
          let imagePath = value === 1 ? "/opt/gui/images/bulbon.png" : "/opt/gui/images/bulboff.png";

          if (sender.fa.existsSync(imagePath)) {
            let imageData = sender.fa.readBinaryFileSync(imagePath).toString('base64');
            return btoa(JSON.stringify({
              imageData,
              imageMime: "image/png",
              targetId: `bulb_${index}`
            }));
          }
        };
      },

      jsContent: (app) => {
        const container = document.querySelector(`.main-container[data-uuid="${app.header.uuid}"]`);

        // Inisialisasi array bulbs
        const topic = "jayalarasiot/portstates";
        const wsUrl = "ws://192.168.0.105:45452";
        const bulbCount = 11;

        const bulbs = Array.from({ length: bulbCount }, (_, i) => ({
          id: i,
          state: 0,
          port: 0
        }));

        // Load denah pakai ngsLib style
        app.loadRemoteImage("/opt/gui/images/layoutrumah.png", (pic) =>
          app.setRemoteImage(pic, container.querySelector('.image1')));

        // Load gambar lampu padam & nyala pakai ngsLib style
        let bulbOffImg = "";
        let bulbOnImg = "";
        app.loadRemoteImage("/opt/gui/images/bulboff.png", (pic) => {
          bulbOffImg = `data:${pic.imageMime};base64,${pic.imageData}`;
          bulbs.forEach((bulb) => {
            const el = document.getElementById(`bulb_${bulb.id}`);
            el.src = bulbOffImg;
          });
        });
        app.loadRemoteImage("/opt/gui/images/bulbon.png", (pic) => {
          bulbOnImg = `data:${pic.imageMime};base64,${pic.imageData}`;
        });

        function cygRFCLegacy(ws) {
          var self = this;
          this.ws = ws;
          self.remoteCallId = 0;
          self.remoteCallBack = 0;
          self.MQTTonNewMsg = function (topic, data) {
            console.log("New message, topic: " + topic + " message: " + data);
          }
          self._onmessage = function (data) {
            var raw = data.data.trim();
            if (typeof self.onmessage != "undefined") self.onmessage(raw);
            try {
              var jsdata = JSON.parse(raw);
              if (jsdata.protocol == "MQTT") {
                self.MQTTonNewMsg(jsdata.topic, jsdata.ret)
              } else if (jsdata.protocol == "RFC") {
                var o = JSON.parse(raw);
                if (o.id == self.remoteCallId) self.remoteCallBack(o.ret);
              }
            } catch (e) {

            }
          }


          this.ws.onmessage = self._onmessage;

          self.remoteCall = function (param, callBack) {
            if (typeof param.callType == "undefined") param.callType = "function";
            param.id = Math.round(Math.random() * 100000);
            self.remoteCallId = param.id;
            self.remoteCallBack = callBack;
            self.ws.send(JSON.stringify(param));
            return 0;
          }
        }

        // Fungsi set posisi dan port
        function setPos(id, x, y, port) {
          const el = document.getElementById(`bulb_${id}`);
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          el.setAttribute("bid", id);
          bulbs[id].port = port;
        }

        // Posisi sesuai denah
        setPos(0, 320, 355, 8);
        setPos(1, 175, 355, 3);
        setPos(2, 175, 175, 4);
        setPos(3, 185, 530, 2);
        setPos(4, 380, 180, 7);
        setPos(5, 432, 600, 10);
        setPos(6, 265, 135, 11);
        setPos(7, 355, 530, 15);
        setPos(8, 380, 50, 12);
        setPos(9, 70, 280, 9);
        setPos(10, 420, 355, 5);

        // Fungsi praktis untuk ubah status lampu
        window.setBulb = (index, value) => {
          bulbs[index].state = value;
          const el = document.getElementById(`bulb_${index}`);
          el.src = value === 1 ? bulbOnImg : bulbOffImg;
          // Tetap kirim RFC untuk update status di backend
          // RFC.callRFC("mybulb.setBulb", [index, value], (ret) => {
          //   // Tidak perlu update gambar lagi di sini
          // });
        };

        // Pasang event listener click untuk toggle tiap lampu
        bulbs.forEach((bulb) => {
          const el = document.getElementById(`bulb_${bulb.id}`);
          el.addEventListener('click', () => {
            const newState = bulb.state === 1 ? 0 : 1;
            window.setBulb(bulb.id, newState);
            console.log(bulb.port + "=" + newState);
            callRFCLegacy("MQTTsendMsg", ["jayalarasiot/portstates", "set " + bulb.port + ":" + newState]);
          });
        });
        function callRFCLegacy(name, params = [], callBack = {}) {
          if (typeof FC != "undefined")
            FC.remoteCall({ "name": name, "params": params }, callBack);
        }

        // WebSocket + cygRFC untuk sync state
        let wsxReconnectInterval = null;
        function startWSXReconnect() {
          if (wsxReconnectInterval) return;
          wsxReconnectInterval = setInterval(() => {
            if (wsx_connected === 0) {
              console.warn("WSX reconnecting...");
              wsx = new WebSocket(wsUrl);
              FC = new cygRFCLegacy(wsx);
              FC.MQTTonNewMsg = (t, data) => {
                if (t === topic && data.startsWith("value")) {
                  const bits = data.slice(6).split("");
                  console.log(JSON.stringify(bits));
                  bits.forEach((bit, portIdx) => {
                    const bulb = bulbs.find(x => x.port === portIdx);
                    if (bulb) setBulb(bulb.id, Number(bit));
                  });
                }
              };
              wsx.onopen = () => {
                callRFCLegacy("MQTTsendMsg", [topic, "get"]);
                wsx_connected = 1;
                console.log("WS Connected");
              };
              wsx.onerror = console.error;
              wsx.onclose = () => {
                wsx_connected = 0;
                console.warn("WSX closed, will try reconnect in 5s");
              };
            }
          }, 5000);
        }

        if (typeof wsx == "undefined") {
          wsx_connected = 0;
          wsx = new WebSocket(wsUrl);
          FC = new cygRFCLegacy(wsx);
          FC.MQTTonNewMsg = (t, data) => {
            if (t === topic && data.startsWith("value")) {
              const bits = data.slice(6).split("");
              console.log(JSON.stringify(bits));
              bits.forEach((bit, portIdx) => {
                const bulb = bulbs.find(x => x.port === portIdx);
                if (bulb) setBulb(bulb.id, Number(bit));
              });
            }
          };
          wsx.onopen = () => {
            callRFCLegacy("MQTTsendMsg", [topic, "get"]);
            wsx_connected = 1;
            console.log("WS Connected");
          };
          wsx.onerror = console.error;
          wsx.onclose = () => {
            wsx_connected = 0;
            console.warn("WSX closed, will try reconnect in 5s");
            startWSXReconnect();
          };
        }
        if (typeof wsx != "undefined") {
          if (wsx_connected == 1)
            callRFCLegacy("MQTTsendMsg", [topic, "get"]);
        }


      }
    };
  }
};
