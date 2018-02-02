"use strict";


const spawn = require('child_process').spawn;
const merge = require('mout/object/merge');

const Server = require('./_server');


class FFMpegServer extends Server {

  constructor(server, opts) {
    super(server, merge({
      fps: 30
    }, opts));
  }

  get_feed() {

    // ffmpeg -rtsp_transport tcp -i "rtsp://172.20.19.103/media/video1" -pix_fmt yuv420p -an -c:v copy -f rawvideo
    // ffmpeg -f video4linux2 -i /dev/video0 -an -pix_fmt yuv420p -c:v libx264 -profile:v baseline -tune zerolatency -preset ultrafast -movflags frag_keyframe+empty_moov+default_base_moof -g 6 -x264opts fps=24:vbv-maxrate=2500:vbv-bufsize=3000
    var args = [
      "-f", "video4linux2",
      "-i", "/dev/video0",
      "-an",
      '-pix_fmt', 'yuv420p',
      '-c:v', 'libx264',
      '-profile:v', 'baseline',
      '-tune', 'zerolatency',
      '-preset', 'ultrafast',
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
      '-g', '6',
      '-x264opts', 'fps=24:vbv-maxrate=2500:vbv-bufsize=3000',
      '-f', 'rawvideo',
      '-'
    ];

    console.log("ffmpeg " + args.join(' '));
    var streamer = spawn('ffmpeg', args);
    //streamer.stderr.pipe(process.stderr);

    streamer.stderr.on('close', () => {
      console.log('ffmpeg.js streamer.stderr close');
    });

    // https://stackoverflow.com/questions/20792427/why-is-my-node-child-process-that-i-created-via-spawn-hanging
    streamer.stderr.on('data', (data) => {
      if (data && (!(data instanceof String) || data.indexOf('frame=') === 0)) {
        // ignoring messages like:
        // frame= 3540 fps= 30 q=22.0 size=   43192kB time=00:01:58.00 bitrate=2998.6kbits/s dup=24 drop=0
        return;
      }
      // console.log(`ffmpeg.js streamer.stderr data: ${data}`);
      // console.log('ffmpeg.js streamer.stderr data:');
      console.log(data);
    });

    streamer.stderr.on('error', (data) => {
      console.log(`ffmpeg.js streamer.stderr error data: ${data}`);
    });

    streamer.on("close", function () {
      console.log("ffmpeg.js close");
    });

    streamer.on("disconnect", function () {
      console.log("ffmpeg.js disconnect");
    });

    streamer.on("error", function (code) {
      console.log(`ffmpeg.js error code = ${code}`);
    });

    streamer.on("exit", function (code, signal) {
      console.log(`ffmpeg.js exit code = ${code}, signal = ${signal}`);
    });

    return streamer;
  }

}

module.exports = FFMpegServer;