var path = require("path");
var repl = require("repl");
var EventEmitter = require("events").EventEmitter;
var color = require("cli-color");
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
      console.error("exiting due to error:", err.stack);
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

function DesktopBridge() {

  // Run Skype4Py from desktop.py in our virtualenv. On OSX, we need to use the
  // 32-bit version of Python since Skype4Py cannot function on 64-bit.
  this._virtualenv = virtualenv(require.resolve("../package.json"));
  var spawnPython = this._virtualenv.spawnPython.bind(this._virtualenv);
  if (process.platform.match(/darwin/i)) {
    spawnPython = this._virtualenv.spawn32bitOSXPython.bind(this._virtualenv);
  }
  this._child = spawnPython([path.join(__dirname, "desktop.py"), SKYPE_PROTOCOL_VERSION]);

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
// - command: emitted when desktop.py issues a command
// - reply: emitted when desktop.py receives a reply for a command
DesktopBridge.prototype.on = function on() {
  this._emitter.on.apply(this._emitter, arguments);
}

// Send a Skype API command.
// http://mjpizz.github.io/skyper/desktop-api-reference
DesktopBridge.prototype.send = function send(command) {
  this._child.stdin.write(command + "\n");
}

DesktopBridge.prototype.startRepl = function startRepl(options) {

  options = options || {};
  var input = options.input || process.stdin;
  var output = options.output || process.stdout;

  // Start the REPL. Commands come in wrapped in parentheses, so strip
  // those before passing them to Skype.
  options.eval = function skypeRepl(command, context, filename, callback) {
    try {
      var strippedCommand = command.replace(/^\(|\s*\)$/g, "");
      callback(null, this.send(strippedCommand));
    } catch(err) {
      callback(err);
    }
  }.bind(this);

  options.ignoreUndefined = true;

  var replInstance = repl.start(options);

  // Allow Skype events to interrupt the REPL, but always
  // redisplay the prompt.

  function writeEventAndMovePrompt(data) {

    // Overwrite the current input when outputting the event text.
    var currentInput = replInstance.rli.line;
    var left = currentInput.length + replInstance.prompt.length;
    output.write(color.move(-1 * left, 0));
    output.write(data);
    output.write("\r\n");

    // Redisplay the prompt and put the cursor back
    // in its original position.
    replInstance.displayPrompt();
    replInstance.rli._moveCursor(currentInput.length);

  }

  this.on("notification", function(body) {
    writeEventAndMovePrompt(color.yellow.bold("<- " + body));
  });

  this.on("command", function(body) {
    writeEventAndMovePrompt(color.green.bold("-> #" + body.id + " " + body.command));
  });

  this.on("reply", function(body) {
    writeEventAndMovePrompt(color.magenta.bold("<- #" + body.id + " " + body.reply));
  });

  return replInstance;

}

var desktopInstance = null;

function on() {
  desktopInstance = desktopInstance || new DesktopBridge();
  return desktopInstance.on.apply(desktopInstance, arguments);
}

function send() {
  desktopInstance = desktopInstance || new DesktopBridge();
  return desktopInstance.send.apply(desktopInstance, arguments);
}

function startRepl() {
  desktopInstance = desktopInstance || new DesktopBridge();
  return desktopInstance.startRepl.apply(desktopInstance, arguments);
}

module.exports = {on: on, send: send, startRepl: startRepl};
