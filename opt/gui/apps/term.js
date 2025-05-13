module.exports = {
  application: () => {
    let appName = "terminal";
    let appTitle = "Terminal microShell";
    let appContent = {
      header: {
        appName: appName,
        appTitle: appTitle,
        version: "1.0",
        iconSmall: "icon_16_terminal.png",
        iconMedium: "icon_22_terminal.png",
        iconLarge: "icon_32_terminal.png",
        width: 600,
        height: 370,
        maximizable: false,
      },
      content: `<div id="main-content-${appName}"></div>`,
      // Server side
      main: (sender, nos) => {
        sender.ws.remoteFunction.desktop.getKey = (params) => {
          let key = params[0];
          let code = params[1];
          let ctrl = params[2];
          let shift = params[3];

          // if (key == 127) key = "\b";

          let io = {
            key: {
              name: String.fromCharCode(key),
              sequence: code,
              ctrl: ctrl,
              shift: shift,
            },
          };
          webShell.pushIOKey(io);
          return [];
        };

        sender.ws.remoteFunction.desktop.terminalReady = (params) => {
          try {
            const { Shell } = require(`${nos.basePath}/base/microShell`);
            webShell = new Shell(
              `%hostname:%pwd %username%roottag `,
              "Terminal",
              nos,
              (output) => {
                if (output.charCodeAt(0) == 127) output = "\b";
                if (webShell.transmittActive) {
                  sender.sendMessage(`ngs/${appName}`, {
                    type: "crtOut",
                    output: output.replace(/\n/g, "\r\n") //.replaceAll("\u001b[?25h", "\b")
                  });
                }
              },
              true // Authentication mode
            );
            webShell.parentShell = sender.shell;
            webShell.sysConfig = nos.sysConfig;
            webShell.envPath = "/base;/opt;/home";
            webShell.syslog = nos.getDevice("syslogger");
            webShell.pwd = "/home/";
            webShell.username = "root";
            webShell.rootActive = true;

            let dirContents = sender.fa.getDirectoryContents("./base");
            webShell.term.autoCompletionList =
              webShell.term.autoCompletionList.concat(dirContents);

            dirContents = sender.fa.getDirectoryContents("./opt");
            webShell.term.autoCompletionList =
              webShell.term.autoCompletionList.concat(dirContents);
            nos.executeModule(
              `${nos.basePath}/opt`,
              "historylogger",
              null,
              webShell
            );

            webShell.greeting(
              () => {
                webShell.transmittActive = true;
              },
              () => {
                webShell.transmittActive = false;
                sender.sendMessage(`ngs/${appName}`, {
                  type: "notif",
                  msg: "wrong password",
                });
              }
            );
          } catch (e) {
            console.log(`${JSON.stringify(e)}`);
          }
        };
      },
      jsContent: (app) => {
        // Client side

        const term = new Terminal({
          smoothScrollingStepInterval: 10,
          minimumContrastRatio: 1,
          fontFamily: '"Cascadia Code", Menlo, monospace',
          fontSize: 12,
          encoding: 'UTF-8',
          cursorBlink: false,
        });
        window.term = term;


        RFC.registerListener(`ngs/${app.header.appName}`, (data) => {
          if (data.type == "crtOut") {
            window.term.write(data.output);
          } else if (data.type == "notif" && data.msg == "wrong password") {
            showNedryMagicWord();
          }
        });

        term.onData((e) => {
          if (e == "\u0006") {//Ctrl+F
            document.querySelector("body").requestFullscreen();
          } else if (e == "\u0003") {
            // Ctrl+C
            RFC.callRFC("desktop.getKey", [3, "\x03", true], (ret) => { });
          } else if (e == "\u0013") {
            // Ctrl+S
            RFC.callRFC("desktop.getKey", ["\r", "\x13", true], (ret) => { });
          } else
            RFC.callRFC("desktop.getKey", [e.charCodeAt(0), e], (ret) => { });
        });

        term.open(document.getElementById("main-content-terminal"));
        RFC.callRFC("desktop.terminalReady", [], (ret) => { });
      },
    };
    return appContent;
  },
};
