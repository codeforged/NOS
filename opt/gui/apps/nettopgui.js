module.exports = {
  application: () => {
    let appName = "nettop";
    let appTitle = "NOS Network Monitor";

    return {
      header: {
        appName,
        appTitle,
        active: true,
        iconSmall: "icon_16_network.png",
        iconMedium: "icon_22_network.png",
        iconLarge: "icon_32_network.png",
        width: 550,
        height: 300,
      },
      content: `
        <div id="main-content-${appName}" class="p-4">
          <h2 class="text-xl font-semibold mb-4">📡 NOS Network Traffic</h2>
          <table class="w-full text-sm text-left border border-gray-300" id="trafficTable-${appName}">
            <thead class="bg-gray-200">
              <tr>
                <th class="px-2 py-1">Device</th>
                <th class="px-2 py-1">Total Tx (KB)</th>
                <th class="px-2 py-1">Tx Rate (KB/s)</th>
                <th class="px-2 py-1">Total Rx (KB)</th>
                <th class="px-2 py-1">Rx Rate (KB/s)</th>
              </tr>
            </thead>
            <tbody id="trafficBody-${appName}">
              <tr><td colspan="5" class="text-center py-2">⏳ Loading...</td></tr>
            </tbody>
          </table>
        </div>
      `,
      main: (sender, nos) => {
        sender.ws.remoteFunction.system = {}; // Namespace system
        // system.listDevices: balikin info device
        sender.ws.remoteFunction.system.listDevices = () => {
          // console.log("hello");
          // return "Hello world"

          return Object.entries(nos.devices).map(([name, dev]) => {
            return {
              name: dev.name,
              devClass: dev.devClass || "",
              hasStats: typeof dev.connMgr?.getStats === "function"
            };
          });
        };
        // dev.xxx.getStats: panggil dev.connMgr.getStats() jika ada
        sender.ws.remoteFunction.dev = new Proxy({}, {
          get: (_, devName) => {
            return {
              getStats: () => {
                try {
                  // const dev = nos.devices[devName];
                  // console.log("$$$ " + devName)
                  const dev = nos.getDevice(devName);
                  if (!dev || !dev.connMgr || typeof dev.connMgr.getStats !== "function")
                    return { error: "No stats available" };
                  return dev.connMgr.getStats();
                } catch (e) {
                  return { error: e.message };
                }
              }
            };
          }
        });
      },
      jsContent: (app) => {
        // let ws, RFCSensor;
        const tableBody = document.getElementById(`trafficBody-${app.header.appName}`);

        function refreshStats() {
          RFC.callRFC("system.listDevices", [], (devs) => {
            if (!Array.isArray(devs)) return;
            const connMgrs = devs.filter(d => d.devClass?.includes("Connection Manager"));
            const rows = [];

            // Gunakan indeks manual + rekursi biar tetap async-safe
            let i = 0;
            function next() {
              if (i >= connMgrs.length) {
                tableBody.innerHTML = rows.join("");
                return;
              }

              const dev = connMgrs[i++];
              RFC.callRFC("dev." + dev.name + ".getStats", [], (stats) => {
                const txKB = ((stats.totalTx || 0) / 1024).toFixed(2);
                const rxKB = ((stats.totalRx || 0) / 1024).toFixed(2);
                const txRate = stats.txKBps || "0.00";
                const rxRate = stats.rxKBps || "0.00";

                rows.push(`
                  <tr>
                    <td class="px-2 py-1 font-mono">${dev.name}</td>
                    <td class="px-2 py-1 text-right">${txKB}</td>
                    <td class="px-2 py-1 text-right">${txRate}</td>
                    <td class="px-2 py-1 text-right">${rxKB}</td>
                    <td class="px-2 py-1 text-right">${rxRate}</td>
                  </tr>
                `);
                next();
              });
            }

            next();
          });
        }
        $(this).ready(() => {
          refreshStats();
          setInterval(() => {
            refreshStats();
          }, 1000);
        });
      },
    };
  },
};
