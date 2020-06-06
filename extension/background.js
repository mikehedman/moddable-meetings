let webSocket;
const retryTimeoutSeconds = 10;
let mostRecentMeetingData;

chrome.runtime.onInstalled.addListener(function() {

  setupWebsocket();

  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: {hostEquals: 'outlook.office.com'},
      })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });

  chrome.runtime.onMessage.addListener(function(payload) {
    if (payload.type = "schedule") {
      mostRecentMeetingData = payload.meetingData;
      safeSend();
    }
  });
});


function setupWebsocket() {
  webSocket = new WebSocket('ws://meetings.local');

  //if not opened in {retryTimeoutSeconds} seconds, close out the WebSocket and try again
  let retryTimeout = setTimeout(() => {
    webSocket.terminate();
  }, retryTimeoutSeconds * 1000); // force close unless cleared on 'open'

  webSocket.onopen = function() {
    clearTimeout(retryTimeout);

    //in case there's pending data, try sending
    safeSend();
  };

  webSocket.onclose = function() {
    clearTimeout(retryTimeout);
    setTimeout(() => {
      setupWebsocket();
    }, retryTimeoutSeconds * 1000);
  };

  webSocket.onmessage = function(event) {
    showNotification(event.data, new Date().toLocaleTimeString());
  };
}

/**
 * makes sure the socket is open before sending data
 */
function safeSend() {
  if (webSocket && webSocket.readyState === WebSocket.OPEN && mostRecentMeetingData) {
    webSocket.send(mostRecentMeetingData);
    mostRecentMeetingData = undefined;
  }
}

/**
 * Display a system notification
 * @param title
 * @param message
 */
function showNotification(title, message) {
  chrome.notifications.create('', {
    type: 'basic',
    iconUrl: '/message-icon-png-14934.png',
    title,
    message,
    requireInteraction: true,
  });
}
