import sys, time, json
from Skype4Py import Skype
from Skype4Py.api import Command

# Events are passed to the parent over stdout.
def send_event(type, payload):
    skype._Api.acquire()
    try:
        print json.dumps({"type": type, "payload": payload})
        sys.stdout.flush()
    finally:
        skype._Api.release()

# Capture calls to _CallEventHandler and pass them as events
# to the parent process.
def NewCallEventHander(event, *args, **kwargs):

    if event == "Notify":
        body = args[0]
        send_event("notification", body)

    elif event == "Command":
        command = args[0]
        send_event("command", command.Command)

    elif event == "Reply":
        command = args[0]
        send_event("reply", command.Reply)

    # TODO: look a bit closer at the Skype4Py API to see if this is useful
    # elif event == "AttachmentStatus":
    #     status = args[0]
    #     send_event("attachment", status)

    return OriginalCallEventHandler(event, *args, **kwargs)

skype = Skype()
OriginalCallEventHandler = skype._CallEventHandler
skype._CallEventHandler = NewCallEventHander

# Get the protocol version from the commandline args.
skype.Attach(Protocol=int(sys.argv[1]))

# Loop forever, accepting commands over stdin and running
# them against our Skype4Py client.
while True:
    command = sys.stdin.readline()
    if command:
        skype.SendCommand(Command(command.strip()))
    else:
        time.sleep(0.1)
