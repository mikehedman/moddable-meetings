chrome.runtime.onInstalled.addListener(function () {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher({
                pageUrl: {hostEquals: 'outlook.office.com'},
            })
            ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });

    chrome.runtime.onMessage.addListener(function (payload) {
        if (payload.type = "schedule") {
            const xhr = new XMLHttpRequest();
            xhr.withCredentials = true;

            xhr.addEventListener("readystatechange", function () {
                if (this.readyState === 4) {
                    console.log(this.responseText);
                    const messages = JSON.parse(this.responseText);
                    if (messages.length !== 0) {
                        showNotification('', messages.join(', '), new Date().toLocaleTimeString());
                    }
                }
            });

            xhr.open("POST", "http://meetings.local/meetings");
            xhr.setRequestHeader("Content-Type", "application/json");

            xhr.send(payload.meetingData);
        }
    });
});

function showNotification(id, title, message) {
    chrome.notifications.create(id, {
        type: 'basic',
        iconUrl: '/message-icon-png-14934.png',
        title,
        message,
        requireInteraction: true,
    });
}
