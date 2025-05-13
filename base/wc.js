module.exports = {
  instanceName: "wc",
  name: "wc",
  version: "1.1",
  main: function (nos) {
    const args = this.shell.parseCommand(this.shell.lastCmd);

    let raw = this.shell.lineBuffer;
    if (!raw || raw.trim() === "") {
      // Mode mandiri: ambil dari argumen
      raw = args.params._.join(" ");
    }

    function parseWordsToArray(text) {
      return text
        .split("\n")
        .map(line => line.trim().split(/\s+/))
        .flat()
        .filter(word => word.length > 0);
    }

    const arr = parseWordsToArray(raw);
    const count = arr.length;

    const result = `Jumlah kata/data: ${count}\n`;

    if (this.shell._pipeContextStack && this.shell._pipeContextStack.length > 0) {
      this.shell.lineBuffer = result;
    } else {
      this.crt.textOut(result);
    }
  }
};
