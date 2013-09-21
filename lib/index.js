var fs = require("fs");
var url = require("url");
var path = require("path");
var open = require("open");
var applescript = require("applescript");

DEFAULT_ACCEPT_RETRIES = 5
DEFAULT_ACCEPT_SECONDS_BETWEEN_RETRIES = 1

function isAccessibilityEnabled(callback) {

  applescript.execFile(path.join(__dirname, "verify.applescript"), function(err, res) {
    if (err) return callback(err);
    callback(null, res === 'SUCCESS');
  });

}

function enableAccessibility(callback) {

  applescript.execFile(path.join(__dirname, "enable.applescript"), function(err, res) {
    if (err) return callback(err);
    if (res === "SUCCESS") {
      callback();

    // When enable.applescript returns "FAILURE", it means that the user
    // decided not to enable Accessibility.
    } else {
      callback(new Error("OSX Accessibility must be enabled to auto-start calls"));
    }
  });

}

function ensureAccessibility(callback) {

  isAccessibilityEnabled(function(err, enabled) {
    if (err) return callback(err);
    if (enabled) {
      callback();
    } else {
      enableAccessibility(function(err) {
        if (err) return callback(err);
        enableAccessibility(callback);
      });
    }
  });

}

function accept(retries, callback) {

  // Before attempting to accept the call in Skype, make sure the Accessibility
  // option in OSX is enabled. Otherwise, the accept.applescript will not be
  // able to find and click the accept button in the UI.
  ensureAccessibility(function(err) {
    if (err) return callback(err);
    applescript.execFile(path.join(__dirname, "accept.applescript"), function(err, res) {

      // The script must return SUCCESS to indicate it actually
      // found and clicked the button in Skype.
      if (res !== "SUCCESS") {
        err = err || new Error("Unable to click the accept button in Skype");
      }

      // If there was an error but we have remaining retries, wait one
      // second and retry.
      if (err && retries) {
        setTimeout(function() {
          accept(retries - 1);
        }, DEFAULT_ACCEPT_SECONDS_BETWEEN_RETRIES * 1000);

      // Otherwise, just respond with success/failure.
      } else {
        if (callback) {
          callback(err);
        } else if (err) {
          throw err;
        }
      }

    });
  });

}

function convertOptionsToSkypeQuery(options, exclusions) {

  var query = {};
  Object.keys(options).forEach(function(key) {

    // Coerce all defined arguments to strings, e.g. null ==> "null"
    // and true ==> "true" and false ==> "false"
    if (exclusions.indexOf(key) === -1 && typeof key !== "undefined") {
      query[key] = "" + options[key];
    }

  });
  return query;

}

function triggerSkypeUri(action, participants, options, callback) {

  // Generate a Skype URI and open it.
  // https://dev.skype.com/skype-uri/reference
  var nonSkypeOptions = ["retries", "autostart"];
  var skypeUri = url.format({
    protocol: "skype",
    host: participants.join(";"),
    query: convertOptionsToSkypeQuery(options, nonSkypeOptions)
  });
  if (/\?/.test(skypeUri)) {
    skypeUri = skypeUri.replace("?", "?" + action + "&");
  } else {
    skypeUri += "?" + action;
  }
  open(skypeUri);

  // Attempt to accept this call inside of Skype by clicking the
  // button to accept the call.
  if (options.autostart !== false) {
    accept(options.retries || DEFAULT_ACCEPT_RETRIES, callback);
  }

}

function call(participants, options, callback) {
  triggerSkypeUri("call", participants, options || {}, callback);
}

function chat(participants, options, callback) {
  options.autostart = false; // chats have no dialog to auto-accept
  triggerSkypeUri("chat", participants, options || {}, callback);
}

exports.call = call;
exports.chat = chat;
