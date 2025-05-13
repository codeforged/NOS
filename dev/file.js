const fs = require("fs");
const path = require("path");

class FileDriver {
  constructor(basePath) {
    this.basePath = basePath || process.cwd(); // Default to current working directory
    this.name = "fileAccess";
    this.devClass = "File Access";
    this.version = 1.2;
  }

  // Membaca isi file (async)
  readFile(filePath, callback) {
    const fullPath = path.join(this.basePath, filePath);
    fs.readFile(fullPath, "utf8", (err, data) => {
      if (err) {
        // console.error(`Error reading file ${filePath}:`, err);
        // throw err;
        return callback(err, null);
      }
      return callback(null, data);
    });
  }

  // Membaca isi file (sync)
  readFileSync(filePath, isASCII = false) {
    try {
      const fullPath = path.join(this.basePath, filePath);
      if (isASCII === true)
        return fs.readFileSync(fullPath); else
        return fs.readFileSync(fullPath, "utf8");
    } catch (err) {
      // console.error(`Error reading file ${filePath}:`, err);
      throw err;
    }
  }

  // Menulis data ke file (async)
  writeFile(filePath, data, callback) {
    const fullPath = path.join(this.basePath, filePath);
    fs.writeFile(fullPath, data, "utf8", (err) => {
      if (err) {
        // console.error(`Error writing file ${filePath}:`, err);
        return callback(err);
      }
      return callback(null);
    });
  }

  // Menulis data ke file (sync)
  writeFileSync(filePath, data, isASCII = false) {
    const fullPath = path.join(this.basePath, filePath);
    try {
      if (isASCII === true)
        fs.writeFileSync(fullPath, data); else
        fs.writeFileSync(fullPath, data, "utf8");
    } catch (err) {
      // console.error(`Error writing file ${filePath}:`, err);
      throw err;
    }
  }

  // Method untuk menambahkan isi ke file
  appendFileSync(filePath, content) {
    try {
      // Tambahkan konten ke file secara sinkron
      const fullPath = path.join(this.basePath, filePath);
      fs.appendFileSync(fullPath, content, "utf-8");
      // console.log(`Content successfully appended to ${fullPath}`);
    } catch (error) {
      console.error(`Error appending to file: ${error.message}`);
      throw error;
    }
  }

  // Mengecek apakah file ada (async)
  fileExists(filePath, callback) {
    const fullPath = path.join(this.basePath, filePath);
    fs.exists(fullPath, (exists) => {
      return callback(null, exists);
    });
  }

  // Mengecek apakah file ada (sync)
  fileExistsSync(filePath) {
    const fullPath = path.join(this.basePath, filePath);
    // console.log("**"+fullPath);
    return fs.existsSync(fullPath);
  }

  existsSync(filePath) {
    return this.fileExistsSync(filePath);
  }

  // Menghapus file (async)
  deleteFile(filePath, callback) {
    const fullPath = path.join(this.basePath, filePath);
    fs.unlink(fullPath, (err) => {
      if (err) {
        console.error(`Error deleting file ${filePath}:`, err);
        return callback(err);
      }
      return callback(null);
    });
  }

  // Menghapus file (sync)
  deleteFileSync(filePath) {
    const fullPath = path.join(this.basePath, filePath);
    try {
      fs.unlinkSync(fullPath);
    } catch (err) {
      console.error(`Error deleting file ${filePath}:`, err);
      throw err;
    }
  }

  // Membaca isi direktori (async)
  readdir(dirPath, callback) {
    const fullPath = path.join(this.basePath, dirPath);
    fs.readdir(fullPath, (err, files) => {
      if (err) {
        console.error(`Error reading directory ${dirPath}:`, err);
        return callback(err, null);
      }
      return callback(null, files);
    });
  }

  // Membaca isi direktori (sync)
  readdirSync(dirPath, options) {
    const fullPath = path.join(this.basePath, dirPath);
    try {
      return fs.readdirSync(fullPath, options);
    } catch (err) {
      console.error(`Error reading directory ${dirPath}:`, err);
      throw err;
    }
  }

  mkdirSync(path, options) {
    try {
      return fs.mkdirSync(path, options);
    } catch (err) {
      console.error(`Error create directory ${path}:`, err);
      throw err;
    }
  }

  // Mengambil konten direktori
  getDirectoryContents = function (directoryPath) {
    // const directoryPath = "." + self.pwd;
    const fs = require("fs");
    const path = require("path");
    let directories = [];
    let regularFiles = [];
    // console.log("{"+directoryPath+"}");

    const files = fs.readdirSync(directoryPath);
    // console.log('List of files and directories:');
    files.forEach((file) => {
      const fullPath = path.join(directoryPath, file);
      const isDirectory = fs.lstatSync(fullPath).isDirectory();
      if (isDirectory) directories.push(file + "/");
      else regularFiles.push(file);
      // console.log(`${file} - ${isDirectory ? 'Directory' : 'File'}`);
    });
    return directories.concat(regularFiles);
  };
}

module.exports = { FileDriver };
