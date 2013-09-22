## skyper

Skyper is a commandline tool and node library for autostarting local Skype
calls using [Skype URIs](https://dev.skype.com/skype-uri/uri-main).

On Mac OSX, Applescript is used to confirm the call. On other OSes
you will need to confirm manually (patches welcome!).

Raw [Desktop API](https://support.skype.com/en/faq/FA214/what-is-the-desktop-api)
access is available via `skyper.api`, though Microsoft will be gradually
discontinuing portions of this API over time.

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

### Desktop API examples

When Python is available, `skyper.api` exposes the Skype Desktop API via
[Skype4Py](https://pypi.python.org/pypi/Skype4Py/). All Python dependencies
install into a local virtualenv during `npm install`, which keeps them isolated
from the rest of the system.

> **Note for Linux**
> You may need to install the dbus and gobject libraries for Python separately.
> You can do this with `sudo apt-get install python-dbus python-gobject`

You can send a [Skype API command](http://vmiklos.hu/bitlbee-skype/public_api_ref.html) like this:

```javascript
var skyper = require("skyper");

skyper.api.send("CALL echo123");
```

You can also listen for events from Skype:

```javascript
var skyper = require("skyper");

// When sending your command to Skype...
skyper.api.on("command", function(event) {
  console.log(">>>", event)
});

// When Skype acknowledges your command...
skyper.api.on("reply", function(event) {
  console.log("<<<", event)
});

// When other events happen in Skype (incoming call, buddy online, etc)...
skyper.api.on("notification", function(event) {
  console.log("---", event)
});
```

## Contributing

Just make a pull request :) In particular, it'd be great to support auto-confirm
calls for Windows and Linux.
