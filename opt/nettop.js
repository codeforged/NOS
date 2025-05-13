module.exports = {
  version: "1.0",
  author: "Canding & ChatGPT",
  description: "Menampilkan statistik trafik jaringan NOS secara real-time.",
  main: async function (nos) {
    this.crt = this.shell.crt;

    // 🚀 Load semua device class Connection Manager
    const devs = Object.entries(nos.devices).filter(([k, v]) =>
      v.devClass?.includes("Connection Manager")
    );

    if (devs.length === 0) {
      this.crt.textOut("❌ Tidak ditemukan device Connection Manager.\n");
      this.shell.terminate();
      return;
    }

    this.crt.textOut(`📡 Statistik Trafik Jaringan NOS:\n\n`);

    devs.forEach(([name, dev]) => {
      if (!dev.connMgr.getStats) {
        this.crt.textOut(`🔧 ${dev.name.padEnd(12)} :: [No stat support]`);
        return;
      }

      // const stats = dev.connMgr.getStats();
      // const tx = stats.txBytes || 0;
      // const rx = stats.rxBytes || 0;
      // const started = stats.firstTimestamp || Date.now();
      const stats = dev.connMgr.getStats?.() || {};
      const tx = stats.totalTx ?? 0;
      const rx = stats.totalRx ?? 0;
      const txKB = (tx / 1024).toFixed(2);
      const rxKB = (rx / 1024).toFixed(2);
      const txRate = stats.txKBps ?? "0.00";
      const rxRate = stats.rxKBps ?? "0.00";

      this.crt.textOut(
        `📡 ${dev.name.padEnd(12)} :: Tx ${txKB} KB / ${txRate} KB/s | Rx ${rxKB} KB / ${rxRate} KB/s`
      );
    });

    this.crt.textOut(`\nSelesai.\n`);
    this.shell.terminate();
  },

  exitSignal: function () {
    return new Promise((resolve) => resolve());
  },
};


// console.log("RX " + this.connMgr.stats.rxBytes)
// console.log("TX " + this.connMgr.stats.txBytes)
// TX 2226
// RX 2420
// TX 2332
// RX 2530
// TX 2438
// RX 2640
// TX 2544
