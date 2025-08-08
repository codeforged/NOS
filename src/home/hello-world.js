module.exports = {
  name: "hello world",
  version: "0.01",
  main: function () {
    this.crt.textOut("Hello World");
    this.terminate();
  },
};
