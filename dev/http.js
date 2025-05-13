let http = require('http');
let url = require('url');
function httpServer(os, port) {
  var self = this;
  this.name = "httpserver";
  this.os = os;
  this.devClass = "HTTP Server - " + port;
  this.version = 0.3;
  this.port = port;
  this.httpListener = {};

  this.clientList = [];
  this.listener = [];
  this.listeners = [];
  this.addListener = function (name, callback, options = {}) {
    let listener = this.findListener(name);
    if (listener == -1) {
      self.listeners.push({
        name: name,
        callback: callback,
        options: options
      });
      //console.log("add http listeners "+name);
    } else {
      self.listeners[listener].callback = callback;
    }
  }
  this.findListener = function (name) {
    let found = 0;
    let listener = null;
    let foundIndex = -1;
    for (let i = 0; i < this.listeners.length; i++) {
      if (self.listeners[i].name == name) {
        listener = self.listeners[i];
        found = 1;
        foundIndex = i;
        break;
      }
    }
    return foundIndex;
  }

  this.read = function (req, res) {
  }


  this.httpListener = function (req, res) {
    for (let i = 0; i < self.listeners.length; i++)
      self.listeners[i].callback(req, res);
  }

  //this.server = http.createServer(this.httpListener).listen(8081);

  self.express = require('express');
  self.app = self.express();
  self.app.listen(self.port);

  self.app.get('/', (req, res) => {
    for (let i = 0; i < self.listeners.length; i++)
      self.listeners[i].callback(req, res);
    // res.send('hello world '+self.listeners.length)
  })

  this.connected = function () {
  }
}

module.exports = { httpServer: httpServer };
