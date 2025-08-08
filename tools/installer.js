const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { NOSFileSystemDriver } = require("./bfs.js");
const crypto = require("crypto");
const prompt = require('prompt-sync')({ sigint: true });

// Helper prompt user
function ask(question, defaultValue = "", echo = true) {
  if (!echo) {
    // Gunakan prompt-sync untuk input password tanpa echo
    let q = question;
    if (defaultValue) q += `[${defaultValue}]: `; else q += ': ';
    const ans = prompt.hide(q);
    return Promise.resolve(ans || defaultValue);
  } else {
    let ret = "";
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (defaultValue) {
      question += `[${defaultValue}]: `;
    } else {
      question += ": ";
    }
    if (defaultValue) {
      ret = new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans || defaultValue); }));
    }
    else {
      ret = new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
    }
    return ret;
  }
}

// Fungsi hash password sederhana (bisa diganti sesuai kebutuhan NOS)
function hashPassword(pw) {
  const hashedInput = crypto.createHash("sha1").update(pw).digest("hex");
  return hashedInput; // Ganti dengan hash beneran jika perlu
}

// Fungsi migrasi file ke BFS
function migrateFileToBFS(bfs, localFile, bfsFilePath) {
  const data = fs.readFileSync(localFile);
  bfs.writeFileSync(bfsFilePath, data);
  console.log(`Migrated file: ${bfsFilePath}`);
}

// Fungsi migrasi direktori rekursif ke BFS
function migrateFolderToBFS(bfs, localDir, bfsDir) {
  if (!bfs.existsSync(bfsDir)) {
    bfs.mkdirSync(bfsDir, { recursive: true });
  }
  const items = fs.readdirSync(localDir, { withFileTypes: true });
  for (const item of items) {
    const localPath = path.join(localDir, item.name);
    const bfsPath = path.posix.join(bfsDir, item.name);
    if (item.isDirectory()) {
      migrateFolderToBFS(bfs, localPath, bfsPath);
    } else if (item.isFile()) {
      migrateFileToBFS(bfs, localPath, bfsPath);
    }
  }
}

(async () => {
  console.log("Starting NOS Installer...");
  console.log("This will migrate files to BFS and configure NOS settings.\n");
  // 1. Prompt user untuk input path file/direktori sumber dan image BFS
  // const source = await ask("Path file/direktori sumber yang akan dimigrasi: ");
  const source = "src/";
  const bfsFile = await ask("Path + nama file image BFS: ", "images/nos.img");

  // 2. Prompt user untuk konfigurasi NOS
  const hostName = await ask("Hostname NOS: ", "ficus");
  let rootPassword = "";
  while (true) {
    const pw1 = await ask("Root password: ", "elastica", false);
    const pw2 = await ask("Ulangi root password: ", "elastica", false);
    if (pw1 !== pw2) {
      console.log("Password tidak cocok, silakan ulangi.");
    } else {
      rootPassword = pw1;
      break;
    }
  }
  const shellLogin = await ask("Shell utama perlu login? (1/0): ", "0");
  const remoteShellLogin = await ask("Remote shell perlu login? (1/0): ", "0");

  // 3. Otomatis tentukan targetPath jika tidak diisi
  let targetPath = "/";

  // 4. Inisialisasi dan buka BFS
  const bfs = new NOSFileSystemDriver();
  try {
    bfs.open(bfsFile);
  } catch (e) {
    console.error("Gagal membuka BFS image:", e.message);
    process.exit(1);
  }

  // 5. Cek apakah targetPath ada di BFS, jika tidak buat
  if (!bfs.existsSync(targetPath)) {
    bfs.mkdirSync(targetPath, { recursive: true });
  }

  // 6. Migrasi file/direktori ke BFS
  if (fs.existsSync(source)) {
    const targetBFSPath = path.posix.join(targetPath);
    if (fs.lstatSync(source).isDirectory()) {
      migrateFolderToBFS(bfs, source, targetBFSPath);
    } else if (fs.lstatSync(source).isFile()) {
      const fileName = path.basename(source);
      const bfsFilePath = path.posix.join(targetBFSPath, fileName);
      migrateFileToBFS(bfs, source, bfsFilePath);
    } else {
      console.error("Error: Source is neither a file nor a directory!");
      process.exit(1);
    }
  } else {
    console.error("Error: Source not found!");
    process.exit(1);
  }

  // 7. Setelah migrasi, update sysconfig.js
  const sysconfigPath = "/opt/conf/sysconfig.js";
  if (!bfs.existsSync(sysconfigPath)) {
    console.error("sysconfig.js tidak ditemukan di BFS!");
    process.exit(1);
  }
  const sysconfigRaw = bfs.readFileSync(sysconfigPath, { "encoding": "utf8" }).toString("utf8");
  // console.log("sysconfigRaw: " + sysconfigRaw);
  let sysconfig = {};
  try {
    eval("sysconfig = " + sysconfigRaw.replace(/^module\.exports\s*=\s*/, ""));
  } catch (e) {
    console.error("Gagal parse sysconfig.js:", e);
    process.exit(1);
  }

  sysconfig.hostName = hostName;
  if (sysconfig.rshLogin && Array.isArray(sysconfig.rshLogin.users)) {
    sysconfig.rshLogin.users = sysconfig.rshLogin.users.map(u =>
      u.username === "root" ? { ...u, password: hashPassword(rootPassword) } : u
    );
  }
  if (sysconfig.shell) sysconfig.shell.needLogin = parseInt(shellLogin) ? 1 : 0;
  if (sysconfig.remoteShell) sysconfig.remoteShell.needLogin = parseInt(remoteShellLogin) ? 1 : 0;

  const newSysconfig = "module.exports = " + JSON.stringify(sysconfig, null, 2) + ";\n";
  bfs.writeFileSync(sysconfigPath, newSysconfig, "utf8");
  console.log("Konfigurasi sysconfig.js berhasil diupdate!");

  console.log("Migrasi dan konfigurasi NOS selesai!");
})();
