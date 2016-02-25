(function () {
    var log_list = [];
    var logArea = document.querySelector('#logs'),
        eventsArea = document.querySelector('#event_logs_table_area'),
        eventList = document.querySelector('#event_list'),
        stick_scroll = document.querySelector('#stick_to_bottom'),
        modal = document.querySelector('#modal'),
        modalContent = document.querySelector('#modal .content');

    var headerRow = document.getElementById("headerRow");
    document.getElementById("event_logs_table_area").addEventListener('scroll', function (e) {
        headerRow.style.top = e.target.scrollTop + "px";
    });

    var log = function (event) {
        var d = document.createElement('tr');
        if (event.type) {
            d.innerHTML = "<td class='event'><p class='index'>#" + log_list.length + "</p>" + event.type + "</td><td class='selector'>" + event.selector + "</td><td class='timestamp'>" + new Date(event.timestamp).toISOString() + "</td><td class='data'>" + JSON.stringify(event['data']) + "</td>";
        } else if (event.status) {
            d.innerHTML = "<td>NEW STATUS: " + event.status + "</td><td class='selector'>URL: " + event.url + "</td><td class='timestamp'>" + new Date(event.timestamp).toISOString() + "</td><td></td>";
            d.className = 'status';
        }
        logArea.appendChild(d);
        log_list.push(event);
        if (stick_scroll.checked) {
            eventsArea.scrollTop = eventsArea.scrollHeight;
        }
    }

    var selected = ["blur", "change", "click", "contextmenu", "copy", "cut", "dblclick", "error", "focus", "focusin", "focusout", "keydown", "keypress", "keyup", "load", "mousedown", "mouseup", "paste", "reset", "resize", "scroll", "select", "submit", "input", "unload"];
    var events = ["blur", "change", "click", "contextmenu", "copy", "cut", "dblclick", "error", "focus", "focusin", "focusout", "keydown", "keypress", "keyup", "load", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover", "mouseup", "mousewheel", "paste", "reset", "resize", "scroll", "select", "submit", "input", "unload", "wheel"];
    events.forEach(function (item) {
        var div = document.createElement('label');
        div.innerHTML = '<input class="event" type="checkbox" ' + (selected.indexOf(item) > -1 ? 'checked' : '') + ' data-item="' + item + '">' + item;
        eventList.appendChild(div);
    });

    window.addEventListener('load', function () {
        var backgroundPageConnection = chrome.runtime.connect({name: "panel"});

        var recording = false;
        var recordButton = document.querySelector('.recording-button');
        var toggleRecording = function () {
            if (recording) {
                recordButton.innerText = 'Start recording';
                recordButton.classList.remove('recording-state');
                backgroundPageConnection.postMessage({
                    name: 'stop',
                    tabId: chrome.devtools.inspectedWindow.tabId
                });
            } else {
                recordButton.innerText = 'Stop recording';
                recordButton.classList.add('recording-state');
                backgroundPageConnection.postMessage({
                    name: 'init',
                    tabId: chrome.devtools.inspectedWindow.tabId,
                    inspectedEvents: selected
                });
            }

            recording = !recording;
        };
        recordButton.addEventListener('click', toggleRecording);

        var removeLogs = function () {
            log_list = [];
            logArea.innerHTML = '';
        };
        var removeLogsButton = document.querySelector('.remove-logs-button');
        removeLogsButton.addEventListener('click', removeLogs);

        var refreshPagebutton = document.querySelector('.refresh-button');
        refreshPagebutton.addEventListener('click', function () {
            removeLogs();
            if(!recording) {
                toggleRecording();
            }
            chrome.devtools.inspectedWindow.eval("window.document.location.reload();", {useContentScriptContext: true});
        })

        var eventInputs = document.querySelectorAll('input.event');
        for (var i = 0, input; input = eventInputs[i]; i++) {
            input.addEventListener('change', function () {
                backgroundPageConnection.postMessage({
                    name: 'event_modify',
                    tabId: chrome.devtools.inspectedWindow.tabId,
                    event: this.getAttribute('data-item'),
                    status: this.checked
                });
                if(this.checked) {
                    selected.push(this.getAttribute('data-item'));
                } else {
                    selected.splice(selected.indexOf(this.getAttribute('data-item')), 1)
                }
            });
        }

        var exportType = "json";
        var exportButton = document.querySelector('.export-button');
        var textarea = document.createElement('textarea');
        textarea.className = 'fullTextarea';
        modalContent.appendChild(textarea);

        exportButton.addEventListener('click', function () {
            textarea.value = window.EXPORTERS[exportType](log_list);
            modal.querySelector('.'+exportType+".item").classList.add('active');
            modal.style.display = 'block';
        });

        var closeModal = document.querySelector('.close-modal');
        closeModal.addEventListener('click', function () {
            modal.style.display = 'none';
        });

        var exports = document.querySelectorAll('#modal .header .item');
        for (var i = 0, input; input = exports[i]; i++) {
            input.addEventListener('click', function () {
                modal.querySelector('.'+exportType+".item").classList.remove('active');
                exportType = this.getAttribute('type');
                textarea.value = window.EXPORTERS[exportType](log_list);
                modal.querySelector('.'+exportType+".item").classList.add('active');
            });
        }

        backgroundPageConnection.onMessage.addListener(function (event, sender, sendResponse) {
            log(event);
        });
    });


})();
