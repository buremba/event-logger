var inject = function () {
   var trackedEvents = null;
   /**
   * Gets an XPath for an element which describes its hierarchical location.
   * Taken from http://stackoverflow.com/a/11133649
   */
  var getElementXPath = function(element) {
      if (element && element.id)
          return '//*[@id="' + element.id + '"]';
      else
          return getElementTreeXPath(element);
  };

  var getElementTreeXPath = function(element) {
      var paths = [];

      // Use nodeName (instead of localName) so namespace prefix is included (if any).
      for (; element && element.nodeType == 1; element = element.parentNode)  {
          var index = 0;
          // EXTRA TEST FOR ELEMENT.ID
          if (element && element.id) {
              paths.splice(0, 0, '/*[@id="' + element.id + '"]');
              break;
          }

          for (var sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
              // Ignore document type declaration.
              if (sibling.nodeType == Node.DOCUMENT_TYPE_NODE)
                continue;

              if (sibling.nodeName == element.nodeName)
                  ++index;
          }

          var tagName = element.nodeName.toLowerCase();
          var pathIndex = (index ? "[" + (index+1) + "]" : "");
          paths.splice(0, 0, tagName + pathIndex);
      }

      return paths.length ? "/" + paths.join("/") : "WINDOW";
  };
    var resolveXPath = function (path) {
        return new XPathEvaluator().evaluate(path, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }
    console.info("Initialized macro automation tool");

    var log_event = function (e) {
        var message = {type: e.type, timeStamp: e.timeStamp, xPath: getElementXPath(e.target)};
        console.log(e, message);
        port.postMessage(message);
    }

    var port = chrome.runtime.connect();

    chrome.runtime.onMessage.addListener(
        function (message, sender, sendResponse) {
            console.log("got message", message, sender);
            if (message.action == "track_events") {
                trackedEvents = message.events;
                for (var i = 0; i < message.events.length; i++) {
                    window.addEventListener(message.events[i], log_event);
                }
            }else
            if (message.action == "stop") {
                for (var i = 0; i < trackedEvents.length; i++) {
                    window.removeEventListener(trackedEvents[i], log_event);
                }
            }else
            if (message.action == "event_modify") {
                if(message.status)
                    window.addEventListener(message.event, log_event);
                else
                    window.removeEventListener(message.event, log_event);

            }
        });

    port.onMessage.addListener(function (msg) {
        console.log('something happened', msg);
    });

}

inject();
//# sourceURL=debug.js