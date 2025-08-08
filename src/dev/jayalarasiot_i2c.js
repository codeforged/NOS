module.exports = {
  jayalarasIoTI2C: function (os) {
    var self = this;
    var success = 1;
    this.name = "jayalarasIoTI2C";
    this.os = os;
    this.version = 0.01;
    this.devClass = "JayaLaras IoT I2C"; 
    var fserialport;
    var msgQue = [];
    self.waktuAutoOffKamarMandiUtama = 1000 * 60 * 20; // ms

    var ImsgQue = setInterval(function() {
      if (msgQue.length>0) {
        var str = msgQue.shift();   
        fserialport.write(str);     
      }
    }, 500);

    /************************** start of constructor ****************************/
    var MCP23017 = require('node-mcp23017');

    var mcp = new MCP23017({
      address: 0x20, //default: 0x20
      device: 1, // '/dev/i2c-1' on model B | '/dev/i2c-0' on model A
      debug: false //default: false
    });

    var mcpSw = new MCP23017({
      address: 0x24, //default: 0x20
      device: 1, // '/dev/i2c-1' on model B | '/dev/i2c-0' on model A
      debug: false //default: false
    });

    portStates = []; // 9 -> Luar, 15 -> living room depan, 8 -> living room belakang, 7 -> dapur, 4 -> working room 
    swStates = []; // 15 -> saklar living room depan, 8 -> saklar living room belakang, (true = led on) 
    allowMultiState = [];
    multiState = [];
    manual = 0;

    //set all GPIOS to be OUTPUTS
    for (var i = 0; i < 16; i++) {
      mcp.pinMode(i, mcp.OUTPUT);
      mcp.digitalWrite(i, mcp.HIGH);
      portStates[i] = 0;
      allowMultiState[i] = 0;
      multiState[i] = 0;
      mcpSw.pinMode(i, mcpSw.INPUT_PULLUP);
    }

    allowMultiState[15] = 3; //
    //allowMultiState[7] = 3; // saklar kamar utama
    allowMultiState[8] = 2; //

    setInterval(function () {
      updateSwitchAndLamp();
    }, 500);

/************************** end of constructor ****************************/

/***** private function *****/
    function getHrMn() {
	let dt = new Date();
        let hr = dt.getHours();
        let mn = dt.getMinutes();
        hr += mn/59;
	return {hr: hr, mn: mn}
    }
    function updateSwitchAndLamp() {
      for (var i=0; i<16; i++) {
        mcpSw.digitalRead(i, function (pin, err, value) {
          state = value
          if (state!=swStates[pin]) {
            //console.log("pin: ",pin);
            swStates[pin] = state;
            if (allowMultiState[pin]>0) {
              multiState[pin]++;
              if (multiState[pin]>allowMultiState[pin]) multiState[pin] = 0;
              //console.log("#",multiState[pin]);
              
              if (pin==7) { // kamar utama
                if (multiState[pin]==0) {
                  turnOff(15);
                  turnOff(10);
                } else if (multiState[pin]==1) {
                  turnOff(15);
                  turnOn(10);
                } else if (multiState[pin]==2) {
                  turnOn(15);
                  turnOff(10);              
                } else if (multiState[pin]==3) {
                  turnOn(15);
                  turnOn(10);
                }
              } else if (pin==8) { // ruang utama belakang
                if (multiState[pin]==0) {
                  turnOff(3);
                  turnOff(8);
                } else if (multiState[pin]==1) {
                  turnOff(3);
                  turnOn(8);
                } else if (multiState[pin]==2) {
                  turnOn(3);
                  turnOff(8);              
                } else if (multiState[pin]==3) {
                  turnOn(3);
                  turnOn(8);
                }
              }
              else if (pin==15) { // ruang utama depan
		let hrmn = getHrMn();
		if (hrmn.hr>=18 || hrmn.hr<5) {
		  if (multiState[pin] == 0 || multiState[pin] == 2)
		     turnOff(4); else turnOn(4);
                } else {
		  if (multiState[pin]==0) {
                    turnOff(9);
                    turnOff(4);
                  } else if (multiState[pin]==1) {
                    turnOff(9);
                    turnOn(4);
                  } else if (multiState[pin]==2) {
                    turnOn(9);
                    turnOff(4);              
                  } else if (multiState[pin]==3) {
                    turnOn(9);
                    turnOn(4);
                  }
		}
              }            
            } else {
              if (pin==15) pin = 9; else 
              if (pin==9) pin = 11; else 
              if (pin==8) pin = 8; else 
              if (pin==3) pin = 7; else 
              if (pin==7) pin = 15; else 
              if (pin==12) pin = 10; else 
              if (pin==11) {
                pin = 12;
                if (state==1) turnOff(5); else turnOn(5); 
              }
              if (state==0) {
                turnOn(pin); 

                // auto off untuk kamar mandi
                if (pin == 10 || pin == 11) {
                  setTimeout(()=>{
                    turnOff(pin);
                  }, self.waktuAutoOffKamarMandiUtama);
                }
              } else {
                turnOff(pin);
              }
            }
            manual = 1;
          }
        });
      }
    }

    function updatePortStates() {
      for (var i=0; i<16; i++) {
        mcp.digitalRead(i, function (pin, err, value) {
          portStates[pin] = value;
        });
      }
    }

    function turnOff(ioNumber) {
      portStates[ioNumber] = 0;
      if (ioNumber % 2==0) ioNumber /= 2; else
      ioNumber = Math.floor(ioNumber/2+8);  
      mcp.digitalWrite(ioNumber, mcp.HIGH);
    }


    function turnOn(ioNumber) {         
      portStates[ioNumber] = 1;
      if (ioNumber % 2==0) ioNumber /= 2; else
        ioNumber = Math.floor(ioNumber/2+8);  
      mcp.digitalWrite(ioNumber, mcp.LOW);
    }


/***** end of private function *****/


    this.ready = function() {
      if (success) return 1; else return 0;
    }

    this.setSerialport = function(ser) {
      //   fserialport = ser;
      //   fserialport.read = function (data) {
  		  //   console.log(">> "+data)
  		  // }
    }
    this.setPortValue = function (port, value) {      
      //msgQue.push("SP "+port+" "+value);
      if (value==1) turnOn(port); else turnOff(port);
      manual = 0;
    }
    this.getPortStatus = function (port) {      
      //msgQue.push("GP "+port);

      return portStates[port];
    }
    this.getAllStatus = function () {      
      //msgQue.push("PS 1");
      var str="";
      for (var i=0; i<16; i++) {
        if (swStates[i])
        str+='1'; else str+='0';
      }    
      return str;
    }
    this.getAllPortStatus = function () {  
      var str="";
      for (var i=0; i<16; i++) {
        str+=portStates[i];
      }    
      return str;
      //msgQue.push("PP 1");
    }

    success = 1;  
  }
}

