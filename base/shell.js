const crypto = require("crypto");

class Shell {
  #nos;
  constructor(prompt = ">", title, nos, transmitData, authentication = false) {
    const { TermUtil } = require(nos.basePath + "/base/termUtil");
    this.#nos = nos;
    this.version = "Core Shell 0.44";
    this.prompt = prompt;
    this.transmitData = transmitData;
    this.origTransmitData = this.transmitData;
    this.nosCodeName = this.#nos.codeName;
    this.nosVersion = this.#nos.version;
    this.nosAuthor = this.#nos.author;
    this.basePath = this.#nos.basePath;
    this.hostName = this.#nos.hostName;
    this.userInput = 0;
    this.sudoTimeOut = 60 * 1000 * 2;
    this.transmittActive = true;
    this.authentication = authentication;


    if (this.syslog != null)
      this.syslog.append(`Shell created: ${prompt} :: ${title}`, 3)

    this.crt = {
      rows: process.stdout.rows,
      columns: process.stdout.columns,
      write: (data) => {
        if (this.transmitData != null) {
          this.transmitData(data);
          return data;
        }
      },
      textOut: (data) => {
        if (this.transmitData != null) {
          this.transmitData(`${data}\n`);
          return `${data}\n`;
        }
      },
      log: (data) => {
        if (this.transmitData != null) {
          this.transmitData(`${data}\n`);
          return `${data}\n`;
        }
      },
      clear: () => {
        if (this.transmitData != null) {
          this.transmitData("\x1b[2J\x1b[0;0f");
          return "\x1b[2J\x1b[0;0f";
        }
      }
    }

    // this.transmitData  = null;
    // this.transmitData  = this.origTransmitData;
    this.interruptSignalListener = [];
    this.termUtil = new TermUtil(this.crt);

    // for compatibility purpose
    this.term = this.termUtil;
    // enf of for compatibility purpose

    this.autoCompletionList = [];
    this.autoCompletionList.push('exit');
    this.autoCompletionList.push('reboot');
    this.autoCompletionList.push('shutdown');
    this.autoCompletionList.push('clear');
    this.autoCompletionList.push('pwd');
    this.autoCompletionList.push('lsdev');
    this.autoCompletionList.push('whoami');
    this.autoCompletionList.push('newterm');
    this.autoCompletionList.push('hist');
    this.autoCompletionList.push('run');
    this.termUtil.autoCompletionList =
      this.termUtil.autoCompletionList.concat(
        this.autoCompletionList
      )

    this.title = this.version;
    this.keyboardActive = true;
    this.parentShell = null;
    this._pwd = "/";
    this._lastCmd = "";
    this._username = nos.sysConfig.rshLogin.username;
    this.rootActive = false;

    // this.loadDevices = function (a,b) {
    //   return this.#nos.loadDevices(a,b);
    // }
    this.loadDevices = function (a, b) {
      return this.#nos.loadDevices(a, b);
    }

    this.getDevice = function (deviceName) {
      return this.#nos.getDevice(deviceName);
    }

    this.termUtil.doCtrlC = () => {
      for (let i = 0; i < this.interruptSignalListener.length; i++) {
        this.interruptSignalListener[i]();
      }
      this.crt.write("^C\n");
      this.showPrompt();
      this.termUtil.showCursor();
    }

    this.termUtil.shellHandler = (lastCmd) => {
      let pipeIdx = lastCmd.indexOf(" | ");
      let realLastCmd = lastCmd;
      let origLastCmd = lastCmd;
      this.pipePostProcessingData = null;
      if (pipeIdx > -1) {
        let afterPipe = lastCmd.slice(lastCmd.indexOf(" | ") + 3);
        // this.crt.textOut("afterpipe: "+afterPipe);

        origLastCmd = lastCmd.slice(0, lastCmd.indexOf(" | "));

        let args = afterPipe.split(" ");
        // this.crt.textOut("args: "+JSON.stringify(args));
        let fullPath = this.find(args[0], this.envPath);
        const path = require('path');
        let error = 0;
        let directory;
        let fileName;
        try {
          directory = path.dirname(fullPath);
          fileName = path.basename(fullPath);
        } catch (e) {
          error = 1;
          //this.crt.textOut(e);
        }
        if (error == 0) {
          this.lastCmd = afterPipe;
          this.origTransmitData = this.transmitData;
          let errorLevel = nos.executeModule(directory, fileName, () => {
          }, this, this.rootActive, this.lastCmd);
          // console.log("ww: "+this.lastCmd)
          // this.termUtil.shellHandler(this.lastCmd);
        } else {
          //   this.crt.textOut(afterPipe+" not found!");
        }
      }
      lastCmd = origLastCmd;
      this._lastCmd = lastCmd;
      if (this.userInput == 1) {
        if (this.userInputHandler != null) this.userInputHandler(this.lastCmd);
        this.userInput = 0;
      } else {
        if (this.cmdHistoryFiller) {
          // this.crt.textOut(`cmdHistoryFiller(${lastCmd})`)
          this.cmdHistoryFiller(realLastCmd);
          if (this.saveHistory) this.saveHistory();
        }
        if (lastCmd == "exit") {
          if (this.onExit != null) this.onExit();
        } else if (lastCmd == "sudo") {
          this.authLogin()
            .then((valid) => {
              // this.crt.textOut("login valid "+valid)
              this.rootActive = true;
              setTimeout(() =>
                this.rootActive = false
                , this.sudoTimeOut)
              this.showPrompt();
            })
            .catch((valid) => {
              this.crt.textOut("Access denied!");
              this.showPrompt();
            })
        } else if (lastCmd == "unsudo") {
          this.rootActive = false;
          this.showPrompt();
        } else if (lastCmd.startsWith("!")) {
          try {
            (new Function(lastCmd.substring(1)))();
          } catch (e) {
            this.crt.textOut(e);
          }
          this.showPrompt();
        } else if (lastCmd.startsWith("$")) {
          const exec = require('child_process').exec;
          try {
            let myPromise = new Promise((myResolve, myReject) => {
              exec(lastCmd.substring(1), (err, stdout, stderr) => {
                if (!err) {
                  this.crt.write(stdout)
                  myResolve(); // when successful             
                } else {
                  this.crt.write(stderr);
                  myReject();  // when error
                }
              });
            })
            myPromise.then(
              (value) => { this.showPrompt(); },
              (error) => { this.showPrompt(); }
            );
          } catch (e) {
            this.crt.textOut(e);
          }
        } else if (lastCmd == "reboot") {
          this.crt.textOut("Sending exit signal ...");
          nos.shutdown(1);
        } else if (lastCmd == "clear") {

          this.crt.clear();
          this.showPrompt();
        } else if (lastCmd == "hist") {
          this.termUtil.history.map((x, i) => {
            this.crt.write(`${i + 1}. ${x}\n`);
          });
          this.showPrompt();
        } else if (lastCmd.startsWith("run")) {
          try {
            let args = lastCmd.split(" ");
            this.termUtil.shellHandler(this.termUtil.history[parseInt(args[1]) - 1]);
          } catch (e) {
            this.crt.textOut(e);
          }
          //this.showPrompt();
        } else if (lastCmd == "pwd") {

          this.crt.write(`${this._pwd}\n`);
          this.showPrompt();
        } else if (lastCmd == "lsdev") {

          // nos.devices.map((x) => {
          //   this.crt.write(`${x.name.padEnd(10," ")}\t :: ${x.devClass}\n`);
          // });
          const icons = {
            "system logger": "📝",
            "display": "🖥️ ",
            "keyboard": "⌨️ ",
            "file access": "📁",
            "websocket": "🌐",
            "ttymoderator": "🎛️ ",
            "httpserver2": "🛰️",
            "mqttnl Connection Manager": "📡",
            "MQTNL Connection Manager for ESP32": "📶",
            "default": "🔧"
          };

          function visualWidth(str) {
            let width = 0;
            for (let i = 0; i < str.length; i++) {
              const code = str.codePointAt(i);
              if (
                (code >= 0x1F300 && code <= 0x1FAFF) || // emoji
                (code >= 0x2000 && code <= 0x206F)
              ) {
                width += 2;
                if (code > 0xFFFF) i++; // skip surrogate pair
              } else {
                width += 1;
              }
            }
            return width;
          }

          function padRightVisual(str, totalWidth) {
            const current = visualWidth(str);
            return str + " ".repeat(Math.max(0, totalWidth - current));
          }

          nos.devices.forEach((x) => {
            const icon = icons[x.devClass] || icons["default"];
            const label = `${icon} ${x.name}`;
            const padded = padRightVisual(label, 22); // Adjust width as needed
            this.crt.write(`${padded}\t:: ${x.devClass}${(x.cryptoName ? " [" + x.cryptoName + "]" : "")}\n`);
          });
          this.showPrompt();
        } else if (lastCmd == "whoami") {

          this.crt.write(`${this.title} root active: ${this.rootActive}\n`);
          this.showPrompt();
        } else if (lastCmd.substring(0, 7) == "newterm") {
          let args = lastCmd.split(" ");
          const { ShellOpen } = require(nos.basePath + "/base/shellOpen");
          this.childShell = new ShellOpen(`${args[1]}`, args[2], nos, this, (data) => {
            this.crt.write(data);
          });
          this.emitIOKey = (io) => {
            this.childShell.shell.pushIOKey(io);
          }
        } else {
          if (lastCmd.length > 0) {
            let error = 0;
            try {
              let args = lastCmd.split(" ");
              if (args[0] == "sudo") {
                this.authLogin()
                  .then((valid) => {
                    // this.crt.textOut("login valid "+valid)
                    this.rootActive = true;

                    args = args.slice(1);
                    lastCmd = args.join(" ");
                    this.lastCmd = lastCmd;
                    let fullPath = this.find(args[0], this.envPath);
                    const path = require('path');
                    const directory = path.dirname(fullPath);
                    const fileName = path.basename(fullPath);

                    let errorLevel = nos.executeModule(directory, fileName, () => {
                    }, this, this.rootActive, this.lastCmd);

                    setTimeout(() => {
                      this.rootActive = false;
                    }, this.sudoTimeOut)
                  })
                  .catch((valid) => {
                    this.crt.textOut("Access denied!");

                    args = args.slice(1);
                    lastCmd = args.join(" ");
                    this.lastCmd = lastCmd;
                    let fullPath = this.find(args[0], this.envPath);
                    const path = require('path');
                    const directory = path.dirname(fullPath);
                    const fileName = path.basename(fullPath);
                    try {
                      let errorLevel = nos.executeModule(directory, fileName, () => {
                      }, this, this.rootActive, this.lastCmd);
                    } catch (e) {
                      if (e.code == 1 || e.code == 2 || e.code == 3) {
                        this.crt.textOut(e.message);
                      } else error = 1;

                      this.showPrompt();
                    }
                  })
              } else {
                let fullPath = this.find(args[0], this.envPath);
                const path = require('path');
                const directory = path.dirname(fullPath);
                const fileName = path.basename(fullPath);
                // const module = require(fullPath);          
                let errorLevel = nos.executeModule(directory, fileName, () => {
                }, this, this.rootActive, lastCmd);
              }
            } catch (e) {
              if (e.code == 1 || e.code == 2 || e.code == 3) {
                this.crt.textOut(e.message);
              } else error = 1;

              this.showPrompt();
            }

            if (error == 0) {
              this.termUtil.addHistory(lastCmd);
            } else {
              this.crt.textOut("Command not found!")
              this.showPrompt();
            }
          } else {
            this.showPrompt();
          }
        }
      }
      // setTimeout(()=>{          

      // },10);
    }

  }

