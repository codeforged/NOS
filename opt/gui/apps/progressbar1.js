module.exports = {
  application: () => {
    let appName = "progressbar1";
    let appTitle = "ESP32 Gauges";

    return {
      header: {
        appName,
        appTitle,
        iconSmall: "icon_16_chart.png",
        iconMedium: "icon_22_chart.png",
        iconLarge: "icon_32_chart.png",
        width: 520,
        height: 250,
        resizable: true,
      },
      content: `
      <style>
  #main-content-${appName} {
    display: flex;
    justify-content: center; /* center horizontal */
    align-items: center;     /* center vertical */
    gap: 40px;               /* jarak antar gauge */
    height: 100%;           /* atur tinggi area */
    text-align: center;
    flex-wrap: wrap;         /* biar responsive kalau sempit */

  }

  .progressbar-semicircle {
    width: 200px;
    height: 100px;
  }
</style>

<div id="main-content-${appName}">
  <span id="container1-${appName}" class="progressbar-semicircle"></span>
  <span id="container2-${appName}" class="progressbar-semicircle"></span>
</div> 
      `,
      main: (sender, nos) => { },
      jsContent: (app) => {
        let bar1 = new ProgressBar.SemiCircle(
          `#container1-${app.header.appName}`,
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
          `#container2-${app.header.appName}`,
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

        function updateGauge(id, bar, done) {
          RFCSensorGauges.callRFC("nto.getData", [id], (res) => {
            try {
              if (res && res.value) {
                const v = parseFloat(res.value);
                const safeVal = Math.max(0, Math.min(100, v));
                bar.animate(safeVal / 100); // progressbar expects 0.0–1.0
              }
              if (done) done();
            } catch (e) {
              console.log(e);
            }
          });
        }

        $(this).ready(() => {
          connect();
        });
      },
    };
  },
};

// module.exports = {
//   application: () => {
//     let appName = "progressbar1";
//     let appTitle = "Progress Bar Demo";

//     return {
//       header: {
//         appName,
//         appTitle,
//         iconSmall: "icon_16_drive.png",
//         iconMedium: "icon_22_drive.png",
//         iconLarge: "icon_32_drive.png",
//         width: 600,
//         height: 300
//       },
//       content: `
//       <style>
//         #main-content-${appName} {
//           text-align: center;
//         }
//         .progressbar-semicircle {
//           margin: 20px;
//           width: 200px;
//           height: 100px;
//           float: left;
//         }
//       </style>
//       <div id="main-content-${appName}">
//         <span id="container1-${appName}" class="progressbar-semicircle"></span>
//         <span id="container2-${appName}" class="progressbar-semicircle"></span>
//       </div>
//       `,
//       main: (sender, nos) => {
//         // Optional backend logic (NOS side)
//         sender.crt.textOut("[NOS App] " + appTitle + " started.\n");
//       },
//       jsContent: (app) => {
//         var bar1 = new ProgressBar.SemiCircle(`#container1-${app.header.appName}`, {
//           strokeWidth: 6,
//           color: '#5FEA82',
//           trailColor: '#eee',
//           trailWidth: 1,
//           easing: 'easeInOut',
//           duration: 400,
//           svgStyle: null,
//           text: {
//             value: 'Temperature',
//             alignToBottom: true
//           },
//           from: { color: '#AC7A82' },
//           to: { color: '#ED6A5A' },
//           // Set default step function for all animate calls
//           step: (state, bar) => {
//             bar.path.setAttribute('stroke', state.color);
//             var value = Math.round(bar.value() * 100);
//             if (value === 0) {
//               bar.setText('');
//             } else {
//               bar.setText(value + "<br/>Temp");
//             }

//             bar.text.style.color = state.color;
//           }
//         });
//         bar1.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
//         bar1.text.style.fontSize = '1.5rem';

//         bar1.animate(.3);  // Number from 0.0 to 1.0

//         var bar2 = new ProgressBar.SemiCircle(`#container2-${app.header.appName}`, {
//           strokeWidth: 6,
//           color: '#5FEA82',
//           trailColor: '#eee',
//           trailWidth: 1,
//           easing: 'easeInOut',
//           duration: 400,
//           svgStyle: null,
//           text: {
//             value: '',
//             alignToBottom: true
//           },
//           from: { color: '#AF7A82' },
//           to: { color: '#ED6A5A' },
//           // Set default step function for all animate calls
//           step: (state, bar) => {
//             bar.path.setAttribute('stroke', state.color);
//             var value = Math.round(bar.value() * 100);
//             if (value === 0) {
//               bar.setText('');
//             } else {
//               bar.setText(value + "<br/>Humid");
//             }

//             bar.text.style.color = state.color;
//           }
//         });
//         bar2.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
//         bar2.text.style.fontSize = '2rem';

//         bar2.animate(.8);  // Number from 0.0 to 1.0
//       }
//     };
//   }
// };
