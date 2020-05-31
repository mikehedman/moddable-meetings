# Moddable Meetings
This repository contains the software needed to display an Outlook Calendar on a [Moddable Two](https://www.moddable.com/moddable-two.php) display.

## Components
### Device software
Prerequisite: follow the steps in the [Moddable Two Getting Started Guide](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/moddable-two.md)

Run on the simulator:
`mcconfig -d -m`

Deploy to device with WiFi credentials
`mcconfig -d -m -p esp32/moddable_two ssid="xxxxxx" password="yyyyyyyyy"`

Configurable options are primarily in the `config` section of device/manifest.json

### Chrome extension
The Chrome extension is used to collect the meeting schedule from an MS Outlook webview: https://outlook.office.com/calendar

The device software also displays buttons, that when pushed sends a message to the Chrome Extenstion, cause notifications to be displayed on the computer running Chrome.

To use:
1) [Install extension](https://support.google.com/chrome_webstore/answer/2664769?hl=en)
1) Open Chrome, and load your Outlook calendar, eg: https://outlook.office.com/calendar
1) Navigate to the proper day

## Credits
Moddable is a trademark of []Moddable Tech Inc.](https://www.moddable.com)
Messager icon image (used in the notification) is from https://www.freeiconspng.com/uploads/message-icon-png-16.png

## license
MIT