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

If you just want the node library:

```bash
npm install skyper
```

## Commandline Examples

On the commandline, make a test call to Skype's echo bot:

```bash
skyper call echo123
```

> **Note for Mac OSX**
> You may be prompted for your Administrator password. This happens when
> activating OSX Accessibility options for auto-accepting calls.

Specify more than one participant:

```bash
skyper call echo123,skype.test.user.1,skype.test.user.2
```

Get advanced usage information:

```bash
skyper -h
Usage: skyper {call|chat} user1,user2,... [--topic topic] [--video]
```

## API Examples

Using the node module, make a test call to Skype's echo bot:

```javascript
var skyper = require("skyper");
skyper.call(["echo123"]);
```

> **Note for Mac OSX**
> You may be prompted for your Administrator password. This happens when
> activating OSX Accessibility options for auto-accepting calls.

Specify more than one participant, as well as advanced arguments like
topic and enabling video:

```javascript
var skyper = require("skyper");
skyper.call(["echo123", "skype.test.user.1"], {
  topic: "Hello world", // Note: in some cases, Skype does not modify the topic.
  video: true
});
```

Give a callback if you want to know about issues starting or accepting the call:

```javascript
var skyper = require("skyper");
skyper.call(["echo123", "skype.test.user.1"], {}, function(err) {
  if (err) {
    console.error("Oh no! Something happenend", err);
  }
});
```

## Contributing

Just make a pull request :) In particular, it'd be great to support auto-confirm
calls for Windows and Linux.
