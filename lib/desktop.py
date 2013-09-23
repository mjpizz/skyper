import sys, time, json
from Skype4Py import Skype, apiAttachAvailable
from Skype4Py.api import Command


class Desktop(object):

    def __init__(self, protocol):

        self.__protocol = protocol
        self.__skype = Skype(Events=self)
        self.__skype.Attach(Protocol=self.__protocol)
        self.__command_counter = 0

    # Commands are sent with a constantly increasing ID.
    def send_command(self, text):
        self.__command_counter += 1
        self.__skype.SendCommand(Command(text.strip(), Id=self.__command_counter))

    # Reattach to Skype if necessary.
    def AttachmentStatus(self, status):
        if status == apiAttachAvailable:
            self.__skype.Attach(Protocol=self.__protocol)

    # Events are passed through to the parent process.
    def Notify(self, body):
        self.__send_event_to_parent("notification", body)

    def Command(self, command):
        self.__send_event_to_parent("command", {
            "id": command.Id,
            "command": command.Command,
            })

    def Reply(self, command):
        self.__send_event_to_parent("reply", {
            "id": command.Id,
            "command": command.Command,
            "reply": command.Reply,
            })

    # Events are passed to the parent over stdout. Acquire/release the
    # internal lock to keep output threadsafe.
    def __send_event_to_parent(self, type, payload):
        self.__acquire_lock()
        try:
            print json.dumps({"type": type, "payload": payload})
            sys.stdout.flush()
        finally:
            self.__release_lock()

    # HACK: to keep things threadsafe, we need to use the internal
    # lock that the rest of Skype4Py uses.
    def __acquire_lock(self):
        self.__skype._Api.acquire()

    def __release_lock(self):
        self.__skype._Api.release()


# Get the protocol version from the commandline args. Then loop forever,
# accepting commands over stdin and running them against our Skype4Py client.
desktop = Desktop(protocol=int(sys.argv[1]))
while True:
    command = sys.stdin.readline()
    if command:
        desktop.send_command(command)
    else:
        time.sleep(0.1)
