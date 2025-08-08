module.exports = {
  application: (uuid) => {
    let appName = "testngslib";
    let appTitle = "NGS Lib Tester";

    return {
      header: {
        appName,
        appTitle,
        version: "1.0",
        uuid,
        active: true,
        icon: "/opt/gui/images/icon/icon_32_drive.png",
        iconSmall: "icon_16_app.png",
        iconMedium: "icon_22_app.png",
        iconLarge: "icon_32_app.png",
        resizable: true,
        width: 500,
        height: 400
      },
      content: `
          	<style type="text/css">
            	.main-container {
              	padding: 10px;
              }
            </style>
            <div class="main-container" data-app="${appName}" data-uuid="${uuid}">
              <img class="image1"/>
            </div>`,
      main: (sender, nos) => {
        // Optional backend logic (NOS side)
      },
      jsContent: (app) => {
        // Frontend logic (browser side)
        const container = document.querySelector(`.main-container[data-uuid="${app.header.uuid}"]`);

        // Contoh penggunaan ngsLibCall
        // app.ngsLibCall("loadImage", ["/mnt/local/babam1.jpeg"], (pic) => {
        //   app.setRemoteImage(pic, container.querySelector(".image1"));
        // });


        // Contoh penggunaan ngsLibCallAsync
        // (async () => {
        //   try {
        //     const myPic = await app.ngsLibCallAsync("loadImage", ["/opt/gui/images/layoutrumah.png"]);
        //     const img = container.querySelector(".image1");
        //     img.src = `data:${myPic.imageMime};base64,${myPic.imageData}`;
        //   } catch (err) {
        //     console.error("Gagal load image:", err);
        //   }
        // })();

        // Contoh penggunaan loadRemoteImage

        app.loadRemoteImage("/opt/gui/images/babam1.jpeg", (pic) =>
          app.setRemoteImage(pic, container.querySelector(".image1")));

        // Contoh penggunaan loadRemoteImageAsync
        // (async () => {
        //   try {
        //     myPic = await app.loadRemoteImageAsync("/opt/gui/images/layoutrumah.png");
        //     const img = container.querySelector(".image1");
        //     img.src = `data:${myPic.imageMime};base64,${myPic.imageData}`;
        //   } catch (err) {
        //     console.error("Gagal load image:", err);
        //   }
        // })();
      }
    };
  }
};