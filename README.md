## skyper

Skyper is a commandline tool and node library for autostarting local Skype
calls using [Skype URIs](https://dev.skype.com/skype-uri/uri-main).

On Mac OSX, it uses Applescript to confirm the call. On other OSes
you will need to confirm manually.

## Installation

If you want the commandline tool, install globally using npm:

```bash
sudo npm install skyper -g
```

If you just want the node module:

```bash
npm install skyper
```

## Commandline examples

On the commandline, make a test call to Skype's echo bot:

```bash
skyper call echo123
```

> **Note for Mac OSX**
> You may be prompted for your Administrator password. This happens when
> activating OSX Accessibility options for auto-confirming calls.

Specify more than one participant:

```bash
skyper call echo123,skype.test.user.1,skype.test.user.2
```

Get advanced usage information:

```bash
skyper -h
Usage: skyper {call|chat} user1,user2,... [--topic topic] [--video]
```

## node examples

Using the node module, make a test call to Skype's echo bot:

```javascript
var skyper = require("skyper");
skyper.call(["echo123"]);
```

> **Note for Mac OSX**
> You may be prompted for your Administrator password. This happens when
> activating OSX Accessibility options for auto-confirming calls.

Specify more than one participant, as well as advanced arguments like
topic and enabling video:

```javascript
var skyper = require("skyper");
skyper.call(["echo123", "skype.test.user.1"], {
  topic: "Hello world", // Note: in some cases, Skype does not modify the topic.
  video: true
});
```

Give a callback if you want to know about issues starting or confirming the call:

```javascript
var skyper = require("skyper");
skyper.call(["echo123", "skype.test.user.1"], {}, function(err) {
  if (err) {
    console.error("Oh no! Something happenend", err);
  }
});
```

### node API examples

When Python is available, skyper offers raw Skype API access via
[Skype4Py](https://pypi.python.org/pypi/Skype4Py/). All dependencies are
installed into a virtualenv in node_modules during `npm install`, so your
environment remains untouched.

You can send a [Skype API command](http://vmiklos.hu/bitlbee-skype/public_api_ref.html) like this:

```javascript
var skyper = require("skyper");
skyper.api.send("CALL echo123");
```

You can also listen for notifications from Skype:

```javascript
skyper.api.on("notification", function(body) {
  console.log("Got notification from Skype:", body);
});
```

## Contributing

Just make a pull request :) In particular, it'd be great to support auto-confirm
calls for Windows and Linux.
