module.exports = function (envParams) {
  __APP.defaultComm = "comm";

  if (!envParams.nos.__CORE) envParams.nos.__CORE = {};
  if (!envParams.nos.__CORE.encryption) {
    envParams.nos.__CORE.encryption = this.core_encryption;
  }
  const EncryptionCore = require(`${envParams.nos.basePath}/lib/encryption_core`);
  envParams.nos.__CORE.encryption = new EncryptionCore();
  __APP.core.encryption = envParams.nos.__CORE.encryption;

  const AES256Agent = require(`${envParams.nos.basePath}/opt/crypto/cryptography/aes-agent`);
  const ChaCha20Agent = require(`${envParams.nos.basePath}/opt/crypto/cryptography/chacha20poly`);
  const RSAAgent = require(`${envParams.nos.basePath}/opt/crypto/cryptography/rsa-agent`);
  const noneEncryption =
    require(`${envParams.nos.basePath}/opt/crypto/cryptography/none-encryption`).noneEncryption;
  const reverseEncryption =
    require(`${envParams.nos.basePath}/opt/crypto/cryptography/none-encryption`).reverseEncryption;

  // Register semua agent class
  envParams.nos.__CORE.encryption.registerEncryption(AES256Agent);
  envParams.nos.__CORE.encryption.registerEncryption(ChaCha20Agent);
  envParams.nos.__CORE.encryption.registerEncryption(RSAAgent);
  envParams.nos.__CORE.encryption.registerEncryption(noneEncryption);
  envParams.nos.__CORE.encryption.registerEncryption(reverseEncryption);

  // create instance encryption               
  envParams.nos.__CORE.encryption.addInstance("none", "none");
  envParams.nos.__CORE.encryption.addInstance("RSA", "RSA");
  envParams.nos.__CORE.encryption.addInstance(
    "chacha20-poly1305",
    "chacha20-poly1305",
    envParams.nos.sysConfig.chacha20poly.key
  );
  envParams.nos.__CORE.encryption.addInstance(
    "chacha20-poly1305-comm1",
    "chacha20-poly1305",
    envParams.nos.sysConfig.chacha20poly.esp32key
  );
  envParams.nos.__CORE.encryption.setSecurityAgent(
    envParams.mqtnlDriver,
    "none"
  );
  envParams.nos.__CORE.encryption.setSecurityAgent(
    envParams.mqtnlDriver2,
    "chacha20-poly1305-comm1"
  );
};
