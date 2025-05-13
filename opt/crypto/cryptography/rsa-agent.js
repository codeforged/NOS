const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class RSAAgent {
  static name = "RSA";
  static version = "0.2";
  static description = "RSA Asymmetric encryption";
  constructor() {
    this.name = RSAAgent.name;
    this.description = RSAAgent.description;

    const pubPath = path.join("opt/conf/", "public.pem");
    const privPath = path.join("opt/conf/", "private.pem");
    let publicKey, privateKey;

    // Generate RSA keypair jika belum ada
    if (!fs.existsSync(pubPath) || !fs.existsSync(privPath)) {
      const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync(
        "rsa",
        {
          modulusLength: 2048,
        }
      );

      fs.writeFileSync(pubPath, pub.export({ type: "pkcs1", format: "pem" }));
      fs.writeFileSync(privPath, priv.export({ type: "pkcs1", format: "pem" }));
      // this.crt.textOut("🔑 RSA keypair generated and saved.");
    }

    publicKey = fs.readFileSync(pubPath, "utf8");
    privateKey = fs.readFileSync(privPath, "utf8");

    this.targetPubKey = publicKey;
    this.privateKey = privateKey;
  }

  setPublicKey(pubKey) {
    this.targetPubKey = pubKey;
  }

  setPrivateKey(privKey) {
    this.privateKey = privKey;
  }

  getMyPublicKey() {
    return this.privateKey
      ? crypto
          .createPublicKey(this.privateKey)
          .export({ type: "pkcs1", format: "pem" })
      : null;
  }

  cipher(data) {
    return crypto
      .publicEncrypt(
        {
          key: this.targetPubKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        Buffer.from(data)
      )
      .toString("base64");
  }

  decipher(data) {
    return crypto
      .privateDecrypt(
        {
          key: this.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        Buffer.from(data, "base64")
      )
      .toString();
  }
}

module.exports = RSAAgent;

// const fs = require("fs");
// const path = require("path");
// const crypto = require("crypto");

// module.exports = {
//   instanceName: "rsa",
//   name: "rsa",
//   version: 0.2,
//   author: "Andriansah",
//   needRoot: true,
//   main: function (nos) {
//     this.display = this.shell.crt;

//     const pubPath = path.join("home", "rsa_pub.pem");
//     const privPath = path.join("home", "rsa_priv.pem");

//     let publicKey, privateKey;

//     // Generate RSA keypair jika belum ada
//     if (!fs.existsSync(pubPath) || !fs.existsSync(privPath)) {
//       const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync("rsa", {
//         modulusLength: 2048,
//       });

//       fs.writeFileSync(pubPath, pub.export({ type: 'pkcs1', format: 'pem' }));
//       fs.writeFileSync(privPath, priv.export({ type: 'pkcs1', format: 'pem' }));
//       this.display.textOut("🔑 RSA keypair generated and saved.");
//     }

//     publicKey = fs.readFileSync(pubPath, "utf8");
//     privateKey = fs.readFileSync(privPath, "utf8");

//     const agent = {
//       name: "RSA",
//       description: "RSA asymmetric encryption for key exchange",

//       // Ambil publicKey milik sendiri
//       getMyPublicKey: () => publicKey,
//       targetPubKey: null,
//       // Enkripsi dengan publicKey lawan
//       cipher (data) {
//         return crypto.publicEncrypt(
//           { key: this.targetPubKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
//           Buffer.from(data)
//         ).toString("base64");
//       },

//       // Dekripsi dengan privateKey sendiri
//       decipher: (data) => {
//         return crypto.privateDecrypt(
//           { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
//           Buffer.from(data, "base64")
//         ).toString("utf8");
//       },

//       // Simpan publicKey lawan ke known_hosts
//       savePublicKey: (nodeName, key) => {
//         let file = "home/known_hosts.json";
//         let data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
//         data[nodeName] = {
//           publicKey: key,
//           lastSeen: new Date().toISOString()
//         };
//         fs.writeFileSync(file, JSON.stringify(data, null, 2));
//       },

//       // Ambil publicKey lawan dari known_hosts
//       getPublicKey: (nodeName) => {
//         let file = "home/known_hosts.json";
//         if (!fs.existsSync(file)) return null;
//         let data = JSON.parse(fs.readFileSync(file));
//         return data[nodeName] ? data[nodeName].publicKey : null;
//       },

//       // Handshake + kirim shared key terenkripsi pakai RSA
//       rsaHandshakeAndSecure: function (nodeName, sendFunction, algorithm, callback) {
//         const knownHostsFile = "home/known_hosts.json";

//         let hosts = fs.existsSync(knownHostsFile) ? JSON.parse(fs.readFileSync(knownHostsFile)) : {};
//         const target = hosts[nodeName];

//         if (!target || !target.publicKey) {
//           this.display.textOut(`❗ Public key for '${nodeName}' not found in known_hosts.`);
//           return;
//         }

//         const targetPubKey = target.publicKey;

//         // Generate random 256-bit secret key
//         const randomBytes = crypto.randomBytes(32);
//         const secretKey = randomBytes.toString("hex");

//         // Encrypt secretKey pakai RSA
//         const encrypted = crypto.publicEncrypt(
//           { key: targetPubKey, padding: crypto.constants.RSA_PKCS1_PADDING },
//           Buffer.from(secretKey)
//         ).toString("base64");

//         // Kirim paket pertukaran kunci
//         sendFunction({
//           type: "key-exchange",
//           algo: algorithm,
//           from: nos.nodeName || "unknown",
//           key: encrypted
//         });

//         this.display.textOut(`🔐 Secret key sent to ${nodeName} using RSA (${algorithm})`);

//         if (callback) callback(secretKey);
//       }
//     };

//     // Daftarkan agent ke NOS
//     nos.__CORE.encryption.registerEncryption(agent);
//     this.display.textOut(`✅ RSA agent successfully registered.`);
//   }
// };
