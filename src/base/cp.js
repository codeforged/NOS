module.exports = {
  name: "cp",
  version: 0.1,
  main: function (nos) {
    const devices = [{ name: "bfsAccess", objectName: "fd" }];
    this.shell.loadDevices(devices, this);

    const args = this.shell.parseCommand(this.shell.lastCmd);

    const path = this.shell.pathLib;

    // Simple path joining function
    const joinPath = (dir, file) => {
      if (dir === '/') return `/${file}`;
      if (dir.endsWith('/')) return `${dir}${file}`;
      return `${dir}/${file}`;
    };

    // Simple basename function
    const basename = (path) => {
      const lastSlash = path.lastIndexOf('/');
      return lastSlash === -1 ? path : path.substring(lastSlash + 1);
    };

    // Simple dirname function
    const dirname = (path) => {
      const lastSlash = path.lastIndexOf('/');
      if (lastSlash === -1) return '.';
      if (lastSlash === 0) return '/';
      return path.substring(0, lastSlash);
    };

    const resolvePathHelper = (rawPath) => {
      const homeDirectory = this.shell.home || '/home';
      const currentWorkingDirectory = this.shell.pwd;

      if (rawPath === '~') rawPath = '~/'
      else if (rawPath === '.') rawPath = './'

      if (rawPath.startsWith('~/')) {
        return joinPath(homeDirectory, rawPath.substring(2));
      } else if (rawPath.startsWith('./')) {
        return joinPath(currentWorkingDirectory, rawPath.substring(2));
      } else if (rawPath.startsWith('/')) {
        return rawPath; // Absolute path
      } else {
        // Relative to current working directory
        return joinPath(currentWorkingDirectory, rawPath);
      }
    };

    const expandWildcard = (pattern) => {
      // Handle wildcard patterns like /base/*
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
          // this.crt.textOut(`Debug: Direktori '${dirPath}' tidak ditemukan saat mencari pola '${filePattern}'`);
          return [];
        }

        try {
          // Periksa apakah direktori ada
          const stat = this.fd.statSync(dirPath);
          if (!stat || !stat.isDirectory || !stat.isDirectory()) {
            // this.crt.textOut(`Debug: '${dirPath}' bukan direktori.`);
            return [];
          }

          // Ambil daftar file di direktori
          const items = this.fd.readdirSync(dirPath, { withFileTypes: true });
          if (!items || items.length === 0) {
            // this.crt.textOut(`Debug: Direktori '${dirPath}' kosong.`);
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

          // Debug output - hanya saat troubleshooting
          // this.crt.textOut(`Debug: Mencari file di '${dirPath}' dengan pola regex: ${regex.toString()}`);
          // this.crt.textOut(`Debug: Daftar file di direktori: ${items.map(item => item.name).join(', ')}`);

          for (const item of items) {
            // Pastikan item memiliki properti name
            const itemName = item.name || item;
            if (regex.test(itemName)) {
              // Simple path joining
              const fullPath = dirPath === '/' ? `/${itemName}` : `${dirPath}/${itemName}`;
              matchedPaths.push(fullPath);
              // this.crt.textOut(`Debug: File cocok: ${fullPath}`);
            }
          }

          return matchedPaths;
        } catch (e) {
          this.crt.textOut(`Error reading directory ${dirPath}: ${e.message}`);
          return [];
        }
      } else {
        return [pattern];
      }
    };

    const showSyntax = () => {
      this.crt.textOut(`Syntax: ${args.command} <source> <destination>`);
      this.crt.textOut(`Examples:`);
      this.crt.textOut(`  ${args.command} file.txt /home/backup/`);
      this.crt.textOut(`  ${args.command} /base/* /home/base/`);
      this.terminate();
    };

    if (!args.params._ || args.params._.length < 2) {
      showSyntax();
      return;
    }

    const rawSourceString = args.params._[0];
    const rawDestPathString = args.params._[1];
    let resolvedDestPath = resolvePathHelper(rawDestPathString);

    // Expand wildcard patterns
    const expandedSources = expandWildcard(resolvePathHelper(rawSourceString));

    if (expandedSources.length === 0) {
      // Debug: Tampilkan detail untuk membantu diagnosa masalah
      this.crt.textOut(`Error: Tidak ada file yang cocok dengan pola '${rawSourceString}'`);
      this.terminate();
      return;
    }

    // Check if all source paths exist
    for (const sourcePath of expandedSources) {
      // this.crt.textOut(`Debug: Memeriksa file: ${sourcePath}`);
      if (!this.fd.existsSync(sourcePath)) {
        this.crt.textOut(`Error: File sumber '${sourcePath}' tidak ditemukan.`);
        this.terminate();
        return;
      }
    }

    // Ensure destination directory exists for multiple files/wildcard copy
    if (expandedSources.length > 1 || rawSourceString.includes('*')) {
      // For wildcard or multiple files, destination must be a directory
      if (!rawDestPathString.endsWith('/') && rawDestPathString !== '~' && rawDestPathString !== '.') {
        // If destination doesn't explicitly look like a directory, treat it as one
        if (!this.fd.existsSync(resolvedDestPath)) {
          resolvedDestPath = rawDestPathString.endsWith('/') ? resolvedDestPath : resolvedDestPath + '/';
        } else if (!this.fd.statSync(resolvedDestPath).isDirectory()) {
          this.crt.textOut(`Error: When copying multiple files, destination must be a directory.`);
          this.terminate();
          return;
        }
      }

      // Create destination directory if it doesn't exist
      if (!this.fd.existsSync(resolvedDestPath)) {
        try {
          this.fd.mkdirSync(resolvedDestPath, { recursive: true });
        } catch (e) {
          this.crt.textOut(`Error creating directory ${resolvedDestPath}: ${e.message}`);
          this.terminate();
          return;
        }
      }
    }

    const copyFile = (src, dest) => {
      try {
        // const data = this.fd.readFileSync(src, true, "latin1");
        const data = this.fd.readBinaryFileSync(src);
        this.fd.writeFileSync(dest, data);
        this.crt.textOut(`Copied: ${src} to ${dest}`);
      } catch (e) {
        this.crt.textOut(`Error copying ${src}: ${e.message}`);
      }
    };

    const copyFolder = (srcDir, destDir) => {
      try {
        if (!this.fd.existsSync(destDir)) {
          this.fd.mkdirSync(destDir, { recursive: true });
        }
        const items = this.fd.readdirSync(srcDir, { withFileTypes: true });
        for (const item of items) {
          const srcPath = path.posix.join(srcDir, item.name);
          const destPath = path.posix.join(destDir, item.name);
          if (item.isDirectory()) {
            copyFolder(srcPath, destPath);
          } else if (item.isFile()) {
            copyFile(srcPath, destPath);
          }
        }
      } catch (e) {
        this.crt.textOut(`Error copying folder ${srcDir}: ${e.message}`);
      }
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

      // For file copying, ensure parent directory exists
      if (!sourceIsDirectory) {
        const parentDir = path.posix.dirname(finalDestinationPath);
        if (!this.fd.existsSync(parentDir)) {
          try {
            this.fd.mkdirSync(parentDir, { recursive: true });
          } catch (e) {
            this.crt.textOut(`Error creating directory ${parentDir}: ${e.message}`);
            continue;
          }
        }
      }

      // Check for copying directory into itself or subdirectory
      if (sourceIsDirectory) {
        if (finalDestinationPath.startsWith(sourcePath + '/') || finalDestinationPath === sourcePath) {
          this.crt.textOut(`Error: Cannot copy directory '${sourcePath}' into itself or a subdirectory.`);
          continue;
        }
      }

      // Perform the copy operation
      if (sourceIsDirectory) {
        copyFolder(sourcePath, finalDestinationPath);
      } else {
        copyFile(sourcePath, finalDestinationPath);
      }
    }

    this.crt.textOut("Copy operation completed.");
    this.terminate();
  },
};
