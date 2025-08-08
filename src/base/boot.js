module.exports = {
  name: "boot",
  instanceName: "__boot",
  showBanner: () => {
    // let banner = "\r\n" + "Ficus Elastica\r\n" + "author: K1ngUn1c0rn🦄";
    // console.log(banner);
  },

  main: async function (nos) {
    // this.showBanner(); // Menampilkan banner

    try {
      await nos.executeModule("/base/", "sysinit.js", () => { }, null, true);
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  },
};
