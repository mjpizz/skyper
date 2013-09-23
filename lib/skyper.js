var fs = require("fs");
var url = require("url");
var path = require("path");
var open = require("open");
var applescript = require("applescript");
var desktop = require("./desktop");

DEFAULT_ACCEPT_RETRIES = 5
DEFAULT_ACCEPT_SECONDS_BETWEEN_RETRIES = 1

VERIFY_APPLESCRIPT = path.join(__dirname, "osx", "verify.applescript")
ENABLE_APPLESCRIPT = path.join(__dirname, "osx", "enable.applescript")
CONFIRM_APPLESCRIPT = path.join(__dirname, "osx", "confirm.applescript")

function ensureAutoconfirmSupported(callback) {
  applescript.execString("", function(err) {
    if (err && err.exitCode) return callback(new Error("Your operating system does not support auto-confirm, you will need to manually confirm this call from the Skype UI"));
    callback();
  });
}

function isAccessibilityEnabled(callback) {

  applescript.execFile(VERIFY_APPLESCRIPT, function(err, res) {
    if (err) return callback(err);
    callback(null, res === 'SUCCESS');
  });

}

function enableAccessibility(callback) {

  applescript.execFile(ENABLE_APPLESCRIPT, function(err, res) {
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

function confirm(retries, callback) {

  // Before attempting to confirm the call in Skype, make sure the Accessibility
  // option in OSX is enabled. Otherwise, the confirm.applescript will not be
  // able to find and click the confirm button in the UI.
  ensureAccessibility(function(err) {
    if (err) return callback(err);
    applescript.execFile(CONFIRM_APPLESCRIPT, function(err, res) {

      // The script must return SUCCESS to indicate it actually
      // found and clicked the button in Skype.
      if (res !== "SUCCESS") {
        err = err || new Error("Unable to click the confirm button in Skype");
      }

      // If there was an error but we have remaining retries, wait one
      // second and retry.
      if (err && retries) {
        setTimeout(function() {
          confirm(retries - 1);
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
  var nonSkypeOptions = ["retries", "autoconfirm"];
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

  // Attempt to confirm this call inside of Skype by clicking the
  // button to confirm the call.
  if (options.autoconfirm !== false) {
    ensureAutoconfirmSupported(function(err) {
      if (err && callback) return callback(err);
      if (err) throw err;
      confirm(options.retries || DEFAULT_ACCEPT_RETRIES, callback);
    });
  }

}

function call(participants, options, callback) {
  options = options || {};
  triggerSkypeUri("call", participants, options, callback);
}

function chat(participants, options, callback) {
  options = options || {};
  options.autoconfirm = false; // chats have no dialog to auto-confirm
  triggerSkypeUri("chat", participants, options, callback);
}

exports.call = call;
exports.chat = chat;
exports.desktop = desktop;
