var inject = function () {
    var trackedEvents = null;
    var getNodeTreeXPath = function (node) {
        var paths = [];

        loop1:
            for (; node && (node.nodeType == 1 || node.nodeType == 3); node = node.parentNode) {
                var index = 0;

                if (node.id) {
                    paths.splice(0, 0, '#' + node.id);
                    break;
                }

                var classes = node.classList;
                if (classes.length > 1) {
                    var classSelector = "";
                    for (var i = 0; i < classes.length; i++) {
                        classSelector += "." + classes[i];
                    }
                    if (document.querySelectorAll(classSelector).length === 1) {
                        paths.splice(0, 0, node.tagName.toLowerCase() + classSelector);
                        break;
                    }
                }

                if (classes.length === 1) {
                    var classOfElements = document.getElementsByClassName(classes[0]);

                    if (classOfElements.length === 1) {
                        paths.splice(0, 0, node.tagName.toLowerCase() + "." + classes[0]);
                        break;
                    } else {
                        var tempNode = node;
                        for (; tempNode && (tempNode.nodeType == 1 || tempNode.nodeType == 3); tempNode = tempNode.parentNode) {
                            if (tempNode.getElementsByClassName(classes[0]).length === 1) {
                                paths.splice(0, 0, getUniqueSelector(tempNode) + " > " + node.tagName.toLowerCase() + "." + classes[0]);
                                break loop1;
                            }
                        }
                    }
                }

                for (var sibling = node.previousSibling; sibling; sibling = sibling.previousSibling) {
                    if (sibling.nodeType == Node.DOCUMENT_TYPE_NODE)
                        continue;

                    if (sibling.nodeName == node.nodeName)
                        ++index;
                }

                var tagName = (node.nodeType == 1 ? node.nodeName.toLowerCase() : "");
                var pathIndex = (index != null ? ":nth-child(" + (index) + ")" : "");
                paths.splice(0, 0, tagName + pathIndex);
            }

        return paths.length ? paths.join(" ") : null;
    };

    var getUniqueSelector = function (node) {
        if (node && node.id)
            return '#' + node.id;
        else
            return getNodeTreeXPath(node);
    };

    var port = chrome.runtime.connect();
    console.info("Initialized event listener");

    var dataEvents = ["change", "input", "keydown", "keypress", "keyup"];
    var keyEvents = ["input", "keydown", "keypress", "keyup"];
    var log_event = function (e) {
        var data = {};
        if (dataEvents.indexOf(e.type) > -1) {
            if (e.target.tagName === 'SELECT') {
                data.option = {
                    value: e.target.options[e.target.selectedIndex].value,
                    text: e.target.options[e.target.selectedIndex].text
                };
            } else if (e.target.tagName === 'INPUT' || e.tagName === 'TEXTAREA') {
                data.input = {value: e.target.value};
            }
        }
        if (keyEvents.indexOf(e.type) > -1) {
            data.action = {
                shiftKey: e.shiftKey,
                metaKey: e.metaKey,
                keyCode: e.keyCode,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey
            };
        }

        if (e.target != null && e.target !== window) {
            var attributes = {};
            data.element = {attributes: attributes, tag: e.target.tagName};

            e.target.attributes && Array.prototype.slice.call(e.target.attributes).forEach(function (attr) {
                attributes[attr.name] = attr.value;
            });
        }

        var message = {type: e.type, timestamp: e.timeStamp, data: data, selector: getUniqueSelector(e.target)};
        console.log('log', message);
        port.postMessage(message);
    }

    chrome.runtime.onMessage.addListener(
        function (message, sender, sendResponse) {
            console.log("got message", message, sender);
            if (message.action == "track_events") {
                trackedEvents = message.events;
                for (var i = 0; i < message.events.length; i++) {
                    window.addEventListener(message.events[i], log_event, true);
                }

                var message = {status: "PAGE_LOAD", timestamp: new Date().getTime(), url:  window.location.href};
                console.log('log current page', message);
                port.postMessage(message);
            } else if (message.action == "stop") {
                for (var i = 0; i < trackedEvents.length; i++) {
                    window.removeEventListener(trackedEvents[i], log_event);
                }
            } else if (message.action == "event_modify") {
                if (message.status) {
                    window.addEventListener(message.event, log_event);
                } else {
                    window.removeEventListener(message.event, log_event);
                }

            }
        });

    port.onMessage.addListener(function (msg) {
        console.log('something happened', msg);
    });

}

inject();
//# sourceURL=debug.js