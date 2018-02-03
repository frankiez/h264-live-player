"use strict";

const WebSocket = require('ws');
const WebSocketServer = require('ws').Server;
const Splitter        = require('stream-split');
const merge           = require('mout/object/merge');

const NALseparator    = new Buffer([0,0,0,1]);//NAL break


class _Server {

  constructor(server, options) {

    this.options = merge({
        width : 350,
        height: 420,
    }, options);

    this.wss = new WebSocketServer({ server });

    this.new_client = this.new_client.bind(this);
    this.start_feed = this.start_feed.bind(this);
    this.broadcast  = this.broadcast.bind(this);

    this.wss.on('connection', this.new_client);
  }
  

  start_feed() {
    var readStream = this.get_feed();
    this.readStream = readStream;

    readStream = readStream.pipe(new Splitter(NALseparator));
    readStream.on("data", this.broadcast);

    readStream.on("close", function() {
      console.log("_server.js close");
    });

    readStream.on("error", function(code) {
      console.log(`_server.js error code = ${code}`);
    });
  }

  get_feed() {
    throw new Error("to be implemented");
  }

  broadcast(data) {
    this.wss.clients.forEach(function(socket) {
      if (socket.readyState !== WebSocket.OPEN) {
        console.log('socket.readyState = ', socket.readyState);
        return;
      }

      if(socket.buzy)
        return;

      socket.buzy = true;
      socket.buzy = false;

      socket.send(Buffer.concat([NALseparator, data]), { binary: true}, function ack(error) {
        socket.buzy = false;
      });
    });
  }

  new_client(socket) {

    var self = this;
    console.log('New guy');
    if (!self.readStream) {
      self.start_feed();
    } else if (self.readStream.isPaused()) {
      self.readStream.resume();
    }

    socket.send(JSON.stringify({
      action: "init",
      width: this.options.width,
      height: this.options.height,
      fps: this.options.fps
    }));

    // socket.send(JSON.stringify({
    //   action: "init",
    //   width: this.options.height,
    //   height: this.options.width,
    //   fps: this.options.fps
    // }));

    socket.on("message", function (data) {
      var cmd = "" + data, action = data.split(' ')[ 0 ];
      console.log("Incomming action '%s'", action);

      /*
      if (action == "REQUESTSTREAM") {
        if (!self.readStream) {
          self.start_feed();
        } else {
          self.readStream.resume();
        }
      }
      if (action == "STOPSTREAM") {
        self.readStream.pause();
      }
      */

      if (action == "STOPSTREAM" || (action == "REQUESTSTREAM" && !!self.streamer)) {
        // self.streamer.kill('SIGKILL');
        self.streamer.kill();
        self.readStream = undefined;
        console.log("previous streamer killed");
      }

      if (action == "REQUESTSTREAM") {
        self.start_feed();
      }

    });

    socket.on('close', function () {
      // self.readStream.end();
      console.log('web-socket closed');
    });
  }


}
;


module.exports = _Server;