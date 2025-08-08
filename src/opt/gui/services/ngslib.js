module.exports = {
  instanceName: "nosdesktop",
  name: "NOS Desktop",
  version: 0.6,
  needRoot: true,
  author: "Andriansah",
  main: function (nos) {
    var devices = [
      { name: "websocket1", objectName: "ws" },
      { name: "bfsAccess", objectName: "fa" }
    ];
    this.failed = !this.shell.loadDevices(devices, this);
    if (this.failed) {
      this.shell.terminate();
      return;
    }


    // Namespace untuk fungsi-fungsi generik NGS Services
    this.ws.remoteFunction.ngsLib = {};

    // Fungsi loadImage: ambil gambar dari server dan kirim ke client
    this.ws.remoteFunction.ngsLib.loadImage = (params) => {
      // params: [imagePath]
      let imagePath = params[0];
      let pic = {
        imagePath,
        imageData: null,
        imageMime: ""
      };
      if (this.fa.existsSync(imagePath)) {
        pic.imageData = this.fa.readBinaryFileSync(imagePath).toString('base64');
        const ext = imagePath.split('.').pop().toLowerCase();
        const mimeTypes = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp'
        };
        pic.imageMime = mimeTypes[ext] || 'image/jpeg';
        return btoa(JSON.stringify(pic));
      }
    };
    this.crt.textOut(`✅ NGS Library loaded`);
  }
};
