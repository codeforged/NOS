module.exports = {
	version: 0.22,
	main: function (nos) {
		let display = this.shell.crt;
		const cmd = this.shell.parseCommand(this.shell.lastCmd);
		if (cmd.params["a"]) {
			display.textOut(
				`${this.shell.nosCodeName} - ${this.shell.nosVersion}, Shell Version ${this.shell.version}, \n` +
				`${__APP.distro.version}, Author: ${this.shell.nosAuthor}`
			);
		} else {
			display.textOut(`${this.shell.nosCodeName}`);
		}
		this.shell.terminate();
	}
} 