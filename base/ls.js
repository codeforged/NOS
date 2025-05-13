const path = require("path");
const fs = require("fs");

module.exports = {
    name: "ls",
    description: "List files and directories in the given path",
    version: "1.0",
    needRoot: false,
    main: function (os) {
        const devices = [
            { name: "fileAccess", objectName: "fd" }
        ];
        this.shell.loadDevices(devices, this);
        this.crt = this.shell.crt;

        let args = this.shell.lastCmd.trim().split(/\s+/);
        let targetArg = args.find(arg => !arg.startsWith("--") && arg !== "ls");
        let dirPath = targetArg || this.shell.pwd;

        // Bersihkan path NOS agar konsisten
        if (!dirPath.startsWith("/")) {
            dirPath = path.join(this.shell.pwd, dirPath);
        }
        if (dirPath !== "/" && dirPath.endsWith("/")) {
            dirPath = dirPath.slice(0, -1);
        }

        const useLineMode = args.includes("--line");
        let fullOutput = "";

        const printList = (list) => {
            if (useLineMode) {
                list.forEach(item => fullOutput += item + "\n");
            } else {
                const maxWidth = 25;
                const columns = Math.floor(this.crt.columns / maxWidth) || 1;
                let line = "";
                list.forEach((item, index) => {
                    line += item.padEnd(maxWidth);
                    if ((index + 1) % columns === 0) {
                        fullOutput += line + "\n";
                        line = "";
                    }
                });
                if (line) fullOutput += line + "\n";
            }
        };

        const realPath = path.resolve("." + dirPath); // Untuk keperluan fs.statSync()

        try {
            const files = this.fd.readdirSync(dirPath); // Gunakan path NOS
            let directories = [];
            let regularFiles = [];

            for (const file of files) {
                const filePath = path.join(realPath, file);
                try {
                    const stats = fs.statSync(filePath);
                    if (stats.isDirectory()) {
                        directories.push(file + "/");
                    } else {
                        regularFiles.push(file);
                    }
                } catch (err) {
                    regularFiles.push(file); // fallback: anggap file
                }
            }

            directories.sort();
            regularFiles.sort();
            printList(directories);
            printList(regularFiles);

            fullOutput += `\n📁 Directories: ${directories.length}   📄 Files: ${regularFiles.length}\n`;

            // Pipe-aware output
            if (typeof this.shell.lineBuffer === "string") {
                this.shell.lineBuffer = fullOutput;
            } else {
                this.crt.textOut(fullOutput);
            }

        } catch (err) {
            this.crt.textOut(`❌ Gagal membaca '${dirPath}': ${err.message}`);
        }

        this.shell.terminate();
    }
};


// const path = require("path");
// const fs = require("fs");

// module.exports = {
//     name: "ls",
//     description: "List file of current directory",
//     version: "0.9",
//     needRoot: false,
//     main: function (os) {
//         const devices = [
//             { name: "fileAccess", objectName: "fd" }
//         ];
//         this.shell.loadDevices(devices, this);
//         this.crt = this.shell.crt;

//         let args = this.shell.lastCmd.split(" ");
//         let targetArg = args.find(arg => !arg.startsWith("--") && arg !== "ls");
//         let dirPath = targetArg || this.shell.pwd;

//         // Normalize dan pastikan ada trailing slash jika perlu
//         if (dirPath !== "/" && !dirPath.endsWith("/")) {
//             dirPath += "/";
//         }

//         const useLineMode = args.includes("--line");
//         let fullOutput = "";

//         const printList = (list) => {
//             if (useLineMode) {
//                 list.forEach(item => fullOutput += item + "\n");
//             } else {
//                 const maxWidth = 25;
//                 const columns = Math.floor(80 / maxWidth);
//                 let line = "";
//                 list.forEach((item, index) => {
//                     line += item.padEnd(maxWidth);
//                     if ((index + 1) % columns === 0) {
//                         fullOutput += line + "\n";
//                         line = "";
//                     }
//                 });
//                 if (line) fullOutput += line + "\n";
//             }
//         };

//         const directoryPath = path.resolve("." + dirPath); // absolute path untuk fs.statSync

//         try {
//             const files = this.fd.readdirSync(dirPath); // tetap pakai path NOS (bukan resolve)
//             let directories = [];
//             let regularFiles = [];

//             for (const file of files) {
//                 const filePath = path.join(directoryPath, file);
//                 try {
//                     const stats = fs.statSync(filePath);
//                     if (stats.isDirectory()) {
//                         directories.push(file);
//                     } else {
//                         regularFiles.push(file);
//                     }
//                 } catch (err) {
//                     continue;
//                 }
//             }

//             printList(directories.map(d => d + "/"));
//             printList(regularFiles);

//             fullOutput += `\nTotal directory: ${directories.length}\n`;
//             fullOutput += `Total files: ${regularFiles.length}\n`;

//             // Pipe-aware: jika dalam pipeline, isi lineBuffer saja
//             if (typeof this.shell.lineBuffer === "string") {
//                 this.shell.lineBuffer = fullOutput;
//             } else {
//                 this.crt.textOut(fullOutput);
//             }

//         } catch (err) {
//             this.crt.textOut(`❌ Tidak dapat membaca direktori '${dirPath}': ${err.message}`);
//         }

//         this.shell.terminate();
//     }
// };
