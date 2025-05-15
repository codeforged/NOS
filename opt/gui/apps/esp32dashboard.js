function generateGUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

module.exports = {
  application: () => {
    let appName = "esp32dashboard";
    let appTitle = "ESP32 Sensor";
    let guid = generateGUID();

    return {
      header: {
        appName,
        appTitle,
        guid,
        iconSmall: "icon_16_chart.png",
        iconMedium: "icon_22_chart.png",
        iconLarge: "icon_32_chart.png",
        resizable: true,
      },
      content: `
        <style>
          .chart-container[data-guid="${guid}"] {
            display: grid;
            grid-template-columns: repeat(2, 1fr); /* 2 columns, each taking equal space */
            grid-template-rows: repeat(2, 1fr); /* 2 rows, each taking equal space */
            gap: 20px; /* Optional: Add some spacing between charts */
          .chart-box {
            /* You can add padding, borders, etc. here if needed */
            width: 100%; /* Ensure the charts take full width of the box */
            height: 350px; /* Set a height for the charts. Adjust as needed. */
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .chart-box canvas {
            width: 80%;
            height: 80%;
          }
        </style>
        <div class="chart-container" data-app="${appName}" data-guid="${guid}">
          <div class="chart-box">
              <canvas data-chart="chart1" data-chart-title="Temperature"></canvas>
          </div>
          <div class="chart-box">
              <canvas data-chart="chart2" data-chart-title="Humidity"></canvas>
          </div>
          <div class="chart-box">
              <canvas data-chart="chart3"></canvas>
          </div>
          <div class="chart-box">
              <canvas data-chart="chart4"></canvas>
          </div>
        </div>
      `,
      main: () => { },
      jsContent: (app) => {
        const MAX_POINTS = 15;
        window.charts = {};
        const root = document.querySelector(
          `.chart-container[data-guid="${app.header.guid}"]`
        );

        root.querySelectorAll("[data-chart]").forEach((canvas) => {
          const chartId = canvas.getAttribute("data-chart");
          const chartTitle = canvas.getAttribute("data-chart-title");
          const ctx = canvas.getContext("2d");

          //console.log(chartId);

          charts[chartId] = new Chart(ctx, {
            type: "line",
            data: {
              labels: Array(MAX_POINTS).fill(""),
              datasets: [
                {
                  label: `Sensor ${chartTitle}`,
                  data: Array(MAX_POINTS).fill(null),
                  fill: false,
                  borderColor: "#4bc0c0",
                  tension: 0.4,
                },
              ],
            },
            options: {
              responsive: true,
              animation: false,
              plugins: {
                title: { display: false },
              },
              scales: {
                x: { title: { display: true, text: "Time" } },
                y: { min: 0, max: 100, title: { display: true, text: "Value" } },
              },
            },
          });
        });

        let ws, RFCSensorGauges;
        let idTemp = "01";
        let idHumid = "02";

        function connect() {
          let srcaddress = "ws://192.168.0.110:8080";
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
              // Geser data dan label ke kiri
              let ts = new Date(temp.timeStamp).toLocaleTimeString();


              charts["chart1"].data.datasets[0].data.push(temp.value);
              charts["chart1"].data.labels.push(ts);

              if (charts["chart1"].data.labels.length > 20) {
                charts["chart1"].data.labels.shift();
                charts["chart1"].data.datasets[0].data.shift();
              }
              charts["chart1"].update();

              // console.log("temp: " + temp.value)

              const hum = await callRFCAsync("nto.getData", [idHumid]);
              ts = new Date(hum.timeStamp).toLocaleTimeString();
              charts["chart2"].data.datasets[0].data.push(hum.value);
              charts["chart2"].data.labels.push(ts);

              if (charts["chart2"].data.labels.length > 20) {
                charts["chart2"].data.labels.shift();
                charts["chart2"].data.datasets[0].data.shift();
              }
              charts["chart2"].update();
              //console.log("hum: " + hum.value)
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

        // Simpan chart global biar bisa dipanggil dari luar
        window[app.header.guid] = { charts };
      },
    };
  },
};

// module.exports = {
//   application: () => {
//     let appName = "esp32dashboard";
//     let appTitle = "ESP32 Sensor";
//     let appContent = {
//       header: {
//         appName: appName,
//         appTitle: appTitle,
//         iconSmall: "icon_16_chart.png",
//         iconMedium: "icon_22_chart.png",
//         iconLarge: "icon_32_chart.png",
//         width: 700,
//         height: 450,
//       },
//       content: `<div id="main-content-${appName}">
//       <div class="flex flex-col gap-2 h-full" style="width: 100%;height:100%;">
//             <div class="flex gap-2 items-center" style="padding-top: 10px; padding-left: 20px; padding-right: 20px">            
//       <select class="form-select" id="sensorIdSelect"></select>
//       </div>
//       </div>
//       <canvas id="myChart"></canvas></div>`,
//       main: () => { },
//       jsContent: (app) => {
//         const ctx = document.getElementById("myChart").getContext("2d");

//         const MAX_POINTS = 15;

//         window.chart = new Chart(ctx, {
//           type: "line",
//           data: {
//             labels: Array(MAX_POINTS).fill(""),
//             datasets: [
//               {
//                 label: "Live Data",
//                 data: Array(MAX_POINTS).fill(null),
//                 fill: false,
//                 borderColor: "#4bc0c0",
//                 tension: 0.4,
//               },
//             ],
//           },
//           options: {
//             responsive: true,
//             animation: false,
//             plugins: {
//               title: {
//                 display: false,
//                 text: "ESP32 Sensor Monitor",
//               },
//             },
//             scales: {
//               x: { title: { display: true, text: "Time" } },
//               y: { min: 0, max: 100, title: { display: true, text: "Value" } },
//             },
//           },
//         });

//         function connect() {
//           let srcaddress = "ws://localhost:8080";
//           ws = new WebSocket(srcaddress);
//           ws.onopen = function () {
//             window.RFCSensor = new cygRFC(ws);
//             RFCSensor.callRFC = (name, params = [], callBack = {}) => {
//               RFCSensor.remoteCall(
//                 {
//                   name: name,
//                   params: params,
//                 },
//                 callBack
//               );
//             };

//             //createChart();
//             populateSensorList();

//             setInterval(() => {
//               if (sensorId) {
//                 // console.log("xxx " + sensorId);
//                 updateChart(sensorId);
//               }
//             }, 2000);
//           };

//           ws.onclose = function (e) {
//             console.log("Socket closed. Retry in 1s.", e.reason);
//             setTimeout(connect, 1000);
//           };

//           ws.onerror = function (err) {
//             console.error("WebSocket error: ", err.message);
//             ws.close();
//           };
//         }
//         function populateSensorList() {
//           RFCSensor.callRFC("nto.getList", [], (list) => {
//             if (!list || !Array.isArray(list)) return;
//             const select = $("#sensorIdSelect");
//             select.empty();
//             list.forEach((item) => {
//               select.append(
//                 `<option value="${item.id}">${item.id} - ${item.name}</option>`
//               );
//             });
//             sensorId = select.val(); // ambil sensor pertama sebagai default
//           });
//         }
//         function updateChart(id) {
//           RFCSensor.callRFC("nto.getData", [id], (res) => {
//             try {
//               // console.log("Incoming getData: "+JSON.stringify(res));
//               let data = res;
//               if (data.value != null) {
//                 const ts = new Date(data.timeStamp).toLocaleTimeString();
//                 const val = parseFloat(data.value);

//                 // Geser data dan label ke kiri
//                 chart.data.datasets[0].data.push(val);
//                 chart.data.labels.push(ts);

//                 if (chart.data.labels.length > 20) {
//                   chart.data.labels.shift();
//                   chart.data.datasets[0].data.shift();
//                 }
//                 chart.update();
//               }
//             } catch (e) {
//               console.log(e);
//             }
//           });
//         }

//         $(this).ready(() => {
//           sensorId = 0;
//           connect();

//           $("#sensorIdSelect").on("change", function () {
//             sensorId = $(this).val();
//             console.log(sensorId);
//             chart.data.labels = Array(MAX_POINTS).fill("");
//             chart.data.datasets[0].data = Array(MAX_POINTS).fill(null);
//             chart.update();
//           });
//         });
//       },
//     };
//     return appContent;
//   },
// };
