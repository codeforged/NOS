module.exports = {
  author: "ChatGPT x Canding",
  description: "Generator app GUI NOS Desktop (SDK v1)",
  version: "1.0",
  main: function (nos) {
    this.shell.loadDevices(
      [
        { name: "fileAccess", objectName: "fa" },
      ],
      this
    );
    const args = this.shell.parseCommand(this.shell.lastCmd);
    let outFileName = "";
    let outAppName = "";
    let outAppTitle = "";

    if (args.params && args.params.o) {
      outFileName = args.params.o;
    }
    if (args.params && args.params.n) {
      outAppName = args.params.n;
    }
    if (args.params && args.params.t) {
      outAppTitle = args.params.t;
    }

    if (outFileName == "" || outAppName == "" || outAppTitle == "") {
      this.crt.textOut("❌ Usage: create-app.js -n <App Name> -t <App Title> -o <filename> \n");
      return;
    }

    if (!outFileName.endsWith(".js")) outFileName += ".js";

    const appName = outAppName;
    const appTitle = outAppTitle;
    const filePath = `/opt/gui/apps/${outFileName}`;

    // Template isi file
    const fileContent = `module.exports = {
  application: () => {
    let appName = "${appName}";
    let appTitle = "${appTitle}";

    return {
      header: {
        appName,
        appTitle,
        iconSmall: "icon_16_drive.png",
        iconMedium: "icon_22_drive.png",
        iconLarge: "icon_32_drive.png",
        width: 400,
        height: 300
      },
      content: \`<div id="main-content-\${appName}">Hello from \${appTitle}!</div>\`,
      main: (sender, nos) => {
        // Optional backend logic (NOS side)
        sender.crt.textOut("[NOS App] " + appTitle + " started.\\n");
      },
      jsContent: (app) => {
        // Frontend logic (browser side)
        const div = document.getElementById("main-content-" + app.header.appName);
        if (div) div.innerHTML += "<br/><i>JS loaded successfully.</i>";
      }
    };
  }
};`;

    try {
      this.fa.writeFileSync(filePath, fileContent);
      this.crt.textOut(`✅ App '${appName}' created at: ${filePath}\n`);
      this.shell.terminate();
    } catch (err) {
      this.crt.textOut(`❌ Error creating app: ${err}\n`);
    }
  }
};
