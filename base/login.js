module.exports = {
  name: "login",
  version: "1.2",
  needRoot: true,
  main: function (nos) {
    const { userPrompt } = require(this.shell.basePath + "/base/basicShell"); // pastikan sudah versi stylish
    let username, passwd;

    new userPrompt({
      prompt: "Username: ",
      shell: this.shell,
      once: true,
      echo: true,
      cmdExit: ".exit"
    }, (data) => {
      username = data;
      new userPrompt({
        prompt: "Password: 🔑\u001B[?25l",
        shell: this.shell,
        once: true,
        echo: false,
        cmdExit: ".exit"
      }, (data) => {
        passwd = data;
        this.crt.write(`\u001B[?25h\n`);
        const sacredPhrases = require(this.shell.basePath + "/lib/sacredPhrases.js");
        const phrase = sacredPhrases[Math.floor(Math.random() * sacredPhrases.length)];

        const loginCheck = this.shell.checkLogin(username, passwd);
        if (loginCheck != null) {
          this.shell.rootActive = (loginCheck.userType === "root" ? true : false);
          this.shell.username = username;
          this.crt.write(`\n:: ${this.shell.version} ::\n`);
          this.crt.write(`"${phrase}" \n\n`);
          this.shell.terminate();
        } else {
          this.crt.textOut("\n-- Access Denied! --\n");
          nos.shutdown(0);
        }
      });
    });
  }
};


// module.exports = {
//   name: "login",
//   version: "1.1",
//   needRoot: true,
//   main: function (nos) {
//     const userPrompt = require(this.shell.basePath + "/base/basicShell").userPrompt;
//     let username, passwd;
//     new userPrompt("Username: ", this.shell, (data) => {
//       username = data;
//       new userPrompt("Password: 🔑\u001B[?25l", this.shell, (data) => {
//         passwd = data;
//         this.crt.write(`\u001B[?25h\n`);
//         loginCheck = this.shell.checkLogin(username, passwd);
//         if (loginCheck != null) {
//           this.shell.rootActive = (loginCheck.userType == "root" ? true : false);

//           this.shell.username = username;
//           this.crt.write(`\n:: ${this.shell.version} ::\n`);
//           this.shell.terminate();
//         } else {
//           this.crt.textOut("\n-- Access Denied! --\n");
//           nos.shutdown(0);
//         }
//       }, true, false); // <-- true is for once prompt
//     }, true); // <-- true is for once prompt        
//   }
// };