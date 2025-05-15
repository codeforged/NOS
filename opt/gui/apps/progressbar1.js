function generateGUID() {
  // Simple GUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

module.exports = {
  application: () => {
    let appName = "progressbar1";
    let appTitle = "ESP32 Gauges";
    let guid = generateGUID();

    return {
      header: {
        appName,
        appTitle,
        guid, // bisa dipakai untuk keperluan lain
        iconSmall: "icon_16_chart.png",
        iconMedium: "icon_22_chart.png",
        iconLarge: "icon_32_chart.png",
        width: 520,
        height: 250,
        resizable: true,
      },
      content: `
      <style>
        .main-content[data-guid="${guid}"] {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 40px;
          height: 100%;
          text-align: center;
          flex-wrap: wrap;
        }
        .progressbar-semicircle {
          width: 200px;
          height: 100px;
        }
      </style>
      <div class="main-content" data-app="${appName}" data-guid="${guid}">
        <span class="progressbar-semicircle" data-gauge="temp"></span>
        <span class="progressbar-semicircle" data-gauge="humid"></span>
      </div>
      `,
      main: (sender, nos) => { },
      jsContent: (app) => {
        // Cari root aplikasi berdasarkan data-guid unik
        const root = document.querySelector(`.main-content[data-guid="${app.header.guid}"]`);
        const tempElem = root.querySelector('[data-gauge="temp"]');
        const humidElem = root.querySelector('[data-gauge="humid"]');

        let bar1 = new ProgressBar.SemiCircle(
          tempElem,
          {
            strokeWidth: 6,
            color: "#5FEA82",
            trailColor: "#eee",
            trailWidth: 1,
            easing: "easeInOut",
            duration: 400,
            svgStyle: null,
            text: {
              value: "",
              alignToBottom: true,
            },
            from: { color: "#ACEA82" },
            to: { color: "#ED6A5A" },
            step: (state, bar) => {
              bar.path.setAttribute("stroke", state.color);
              var value = Math.round(bar.value() * 100);
              bar.setText(`${value}<br/>Temp`);
              bar.text.style.color = state.color;
            },
          }
        );
        bar1.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
        bar1.text.style.fontSize = "1.5rem";

        let bar2 = new ProgressBar.SemiCircle(
          humidElem,
          {
            strokeWidth: 6,
            color: "#5FEA82",
            trailColor: "#eee",
            trailWidth: 1,
            easing: "easeInOut",
            duration: 400,
            svgStyle: null,
            text: {
              value: "",
              alignToBottom: true,
            },
            from: { color: "#AFEA82" },
            to: { color: "#ED6A5A" },
            step: (state, bar) => {
              bar.path.setAttribute("stroke", state.color);
              var value = Math.round(bar.value() * 100);
              bar.setText(`${value}<br/>Humid`);
              bar.text.style.color = state.color;
            },
          }
        );
        bar2.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
        bar2.text.style.fontSize = "2rem";

        //======= Live Data Logic =========
        let ws, RFCSensorGauges;
        let idTemp = "01";
        let idHumid = "02";

        function connect() {
          let srcaddress = "ws://localhost:8080";
          ws = new WebSocket(srcaddress);

          ws.onopen = function () {
            console.log("WebSocket connected!");
            RFCSensorGauges = new cygRFC(ws);
            RFCSensorGauges.callRFC = (name, params = [], callBack = {}) => {
              RFCSensorGauges.remoteCall({ name, params }, callBack);
            };

            function callRFCAsync(name, params = []) {
              return new Promise((resolve, reject) => {
                RFCSensorGauges.callRFC(name, params, (res) => {
                  resolve(res);
                });
              });
            }

            async function updateAllGauges() {
              const temp = await callRFCAsync("nto.getData", [idTemp]);
              if (temp?.value) bar1.animate(Math.min(1, temp.value / 100));

              const hum = await callRFCAsync("nto.getData", [idHumid]);
              if (hum?.value) bar2.animate(Math.min(1, hum.value / 100));
            }

            setInterval(updateAllGauges, 2000);
          };

          ws.onclose = function (e) {
            console.log("Socket closed. Retry in 1s.", e.reason);
            setTimeout(connect, 1000);
          };

          ws.onerror = function (err) {
            console.error("WebSocket error: ", err.message);
            ws.close();
          };
        }

        $(this).ready(() => {
          connect();
        });
      },
    };
  },
};