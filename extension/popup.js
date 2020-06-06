let changeColor = document.getElementById('changeColor');

changeColor.onclick = function(element) {
  //Send a message to meetings.js to scrape the meetings
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {command: "getMeetings"}, function(response) {
      window.close();
    });
  });
};


