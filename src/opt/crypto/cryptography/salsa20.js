// Modul enkripsi Salsa20 untuk NOS
// Author: Andriansah
// Pola mengikuti chacha20poly.js

class Salsa20Agent {
  static name = "salsa20";
  static description = "Salsa20 Stream Cipher";
  constructor(key) {
    this.name = Salsa20Agent.name;
    this.description = Salsa20Agent.description;
    this.setKey(key);
  }

  setKey(key) {
    // Kunci harus 32 byte (256 bit) untuk Salsa20
    this.key = Buffer.isBuffer(key) ? key : Buffer.from(key);
    if (this.key.length !== 32) throw new Error("Key harus 256 bit (32 byte)");
  }

  cipher(data) {
    const salsa20 = require("salsa20");
    const iv = Buffer.alloc(8, 0); // IV 8 byte (bisa diganti random)
    const plaintext = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
    const cipher = new salsa20(this.key, iv);
    const encrypted = cipher.encrypt(plaintext);
    return Buffer.concat([iv, encrypted]).toString("hex");
  }

  decipher(data) {
    const salsa20 = require("salsa20");
    const buffer = Buffer.from(data, "hex");
    const iv = buffer.slice(0, 8);
    const ciphertext = buffer.slice(8);
    const cipher = new salsa20(this.key, iv);
    const decrypted = cipher.decrypt(ciphertext);
    return decrypted.toString("utf8");
  }
}

module.exports = Salsa20Agent;
