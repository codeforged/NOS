module.exports = {
  name: "scheduler",
  version: "0.1",
  needRoot: true,
  main: function (nos) {
    this.shell.loadDevices([
      { name: "bfsAccess", objectName: "fa" },
      { name: "nimbus", objectName: "nimbus" }
    ], this);

    const scheduleFile = "/opt/conf/schedule.json";
    let tasks = [];
    try {
      tasks = JSON.parse(this.fa.readFileSync(scheduleFile, "utf8"));
    } catch (e) {
      this.crt.textOut("Gagal baca schedule.json: " + e.message);
      this.shell.terminate();
      return;
    }

    // Simpan waktu eksekusi berikutnya untuk tiap task repeatable
    const nextRun = {};
    const now = () => Math.floor(Date.now() / 1000);

    // Enable flag untuk loop
    this.enable = true;

    // Jalankan task startup
    tasks.filter(t => t.type === 'startup').forEach(task => {
      // this.crt.textOut(`[Scheduler] Menjalankan (startup): ${task.command}`);
      if (task.command.trim() != "") this.shell.exec(task.command);
    });

    // Siapkan repeatable
    tasks.filter(t => t.type === 'repeatable' || !t.type).forEach(task => {
      nextRun[task.name] = now() + (task.interval || 60);
    });

    this.crt.textOut(`✅ Scheduler starting`);

    // Loop utama untuk repeatable
    const loop = () => {
      if (!this.enable) {
        this.crt.textOut("Scheduler NOS dihentikan oleh interrupt.");
        return;
      }
      const tnow = now();
      tasks.filter(t => t.type === 'repeatable' || !t.type).forEach(task => {
        if (tnow >= nextRun[task.name]) {
          // this.crt.textOut(`[Scheduler] Menjalankan: ${task.command}`);
          if (task.command.trim() != "") this.shell.exec(task.command);
          nextRun[task.name] = tnow + (task.interval || 60);
        }
      });
      setTimeout(loop, 1000);
    };
    loop();

    // Jalankan task shutdown saat exitSignal
    this.exitSignal = () => {
      tasks.filter(t => t.type === 'shutdown').forEach(task => {
        // this.crt.textOut(`[Scheduler] Menjalankan (shutdown): ${task.command}`);
        if (task.command.trim() != "") this.shell.exec(task.command);
      });
      this.enable = false;
      this.crt.textOut("Scheduler NOS dihentikan.");
    };
  }
}