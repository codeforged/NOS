module.exports = {
  name: "mv",
  version: 0.1,
  main: function (nos) {
    const devices = [{ name: "bfsAccess", objectName: "fd" }];
    this.shell.loadDevices(devices, this);

    const args = this.shell.parseCommand(this.shell.lastCmd);

    const path = nos.path; // Assuming nos.path is available and provides posix-like join

    const resolvePathHelper = (rawPath) => {
      const homeDirectory = this.shell.home || '/home';
      const currentWorkingDirectory = this.shell.pwd;

      if (rawPath === '~') rawPath = '~/'
      else if (rawPath === '.') rawPath = './'

      if (rawPath.startsWith('~/')) {
        return path.posix.join(homeDirectory, rawPath.substring(2));
      } else if (rawPath.startsWith('./')) {
        return path.posix.join(currentWorkingDirectory, rawPath.substring(2));
      } else if (rawPath.startsWith('/')) {
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
      this.crt.textOut(`Syntax: ${args.command} <source> <destination>`);
      this.terminate();
    };

    if (!args.params._ || args.params._.length < 2) {
      showSyntax();
      return;
    }

    const rawSourceString = args.params._[0];
    const rawDestPathString = args.params._[1];
    let resolvedDestPath = resolvePathHelper(rawDestPathString);

    // Expand wildcard patterns in source
    const expandedSources = expandWildcard(resolvePathHelper(rawSourceString));

    if (expandedSources.length === 0) {
      this.crt.textOut(`Error: Tidak ada file yang cocok dengan pola '${rawSourceString}'`);
      this.terminate();
      return;
    }

    // Check if all source paths exist
    for (const sourcePath of expandedSources) {
      if (!this.fd.existsSync(sourcePath)) {
        this.crt.textOut(`Error: File sumber '${sourcePath}' tidak ditemukan.`);
        this.terminate();
        return;
      }
    }

    // Ensure destination directory exists for multiple files/wildcard move
    if (expandedSources.length > 1 || rawSourceString.includes('*')) {
      // For wildcard or multiple files, destination must be a directory
      if (!this.fd.existsSync(resolvedDestPath)) {
        if (rawDestPathString.endsWith('/') || rawDestPathString === '~' || rawDestPathString === '.') {
          // Explicitly looks like a directory, create it
          try {
            this.fd.mkdirSync(resolvedDestPath, { recursive: true });
          } catch (e) {
            this.crt.textOut(`Error membuat direktori ${resolvedDestPath}: ${e.message}`);
            this.terminate();
            return;
          }
        } else {
          this.crt.textOut(`Error: Untuk memindahkan beberapa file, destinasi harus berupa direktori.`);
          this.terminate();
          return;
        }
      } else if (!this.fd.statSync(resolvedDestPath).isDirectory()) {
        this.crt.textOut(`Error: Untuk memindahkan beberapa file, destinasi harus berupa direktori.`);
        this.terminate();
        return;
      }
    }

    const moveFile = (src, dest) => {
      const data = this.fd.readFileSync(src);
      this.fd.writeFileSync(dest, data);
      this.fd.unlinkSync(src);
      this.crt.textOut(`Dipindahkan: ${src} ke ${dest}`);
    };

    const moveFolder = (srcDir, destDir) => {
      if (!this.fd.existsSync(destDir)) {
        this.fd.mkdirSync(destDir, { recursive: true });
      }
      const items = this.fd.readdirSync(srcDir, { withFileTypes: true });
      for (const item of items) {
        const srcPath = srcDir + '/' + item.name;
        const destPath = destDir + '/' + item.name;
        if (item.isDirectory()) {
          moveFolder(srcPath, destPath);
        } else if (item.isFile()) {
          moveFile(srcPath, destPath);
        }
      }
      this.fd.rmdirSync(srcDir);
      this.crt.textOut(`Dipindahkan: direktori ${srcDir} ke ${destDir}`);
    };

    // Process each source file/directory
    for (const sourcePath of expandedSources) {
      const sourceIsDirectory = this.fd.statSync(sourcePath).isDirectory();
      let finalDestinationPath;

      // Determine final destination path
      if (this.fd.existsSync(resolvedDestPath) && this.fd.statSync(resolvedDestPath).isDirectory()) {
        // Case 1: Destination exists and is a directory. Items will be placed inside it.
        finalDestinationPath = path.posix.join(resolvedDestPath, path.posix.basename(sourcePath));
      } else if (rawDestPathString.endsWith('/') || rawDestPathString === '~' || rawDestPathString === '.') {
        // Case 2: Destination string explicitly indicates a target directory
        finalDestinationPath = path.posix.join(resolvedDestPath, path.posix.basename(sourcePath));
      } else if (expandedSources.length === 1) {
        // Case 3: Single file, destination can be a specific file name
        finalDestinationPath = resolvedDestPath;
      } else {
        // Multiple files, destination must be directory
        finalDestinationPath = path.posix.join(resolvedDestPath, path.posix.basename(sourcePath));
      }

      // For file moving, ensure parent directory exists
      if (!sourceIsDirectory) {
        const parentDir = path.posix.dirname(finalDestinationPath);
        if (!this.fd.existsSync(parentDir)) {
          try {
            this.fd.mkdirSync(parentDir, { recursive: true });
          } catch (e) {
            this.crt.textOut(`Error membuat direktori ${parentDir}: ${e.message}`);
            continue;
          }
        }
      }

      // Check for moving directory into itself or subdirectory
      if (sourceIsDirectory) {
        if (finalDestinationPath.startsWith(sourcePath + '/') || finalDestinationPath === sourcePath) {
          this.crt.textOut(`Error: Tidak dapat memindahkan direktori '${sourcePath}' ke dalam dirinya sendiri atau subdirektorinya.`);
          continue;
        }
      }

      // Perform the move operation
      try {
        if (sourceIsDirectory) {
          moveFolder(sourcePath, finalDestinationPath);
        } else {
          moveFile(sourcePath, finalDestinationPath);
        }
      } catch (e) {
        this.crt.textOut(`Error memindahkan ${sourcePath}: ${e.message}`);
      }
    }

    this.crt.textOut("Operasi pemindahan selesai.");
    this.terminate();
  },
};
