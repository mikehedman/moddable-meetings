/*
 * This work is based on examples from the Moddable SDK:
 *   https://github.com/Moddable-OpenSource/moddable/tree/public/examples
 * Moddable copyright info:
 *   Copyright (c) 2016-2018  Moddable Tech, Inc.
 *   This work is licensed under the
 *       Creative Commons Attribution 4.0 International License.
 *   To view a copy of this license, visit
 *       <http://creativecommons.org/licenses/by/4.0>.
 *   or send a letter to Creative Commons, PO Box 1866,
 *   Mountain View, CA 94042, USA.
 *
 */
import {} from "piu/MC";
import {Server} from "websocket"
import MDNS from "mdns";
import config from "mc/config";

const WHITE = "#ffffff";
const GRAY = "#202020";
const BLUE = "#192eab";
const LIGHTBLUE = "#bac0e5";
const RED = "#ff2600";
const GREEN = "#7CFC00";

const backgroundSkin = new Skin({fill: GRAY});
const itemsSkin = new Skin({fill: WHITE});
const itemsStyle = new Style({color: GRAY});
const noMoreItemsStyle = new Style({color: GREEN});
const activeMeetingSkin = new Skin({fill: RED});
const buttonContainerSkin = new Skin({fill: GRAY});
const buttonSkin = new Skin({fill: BLUE});
const buttonPressedSkin = new Skin({fill: LIGHTBLUE});
const buttonsStyle = new Style({color: WHITE});

const OpenSans20 = new Style({font: "20px Open Sans"});

const ListItem = Label.template($ => ({
  skin: itemsSkin, style: itemsStyle, string: $
}));

function safeBacklight(brightness) {
  //simulator won't have backlight, so skip if not present
  if (typeof backlight !== 'undefined') {
    backlight.write(brightness);
  }
}

class VerticalScrollerBehavior extends Behavior {
  onTouchBegan(scroller, id, x, y) {
    safeBacklight(100);
    this.anchor = scroller.scroll.y;
    this.y = y;
    this.waiting = true;
  }

  onTouchMoved(scroller, id, x, y, ticks) {
    let delta = y - this.y;
    if (this.waiting) {
      if (Math.abs(delta) < 8) {
        return;
      }
      this.waiting = false;
      scroller.captureTouch(id, x, y, ticks);
    }
    scroller.scrollTo(0, this.anchor - delta);
  }
}

const VerticalScrollingContent = Scroller.template($ => ({
  anchor: "SCROLLER", left: 0, right: 0, top: 0, bottom: 0,
  skin: backgroundSkin, active: true, clip: true, loop: true,
  contents: [
    Column($, {
      anchor: "SCROLLER_COLUMN", top: 0, left: 0, right: 0,
      Behavior: class extends Behavior {
        onCreate(application, data) {
          this.data = data || {};
        }

        onUpdateSchedule(column, schedule) {
          const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
          this.data.schedule = schedule;

          let meetingsPresent = false;
          //get current time
          let now = new Date();
          column.empty();
          const columnItemOptions = {top: 20, height: 50, left: 5, right: 5};

          for (let i = 0; i < schedule.length; i++) {
            const meeting = schedule[i];

            if (meeting.endModdable <= now) {
              continue;
            }

            meetingsPresent = true;
            const itemOptions = {...columnItemOptions};
            if (isMeetingActive(now, meeting)) {
              itemOptions.skin = activeMeetingSkin;
            }

            column.add(new ListItem(days[meeting.startLocal.getDay()] + '  ' + timeFormat(meeting.startLocal) + ' - ' + timeFormat(meeting.endLocal), itemOptions));
          }
          if (!meetingsPresent) {
            columnItemOptions.skin = backgroundSkin;
            columnItemOptions.style = noMoreItemsStyle;
            column.add(new ListItem('No More Meetings!', columnItemOptions));
          }

          column.duration = 60000;
          column.time = 0;
          column.start();
        }

        onFinished(column) {
          this.onUpdateSchedule(column, this.data.schedule);
        }
      },
    }),
  ],
  Behavior: VerticalScrollerBehavior,
}));

function isMeetingActive(now, meeting) {
  return meeting.startModdable <= now && (meeting.endModdable > now);
}

