var exports = {
    json: function (events) {
        return JSON.stringify(events, null, "\t")
    },
    protractor: ((function () {
        var magic = ["ng-click", "ng-model", "ng-href", "href", "name"];
        var trackedEvents = ["mousedown", "submit", "keyup", "change"];

        return function (events) {
            var actions = ["browser.get('" + events[0].url + "');", "var domElement;"], inputState = "";
            for (var i = 1; i < events.length; i++) {
                var event = events[i];
                if (trackedEvents.indexOf(event.type) === -1) {
                    continue;
                }

                var selector;
                if (event.data.element.attributes["ng-model"] != null && !event.data.element.attributes["ng-model"].match(/\[|\./g)) {
                    selector = 'model("' + event.data.element.attributes["ng-model"] + '")';
                } else if (event.data.element.attributes.id != null) {
                    selector = 'id("' + event.data.element.attributes.id + '")';
                } else {
                    var css = event.selector.replace(/\.ng\-binding[ \.#\[]*]/g, '');
                    magic.forEach(function (attr) {
                        var value = event.data.element.attributes[attr];
                        if (value != null) {
                            css += "[" + attr + "=\"" + value + "\"]";
                        }
                    });
                    selector = "css('" + css + "')";
                }

                var action;
                if (event.type === 'mousedown') {
                    if (event.data.element.tag === 'SELECT') {
                        continue;
                    }
                    action = "click()";
                } else if (event.type === 'submit') {
                    action = "submit()";
                } else if (event.type === "keyup") {
                    if (event.data.element.tag !== "TEXTAREA" && event.data.element.tag !== 'INPUT') {
                        continue;
                    }
                    if (events[i + 1].type === "keyup") {
                        inputState = String.fromCharCode(event.data.action.keyCode);
                        continue;
                    }

                    action = "sendKeys('" + (inputState + String.fromCharCode(event.data.action.keyCode)).replace(/'/g, '\'') + "')";
                    inputState = "";
                } else if (event.type === "change") {
                    if (event.data.element.tag !== "SELECT") {
                        continue;
                    }

                    selector += ".findElement(by.cssContainingText('option', \"" + event.data.option.text + "\"))"
                    action = "click()";
                } else {
                    console.warn("ignoring ", event);
                    continue;
                }


                actions.push('domElement = element(by.' + selector + ');');
                actions.push('expect(domElement.isPresent()).toBe(true);');
                if (action != null) {
                    actions.push('domElement.' + action + ";");
                }
                actions.push("");
            }

            return actions.join("\n");
        }
    })())
};

window.EXPORTERS = exports;