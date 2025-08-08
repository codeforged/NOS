
module.exports = {
  name: "rm",
  version: 0.1,
  main: function (nos) {
    const devices = [{ name: "bfsAccess", objectName: "fd" }];
    this.shell.loadDevices(devices, this);

    const args = this.shell.parseCommand(this.shell.lastCmd);

    const path = this.shell.pathLib;

    const resolvePathHelper = (rawPath) => {
      const homeDirectory = this.shell.home || "/home";
      const currentWorkingDirectory = this.shell.pwd;

      if (rawPath === "~") rawPath = "~/";
      else if (rawPath === ".") rawPath = "./";

      if (rawPath.startsWith("~/")) {
        return path.posix.join(homeDirectory, rawPath.substring(2));
      } else if (rawPath.startsWith("./")) {
        return path.posix.join(currentWorkingDirectory, rawPath.substring(2));
      } else if (rawPath.startsWith("/")) {
        return rawPath; // Absolute path
      } else {
        // Relative to current working directory
        return path.posix.join(currentWorkingDirectory, rawPath);
      }
    };

    // Fungsi untuk mengembangkan pola wildcard (seperti * dan ?)
    const expandWildcard = (pattern) => {
      // Handle wildcard patterns like /base/* or *.js
      if (pattern.includes('*')) {
        // Simple path parsing without relying on path.posix
        const lastSlashIndex = pattern.lastIndexOf('/');
        let dirPath, filePattern;

        if (lastSlashIndex === -1) {
          // No slash found, pattern is in current directory
          dirPath = '.';
          filePattern = pattern;
        } else {
          dirPath = pattern.substring(0, lastSlashIndex) || '/';
          filePattern = pattern.substring(lastSlashIndex + 1);
        }

        if (!this.fd.existsSync(dirPath)) {
          return [];
        }

        try {
          // Periksa apakah direktori ada
          const stat = this.fd.statSync(dirPath);
          if (!stat || !stat.isDirectory || !stat.isDirectory()) {
            return [];
          }

          // Ambil daftar file di direktori
          const items = this.fd.readdirSync(dirPath, { withFileTypes: true });
          if (!items || items.length === 0) {
            return [];
          }

          const matchedPaths = [];

          // Convert shell pattern to regex
          // Escape special regex characters except * which we'll convert to .*
          const escapeRegExp = (string) => {
            return string.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
          };

          const regexPattern = escapeRegExp(filePattern);
          const regex = new RegExp(`^${regexPattern}$`);

          for (const item of items) {
            // Pastikan item memiliki properti name
            const itemName = item.name || item;
            if (regex.test(itemName)) {
              // Simple path joining
              const fullPath = dirPath === '/' ? `/${itemName}` : `${dirPath}/${itemName}`;
              matchedPaths.push(fullPath);
            }
          }

          return matchedPaths;
        } catch (e) {
          this.crt.textOut(`Error membaca direktori ${dirPath}: ${e.message}`);
          return [];
        }
      } else {
        return [pattern];
      }
    };

    const showSyntax = () => {
      this.crt.textOut(`Syntax: ${args.command} <target>`);
      this.terminate();
    };

    if (!args.params._ || args.params._.length < 1) {
      showSyntax();
      return;
    }

    const rawTargetString = args.params._[0];

    // Expand wildcard patterns
    const expandedTargets = expandWildcard(resolvePathHelper(rawTargetString));

    if (expandedTargets.length === 0) {
      this.crt.textOut(`Error: Tidak ada file yang cocok dengan pola '${rawTargetString}'`);
      this.terminate();
      return;
    }

    // Check if targets exist
    for (const targetPath of expandedTargets) {
      if (!this.fd.existsSync(targetPath)) {
        this.crt.textOut(`Error: File '${targetPath}' tidak ditemukan.`);
        this.terminate();
        return;
      }
    }

    const deleteFile = (filePath) => {
      this.fd.unlinkSync(filePath);
      this.crt.textOut(`Deleted file: ${filePath}`);
    };

    const isRecursive = args.params.R || false;

    const deleteFolder = (folderPath) => {
      const items = this.fd.readdirSync(folderPath).map((name) => {
        const stats = this.fd.statSync(folderPath + "/" + name);
        return { name, isDirectory: stats.isDirectory(), isFile: stats.isFile() };
      });
      if (items.length === 0) {
        this.fd.rmdirSync(folderPath); // Use rmdirSync from this.fd
        this.crt.textOut(`Deleted empty folder: ${folderPath}`);
        return;
      }
      if (!isRecursive) {
        this.crt.textOut(`Error: Directory '${folderPath}' is not empty. Use -R to remove recursively.`);
        this.terminate();
        return;
      }
      for (const item of items) {
        const itemPath = folderPath + "/" + item.name;
        if (item.isDirectory) {
          deleteFolder(itemPath);
        } else if (item.isFile) {
          deleteFile(itemPath);
        }
      }
      this.fd.rmdirSync(folderPath);
      this.crt.textOut(`Deleted folder: ${folderPath}`);
    };

    // Process each target
    for (const targetPath of expandedTargets) {
      try {
        const stats = this.fd.statSync(targetPath);
        if (stats.isDirectory()) {
          deleteFolder(targetPath);
        } else {
          deleteFile(targetPath);
        }
      } catch (e) {
        this.crt.textOut(`Error saat menghapus ${targetPath}: ${e.message}`);
      }
    }

    this.crt.textOut("Operasi penghapusan selesai.");
    this.terminate();
  },
};
