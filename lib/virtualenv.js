// TODO: publish this as node-virtualenv
var fs = require("fs");
var path = require("path");
var spawn = require("child_process").spawn;
var EventEmitter = require("events").EventEmitter;
var tar = require("tar");
var zlib = require("zlib");
var rimraf = require("rimraf");
var request = require("request");

function VirtualEnv(packagePath, options) {
  options = options || {};

  // Details come directly from the given package.json
  var package = require(packagePath);
  this._version = package.virtualenv.version;
  this._pythonDeps = package.virtualenv.dependencies;
  this._createFlags = package.virtualenv.flags || [];
  this._virtualenvHome = path.join(path.dirname(packagePath), "node_modules", ".virtualenv");
  this._virtualenvRoot = path.join(this._virtualenvHome, "virtualenv-" + this._version);
  this._virtualenvPath = path.join(this._virtualenvRoot, "node-virtualenv");

  this._stdout = options.stdout || process.stdout;
  this._stderr = options.stderr || process.stderr;

}

VirtualEnv.prototype._reportProgress = function _reportProgress(action, target) {
  this._stdout.write(action + " " + target + "\n");
}

VirtualEnv.prototype.download = function download(callback) {

  // Remove the previous copy of our virtualenv.
  rimraf.sync(this._virtualenvHome);

  // Start the download.
  var url = "https://pypi.python.org/packages/source/v/virtualenv/virtualenv-" + this._version + ".tar.gz";
  var downloadStream = request(url);

  // Stream the download through unzipping to the final destination.
  var gunzipStream = zlib.createGunzip();
  var untarStream = tar.Extract({path: this._virtualenvHome});
  var finalStream = downloadStream.pipe(gunzipStream).pipe(untarStream);
  finalStream.on("end", callback);

  // Emit helpful events to track progress.
  this._reportProgress("downloading", url);
  downloadStream.on("end", function() {
    this._reportProgress("unzipping", url);
  }.bind(this));

}

VirtualEnv.prototype.on = function on() {
  this._emitter.on.apply(this._emitter, arguments);
}

VirtualEnv.prototype.create = function create(callback) {

  // Create virtualenv in "node_modules/.virtualenv/virtualenv-X/node-virtualenv"
  this._reportProgress("creating", this._virtualenvPath);
  var virtualenvName = path.basename(this._virtualenvPath);
  var createProc = spawn("python",
    ["virtualenv.py"].concat(this._createFlags).concat([virtualenvName]),
    {cwd: this._virtualenvRoot}
  );
  createProc.stderr.pipe(process.stderr);
  createProc.stdout.pipe(process.stdout);
  createProc.on("exit", function(code) {
    if (code) return callback(new Error("Error while creating virtualenv: exit " + code));
    callback();
  }.bind(this));

}

VirtualEnv.prototype.install = function install(callback) {

  // Install Python dependencies into the virtualenv created in the create step.
  this._reportProgress("installing", this._virtualenvPath);
  var pipProc = spawn("bin/pip",
    ["install"].concat(this._pythonDeps),
    {cwd: this._virtualenvPath}
  );
  pipProc.stderr.pipe(process.stderr);
  pipProc.stdout.pipe(process.stdout);
  pipProc.on("exit", function(code) {
    if (code) return callback(new Error("Error while installing dependencies in virtualenv: exit " + code));
    callback();
  }.bind(this));

}

VirtualEnv.prototype.python = function python(args, options) {
  var pathToPython = path.join(this._virtualenvPath, "bin", "python");
  return spawn(pathToPython, args, options);
}

VirtualEnv.prototype.python32bitOSX = function python32bitOSX(args, options) {
  var pathToPython = path.join(this._virtualenvPath, "bin", "python");
  return spawn("arch", ["-i386"].concat([pathToPython]).concat(args), options);
}

module.exports = function virtualenv(packagePath, options) {
  return new VirtualEnv(packagePath, options);
}
