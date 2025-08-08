/**
 * Custom Dashboard (Flexible Grid, JSON Layout)
 * Author: Andriansah + Copilot
 */

module.exports = {
  application: (uuid = null, nosdesktop = null) => {
    let appName = "senslitedashboard";
    let appTitle = "Senslite Dashboard";

    // Contoh definisi layout dashboard (bisa di-load dari file JSON)
    // Tipe: "line" untuk line chart, "gauge" untuk half radial gauge
    // id: unique id untuk tiap widget
    // title: judul widget
    // row, col: posisi grid (mulai dari 1)
    // colSpan, rowSpan: opsional, default 1
    // console.log("Custom Dashboard initialized with UUID:", uuid);
    let dashboardLayout = {
      columns: 1,
      rows: 1,
      widgets: [
      ]
    };

    if (nosdesktop != null)
      dashboardLayout = JSON.parse(nosdesktop.fa.readFileSync("/opt/conf/senslite-client.json")).dashboard_configuration;

    // console.log(JSON.stringify(dashboardLayout));
    // const dashboardLayout = {
    //   columns: 2,
    //   rows: 3,
    //   widgets: [
    //     { id: "01", type: "line", title: "Temperature", row: 1, col: 1 },
    //     { id: "02", type: "line", title: "Humidity", row: 1, col: 2 },
    //     { id: "03", type: "gauge", title: "Light", row: 2, col: 1 },
    //     { id: "04", type: "gauge", title: "Soil", row: 2, col: 2 },
    //     // { id: "pressure1", type: "gauge", title: "Inner Pressure", row: 3, col: 1 },
    //     // { id: "pressure2", type: "gauge", title: "Outter Pressure", row: 3, col: 2 },
    //     // { id: "waterflow", type: "text", title: "Water flow", text: "52", row: 4, col: 1 },
    //     { id: "airflow", type: "text", title: "Air flow", text: "32", row: 3, col: 2 },
    //     { id: "power", type: "nixietube", title: "Power", value: "123", digits: 4, row: 3, col: 1 }
    //   ]
    // };

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
        width: 900,
        height: 600,
        dashboardLayout
      },
      content: `
        <style>
          .main-container[data-uuid="${uuid}"] {
            padding-top: 20;
            height: 100%; /* Set tinggi container menjadi 100% dari tinggi parentnya*/
            display: flex; /* Tambahkan ini */
            flex-direction: column; /* Tambahkan ini */
          }
          .dashboard-title {
            padding-top: 10px;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(${dashboardLayout.columns}, 1fr);
            grid-template-rows: repeat(${dashboardLayout.rows}, 1fr);
            gap: 10px;
            height: 100%;
            padding: 10px;
            box-sizing: border-box;            
          }
          .dashboard-widget {
            background: #fff;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.07);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 10px;
            padding-bottom: 0;
            min-width: 0;
            min-height: 0;
            overflow: hidden;
          }
          .dashboard-widget-title {
            font-weight: bold;
            margin-bottom: 10px;
            padding-top: 0px;
            margin-top: 0px;
            font-size: 1.1rem;
          }
          /* Khusus untuk widget nixietube, atur margin agar title tidak terlalu kebawah */
          .dashboard-widget-nixietube ~ .dashboard-widget-title,
          .dashboard-widget[data-widget-id][data-nixietube] .dashboard-widget-title {
            margin-bottom: 10px !important;
          }
          .dashboard-widget-canvas {
            width: 50%;
            height: 60%;
            max-width: 400px;
            max-height: auto;
            min-height: 100px;
            min-width: 120px;
          }
          .dashboard-widget-text {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: clamp(2.2rem, 5vw, 4rem);
            font-weight: bold;
            text-align: center;
            word-break: break-word;
            padding: 10px;
          }
          .dashboard-widget-nixietube {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 80%;
            height: 70%;
            min-height: 80px;
            min-width: 80px;
            background: transparent;
          }
          .nixie-digit {
            font-family: 'Share Tech Mono', 'Courier New', Courier, monospace;
            font-size: clamp(2.5rem, 7vw, 5rem);
            color: #ffa047ff;
            background: rgba(30, 20, 10, 0.85);
            border-radius: 0.4em 0.4em 0.4em 0.4em;
            margin: 0 2px;
            padding: 10px 6px 6px 6px;
            box-shadow:
              0 0 16px 4px #ffb34788,
              0 0 32px 8px #ff9100aa inset,
              0 2px 8px #000a inset;
            letter-spacing: 2px;
            line-height: 1.1;
            min-height: .2em;
            text-align: center;
            border: 2px solid #ffb34744;
            position: relative;
            text-shadow:
              0 0 8px #ffa047ff,
              0 0 24px #ff8800ff,
              0 0 2px #fff;
            transition: background 0.2s;
          }
          .nixie-digit:after {
            content: '';
            display: block;
            position: absolute;
            left: 50%;
            top: 0;
            width: 60%;
            height: 20%;
            background: linear-gradient(180deg, #fff2 60%, transparent 100%);
            border-radius: 50%;
            transform: translateX(-50%);
            pointer-events: none;
          }
        </style>
        <div class="main-container" data-app="${appName}" data-uuid="${uuid}">
        <div class="dashboard-title" style="font-size:1.6rem;font-weight:bold;text-align:center;">${dashboardLayout.title || "Dashboard"}</div>
        <div class="dashboard-grid">
          ${dashboardLayout.widgets.map(w => {
        if (w.type === "space") {
          return `<div class="dashboard-widget" data-widget-id="${w.id}" style="grid-row:${w.row};grid-column:${w.col};background:transparent;box-shadow:none;border:none;"></div>`;
        }
        if (w.type === "nixietube") {
          let val = (w.value || '').toString();
          let digits = w.digits || val.length || 1;
          let padded = val.padStart(digits, ' ');
          return `<div class="dashboard-widget" data-widget-id="${w.id}" style="grid-row:${w.row};grid-column:${w.col};">
            <div class="dashboard-widget-title">${w.title}</div>
            <div class="dashboard-widget-nixietube" data-nixietube="${w.id}">
              ${padded.split('').map(d => d === ' ' ? `<span class=\"nixie-digit\">&nbsp;</span>` : `<span class=\"nixie-digit\">${d}</span>`).join('')}
            </div>
          </div>`;
        }
        return `
              <div class="dashboard-widget" data-widget-id="${w.id}" style="grid-row:${w.row};grid-column:${w.col};">
                <div class="dashboard-widget-title">${w.title}</div>
                ${w.type === "line" ? `<canvas class="dashboard-widget-canvas" data-chart="${w.id}"></canvas>` : ""}
                ${w.type === "gauge" ? `<span class="dashboard-widget-canvas" data-gauge="${w.id}"></span>` : ""}
                ${w.type === "text" ? `<div class="dashboard-widget-text" data-text="${w.id}">${w.text || ""}</div>` : ""}
              </div>
            `;
      }).join("")}
        </div>
        </div>
      `,
      main: () => { },
      jsContent: (app) => {
        // --- Inisialisasi chart, gauge, text, dan nixietube sesuai dashboardLayout ---
        const MAX_POINTS = 15;
        const charts = {};
        const gauges = {};
        const texts = {};
        const nixietubes = {};
        const dashboardLayout = app.header.dashboardLayout;
        const mainContainer = document.querySelector(`.main-container[data-uuid="${app.header.uuid}"]`);
        const root = mainContainer.querySelector(`.dashboard-grid`);
        // --- Line Chart ---
        dashboardLayout.widgets.filter(w => w.type === "line").forEach(w => {
          const canvas = root.querySelector(`[data-chart="${w.id}"]`);
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          charts[w.id] = new Chart(ctx, {
            type: "line",
            data: {
              labels: Array(MAX_POINTS).fill(""),
              datasets: [{
                label: w.title,
                data: Array(MAX_POINTS).fill(null),
                fill: true,
                borderColor: w.id === "01" ? "#FF6384" : w.id === "02" ? "#36A2EB" : "#888888",
                tension: 0.4
              }]
            },
            options: {
              responsive: true,
              animation: false,
              plugins: { legend: { display: false }, title: { display: false, text: w.title } },
              scales: { x: { title: { display: true, text: "Time" } }, y: { min: 0, max: 100, title: { display: true, text: "Value" } } }
            }
          });
        });
        // --- Gauge ---
        function createGauge(element, label, colorFrom, colorTo) {
          const bar = new ProgressBar.SemiCircle(element, {
            strokeWidth: 6,
            color: colorFrom,
            trailColor: "#eee",
            trailWidth: 1,
            easing: "easeInOut",
            duration: 400,
            svgStyle: null,
            text: { value: "", alignToBottom: true },
            from: { color: colorFrom },
            to: { color: colorTo },
            step: (state, bar) => {
              bar.path.setAttribute("stroke", state.color);
              var value = Math.round(bar.value() * 100);
              bar.setText(`${value}<br/>${label}`);
              bar.text.style.color = state.color;
            },
          });
          bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
          bar.text.style.fontSize = "1rem";
          return bar;
        }
        dashboardLayout.widgets.filter(w => w.type === "gauge").forEach(w => {
          const elem = root.querySelector(`[data-gauge="${w.id}"]`);
          if (!elem) return;
          gauges[w.id] = createGauge(elem, w.title,
            w.id === "light" ? "#FFDA6A" : w.id === "pressure1" ? "#77D4FE" : w.id === "pressure2" ? "#FF6384" : "#4BC0C0",
            w.id === "light" ? "#FFCE56" : w.id === "pressure1" ? "#4BC0C0" : w.id === "pressure2" ? "#36A2EB" : "#36A2EB"
          );
        });
        // --- Text Widget ---
        dashboardLayout.widgets.filter(w => w.type === "text").forEach(w => {
          const elem = root.querySelector(`[data-text="${w.id}"]`);
          if (!elem) return;
          texts[w.id] = elem;
          // Optionally, you can set text content dynamically here
          // elem.textContent = w.text || "";
        });
        // --- Nixie Tube Widget ---
        dashboardLayout.widgets.filter(w => w.type === "nixietube").forEach(w => {
          const elem = root.querySelector(`[data-nixietube="${w.id}"]`);
          if (!elem) return;
          nixietubes[w.id] = elem;
        });
        // --- Simulasi update data (nanti bisa diganti dengan data asli) ---
        window[app.header.uuid] = { charts, gauges, texts, nixietubes };
        // Fungsi global untuk inject nilai ke widget
        window.pushData = function (datasource_id, value, shift) {
          for (let i = 0; i < dashboardLayout.widgets.length; i++) {
            const w = dashboardLayout.widgets[i];
            if (w.datasource_id === datasource_id) {
              if (w.type === "line" && charts[w.id]) {
                let chart = charts[w.id];
                let dataArr = chart.data.datasets[0].data;
                dataArr.push(value);
                if (typeof shift === 'number' && dataArr.length > shift) {
                  dataArr.splice(0, dataArr.length - shift);
                }
                // Update labels (dummy, just for shifting)
                chart.data.labels.push("");
                if (typeof shift === 'number' && chart.data.labels.length > shift) {
                  chart.data.labels.splice(0, chart.data.labels.length - shift);
                }
                chart.update();
              } else if (w.type === "gauge" && gauges[w.id]) {
                let gauge = gauges[w.id];
                let v = Math.max(0, Math.min(1, value / 100)); // value 0..100 to 0..1
                gauge.animate(v);
              } else if (w.type === "text" && texts[w.id]) {
                texts[w.id].textContent = value;
              } else if (w.type === "nixietube" && nixietubes[w.id]) {
                const nix = nixietubes[w.id];
                let digits = w.digits || 4;

                // Convert value to string and pad with spaces
                let valStr = value.toString();
                let padded = valStr.padStart(digits, ' ');

                // Render with empty digit but still has the same height as other digits
                nix.innerHTML = padded.split('').map(d =>
                  d === ' ' ? `<span class="nixie-digit">&nbsp;</span>` : `<span class="nixie-digit">${d}</span>`
                ).join('');
              }
              // return;
            }
          }
          const ctx = window[app.header.uuid];
          if (!ctx) return;
          // Line chart
          if (ctx.charts && ctx.charts[id]) {
            let chart = ctx.charts[id];
            let dataArr = chart.data.datasets[0].data;
            dataArr.push(value);
            if (typeof shift === 'number' && dataArr.length > shift) {
              dataArr.splice(0, dataArr.length - shift);
            }
            // Update labels (dummy, just for shifting)
            chart.data.labels.push("");
            if (typeof shift === 'number' && chart.data.labels.length > shift) {
              chart.data.labels.splice(0, chart.data.labels.length - shift);
            }
            chart.update();
            return;
          }
          // Gauge
          if (ctx.gauges && ctx.gauges[id]) {
            let gauge = ctx.gauges[id];
            let v = Math.max(0, Math.min(1, value / 100)); // value 0..100 to 0..1
            gauge.animate(v);
            return;
          }
          // Text
          if (ctx.texts && ctx.texts[id]) {
            ctx.texts[id].textContent = value;
            return;
          }
          // Nixie Tube style, support fixed digit count
          if (ctx.nixietubes && ctx.nixietubes[id]) {
            const nix = (dashboardLayout.widgets.filter(w => w.id === "power")[0]);
            let digits = nix.digits;

            // Convert nilai ke string dan padding dengan spasi
            let valStr = value.toString();
            let padded = valStr.padStart(digits, ' ');

            // Render dengan digit kosong, tapi tetap memiliki tinggi yang sama dengan digit lainnya
            ctx.nixietubes[id].innerHTML = padded.split('').map(d =>
              d === ' ' ? `<span class=\"nixie-digit\">&nbsp;</span>` : `<span class=\"nixie-digit\">${d}</span>`
            ).join('');
            return;
          }
        };

        function connect() {
          if (window.sensliteWS && window.sensliteWS.readyState === WebSocket.OPEN) {
            console.log("WebSocket sudah terhubung, tidak perlu membuat koneksi baru.");
            return;
          }
          const srcaddress = dashboardLayout.datasource.server_address;
          window.sensliteWS = new WebSocket(srcaddress);
          window.sensliteRFC = new cygRFC(window.sensliteWS);

          window.sensliteWS.onopen = () => {
            window.sensliteRFC.callRFC("nto.getList", [], list => {
              // Register untuk menerima update data sensor
              console.log("NTO Service aktif, daftar sensor:", list);
              window.sensliteRFC.callRFC("nto.registerSensorListener", [app.header.uuid], () => {
                console.log("Berhasil mendaftar listener untuk sensor");
              });

              // Register listener untuk menerima update data sensor
              window.sensliteRFC.registerListener(`senslite/${app.header.uuid}`, data => {
                if (data?.type === "sensorUpdate" && data.payload) {
                  const arr = data.payload.replaceAll("\u0000", '').split("=");
                  console.log(JSON.stringify(arr));
                  const [id, value] = arr;
                  window.pushData(id, value, 15);
                }
              });
            });
          };

          window.sensliteWS.onclose = () => {
            setTimeout(connect, 1000);
          };
          window.sensliteWS.onerror = () => window.sensliteWS.close();
        }

        $(document).ready(() => {
          connect();
        });
      }
    };
  }
};
