class TermUtil {
  constructor(crt) {
    this.crt = crt;
    this.buf = "";
    this.col = 0;
    this.prompt = "";
    this.echo = true;
    this.isUserInput = false;
    this.userInputCharmask = null;
    this.history = [];
    this.historyIdx = 0;
    // this.autoCompletionList = [];
    this.autoCompletionList = [];
    this.tabSearchIdx = 0;
    this.tabSearchWord = "";
    this.doReturnGetFromHistory = 0;

    // Menambahkan metode tambahan ke String
    String.prototype.replaceAt = function (index, replacement) {
      return (
        this.substring(0, index) +
        replacement +
        this.substring(index + replacement.length)
      );
    };

    String.prototype.splice = function (start, delCount, newSubStr) {
      return (
        this.slice(0, start) +
        newSubStr +
        this.slice(start + Math.abs(delCount))
      );
    };
  }

  findHistory(cmd) {
    return this.history.indexOf(cmd);
  }
  hideCursor() {
    this.crt.write("\u001B[?25l");
  }
  showCursor() {
    this.crt.write("\u001B[?25h");
  }
  searchHistory(cmd) {
    let foundIdx = 0;
    let result = "";
    for (let i = 0; i < this.history.length; i++) {
      if (cmd === this.history[i].substring(0, cmd.length)) {
        if (this.tabSearchIdx === foundIdx) {
          result = this.history[i];
          break;
        }
        foundIdx++;
      }
    }
    return result;
  }

  doCtrlC() {}

  searchCompletion(cmd) {
    let foundIdx = 0;
    let result = "";
    for (let i = 0; i < this.autoCompletionList.length; i++) {
      if (cmd === this.autoCompletionList[i].substring(0, cmd.length)) {
        if (this.tabSearchIdx === foundIdx) {
          result = this.autoCompletionList[i];
          break;
        }
        foundIdx++;
      }
    }
    return result;
  }

  searchAutoComplete(cmd) {
    return this.autoCompletionList.filter((word) => word.startsWith(cmd));
  }

  addHistory(cmd) {
    if (cmd.trim() === "") return;
    if (!this.history.includes(cmd)) {
      this.history.push(cmd);
      return 0;
    }
    return 1;
  }

  displayInColumns(words) {
    const columns = 3;
    const rows = Math.ceil(words.length / columns);
    let columnsArray = Array.from({ length: columns }, () => []);

    words.forEach((word, index) => {
      const columnIndex = index % columns;
      columnsArray[columnIndex].push(word);
    });

    let result = "";
    for (let row = 0; row < rows; row++) {
      let rowString = "";
      for (let col = 0; col < columns; col++) {
        const word = columnsArray[col][row] || "";
        rowString += word.padEnd(10);
      }
      result += rowString + "\n";
    }
    return result;
  }

  doTab() {
    let scmd = this.searchCompletion(this.tabSearchWord);
    if (scmd !== "") {
      let arrscmd = this.searchAutoComplete(this.tabSearchWord);

      this.tabSearchIdx++;
      if (this.tabSearchIdx > arrscmd.length - 1) this.tabSearchIdx = 0;

      let rcmd = scmd;
      if (arrscmd.length === 1) rcmd += " ";
      if (this.buf.length > 0) {
        this.crt.write(`\x1b[${this.buf.length}D`);
        this.crt.write(`\x1b[0K`);
      }

      if (this.buf.split(" ").length > 1) {
        let str = this.buf.split(" ").slice(0, -1).join(" ") + " ";
        this.buf = str + rcmd;
      } else {
        this.buf = rcmd;
      }

      this.col = this.buf.length;
      this.crt.write(this.buf);
    } else if (scmd === "") {
      this.tabSearchIdx = 0;
    }
  }

