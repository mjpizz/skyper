var path = require("path");
var EventEmitter = require("events").EventEmitter;
var virtualenv = require("virtualenv");

// Attempt to use the highest protocol version from Skype API (8).
// Skype will quietly fallback to an earlier protocol version if it
// needs to, so if you have an older version of Skype this shouldn't break.
SKYPE_PROTOCOL_VERSION = 8

// Helper to ensure the child process exits on parent exit, and vice-versa.
// TODO: turn ensureMutualExit into its own npm module
function ensureMutualExit(proc) {

  // Define the helpers for mutual destruction.
  var cleaningUp = false;
  var cleanedUp = false;
  var exited = false;

  function cleanup(err) {
    cleaningUp = true;
    if (!cleanedUp) {
      cleanedUp = true;
      proc.kill();
    }
  };

  function cleanupAndExit(err) {
    cleaningUp = true;
    if (err) {
      console.error("exiting due to error:", err);
    }

    // Kill the parent process after the child exits.
    if (exited) {
      process.exit();
    } else {
      proc.on("exit", function() {
        process.exit();
      });
      process.nextTick(cleanup);
    }
  };

  // Kill the child process if the parent dies.
  process.on("exit", cleanup);
  process.on("uncaughtException", cleanupAndExit);
  process.on("SIGINT", cleanupAndExit);
  process.on("SIGTERM", cleanupAndExit);

  // Watch for child process dying.
  proc.on("exit", function(exitCode, signal) {
    exited = true;
    if (!cleanedUp && !cleaningUp) {
      if (signal && exitCode !== null && exitCode !== 0) {
        console.error("exited with code " + exitCode + " due to signal " + signal);
      } else if (signal) {
        console.error("exited due to signal " + signal);
      } else if (exitCode !== 0) {
        console.error("exited with code " + exitCode);
      }
    }
    process.exit();
  });

}

function ApiBridge() {

  // Run Skype4Py from api.py in our virtualenv. On OSX, we need to use the
  // 32-bit version of Python since Skype4Py cannot function on 64-bit.
  this._virtualenv = virtualenv(require.resolve("../package.json"));
  var spawnPython = this._virtualenv.spawnPython.bind(this._virtualenv);
  if (process.platform.match(/darwin/i)) {
    spawnPython = this._virtualenv.spawn32bitOSXPython.bind(this._virtualenv);
  }
  this._child = spawnPython([path.join(__dirname, "api.py"), SKYPE_PROTOCOL_VERSION]);

  // Ensure that the stderr of this child shows up in the parent process
  // and that the two processes mutually exit when the other exits.
  this._child.stderr.pipe(process.stderr);
  ensureMutualExit(this._child);

  // Pass through events from the child process' stdout.
  this._emitter = new EventEmitter();
  this._child.stdout.on("data", function(data) {
    var lines = data.toString().split("\n");
    lines.forEach(function(line) {
      if (line) {
        var event = JSON.parse(line);
        this._emitter.emit(event.type, event.payload);
      }
    }.bind(this));
  }.bind(this));

}

// Listen for Skype API events. There are 3 kind of events:
// - notification: emitted when Skype state changes
// - command: emitted when the api issues a command
// - reply: emitted when the api receives a reply for a command
ApiBridge.prototype.on = function on() {
  this._emitter.on.apply(this._emitter, arguments);
}

// Send a Skype API command.
// http://vmiklos.hu/bitlbee-skype/public_api_ref.html
ApiBridge.prototype.send = function send(command) {
  this._child.stdin.write(command + "\n");
}

var apiInstance = null;

function on() {
  apiInstance = apiInstance || new ApiBridge();
  apiInstance.on.apply(apiInstance, arguments);
}

function send() {
  apiInstance = apiInstance || new ApiBridge();
  apiInstance.send.apply(apiInstance, arguments);
}

module.exports = {on: on, send: send};
