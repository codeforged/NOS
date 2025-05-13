const basicShell = require("../base/basicShell");

class CustomShell extends basicShell.Shell {
  #nos;
  constructor(prompt = ">", title, nos, transmitData, authentication) {
    super(prompt, title, nos, transmitData, authentication);
    this.#nos = nos;
    this._pipeContextStack = []; // Stack untuk buffer & transmit context
    this.version = "microShell 0.06";
  }

  shellHandler(lastCmd, isFromPipe = false) {
    // Deteksi command !<angka> untuk eksekusi dari history
    if (lastCmd.trim().startsWith("!")) {
      const fa = this.#nos.getDevice("fileAccess"); // atau this.fa kalau sudah di-load saat init shell
      const histFile = "/home/cmdHist.txt";

      if (!fa.fileExistsSync(histFile)) {
        this.crt.textOut("⛔ File history tidak ditemukan.\n");
        return;
      }

      const lines = fa
        .readFileSync(histFile)
        .split("\n")
        .filter((x) => x.trim() !== "");
      const num = parseInt(lastCmd.trim().substring(1)); // ambil angka setelah tanda !

      if (isNaN(num) || num < 1 || num > lines.length) {
        this.crt.textOut("❌ Nomor history tidak valid.\n");
        return;
      }

      const cmd = lines[num - 1].trim();
      this.shellHandler(cmd); // jalankan ulang perintah
      return;
    }

    // === DETEKSI ; BERLAPIS + PARSE PER SEGMEN ===
    if (lastCmd.includes(";")) {
      const commands = lastCmd.split(";").map((cmd) => cmd.trim());
      const execNext = (index = 0) => {
        if (index >= commands.length) {
          this.showPrompt();
          return;
        }

        const command = commands[index];
        const runCmd = () => {
          // Tangani sebagai pipeline jika mengandung |
          if (command.includes("|")) {
            const pipeline = command.split("|").map((c) => c.trim());

            // Backup context
            this._pipeContextStack.push({
              lineBuffer: this.lineBuffer,
              transmitData: this.transmitData,
            });

            // RPV mode
            this.lineBuffer = "";
            this.promptVisible = false;
            this.transmitData = (data) => {
              this.lineBuffer += data;
            };

            // Jalankan pipeline lalu lanjut ke execNext()
            this.runPipelineWithCallback(pipeline, "", 0, () => {
              execNext(index + 1);
            });
          } else {
            try {
              this.executeScript(command, isFromPipe);
              execNext(index + 1);
            } catch (err) {
              this.crt.textOut(`❌ Error: ${err.message || err}`);
              this.showPrompt();
            }
          }
        };

        runCmd();
      };

      execNext();
      return;
    }

    // === HANDLE PIPE (STANDALONE) ===
    if (lastCmd.includes("|")) {
      const pipeline = lastCmd.split("|").map((cmd) => cmd.trim());

      if (this.cmdHistoryFiller) {
        this.cmdHistoryFiller(lastCmd);
        if (this.saveHistory) this.saveHistory();
      }

      this._pipeContextStack.push({
        lineBuffer: this.lineBuffer,
        transmitData: this.transmitData,
      });

      this.lineBuffer = "";
      this.promptVisible = false;
      this.transmitData = (data) => {
        this.lineBuffer += data;
      };

      this.runPipeline(pipeline, "", 0);
      return;
    }

    // Command biasa
    this.lastCmd = lastCmd;
    if (this.userInput == 1) {
      if (this.userInputHandler != null) {
        this.userInputHandler(this.lastCmd);
      }
      this.userInput = 0;
    } else {
      if (this.cmdHistoryFiller && !isFromPipe) {
        this.cmdHistoryFiller(lastCmd);
        if (this.saveHistory) this.saveHistory();
      }

      if (lastCmd === "sudo") {
        let userInfo = this.getUserInfo(this.username);
        if (userInfo.sudoAllow) {
          this.authLogin(true)
            .then((valid) => {
              this.rootActive = true;
              setTimeout(() => (this.rootActive = false), this.sudoTimeOut);
              this.showPrompt();
            })
            .catch((valid) => {
              this.crt.textOut("Access denied!");
              this.showPrompt();
            });
        } else {
          this.crt.textOut("You can not sudo!");
          this.showPrompt();
        }
      } else if (lastCmd === "unsudo") {
        this.rootActive = false;
        this.showPrompt();
      } else if (lastCmd === "clear") {
        this.crt.clear();
        this.showPrompt();
      } else if (lastCmd === "exit") {
        if (this.onExit != null) this.onExit();
      } else {
        this.executeScript(lastCmd, isFromPipe); // ✅ penting!
      }
    }
  }

  runPipelineWithCallback(commands, inputData, index, doneCallback) {
    if (index >= commands.length) {
      const ctx = this._pipeContextStack.pop();
      if (ctx) {
        this.transmitData = ctx.transmitData;
        this.lineBuffer = ctx.lineBuffer;
      }

      this.crt.textOut(inputData);
      this.promptVisible = true;
      if (typeof doneCallback === "function") doneCallback();

      return;
    }

    this.shellHandler(commands[index], true);
    this.runPipelineWithCallback(
      commands,
      this.lineBuffer,
      index + 1,
      doneCallback
    );
  }

  runPipeline(commands, inputData, index) {
    if (index >= commands.length) {
      // Restore context
      const ctx = this._pipeContextStack.pop();
      if (ctx) {
        this.transmitData = ctx.transmitData;
        this.lineBuffer = ctx.lineBuffer;
      }

      // Output hasil akhir
      this.crt.write(inputData);
      this.promptVisible = true;
      // this.showPrompt();
      return;
    }

    // Jalankan tahap pipeline berikutnya
    this.shellHandler(commands[index], true);

    // Lanjut ke pipeline berikutnya dengan hasil baru
    this.runPipeline(commands, this.lineBuffer, index + 1);
  }
}

module.exports = { Shell: CustomShell };
