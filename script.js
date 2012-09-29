// Utility for loading JSON
function loadJSON(url, cb) {
    var r = new XMLHttpRequest();
    r.open("GET", url, true);
    r.onreadystatechange = function () {
        if (r.readyState != 4) return;
        try {
            var data = JSON.parse(r.responseText);
        } finally {
            cb(data);
            delete r.onreadystatechange;
            delete r;
        }
    };
    r.send(null);
}

var lines = "red green orange blue silver gold".split(" ");

// Update Line on hash change
function onHashChange() {
    var line = location.hash.substr(1);
    if (lines.indexOf(line) != -1) {
        // let css handle showing and hiding the schedules
        document.body.className = "line_selected line_" + line + "_selected";
    }
}
onHashChange();
window.addEventListener("hashchange", onHashChange, false);

loadJSON("schedules.json", function (redSchedule) {
    if (!redSchedule) {
        // Unable to load schedules
        return;
    }
    var scheduleEl = renderSchedule("red", redSchedule);
    document.getElementById("schedules").appendChild(scheduleEl);
});

// Render schedules for a line
function renderSchedule(line, schedule) {
    var scheduleEl = document.createElement("div");
    scheduleEl.className = "schedule";
    scheduleEl.id = line;
    // Loop through each table and generate it
    // appending it as we go.
    for (var i = 0; i < schedule.length; i++) {
        var route = schedule[i];
        var table = renderRoute(route, scheduleEl);
    }
    return scheduleEl;
}

// Create a table for a route
function renderRoute(data, container) {
    // Create the table
    var table = document.createElement("table");

    // Insert title
    var title = document.createElement("h3");
    title.appendChild(document.createTextNode(data.title));
    container.appendChild(title);

    // Loop through destinations
    for (var i = 0; i < data.stops.length; i++) {
        var stop = data.stops[i];
        var tr = document.createElement("tr");

        // Add destination name
        var th = document.createElement("th");
        th.appendChild(document.createTextNode(stop.place));
        tr.appendChild(th);

        // Add times
        insertTimes(tr, stop.times);
        table.appendChild(tr);
    }

    container.appendChild(table);
}

function insertTimes(tr, data) {
    for (var i = 0; i < data.length; i++) {
        var td = document.createElement("td");
        td.appendChild(document.createTextNode(data[i]));
        tr.appendChild(td);
    }
}