  doReturn() {
    this.lastCmd = this.buf.trim();
    this.clearBuf();
    this.crt.write("\r\n");
    if (this.findHistory(this.lastCmd) > -1) {
      this.historyIdx = this.findHistory(this.lastCmd);
      this.doReturnGetFromHistory = 1;
    }

    if (this.doReturnGetFromHistory === 1) {
      let i1 = this.historyIdx;
      let i2 = this.history.length - 1;
      this.geserDepan(this.history, i1);
    }

    if (this.shellHandler) this.shellHandler(this.lastCmd);

    if (this.userInputCharmask !== null) {
      this.userInputCharmask = null;
    }
    this.historyIdx = this.history.length;
    this.tabSearchIdx = 0;
    this.doReturnGetFromHistory = 0;
  }

  geserDepan(a, idx) {
    let s = a[idx];
    for (let i = idx; i < a.length - 1; i++) {
      a[i] = a[i + 1];
    }
    a[a.length - 1] = s;
  }

  keyPress(ch) {
    if (this.echo) {
      this.crt.write(
        this.userInputCharmask === null ? ch : this.userInputCharmask
      );
    }

    this.buf = this.buf.splice(this.col, 0, ch);
    if (this.col < this.buf.length - 1) {
      this.crt.write(this.buf.substring(this.col + 1));
      for (let i = this.buf.length - this.col - 1; i > 0; i--) {
        this.crt.write("\b");
      }
    }
    this.col++;
    this.tabSearchWord = this.buf.split(" ").pop();
    this.tabSearchIdx = 0;
  }

  clearBuf() {
    this.buf = "";
    this.col = 0;
    this.tabSearchWord = "";
    this.tabSearchIdx = 0;
  }

  // Metode lainnya dipertahankan sesuai dengan versi asli, namun diubah menjadi class-based
  doDelete() {
    this.buf = this.buf.split("");
    this.buf.splice(this.col, 1);
    this.buf = this.buf.join("");
    this.crt.write(this.buf.substring(this.col));
    this.crt.write("\x1b[C");
    this.crt.write("\b \b");
    //this.tabSearchWord = this.buf;
    for (let i = 0; i < this.buf.length - this.col; i++) this.crt.write("\b");

    let arr = this.buf.split(" ");
    this.tabSearchWord = arr[arr.length - 1];
  }
  doRightCursor() {
    if (this.col < this.buf.length) {
      this.crt.write("\x1b[C");
      this.col++;
    }
  }
  doLeftCursor() {
    if (this.col > 0) {
      this.crt.write("\b");
      this.col--;
    }
  }
  doBackSpace() {
    if (this.buf.length > 0) {
      if (this.col == this.buf.length) {
        if (this.userInputCharmask == "");
        else this.crt.write("\b \b");
        this.buf = this.buf.substring(0, this.buf.length - 1);
        //this.tabSearchWord = this.buf;
      } else {
        if (this.col > 0) {
          this.buf = this.buf.splice(this.col - 1, 1, "");
          if (this.userInputCharmask == "");
          else this.crt.write("\b");
          this.crt.write(this.buf.substring(this.col - 1) + " ");
          if (this.userInputCharmask == "");
          else
            for (let i = 0; i < this.buf.length - this.col + 2; i++)
              this.crt.write("\b");
        }
      }
      this.col--;
    }
    let arr = this.buf.split(" ");
    this.tabSearchWord = arr[arr.length - 1];
  }
  replaceCmd(rcmd) {
    this.hideCursor();
    if (this.buf.length > 0) {
      this.crt.write(`\x1b[${this.buf.length}D`);
      this.crt.write(`\x1b[0K`);
    }

    this.buf = rcmd;
    this.col = this.buf.length;
    this.crt.write(rcmd);
    this.showCursor();
  }

  doHome() {
    while (this.col > 0) {
      this.doLeftCursor();
    }
  }