  set lastCmd(value) { this._lastCmd = value; }
  get lastCmd() { return this._lastCmd; }
  set pwd(value) { this._pwd = value; }
  get pwd() { return this._pwd; }
  set username(value) { this._username = value; }
  get username() { return this._username; }

  addCompletion(str) {
    this.term.autoCompletionList =
      this.term.autoCompletionList.concat(
        [str]
      )
  }
  reboot() {
    this.crt.textOut("System rebooting ...");
    this.#nos.shutdown(1);
  }

  terminate() {
    this.showPrompt();
  }

  userPrompt = (prompt, echo) => {
    return new Promise((resolve, reject) => {
      this.userInputHandler = (data) => {
        this.userInput = 0;
        this.transmittActive = true;
        resolve(data);
      }
      this.userInput = 1;
      this.transmittActive = true;
      this.crt.write(prompt);
      this.transmittActive = echo;
    })
  }

  showPrompt() {
    if (this.origTransmitData != null)
      this.transmitData = this.origTransmitData;
    this.transmittActive = true;

    if (this.pipePostProcessingData != null) {
      this.crt.write(this.pipePostProcessingData);
      this.pipePostProcessingData = null;
    }

    let str = this.prompt;
    str = str.replaceAll("%pwd",
      (this.pwd.length > 1 && this.pwd.endsWith("/") === true ? this.pwd.substring(0, this.pwd.length - 1) : this.pwd));
    str = str.replaceAll("%username", this.username);
    str = str.replaceAll("%hostname", this.#nos.hostName);
    str = str.replaceAll("%roottag", (this.rootActive ? "⚡" : "$"));
    this.crt.write(`${str}`);
  }

  checkLogin(username, passwd) {
    const users = this.#nos.sysConfig.rshLogin.users;
    const hashedInput = crypto.createHash("sha1").update(passwd).digest("hex");

    for (let user of users) {
      if (user.username === username && user.password.toUpperCase() === hashedInput.toUpperCase()) {
        return user; // login sukses
      }
    }

    return null; // login gagal
  }

  authLogin() {
    return new Promise((resolve, reject) => {
      const userPrompt = require(this.basePath + "/base/shell").userPrompt;
      let username, passwd;
      new userPrompt("Username: ", this, (data) => {
        this.username = data;
        new userPrompt("Password: 🔑\u001B[?25l", this, (data) => {
          passwd = data;
          this.crt.write(`\u001B[?25h\n`);
          const loginCheck = this.checkLogin(this.username, passwd);
          if (loginCheck != null) {
            // if (this.username == this.#nos.sysConfig.rshLogin.username &&
            //   passwd == this.#nos.sysConfig.rshLogin.password) {
            resolve(true);
          } else {
            reject(false);
          }
        }, true, false); // <-- true is for once prompt
      }, true); // <-- true is for once prompt
    });
  }
  greeting(greetingCallback, accessDeniedCallBack = null) {
    this.crt.write(`\n${this.title}\n`);
    if (this.authentication) {
      this.authLogin()
        .then((valid) => {
          // this.crt.textOut("login valid "+valid);
          if (greetingCallback) greetingCallback(); //else
          // this.crt.write(`\nWelcome to ${this.title}\n`);
          this.showPrompt();
        })
        .catch((valid) => {
          this.crt.textOut("Access denied!");
          if (this.onExit) this.onExit();
          if (accessDeniedCallBack) accessDeniedCallBack();
        })
    } else {
      if (greetingCallback) greetingCallback();
      this.showPrompt();
    }
  }

  pushIOKey(io) {
    if (this.keyboardActive === true) {
      //console.log((io.key.sequence.charCodeAt(0)).toString(16));      
      this.termUtil.pushIOKey(io);
    } else {
      if (io.key.ctrl === true && io.key.sequence == "\x1a") {
        this.keyboardActive = true;
        this.termUtil.doCtrlC();
        // this.termUtil.pushIOKey( io );
      }
      if (this.emitIOKey != null) {
        this.emitIOKey(io);
      }
      if (this.getKey != null) {
        this.getKey(io);
      }
    }

    return io;
  }

  find(fileName, paths) {
    const fs = require('fs');
    const path = require('path');
    // Tambahkan ekstensi .js jika belum ada
    if (!fileName.endsWith('.js')) {
      fileName += '.js';
    }

    const directories = paths.split(';'); // Membagi daftar path
    for (const dir of directories) {
      const fullPath = path.resolve(this.#nos.basePath + dir, fileName); // Membuat path absolut
      if (fs.existsSync(fullPath)) { // Mengecek apakah file ada
        return fullPath; // Kembalikan path lengkap jika ditemukan
      }
    }
    return null; // Jika tidak ditemukan
  }

  parseCommand(command) {
    const args = command.match(/(?:[^\s"]+|"[^"]*")+/g); // Ambil argumen, mendukung nilai dalam tanda kutip
    const result = {
      fileName: command.split(" ")[0],
      command: args[0], // Perintah utama
      params: {},
      rawArgs: [] // Semua argumen setelah nama perintah
    };

    let currentFlag = null;
    let nonFlagArgs = []; // Untuk menyimpan argumen non-flag

    args.slice(1).forEach((arg) => {
      const cleanArg = arg.replace(/^"|"$/g, ""); // Hilangkan tanda kutip

      result.rawArgs.push(cleanArg); // Simpan ke rawArgs

      if (arg.startsWith("-")) {
        currentFlag = arg.substring(1);
        result.params[currentFlag] = true;
      } else if (currentFlag) {
        result.params[currentFlag] = cleanArg;
        currentFlag = null;
      } else {
        nonFlagArgs.push(cleanArg);
      }
    });

    // Simpan argumen non-flag di result.params._
    if (nonFlagArgs.length > 0) {
      result.params._ = nonFlagArgs;
    }

    return result;
  }
}

class userPrompt {
  constructor(prompt, shell, onEnter, once = true, echo = true, cmdExit = ".exit") {
    this.shell = shell;
    this.prompt = prompt;
    this.onEnter = onEnter;
    this.cmdExit = cmdExit;
    this.once = once;
    this.echo = echo;
    this.prompter();
  }

  prompter() {
    this.shell.userPrompt(this.prompt, this.echo)
      .then((data, done) => {
        if (this.once == true || data == this.cmdExit) {
          this.onEnter(data);
        } else {
          this.onEnter(data);
          this.prompter();
        }
      })
  }
}

module.exports = { Shell, userPrompt };