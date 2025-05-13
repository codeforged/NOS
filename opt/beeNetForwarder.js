module.exports = {
    name: "beeNet Packet Forwarder",
    version: 0.2,
    main: function (nos) {
        const devices = [
            { name: __APP.defaultComm, objectName: "mqtnl" }
        ];
        this.shell.loadDevices(devices, this);
        this.display = this.shell.crt;

        const args = this.shell.parseCommand(this.shell.lastCmd);
        const mqtt = require("mqtt");
        const bee = require("../lib/beeNetClient");
        const mqtnl = require(__dirname + "/../lib/mqttNetworkLib.js");

        this.showSyntax = () => {
            this.display.textOut(`Syntax: ${args.command} -s <mqtt://src:port> -d <host[:port]>`);
            this.display.textOut(`        ${args.command} -start`);
            this.display.textOut(`        ${args.command} -stop`);
            this.shell.terminate();
        };

        const keys = Object.keys(args.params);

        if (keys.includes('-stop')) {
            if (this.mqtnl.beeBridge) {
                this.mqtnl.beeBridge.stopForward();
                this.display.textOut(`🛑 Packet forwarding stopped.`);
            } else {
                this.display.textOut(`⚠️  No active forwarder to stop.`);
            }
            // return this.shell.terminate();
        }

        if (keys.includes('-start')) {
            if (this.mqtnl.beeBridge && this.mqtnl.mqtnl.beeBridge.startForward) {
                this.mqtnl.beeBridge.startForward();
                this.display.textOut(`▶️ Packet forwarding resumed.`);
            } else {
                this.display.textOut(`⚠️  No existing forwarder. Please use -s and -d to create one.`);
            }
            return this.shell.terminate();
        }

        if (keys.includes('s') && keys.includes('d')) {
            const src = args.params.s;
            const dst = args.params.d;

            if (this.mqtnl.beeBridge) {
                this.display.textOut(`⚠️ Packet forwarder already exists.`);
            } else {
                this.display.textOut(`🔄 Starting beeNet forwarder from ${src} to ${dst}`);
                // this.shell.terminate();
                this.mqtnl.beeBridge = {
                    startForward: () => {
                        mqtnl.beeBridge(src, dst, "mqtnl@1.0/", mqtt, bee);
                    },
                    stopForward: () => {
                        this.display.textOut(`❌ beeBridge forwarder does not support stop yet.`);
                    }
                };
                this.mqtnl.beeBridge.startForward();
            }
            return;// this.shell.terminate();
        }

        this.showSyntax();
    }
};
