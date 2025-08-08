module.exports = {
  application: (uuid) => {
    let appName = "allsensor";
    let appTitle = "All Sensor";

    return {
      header: {
        appName,
        appTitle,
        uuid,
        active: true,
        icon: "/opt/gui/images/icon/icon_32_chart.png",
        iconSmall: "icon_16_chart.png",
        iconMedium: "icon_22_chart.png",
        iconLarge: "icon_32_chart.png",
        resizable: true,
      },
      content: `
        <style>
          .chart-container[data-uuid="${uuid}"] {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(2, 1fr);
            gap: 20px;
          }
          .chart-box {
            width: 100%;
            height: 270px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .chart-box canvas {
            width: 80%;
            height: 80%;
          }
          .alert-nos {
            margin: 20px 0 0 0;
          }
        </style>
        <div class="nos-alert alert-nos" data-app="${appName}" data-uuid="${uuid}"></div>
        <div class="chart-container" data-app="${appName}" data-uuid="${uuid}">
          <div class="chart-box">
              <canvas data-chart="chart1" data-chart-title="Temperature"></canvas>
          </div>
          <div class="chart-box">
              <canvas data-chart="chart2" data-chart-title="Humidity"></canvas>
          </div>
          <div class="chart-box">
              <canvas data-chart="chart3" data-chart-title="Light Intensity"></canvas>
          </div>
          <div class="chart-box">
              <canvas data-chart="chart4" data-chart-title="Soil Moisture"></canvas>
          </div>
        </div>
      `,
      main: () => { },
      jsContent: (app) => {
        // Konfigurasi chart lebih sederhana dengan mapping ID ke properti
        const MAX_POINTS = 15;
        const charts = {};

        // Definisi chart dengan warna dan properti
        const chartConfig = [
          { id: "01", chartId: "chart1", color: "#FF6384" },
          { id: "02", chartId: "chart2", color: "#36A2EB" },
          { id: "03", chartId: "chart3", color: "#FFCE56" },
          { id: "04", chartId: "chart4", color: "#4BC0C0" }
        ];

        // Inisialisasi chart
        const root = document.querySelector(`.chart-container[data-uuid="${app.header.uuid}"]`);

        root.querySelectorAll("[data-chart]").forEach(canvas => {
          const chartId = canvas.getAttribute("data-chart");
          const chartTitle = canvas.getAttribute("data-chart-title") || "Unknown";
          const config = chartConfig.find(c => c.chartId === chartId) || {};

          const ctx = canvas.getContext("2d");
          charts[chartId] = new Chart(ctx, {
            type: "line",
            data: {
              labels: Array(MAX_POINTS).fill(""),
              datasets: [{
                label: chartTitle,
                data: Array(MAX_POINTS).fill(null),
                fill: false,
                borderColor: config.color || "#888888",
                tension: 0.4
              }]
            },
            options: {
              responsive: true,
              animation: false,
              plugins: { legend: { display: false }, title: { display: true, text: chartTitle } },
              scales: { x: { title: { display: true, text: "Time" } }, y: { min: 0, max: 100, title: { display: true, text: "Value" } } }
            }
          });
        });

        // Mapping dari sensorId ke chartId
        const idMap = {
          "01": "chart1", "02": "chart2", "03": "chart3", "04": "chart4"
        };

        // Fungsi update chart yang lebih ringkas
        function updateChartsFromDataString(dataString) {
          if (!dataString) return;

          dataString.split(";").forEach(reading => {
            const [sensorId, value] = reading.split("=");
            if (sensorId && value) {
              const chartId = idMap[sensorId];
              const chart = charts[chartId];

              if (chart) {
                chart.data.labels.push(new Date().toLocaleTimeString());
                chart.data.datasets[0].data.push(parseFloat(value));

                if (chart.data.labels.length > MAX_POINTS) {
                  chart.data.labels.shift();
                  chart.data.datasets[0].data.shift();
                }

                chart.update();
              }
            }
          });
        }

        let ws, RFC;

        // Helper untuk menampilkan pesan warning
        const alertEl = document.querySelector(`.nos-alert[data-uuid="${app.header.uuid}"]`);
        const showAlert = msg => {
          if (alertEl) alertEl.innerHTML = `<div class="alert alert-warning alert-nos" role="alert"><b>Warning:</b> ${msg}</div>`;
        };
        const clearAlert = () => {
          if (alertEl) alertEl.innerHTML = "";
        };

        // Koneksi WebSocket yang lebih ringkas
        function connect() {
          const srcaddress = "ws://codeforged.local:8193";
          ws = new WebSocket(srcaddress);

          ws.onopen = () => {
            RFC = new cygRFC(ws);
            RFC.callRFC("nto.getList", [], list => {
              if (!list || !Array.isArray(list)) {
                showAlert("NTO Service belum aktif. Silakan jalankan service sensor terlebih dahulu.");
                return;
              }
              clearAlert();

              // Register untuk menerima update data sensor
              RFC.callRFC("nto.registerSensorListener", [app.header.uuid]);
              RFC.registerListener(`senslite/${app.header.uuid}`, data => {
                if (data?.type === "sensorUpdate" && data.payload) {
                  updateChartsFromDataString(data.payload);
                }
              });
            });
          };

          ws.onclose = () => setTimeout(connect, 1000);
          ws.onerror = () => ws.close();
        }

        $(document).ready(() => {
          connect();
        });

        // Simpan chart global biar bisa dipanggil dari luar
        window[app.header.uuid] = { charts };
      },
    };
  },
};