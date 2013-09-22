tell application "System Events"
    activate
    set UI elements enabled to true
    if UI elements enabled
      return "SUCCESS"
    else
      return "FAILURE"
    end if
end tell