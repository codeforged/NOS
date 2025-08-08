// console.log("Ini dari default-startup.js");
if (profile.wallpaper && profile.wallpaper.data) {
  $("body").desktop(
    "setWallpaper",
    `data:${profile.wallpaper.mime};base64,${profile.wallpaper.data}`
  );
}