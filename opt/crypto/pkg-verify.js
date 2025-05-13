const fs = require("fs");
const crypto = require("crypto");

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log("❌ Gunakan: node pkg_verify.js <signed_file.json>");
  process.exit(1);
}

const signedFile = args[0];

// Baca file signed
let raw;
try {
  raw = fs.readFileSync(signedFile, "utf8");
} catch (err) {
  console.error("❌ Gagal membaca file:", err.message);
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(raw);
} catch (err) {
  console.error("❌ File bukan format JSON valid:", err.message);
  process.exit(1);
}

if (!parsed.packages || !parsed.signature) {
  console.error("❌ Format file signed tidak valid.");
  process.exit(1);
}

// Verifikasi signature global
const dataToVerify = JSON.stringify(parsed.packages);
const hash = crypto.createHash('sha256').update(dataToVerify).digest();
const isSignatureValid = crypto.verify("sha256", hash, parsed.publicKey, Buffer.from(parsed.signature, 'base64'));
// const dataString = JSON.stringify(parsed.packages);
// const recalculatedSig = crypto.createHash("sha256").update(dataString).digest("hex");

if (isSignatureValid) {
  console.log("✅ Signature global valid.");
} else {
  console.error("❌ Signature global TIDAK VALID! File mungkin telah dimodifikasi.");
}

// Verifikasi hash tiap item
let errorCount = 0;
for (const pkg of parsed.packages) {
  pkg.valid = true;
  if (Array.isArray(pkg.items)) {
    for (const item of pkg.items) {
      if (!item.src || !item.signature) {
        console.warn(`⚠️  Item tidak lengkap:`, item);
        continue;
      }
      try {
        const content = fs.readFileSync("../" + item.src);
        const dataToVerify = content;
        const hash = crypto.createHash('sha256').update(dataToVerify).digest();
        const isSignatureValid = crypto.verify("sha256", hash, parsed.publicKey, Buffer.from(item.signature, 'base64'));
        // const content = fs.readFileSync("../" + item.src);
        // const hash = crypto.createHash("sha256").update(content).digest("hex");

        if (isSignatureValid) {
          console.log(`✅ File signature valid: ${item.src}`);
        } else {
          pkg.valid = false;
          console.error(`❌ Signature invalid: ${pkg.name} ${item.src}`);
          errorCount++;
        }
      } catch (err) {
        console.error(`❌ Gagal baca file ${item.src}: ${err.message}`);
        errorCount++;
      }
    }
  }
}

console.log();
for (const pkg of parsed.packages) {
  console.log(pkg.name + " [" + (pkg.active === true ? "Active" : "Inactive") + "] is " + (pkg.valid === true ? "✅ Valid" : "❌ Invalid"))
}
console.log();

if (errorCount === 0) {
  console.log("🎉 Semua file valid dan sesuai dengan hash.");
} else {
  console.warn(`⚠️  Ada ${errorCount} file yang tidak valid atau bermasalah.`);
}
