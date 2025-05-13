const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("❌ Gunakan: node pkg_signer.js <input_file.json> <output_file.signed>");
  process.exit(1);
}

if (!fs.existsSync("private.pem") || !fs.existsSync("public.pem")) {
  // Dummy private & public RSA keypair (for test only)
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  // Simpan ke file agar bisa dicek ulang kalau perlu
  fs.writeFileSync("private.pem", privateKey.export({ type: 'pkcs1', format: 'pem' }));
  fs.writeFileSync("public.pem", publicKey.export({ type: 'pkcs1', format: 'pem' }));
}


// Load private key
const privateKey = fs.readFileSync("private.pem", "utf8");
const publicKey = fs.readFileSync("public.pem", "utf8");

const inputFile = args[0];
const outputFile = args[1];

// Baca file package asli
let raw;
try {
  raw = fs.readFileSync(inputFile, "utf8");
} catch (err) {
  console.error("❌ Gagal membaca file:", err.message);
  process.exit(1);
}

let pkgData;
try {
  pkgData = JSON.parse(raw).packages;
} catch (err) {
  console.error("❌ Format JSON tidak valid:", err.message);
  process.exit(1);
}

// Proses hash isi file src
for (const pkg of pkgData) {
  if (Array.isArray(pkg.items)) {
    for (const item of pkg.items) {
      try {
        const fileContent = fs.readFileSync("../../" + item.src);
        const serialized = fileContent;
        const hash = crypto.createHash('sha256').update(serialized).digest();
        item.signature = crypto.sign("sha256", hash, privateKey).toString('base64');
        // const hash = crypto.createHash("sha256").update(fileContent).digest("hex");
        // item.hash = hash;
      } catch (err) {
        console.warn(`⚠️  Tidak bisa baca file: ${item.src} (${err.message})`);
        item.hash = null;
      }
    }
  }
}

// Hitung signature total
const serialized = JSON.stringify(pkgData);
const hash = crypto.createHash('sha256').update(serialized).digest();
const signature = crypto.sign("sha256", hash, privateKey).toString('base64');
// const signature = crypto.createHash("sha256").update(serialized).digest("hex");

// Gabungkan dan simpan
const signed = {
  packages: pkgData,
  signature: signature,
  publicKey: publicKey
};

try {
  fs.writeFileSync(outputFile, JSON.stringify(signed, null, 2));
  console.log(`✅ File berhasil ditandatangani dengan hash isi file dan disimpan ke ${outputFile}`);
} catch (err) {
  console.error("❌ Gagal menulis file output:", err.message);
}
