tell application "System Events"
    tell application process "Skype"
        repeat with i from 1 to (count windows)
            if exists (button "Call" of window i)
                click button "Call" of window i
                return "SUCCESS"
            end if
        end repeat
        return "FAILURE"
    end tell
end tell