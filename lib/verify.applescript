tell application "System Events"
    if UI elements enabled
      return "SUCCESS"
    else
      return "FAILURE"
    end
end tell