//formats a date for display in the list view
function timeFormat(d) {
  let hr = d.getHours();
  let min = d.getMinutes();
  if (min < 10) {
    min = "0" + min;
  }
  let ampm = "am";
  if (hr > 12) {
    hr -= 12;
    ampm = "pm";
  } else if (hr === 12) {
    // noon
    ampm = "pm";
  } else if (hr === 0) {
    //handle midnight
    hr = 12;
  }
  return "" + hr + ":" + min + ampm;
}

class MessageButtonBehavior extends Behavior {
  onTouchBegan(label) {
    label.skin = buttonPressedSkin;
  }

  onTouchEnded(label) {
    label.skin = buttonSkin;
    application.delegate("sendMessage", label.string);
  }
}

const MessageButton = Label.template($ => ({
  active: true, top: 10, bottom: 10, right: 10, left: 10,
  style: buttonsStyle, skin: buttonSkin, Behavior: MessageButtonBehavior, string: $.string,
}));

class MeetingAppBehavior extends Behavior {
  onCreate(application, data) {
    this.data = data;
    this.data.previousMeetingData = '';
    this.webSocketServer = null;
    application.duration = 1000 * 60 * 5; // 5 min
    this.configureWebSocket(application);
  }

  onDisplaying(application) {
    if (!(application.height === 240 && application.width === 320 ||
            application.height === 320 && application.width === 240))
      trace("WARNING: This application was designed to run on a 240x320 screen.\n");
    this.setBacklight();
  }

  onFinished(application) {
    this.setBacklight();
  }

  setBacklight() {
    //if it's the end of the work day, dim the backlight
    if ((new Date()).getHours() >= config.endOfDayGMT) {  //15 (gmt) is 8am (PST)
      safeBacklight(100);
    } else {
      safeBacklight(3);
    }
  }

  processMeetingData(application, meetingData) {
    //check if we've already dealt with this schedule
    if (this.data.previousMeetingData === meetingData) {
      return;
    } else {
      this.data.previousMeetingData = meetingData;
    }

    this.data.schedule = JSON.parse(meetingData);

    //convert strings into Date objects
    this.data.schedule.map(meeting => {
      meeting.startModdable = new Date(meeting.start);
      meeting.endModdable = new Date(meeting.end);
      //chop off the timezone part since the moddable doesn't know where it lives
      meeting.startLocal = new Date(meeting.start.split(' GMT')[0]);
      meeting.endLocal = new Date(meeting.end.split(' GMT')[0]);
    });
    // //sort by start time
    // this.data.schedule.sort((a, b) => a.start - b.start);

    this.data["SCROLLER_COLUMN"].delegate("onUpdateSchedule", this.data.schedule);
    application.time = 0;
    application.start();
  }

  configureWebSocket(application) {
    const self = this;
    let server = new Server({port: 80});
    server.callback = function(message, value) {
      switch (message) {
        case Server.connect:
          trace("main.js: socket connect.\n");
          //keep an external pointer to the most recent connection
          self.webSocketServer = this;
          break;

        case Server.handshake:
          trace("main.js: websocket handshake success\n");
          break;

        case Server.receive:
          self.processMeetingData(application, value);
          trace(`received JSON: ${value}\n`);

          application.time = 0;
          application.start();
          break;

        case Server.disconnect:
          trace("main.js: websocket close\n");
          break;
      }
    };

    this.advertiseServer();
  }

  //sends a notification request to the websocket client
  sendMessage(application, message) {
    if (this.webSocketServer !== null) {
      this.webSocketServer.write(message);
    }
  };

  //use mDns to assign a URL name for local network access, like http://meetings.local
  advertiseServer() {
    this.mdns = new MDNS({hostName: config.mdnsDomainName}, function(message, value) {
    });
    this.mdns[config.mdnsDomainName] = this;
  }
}

const MeetingApplication = Application.template($ => ({
  style: OpenSans20,
  contents: [
    Column($, {
      top: 0, bottom: 0, left: 0, right: 0,
      contents: [

        new VerticalScrollingContent($),
        Row($, {
          top: 0, height: 50, left: 0, right: 0, skin: buttonContainerSkin,
          contents: config.buttonLabels.map(label => {
            return new MessageButton({string: label});
          })
        }),
      ]
    })
  ],
  Behavior: MeetingAppBehavior
}));

export default new MeetingApplication({}, {displayListLength: 4096, touchCount: 1});

