__APP.transportLayer = {
  defaultProtocol: "mqtt",
  protocols: [
    {
      name: "mqtt",
      lib: require("mqtt"),
      ip: "mqtt://62.72.31.252",
      port: 1883,
    },
    {
      name: "beeNet",
      lib: require("../../lib/beeNetClient"),
      ip: "localhost",
      port: 1884,
    },
  ],
};

//PLACE THIS AT THE BOTTOM
__APP.transportLayer.defaultProtocol = __APP.transportLayer.protocols.find(
  (item) => item.name === __APP.transportLayer.defaultProtocol
);
