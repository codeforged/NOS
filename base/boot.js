module.exports = {
  name: "boot",
  instanceName: "__boot",
  showBanner: () => {
    let banner =
      "\r\n" +
      " _   _  ____   _____ \r\n" +
      "| \\ | |/ __ \\ / ____|\r\n" +
      "|  \\| | |  | | (___  \r\n" +
      "| . ` | |  | |\\___ \\ \r\n" +
      "| |\\  | |__| |____) |\r\n" +
      "|_| \\_|\\____/|_____/       \r\n" +
      "Ochroma Pyramidale\r\n" +
      "author: K1ngUn1c0rn🦄,\r\n";
    console.log(banner);
  },

  main: function (nos) {  // Mengakses 'nos' yang dipassing ke dalam module
    this.showBanner();  // Menampilkan banner
    nos.executeModule(nos.basePath + "/base", 'sysinit.js', () => {
      // console.log("init.js telah selesai dieksekusi.");
    }, null, true);
  }
}
