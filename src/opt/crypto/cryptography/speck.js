// Modul enkripsi SPECK untuk NOS
// Author: Andriansah
// Pola mengikuti chacha20poly.js

class SpeckAgent {
  static name = "speck";
  static description = "Speck Lightweight Block Cipher";
  constructor(key) {
    this.name = SpeckAgent.name;
    this.description = SpeckAgent.description;
    this.setKey(key);
  }

  setKey(key) {
    // Kunci harus 16 byte (128 bit) untuk Speck128/128
    this.key = Buffer.isBuffer(key) ? key : Buffer.from(key);
    if (this.key.length !== 16) throw new Error("Key harus 128 bit (16 byte)");
  }

  cipher(data) {
    // Implementasi sederhana Speck128/128 (ECB, untuk demo, bukan untuk produksi)
    // Untuk produksi, gunakan mode CBC/CTR dan padding yang benar
    const speckjs = require("speckjs");
    const cipher = new speckjs.Speck128(this.key);
    const plaintext = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
    const padded = Buffer.concat([
      plaintext,
      Buffer.alloc(16 - (plaintext.length % 16), 0),
    ]);
    let encrypted = Buffer.alloc(padded.length);
    for (let i = 0; i < padded.length; i += 16) {
      cipher.encrypt(padded.slice(i, i + 16)).copy(encrypted, i);
    }
    return encrypted.toString("hex");
  }

  decipher(data) {
    const speckjs = require("speckjs");
    const cipher = new speckjs.Speck128(this.key);
    const ciphertext = Buffer.from(data, "hex");
    let decrypted = Buffer.alloc(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i += 16) {
      cipher.decrypt(ciphertext.slice(i, i + 16)).copy(decrypted, i);
    }
    // Hilangkan padding null
    return decrypted.toString("utf8").replace(/\x00+$/, "");
  }
}

module.exports = SpeckAgent;
