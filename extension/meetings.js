chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      //listening for request from popup's "Refresh" button
      if (request.command == "getMeetings") {
        getMeetings();
        sendResponse({status: "sent"});
      }
    }
);

//let the page load for 10 seconds, then collect data
setTimeout(() => {
  getMeetings();
  //refresh every 15 seconds. This frequency is primarily so we can also fetch for messages from the remote device
  setInterval(getMeetings, 1000 * 15);
}, 10000);

//note, this function can also be called from a message sent by the extension popup
function getMeetings() {
  //don't try to do if Outlook isn't visible
  if (document.querySelector('#app') === null) {

    //todo - send a notification that the Outlook page isn't available
    return;
  }

  const meetingTimes = [];
  const meetings = document.querySelectorAll('div[draggable="true"] div[role="button"]');

  for (let j = 0; j < meetings.length; j++) {

    const meeting = meetings[j];
    const details = meeting.getAttribute('aria-label');
    const commaParts = details.split(', ');
    const datePart = commaParts[1];  // 'March 29'
    const timeParts = commaParts[2].split(' ');

    //handle all day events
    let startString, endString;
    if (details.startsWith('all day')) {
      // turn: "all day event for Wednesday, June 3, 2020 Out of office"
      // into new Date('March 29 2020 12:00 AM')
      startString = [datePart, timeParts[0], '12:00 AM'].join(' ');
      endString = [datePart, timeParts[0], '11:59 PM'].join(' ');
    } else {
      // turn "event from Sunday, March 29, 2020 5:00 PM to 5:05 PM Outlook 5:00"
      // into new Date('March 29 2020 5:00 PM')
      const timeParts = commaParts[2].split(' ');
      startString = [datePart, timeParts[0], timeParts[1], timeParts[2]].join(' ');
      endString = [datePart, timeParts[0], timeParts[4], timeParts[5]].join(' ');
    }
    //only care about meetings that have not already ended
    if (new Date(endString) > new Date()) {
      meetingTimes.push({
        start: new Date(startString),
        end: new Date(endString)
      });
    }

  }

  //sort by start time
  meetingTimes.sort((a, b) => a.start - b.start);

  //convert to strings to make it easier over in the device
  meetingTimes.forEach(meeting => {
    meeting.start = meeting.start.toString();
    meeting.end = meeting.end.toString();
  });
  const meetingData = JSON.stringify(meetingTimes);

  chrome.runtime.sendMessage({
    type: 'schedule',
    meetingData
  });
}
