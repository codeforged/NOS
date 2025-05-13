
const CryptoJS = require("crypto-js");

class AES256Agent {
  static name = "AES256";
  static description = "This is AES256 encryption/decryption";
  constructor(key) {
    this.name = AES256Agent.name;
    this.description = AES256Agent.description;
    
    this.setKey(key);
  }

  setKey(key) {
    this.key = key;
  }

  cipher(data) {
    return CryptoJS.AES.encrypt(data, this.key).toString();
  }

  decipher(data) {
    return CryptoJS.AES.decrypt(data, this.key).toString(CryptoJS.enc.Utf8);
  }
}

module.exports = AES256Agent;


// module.exports = {
//   instanceName: "aes256",
//   name: "aes256",
//   version: 0.1,
//   author: "Andriansah",
//   needRoot: true,
//   main: function (nos) {
//     this.display = this.shell.crt;
//     const key = nos.sysConfig.secureShell.key

//     let CryptoJS = require("crypto-js");
//     const agent = {
//       name: "AES256",
//       description: "This is AES256 encryption/decryption",
//       cipher:(data) => CryptoJS.AES.encrypt(data, nos.sysConfig.secureShell.key).toString(),
//       decipher: (data) => CryptoJS.AES.decrypt(data, nos.sysConfig.secureShell.key).toString(CryptoJS.enc.Utf8)
//     }
    
//     nos.__CORE.encryption.registerEncryption(agent);       
//     this.display.textOut(`✅ AES256 successfully registered.`);
//     // this.shell.terminate();
//   }
// }