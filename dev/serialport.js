const { ReadlineParser } = require('@serialport/parser-readline')
const { SerialPort } = require('serialport')

class SerialPortDriver {
  constructor(nos, dev, baudRate) {
    this.name = "serialport";
    this.nos = nos;
    this.devClass = "serialport";
    this.version = 0.2;
    this.path = dev;
    this.baudRate = baudRate;
    this.success = 1;
    this.port = new SerialPort({ path: this.path, baudRate: this.baudRate });
    this.parser = this.port.pipe(new ReadlineParser({ delimiter: "\n" }));
    this.parser.on('data', this._read.bind(this));
    this.listeners = {};
  }

  ready() {
    return this.success ? 1 : 0;
  }

  write(data) {
    // console.log("<< " + data);
    this.port.write(data);
  }

  addListener(name, callback) {
    this.listeners[name] = callback;
  }

  removeListener(name) {
    delete this.listeners[name];
  }

  read(data) {
    //console.log(">> "+data)
    for (const cb of Object.values(this.listeners)) {
      if (typeof cb === 'function') cb(data);
    }
  }

  _read(data) {
    this.read(data);
  }
}

module.exports = { SerialPortDriver };