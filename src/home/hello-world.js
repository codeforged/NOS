module.exports = {
  name: "hello world",
  version: "0.01",
  needRoot: false,
  main: function (nos) {
    this.shell.loadDevices(
      [
        { name: __APP.defaultComm, objectName: "mqtnl" },
        { name: "bfsAccess", objectName: "fa" },
      ],
      this,
    );

    this.crt.textOut("Hello World");
    this.terminate();

    this.abc = function () {
      this.crt.textOut("This is a test function.");
      for (let i = 0; i < 5; i++) {
        this.crt.textOut(`Counter: ${i}`);
      }
    }
  }
};

