path = require("path");
__APP = {};

const __NOS = require("./core.js");
const nos = new __NOS.NOS(process.argv);

nos.basePath = __dirname;
nos.executeModule("./base", "boot.js", () => {}, null, true);
//☕🚬🔨🤣😁💤😌🤦‍♂️👍😎🫡🙏👏🎉🎊✌️⚙️🏅😭💪🦾⌛⏱️⏰📄✅📁🚀🔥🚫⚡🎯❌
