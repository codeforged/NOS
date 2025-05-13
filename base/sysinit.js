module.exports = {
  instanceName: "__sysinit",
  main: function (nos) {
    __APP.distro = {
      version: "Ochroma Pyramidale v1.1",
    };
    const path = require("path");

    const sysConfigPath = path.resolve(
      nos.basePath + "/opt/conf",
      "sysconfig.js"
    );
    nos.sysConfig = require(sysConfigPath);
    if (nos.args[2]) nos.hostName = nos.args[2];
    else nos.hostName = nos.sysConfig.hostName;

    if (nos.hostName == "%hostname%")
      nos.hostName = require('os').hostname();

    const SyslogDriver = require(nos.basePath + "/dev/syslog");
    const syslogDriver = new SyslogDriver.sysloggerInit(
      nos,
      nos.basePath + "/opt/syslog.txt"
    );
    nos.mountDevice(syslogDriver);

    const { DisplayDriver } = require(nos.basePath + "/dev/display");
    const crt = new DisplayDriver(nos);
    nos.mountDevice(crt);

    const { KeyboardDriver } = require(nos.basePath + "/dev/keyboard");
    const keyboardDriver = new KeyboardDriver(nos);
    nos.mountDevice(keyboardDriver);

    const { FileDriver } = require(nos.basePath + "/dev/file");
    const fileDriver = new FileDriver(nos.basePath);
    nos.mountDevice(fileDriver);

    /* * * * * * * * * * * * * * * * * * * * * * * */

    let display = nos.getDevice("display");
    let keyboard = nos.getDevice("keyboard");

    const { Terminal } = require(nos.basePath + "/base/terminal");
    const terminal = new Terminal("tty", display, keyboard);

    __APP.shell = {
      manager: nos.sysConfig.shell.manager,
    };
    const { ShellOpen } = require(nos.basePath + "/base/shellOpen");
    //constructor(prompt = ">", title, nos, parentShell, transmitData, authentication) {

    const loginAsRoot = true;
    const mainShell = new ShellOpen(
      `%hostname:%pwd %username%roottag `,
      "Main Shell",
      nos,
      null,
      null,
      false
    );
    // mainShell.shell.transmittActive = false; // false = disable all emitted text to active screen
    mainShell.shell.sysConfig = nos.sysConfig;
    mainShell.shell.envPath = "/base;/opt;/home";
    mainShell.shell.syslog = nos.getDevice("syslogger");
    mainShell.shell.pwd = "/home/";
    mainShell.shell.transmitData = (data) => {
      if (mainShell.shell.transmittActive) {
        terminal.crt.write(data);
      }
    };

    terminal.kbEvent = (io) => {
      mainShell.shell.pushIOKey(io);
    };

    mainShell.shell.onExit = () => {
      nos.shutdown(0);
    };
    mainShell.shell.term.autoCompletionList =
      mainShell.shell.term.autoCompletionList.concat([nos.hostName]);

    let dirContents = fileDriver.getDirectoryContents("./");
    mainShell.shell.term.autoCompletionList =
      mainShell.shell.term.autoCompletionList.concat(dirContents);

    dirContents = fileDriver.getDirectoryContents("./base");
    mainShell.shell.term.autoCompletionList =
      mainShell.shell.term.autoCompletionList.concat(dirContents);

    dirContents = fileDriver.getDirectoryContents("./opt");
    mainShell.shell.term.autoCompletionList =
      mainShell.shell.term.autoCompletionList.concat(dirContents);

    if (!__APP.core) __APP.core = {};

    try {
      const startUp = require(`${nos.basePath}/opt/conf/startup.js`);
      startUp.startUp(nos);
    } catch (e) {
      console.error(e);
    }

    fileDriver.readFile(`/opt/conf/startup.sh`, (err, content) => {
      mainShell.shell.rootActive = true;
      content.split("\n").map((x) => {
        if (x.trim() != "" && x[0] != "#") {
          let arrX = x.split(" ");
          mainShell.shell.lastCmd = x;
          mainShell.shell.termUtil.shellHandler(x);
        }
      });
      if (nos.sysConfig.shell.needLogin == 1)
        mainShell.shell.termUtil.shellHandler("login");
      else {
        mainShell.shell.username = "root";
        mainShell.shell.rootActive = true;
        mainShell.shell.greeting(() => {
          mainShell.shell.transmittActive = true;
        });
      }
    });
    // }, 1000);
  },
};