  setBackColor(color) {
    let ansiColor;
    switch (color) {
      case "reset":
        ansiColor = 0;
        break;
      case "black":
        ansiColor = 40;
        break;
      case "red":
        ansiColor = 41;
        break;
      case "green":
        ansiColor = 42;
        break;
      case "yellow":
        ansiColor = 43;
        break;
      case "blue":
        ansiColor = 44;
        break;
      case "magenta":
        ansiColor = 45;
        break;
      case "cyan":
        ansiColor = 46;
        break;
      case "white":
        ansiColor = 47;
        break;
    }
    this.crt.write(`\x1b[${ansiColor}m`);
  }

  setTextColor(color) {
    let ansiColor;
    switch (color) {
      case "black":
        ansiColor = 30;
        break;
      case "red":
        ansiColor = 31;
        break;
      case "green":
        ansiColor = 32;
        break;
      case "yellow":
        ansiColor = 33;
        break;
      case "blue":
        ansiColor = 34;
        break;
      case "magenta":
        ansiColor = 35;
        break;
      case "cyan":
        ansiColor = 36;
        break;
      case "white":
        ansiColor = 37;
        break;
    }
    this.crt.write(`\x1b[${ansiColor}m`);
  }

  setCursor(row, col) {
    this.crt.write(`\x1b[${row};${col}H`);
  }

  clearScreen() {
    //this.crt.write("\033[2J\033[0;0f");
    this.crt.write("\x1b[2J\x1b[0;0f");
  }
  pushIOKey(io) {
    //if (typeof this.keyListener!="undefined") {
    if (this.echo == 0) {
      if (typeof this.keyListener != "undefined") this.keyListener(io);
    } else {
      let ch;
      ch = io.key.sequence;
      if ((io.key.ctrl === true && io.key.name == "u") || ch == "\x15") {
        if (this.buf.length > 0) {
          this.crt.write(`\x1b[${this.buf.length}D`);
          this.crt.write(`\x1b[0K`);

          this.clearBuf();
        }
      } else if (
        io.key.ctrl === true &&
        io.key.shift === true &&
        io.key.name == "v"
      ) {
        this.replaceCmd(cp.paste());
        //this.crt.write(cp.paste().toString());
      } else if (io.key.ctrl === true && ch == "\x03") {
        // ctrl + c
        this.doCtrlC();
      } else if (ch == "\r") {
        this.doReturn();
      } else if (ch == " ") {
        this.keyPress(" ");
      } else if (ch == "\x1B[3~") {
        this.doDelete();
      } else if (ch == "\x1B[C") {
        this.doRightCursor();
      } else if (ch == "\x1B[H") {
        // while (this.col>0) {
        //  this.doLeftCursor();
        // }
        this.doHome();
      } else if (ch == "\t") {
        // tab
        this.doTab();
      } else if (ch == "\x1B[A") {
        // up
        if (this.history.length > 0) {
          if (this.historyIdx >= 0) {
            if (this.historyIdx > 0) this.historyIdx--;
            let hcmd = this.history[this.historyIdx];

            this.replaceCmd(hcmd);
            this.buf = hcmd;
            this.col = this.buf.length;
            this.doReturnGetFromHistory = 1;
          }
        }
      } else if (ch == "\x1B[B") {
        // down
        if (this.history.length > 0) {
          if (this.historyIdx < this.history.length) {
            if (this.historyIdx < this.history.length - 1) this.historyIdx++;
            let hcmd = this.history[this.historyIdx];
            this.replaceCmd(hcmd);
            this.buf = hcmd;
            this.col = this.buf.length;
            this.doReturnGetFromHistory = 1;
          }
        }
      } else if (ch == "\x1B[F") {
        while (this.col < this.buf.length) {
          this.doRightCursor();
        }
      } else if (ch == "\x1B[D") {
        // left
        this.doLeftCursor();
      } else if (ch == "\x7F" || ch == "\b") {
        // backspace
        this.doBackSpace();
      } else if (ch == "\x1B[5~") {
        // pageup
      } else if (ch == "\x1B[6~") {
        // pagedown
      } else {
        this.keyPress(ch);
      }
    }
  }
}
module.exports = { version: "0.7", TermUtil };
