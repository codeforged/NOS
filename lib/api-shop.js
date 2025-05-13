// ============================================
// NOSPacketFlow.js (renamed: chaSharekey)
// Refactored: centralized handler logic
// ============================================

const NOSPacketStackV2 = require("./NOSPacketStackV2");
const crypto = require("crypto");

class chaSharekey extends NOSPacketStackV2 {
  constructor(connection) {
    super(connection);

    this._sharedKeyHandler = null;
    this._decryptedHandler = null;

    this.setHandler((payload, src) => {
      if (typeof payload === "string") {
        if (payload === "__request::key-exchange") {
          return this._sharedKeyHandler?.("request", src);
        } else if (payload.startsWith("__pubkey::")) {
          return this._sharedKeyHandler?.("pubkey", src, payload);
        } else if (payload.startsWith("__secretkey::")) {
          return this._sharedKeyHandler?.("secretkey", src, payload);
        } else if (payload === "__status::done") {
          return this._sharedKeyHandler?.("done", src);
        }
      }

      if (typeof this._decryptedHandler === "function") {
        this._decryptedHandler(payload, src);
      }
    });
  }

  negotiateKeyExchangeAsServer(rsaKeyPair, onGotSharedKey = null) {
    this._sharedKeyHandler = (type, src, payload) => {
      if (type === "request") {
        // this.getSession(src).established = false;
        // console.log(`[Master] kirim publickey ke ${JSON.stringify(src)}`);
        this.send(src, `__pubkey::${rsaKeyPair.publicKey}`);
      } else if (type === "secretkey") {
        const encrypted = payload.split("::")[1];
        const sharedKey = crypto.privateDecrypt(
          {
            key: rsaKeyPair.privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          },
          Buffer.from(encrypted, "hex")
        );
        this.send(src, `__status::done`);
        // this.getSession(src).established = true;
        if (onGotSharedKey) onGotSharedKey("" + sharedKey.toString("hex"), src);
      }
    };
  }

  negotiateKeyExchangeAsClient(dst, makeSharedKeyFn, onFinish) {
    const sharedKey = makeSharedKeyFn();
    let waiting = true;

    this._sharedKeyHandler = (type, src, payload) => {
      if (!waiting) return;
      if (type === "pubkey") {
        const pub = payload.split("::")[1];
        const encrypted = crypto
          // .publicEncrypt(pub, Buffer.from(sharedKey, "hex"))
          .publicEncrypt({
            key: pub,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          }, Buffer.from(sharedKey, "hex"))
          .toString("hex");
        this.send(dst, `__secretkey::${encrypted}`);
      } else if (type === "done") {
        this.getSession(src).established = true;
        waiting = false;
        if (typeof onFinish === "function") onFinish(sharedKey, dst);
      }
    };

    this.send(dst, "__request::key-exchange");
  }

  onDecryptedMessage(callback) {
    this._decryptedHandler = callback;
  }
}

module.exports = { chaSharekey };
