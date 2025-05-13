module.exports = {
	name: "historylogger",
	version: 0.2,
	main: function (os) {
		// let display = this.shell.crt;
		// display.textOut("Hello world");
		let devices = [
			{ name: "fileAccess", objectName: "fa" }
		];
		this.failed = (!this.os.loadDevices(devices, this));

		this.display = this.shell.crt;
		// this.display.textOut("History logger ... ");
		// if (this.failed == 0) {              	
		let baseDir = process.cwd();
		//this.msg = "       History logger starting ["+baseDir+"/home/cmdHist.txt"+"]";
		// this.msg = "       History logger starting";
		// this.os.drawProgressBegin(this.msg);
		let args = this.shell.lastCmd.split(" ");


		cmdHistory = [];
		if (this.fa.fileExistsSync("./home/cmdHist.txt")) {
			let content = this.fa.readFileSync("./home/cmdHist.txt").split("\r\n");


			// for (let i=content.length-1; i>=0; i--)
			for (let i = 0; i < content.length; i++)

				// this.display.textOut("Content: "+content[i]);
				this.shell.term.addHistory(content[i]);
			this.shell.term.historyIdx = this.shell.term.history.length;
		} else {
			this.display.textOut(this.shell.basePath + "/home/cmdHist.txt tidak ada!")
		}

		this.shell.cmdHistoryFiller = (cmd) => {
			if (cmd.trim().substring(0, 3) != "run")
				// this.display.textOut("fill "+cmd);
				if (this.shell.term.addHistory(cmd) == 0) {
					// this.display.textOut(`{${cmd.trim().substring(0,3)}}`);
					this.fa.appendFileSync("./home/cmdHist.txt", cmd + "\r\n");
					// this.display.textOut(cmd+" sudah ditambahkan ke list history")
				} else {
					// this.display.textOut("sudah ada "+cmd);
				}

			//cmdHistory.push(cmd);
		}
		this.saveHistory = () => {
			let content = "";
			for (let i = 0; i < this.shell.term.history.length; i++)
				content += this.shell.term.history[i] + "\r\n";
			this.fa.writeFileSync("./home/cmdHist.txt", content);
		}
		this.removeHistory = () => {
			this.display.textOut("Removing history.." + baseDir + "/home/cmdHist.txt");
			try {
				this.fa.deleteFileSync("./home/cmdHist.txt", (err) => {
					if (err) throw err;
					this.display.textOut(baseDir + "/home/cmdHist.txt" + " was deleted");
				});
			} catch (e) {
				this.display.textOut(e);
			}
		}
		this.shell.saveHistory = this.saveHistory;
		this.shell.removeHistory = this.removeHistory;


		//this.display.textOut("History logger running OK.")
		// this.os.drawProgressEnd(this.msg.length, "\x1b[96mOK\x1b[0m");		  
		// } else {
		// 	//this.display.log("failed ya")
		// }				
	}
}