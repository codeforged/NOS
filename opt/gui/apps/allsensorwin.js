function generateGUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

module.exports = {
  application: () => {
    let appName = "allsensorwin";
    let appTitle = "All Sensor Win";
    let guid = generateGUID();

    return {
      header: {
        appName,
        appTitle,
        guid,
        active: false,
        iconSmall: "icon_16_chart.png",
        iconMedium: "icon_22_chart.png",
        iconLarge: "icon_32_chart.png",
        resizable: true
      },
      content: `        
        <div id="main-container"  data-app="${appName}" data-guid="${guid}">
          <div id="win1" title="Window 1"></div>
          <div id="win2" title="Window 2"></div>
          <div id="win3" title="Window 3"></div>
          <div id="win4" title="Window 4"></div>
        </div>
      `,
      main: () => { },
      jsContent: (app) => {
        window.createWindow = function (id, left, top, width, height) {
          $(id)
            .window({
              left,
              top,
              width,
              height,
              draggable: false,
              resizable: false,
              buttons: {}, // hide minimize/collapse buttons
              dialogClass: "no-close", // remove close icon
              minimizable: false,
              maximizable: true,
              collapsible: false,
              closable: false,
              inline: true,
              onMaximize: function () {
                console.log("Maximize diklik");

                // Close other windows
                $(".easyui-window")
                  .not(this)
                  .each(function () {
                    $(this).window("close");
                  });

                // Bring to front
                // $(this).css("z-index", 9999);
              },
              onRestore: function () {
                console.log("Restore diklik");
                windowResize();
              },
            })
          // .window("open");
        }



        $(this).ready(function () {
          setTimeout(() => {
            window.layoutWindows = function () {
              // const screenW = $(window).width();
              // const screenH = $(window).height();
              // const winW = screenW / 2;
              // const winH = screenH / 2;

              createWindow("#win1", 0, 0, 200, 200);
              createWindow("#win2", 0, 0, 200, 200);
              createWindow("#win3", 0, 0, 200, 200);
              createWindow("#win4", 0, 0, 200, 200);

            }
            // createWindow("#win1", 0, 0, 200, 200);
            layoutWindows();
            // $(window).resize();
            // Responsif saat resize
            $(window).resize(() => {
              windowResize();
            });
            console.log("Windows opened");

          }, 0);

          window.windowResize = function () {
            const screenW = $("#main-container").width();
            const screenH = $("#main-container").height();
            const winW = screenW / 2;
            const winH = screenH / 2;

            $("#win1").window("move", {
              left: 0,
              top: 0,
            });
            $("#win1").window("resize", {
              width: winW,
              height: winH,
            });

            $("#win2").window("move", {
              left: winW,
              top: 0,
            });
            $("#win2").window("resize", {
              width: winW,
              height: winH,
            });

            $("#win3").window("move", {
              left: 0,
              top: winH,
            });
            $("#win3").window("resize", {
              width: winW,
              height: winH,
            });

            $("#win4").window("move", {
              left: winW,
              top: winH,
            });
            $("#win4").window("resize", {
              width: winW,
              height: winH,
            });
          }

          // Contoh isi chart ke window 1
          // const canvas = $('<canvas width="400" height="200"></canvas>');
          // $("#win1").html("").append(canvas);

          // setTimeout(() => {
          //   const chart = new Chart(canvas[0].getContext("2d"), {
          //     type: "line",
          //     data: {
          //       labels: ["A", "B", "C"],
          //       datasets: [
          //         {
          //           label: "Contoh Data",
          //           data: [10, 20, 30],
          //           borderColor: "#4bc0c0",
          //           fill: false,
          //           tension: 0.3,
          //         },
          //       ],
          //     },
          //   });
          // }, 100);

          // Responsif saat resize
          // $(window).resize(() => {
          //   layoutWindows();
          // });
        });



        // const MAX_POINTS = 15;
        // window.charts = {};
        // const root = document.querySelector(
        //   `.chart-container[data-guid="${app.header.guid}"]`
        // );

        // root.querySelectorAll("[data-chart]").forEach((canvas) => {
        //   const chartId = canvas.getAttribute("data-chart");
        //   let chartTitle;
        //   let borderColor;
        //   switch (chartId) {
        //     case "chart1":
        //       chartTitle = "Temperature";
        //       borderColor = "#FF6384";
        //       break;
        //     case "chart2":
        //       chartTitle = "Humidity";
        //       borderColor = "#36A2EB";
        //       break;
        //     case "chart3":
        //       chartTitle = "Chart 3";
        //       break;
        //     case "chart4":
        //       chartTitle = "Chart 4";
        //       break;
        //     default:
        //       chartTitle = "Unknown";
        //       break;
        //   }

        //   const ctx = canvas.getContext("2d");

        //   //console.log(chartId);

        //   charts[chartId] = new Chart(ctx, {
        //     type: "line",
        //     data: {
        //       labels: Array(MAX_POINTS).fill(""),
        //       datasets: [
        //         {
        //           label: `Sensor ${chartTitle}`,
        //           data: Array(MAX_POINTS).fill(null),
        //           fill: false,
        //           borderColor: borderColor || "#4bc0c0",
        //           tension: 0.4,
        //         },
        //       ],
        //     },
        //     options: {
        //       responsive: true,
        //       animation: false,
        //       plugins: {
        //         title: { display: false },
        //       },
        //       scales: {
        //         x: { title: { display: true, text: "Time" } },
        //         y: { min: 0, max: 100, title: { display: true, text: "Value" } },
        //       },
        //     },
        //   });
        // });

        // let ws, RFCSensorGauges;
        // let idTemp = "01";
        // let idHumid = "02";

        // function connect() {
        //   let srcaddress = "ws://192.168.0.110:8080";
        //   ws = new WebSocket(srcaddress);

        //   ws.onopen = function () {
        //     console.log("WebSocket connected!");
        //     RFCSensorGauges = new cygRFC(ws);
        //     RFCSensorGauges.callRFC = (name, params = [], callBack = {}) => {
        //       RFCSensorGauges.remoteCall({ name, params }, callBack);
        //     };

        //     function callRFCAsync(name, params = []) {
        //       return new Promise((resolve, reject) => {
        //         RFCSensorGauges.callRFC(name, params, (res) => {
        //           resolve(res);
        //         });
        //       });
        //     }

        //     async function updateAllGauges() {
        //       let ts;
        //       const temp = await callRFCAsync("nto.getData", [idTemp]);
        //       if (temp.age < 2000) {
        //         ts = new Date(temp.timeStamp).toLocaleTimeString();
        //         charts["chart1"].data.datasets[0].data.push(temp.value);
        //         charts["chart1"].data.labels.push(ts);

        //         if (charts["chart1"].data.labels.length > 20) {
        //           charts["chart1"].data.labels.shift();
        //           charts["chart1"].data.datasets[0].data.shift();
        //         }
        //         charts["chart1"].update();
        //       }

        //       const hum = await callRFCAsync("nto.getData", [idHumid]);
        //       if (hum.age < 2000) {
        //         ts = new Date(hum.timeStamp).toLocaleTimeString();
        //         charts["chart2"].data.datasets[0].data.push(hum.value);
        //         charts["chart2"].data.labels.push(ts);

        //         if (charts["chart2"].data.labels.length > 20) {
        //           charts["chart2"].data.labels.shift();
        //           charts["chart2"].data.datasets[0].data.shift();
        //         }
        //         charts["chart2"].update();
        //       }
        //     }

        //     setInterval(updateAllGauges, 2000);
        //   };

        //   ws.onclose = function (e) {
        //     console.log("Socket closed. Retry in 1s.", e.reason);
        //     setTimeout(connect, 1000);
        //   };

        //   ws.onerror = function (err) {
        //     console.error("WebSocket error: ", err.message);
        //     ws.close();
        //   };
        // }

        // $(this).ready(() => {
        //   connect();
        // });

        // // Simpan chart global biar bisa dipanggil dari luar
        // window[app.header.guid] = { charts };
      },
    };
  },
};
