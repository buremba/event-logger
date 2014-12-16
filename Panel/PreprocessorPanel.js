(function () {
    var log_list = [];
    var logArea = document.querySelector('#logs'),
        eventsArea = document.querySelector('#event_logs_table_area'),
        eventList = document.querySelector('#event_list'),
        stick_scroll = document.querySelector('#stick_to_bottom'),
        modal = document.querySelector('#modal'),
        modalContent = document.querySelector('#modal .content');

    var headerRow = document.getElementById("headerRow");
    document.getElementById("event_logs_table_area").addEventListener('scroll', function(e) {
      headerRow.style.top = e.target.scrollTop+"px";
    });

    var log = function (event) {
        var d = document.createElement('tr');
        //JSON.stringify(event);
        if(event['type'])
            d.innerHTML = "<td class='event'><p class='index'>#"+log_list.length+"</p>" + event['type'] + "</td><td class='xPath'>" + event['xPath'] + "</td><td class='timestamp'>" + event['timeStamp'] + "</td>";
        else if(event['status']) {
            d.innerHTML = "<td>NEW STATUS: "+event['status']+"</td><td class='xPath'>URL: " + event['url'] + "</td><td class='timestamp'>" + event['timeStamp'] + "</td>";
            d.className = 'status';
        }
        logArea.appendChild(d);
        log_list.push(event);
        if(stick_scroll.checked)
            eventsArea.scrollTop = eventsArea.scrollHeight;
    }

    var default_selected = ["change", "blur", "click", "dblclick", "focus",  "keyup", "resize", "select", "submit"];
    var events = ["blur", "change", "click", "contextmenu", "copy", "cut", "dblclick", "error", "focus", "focusin", "focusout", "keydown", "keypress", "keyup", "load", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover", "mouseup", "mousewheel", "paste", "reset", "resize", "scroll", "select", "submit", "textinput", "unload", "wheel"];
    events.forEach(function(item) {
        var div = document.createElement('label');
        div.innerHTML = '<input class="event" type="checkbox" '+(default_selected.indexOf(item)>-1 ? 'checked' : '')+' data-item="'+item+'">'+item;
        eventList.appendChild(div);
    });

    window.addEventListener('load', function() {
        var backgroundPageConnection = chrome.runtime.connect({name: "panel"});

        var recordButton = document.querySelector('.recording-button');
        recordButton.addEventListener('click', function(e) {
            if(this.classList.contains("recording-state")) {
                this.innerText = 'Start recording';
                this.classList.remove('recording-state');
                backgroundPageConnection.postMessage({
                    name: 'stop',
                    tabId: chrome.devtools.inspectedWindow.tabId
                });
            }else {
                this.innerText = 'Stop recording';
                this.classList.add('recording-state');
                backgroundPageConnection.postMessage({
                    name: 'init',
                    tabId: chrome.devtools.inspectedWindow.tabId,
                    inspectedEvents: default_selected
                });
            }
            var refreshPagebutton = document.querySelector('.refresh-button');
            refreshPagebutton.addEventListener('click', function() {
                 chrome.devtools.inspectedWindow.eval("window.document.location.reload();", { useContentScriptContext: true });
            })
        });

        var eventInputs = document.querySelectorAll('input.event');
        for (var i = 0, input; input = eventInputs[i]; i++) {
            input.addEventListener('change', function() {
                backgroundPageConnection.postMessage({
                    name: 'event_modify',
                    tabId: chrome.devtools.inspectedWindow.tabId,
                    event: this.getAttribute('data-item'),
                    status: this.checked
                });
                this.checked
            });
        }

        var removeLogsButton = document.querySelector('.remove-logs-button');
        removeLogsButton.addEventListener('click', function() {
            log_list = [];
            logArea.innerHTML = '';
        });


        var removeLogsButton = document.querySelector('.remove-logs-button');
        removeLogsButton.addEventListener('click', function() {
            log_list = [];
            logArea.innerHTML = '';
        });

        var exportButton = document.querySelector('.export-button');
        exportButton.addEventListener('click', function() {
            var textarea =  document.createElement('textarea');
            textarea.value = JSON.stringify(log_list, null, "\t");
            textarea.className = 'fullTextarea';

            modalContent.appendChild(textarea);
            modal.style.display = 'block';
        });

        var closeModal = document.querySelector('.close-modal');
        closeModal.addEventListener('click', function() {
            modalContent.innerHTML = '';
            modal.style.display = 'none';
        });

        backgroundPageConnection.onMessage.addListener(function (request, sender, sendResponse) {
            log(request);
        });
    });


})();
