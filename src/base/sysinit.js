module.exports = {
  instanceName: "__sysinit",
  main: async function (nos) {
    __APP.distro = {
      sysinitVersion: "1.23",
      version: "Ficus Elastica v1.26",
    };
    // return;
    const path = require("path");
    nos.path = path;
    const isWin = process.platform === "win32";
    // Helper for cross-platform path
    function nosPath(...args) {
      if (isWin) {
        return path.join(...args).replace(/\\/g, "/");
      } else {
        return path.posix.join(...args);
      }
    }
    const sysConfigPath = isWin
      ? nosPath("opt", "conf", "sysconfig.js")
      : "/opt/conf/sysconfig.js";
    nos.sysConfig = bfs.require(sysConfigPath);

    // if (nos.args[2]) nos.hostName = nos.args[2];
    // else nos.hostName = nos.sysConfig.hostName;
    const os = require("os");
    const args = nos.args;
    const hostnameIndex = args.indexOf("-h");
    if (hostnameIndex !== -1 && args[hostnameIndex + 1]) {
      nos.hostName = args[hostnameIndex + 1];
    } else {
      nos.hostName = nos.sysConfig.hostName || os.hostname();
    }

    const __nimbusDriver = bfs.require("/dev/nimbus.js");
    const nimbusDriver = new __nimbusDriver.NOSInternalMessageBus();
    nos.mountDevice(nimbusDriver);

    const { DisplayDriver } = bfs.require("/dev/display");
    const crt = new DisplayDriver(nos);
    nos.mountDevice(crt);

    const { KeyboardDriver } = bfs.require("/dev/keyboard");
    const keyboardDriver = new KeyboardDriver(nos);
    nos.mountDevice(keyboardDriver);

    __APP.distro.version = __APP.distro.version;

    // const FileDriver = bfs.require("/dev/bfs");
    const FileDriver = bfs.require(`/dev/${bfs.fileSystemDriver.lib}`);
    const fileDriver = new FileDriver.NOSFileSystemDriver();
    nos.mountDevice(fileDriver);

    // create global variable for accessing bfs
    fs = fileDriver;
    fileDriver.instanceCopy(bfs);

    function generateFingerprintColorsFromHash(originalFingerprint) {
      const colors = [
        41, 42, 43, 44, 45, 46, 47, 100, 101, 102, 103, 104, 105, 106, 107,
      ];
      // 1. Hasilkan hash MD5 dari seluruh fingerprint asli
      const md5Hash = crypto
        .createHash("md5")
        .update(originalFingerprint)
        .digest("hex");
      // Hasil md5Hash akan berupa string heksadesimal 32 karakter, contoh: "d41d8cd98f00b204e9800998ecf8427e"

      // 2. Bagi hash MD5 menjadi pasangan heksadesimal (16 byte)
      const hexBytesFromHash = md5Hash.match(/.{1,2}/g); // Ini akan menghasilkan 16 elemen array

      let row = "";
      const colorsPerRow = 8; // 8 kotak per baris

      hexBytesFromHash.forEach((hex, index) => {
        // Mengubah heksadesimal ke desimal
        const decimalValue = parseInt(hex, 16);

        // Memetakan nilai desimal ke indeks warna menggunakan modulo
        const colorIndex = decimalValue % colors.length;
        const color = colors[colorIndex];

        // Menambahkan kotak warna ke baris
        row += `\x1b[${color}m ${"".padStart(4, " ")}\x1b[0m`;

        // Menambahkan baris baru setelah 8 kotak, asalkan bukan kotak terakhir
        if (
          (index + 1) % colorsPerRow === 0 &&
          index + 1 < hexBytesFromHash.length
        ) {
          row += `\n`;
        }
      });
      return row;
    }

    const crypto = require("crypto");

    function extractFingerprint(publicKeyPem, algo = "sha256") {
      if (typeof publicKeyPem !== "string") return null;
      const b64 = publicKeyPem
        .replace(/-----BEGIN PUBLIC KEY-----/, "")
        .replace(/-----END PUBLIC KEY-----/, "")
        .replace(/\s+/g, "");
      try {
        const keyBuffer = Buffer.from(b64, "base64");
        const hash = crypto.createHash(algo).update(keyBuffer).digest("hex");
        return hash.match(/.{2}/g).join(":");
      } catch (err) {
        return null;
      }
    }

    bfs.readFileSync = fs.readFileSync.bind(fileDriver);
    /* * * * * * * * * * * * * * * * * * * * * * * */
    const SyslogDriver = bfs.require("/dev/syslog");
    const syslogPath = isWin ? nosPath("opt", "syslog.txt") : "/opt/syslog.txt";
    const syslogDriver = new SyslogDriver.sysloggerInit(nos, syslogPath);
    nos.mountDevice(syslogDriver);

    let display = nos.getDevice("display");
    let keyboard = nos.getDevice("keyboard");

    const { Terminal } = bfs.require("/base/terminal");
    const terminal = new Terminal("tty", display, keyboard);

    __APP.shell = {
      manager: nos.sysConfig.shell.manager,
    };
    const { ShellOpen } = bfs.require("/base/shellOpen");
    //constructor(prompt = ">", title, nos, parentShell, transmitData, authentication) {

    const loginAsRoot = true;
    const mainShell = new ShellOpen(
      nos.sysConfig.shell.prompt,
      "Main Shell",
      nos,
      null,
      null,
      false
    );
    // mainShell.shell.transmittActive = false; // false = disable all emitted text to active screen
    mainShell.shell.sysConfig = nos.sysConfig;
    mainShell.shell.envPath = "/base;/opt";
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

    let dirContents = fileDriver.getDirectoryContents("/");
    mainShell.shell.term.autoCompletionList =
      mainShell.shell.term.autoCompletionList.concat(dirContents);

    dirContents = fileDriver.getDirectoryContents("/base");
    mainShell.shell.term.autoCompletionList =
      mainShell.shell.term.autoCompletionList.concat(dirContents);

    dirContents = fileDriver.getDirectoryContents("/opt");
    mainShell.shell.term.autoCompletionList =
      mainShell.shell.term.autoCompletionList.concat(dirContents);

    if (!__APP.core) __APP.core = {};

    try {
      const startupConfPath = isWin
        ? nosPath("opt", "conf", "startup.js")
        : "/opt/conf/startup.js";
      const startUp = bfs.require(startupConfPath);
      startUp.startUp(nos);
    } catch (e) {
      console.error(e);
    }

    const startupShPath = isWin
      ? nosPath("opt", "conf", "startup.sh")
      : "/opt/conf/startup.sh";
    await fileDriver.readFile(startupShPath, async (err, content) => {
      try {
        mainShell.shell.rootActive = true;
        await content
          .replace(/\r\n/g, "\n")
          .split("\n")
          .map(async (x) => {
            if (x.trim() != "" && x[0] != "#") {
              let arrX = x.split(" ");
              mainShell.shell.lastCmd = x;
              await mainShell.shell.termUtil.shellHandler(x);
            }
            mainShell.shell.transmittActive = false;
            await mainShell.shell.termUtil.shellHandler("cd /home");
            mainShell.shell.transmittActive = true;
          });

        // crt.clear();
        let banner = fs.readFileSync("/boot/banner.txt");
        banner = banner.replaceAll("${NOSVersion}", __APP.distro.version);
        banner = banner.replaceAll("${ShellVersion}", mainShell.shell.version);
        banner = banner.replaceAll("${Hostname}", nos.hostName);

        banner = banner.replaceAll("${CPUArch}", os.arch());
        banner = banner.replaceAll("${OSType}", os.type());
        banner = banner.replaceAll("${OSPlatform}", os.platform());
        banner = banner.replaceAll("${OSRelease}", os.release());
        banner = banner.replaceAll(
          "${RAMInfo}",
          Math.round(os.totalmem() / 1024 / 1024)
        );

        // console.log("OS Type:", os.type());           // Misal: 'Linux', 'Darwin', 'Windows_NT'
        // console.log("OS Platform:", os.platform());   // Misal: 'linux', 'win32'
        // console.log("OS Release:", os.release());     // Versi kernel, misal: '5.15.0-91-generic'
        // console.log("CPU Arch:", os.arch());          // Misal: 'x64', 'arm'
        // console.log("CPU Info:", os.cpus()[0].model); // Model CPU pertama
        // console.log("Total RAM (MB):", Math.round(os.totalmem() / 1024 / 1024));
        // console.log("Hostname:", os.hostname());

        crt.write(banner);

        if (fs.existsSync("/opt/conf/public.pem")) {
          const publicKey = fs.readFileSync("/opt/conf/public.pem");
          const fingerprint = extractFingerprint(publicKey);
          // console.log(`Public Key Fingerprint: ${fingerprint}`);
          crt.write(generateFingerprintColorsFromHash(fingerprint));
          crt.write("\r\n\r\n");
        }
        if (nos.sysConfig.shell.needLogin == 1) {
          setTimeout(async () => {
            mainShell.shell.transmittActive = true;
            await mainShell.shell.termUtil.shellHandler("login");
          }, 250);
        } else {
          mainShell.shell.username = "root";
          mainShell.shell.rootActive = true;
          mainShell.shell.greeting(() => {
            mainShell.shell.transmittActive = true;
          });
        }
      } catch (e) {
        console.error("Error executing startup script:", e);
      }
      // bfs = fs;
    });
  },
};
