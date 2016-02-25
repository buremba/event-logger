var connections = window.connections = {}, clients = [];

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    console.log('onupdated', tabId, changeInfo, tab);
    if (tabId in connections) {
        connections[tabId].postMessage({status: changeInfo.status, url: tab.url, timeStamp: new Date().getTime()});
        if (changeInfo.status == 'complete')
            chrome.tabs.executeScript(tabId, {file: "Panel/debug.js"}, function (result) {
                console.log("executed script", result);

                chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {action: "track_events", events: clients[tabId]}, function (response) {
                        console.log("sent events", response);
                    });
                });
            });
    }
});

chrome.tabs.onRemoved.addListener(function (tabId, changeInfo, tab) {
    console.log('onRemoved', tabId, changeInfo, tab);
    if (tabId in connections) {
        delete connections[tabId];
    }
});

chrome.runtime.onConnect.addListener(function (port) {

    var extensionListener = function (message, port, sendResponse) {
        console.log('extensionListener', message, port, sendResponse);
        // The original connection event doesn't include the tab ID of the
        // DevTools page, so we need to send it explicitly.
        if (message.name == "init") {
            if (message.tabId in connections) {
                chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                    clients[message.tabId] = message.inspectedEvents;
                    chrome.tabs.sendMessage(tabs[0].id, {action: "track_events", events: message.inspectedEvents}, function (response) {
                        console.log("sent events", response);
                    });
                });
            } else {
                connections[message.tabId] = port;
                //chrome.tabs.executeScript({code: preprocessor()});
                chrome.tabs.executeScript(message.tabId, {file: "Panel/debug.js"}, function (result) {
                    console.log("executed script", result);

                    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                        clients[message.tabId] = message.inspectedEvents;
                        chrome.tabs.sendMessage(tabs[0].id, {action: "track_events", events: message.inspectedEvents}, function (response) {
                            console.log("sent events", response);
                        });
                    });

                });
            }
            //console.log("injected");
        } else if (message.name == 'resize') {
            chrome.windows.getCurrent(function (wind) {
                var maxWidth = window.screen.availWidth;
                var maxHeight = window.screen.availHeight;
                var updateInfo = {
                    left: 0,
                    top: 0,
                    width: maxWidth,
                    height: maxHeight
                };
                chrome.windows.update(wind.id, updateInfo);
            });
        } else if (message.name == "stop") {
            chrome.tabs.query({active: true, currentWindow: true}, function () {
                chrome.tabs.sendMessage(message.tabId, {action: "stop"}, function (response) {
                    console.log("sent events", response);
                });
            });
        } else if (message.name == "event_modify") {
            chrome.tabs.query({active: true, currentWindow: true}, function () {
                if (message.status) {
                    clients[message.tabId].push(message.event);
                }else {
                    clients[message.tabId].splice(clients[message.tabId].indexOf(message.event), 1);
                }
                chrome.tabs.sendMessage(message.tabId, {action: "event_modify", event: message.event, status: message.status}, function (response) {
                    console.log("sent events", response);
                });
            });
        } else {
            var m = connections[port.sender.tab.id];
            if (m)
                m.postMessage(message);
        }

    }

    // Listen to messages sent from the DevTools page
    port.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function (port) {
        port.onMessage.removeListener(extensionListener);

        var tabs = Object.keys(connections);
        for (var i = 0, len = tabs.length; i < len; i++) {
            if (connections[tabs[i]] == port) {
                delete connections[tabs[i]]
                break;
            }
        }
    });
});

// Receive message from content script and relay to the devTools page for the
// current tab
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (sender.tab) {
        var tabId = sender.tab.id;
        if (tabId in connections) {
            console.log(2, connections[tabId]);
            connections[tabId].postMessage(request);
        } else {
            console.log("Tab not found in connection list.");
        }
    } else {
        console.log("sender.tab not defined.");
    }
    return true;
});