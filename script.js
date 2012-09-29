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
var currentScheduleEl;
function onHashChange() {
    var line = location.hash.substr(1);
    var isLine = (lines.indexOf(line) != -1);
    var scheduleEl = document.getElementById(line);

    // Update styles
    document.body.className = isLine ? "line_selected" : "";

    // hide old schedule
    if (currentScheduleEl) {
        resetScrolling(currentScheduleEl);
        currentScheduleEl.style.display = "none";
    }

    if (isLine) {
        // Show the new schedule
        currentScheduleEl = scheduleEl;
        if (currentScheduleEl) {
            currentScheduleEl.style.display = "block";
            // If the table is not visible, the browser will not scroll to it.
            // So we scroll for it.
            currentScheduleEl.scrollIntoView();
            initScrolling(currentScheduleEl);
        }
    }
}
onHashChange();
window.addEventListener("hashchange", onHashChange, false);
setTimeout(onHashChange, 10);

loadJSON("schedules.json", function (schedules) {
    if (!schedules) {
        // Unable to load schedules
        document.body.appendChild(
            document.createTextNode("Unable to load schedules!"));
        return;
    }
    var schedulesEl = document.getElementById("schedules");
    for (var line in schedules) {
        var scheduleEl = renderSchedule(line, schedules[line]);
        schedulesEl.appendChild(scheduleEl);
    }
    onHashChange();
});

// Render schedules for a line
function renderSchedule(line, schedule) {
    var scheduleEl = document.createElement("div");
    scheduleEl.className = "schedule";
    scheduleEl.id = line;
    scheduleEl.addEventListener("scroll", onScheduleScroll, false);

    // Loop through each table and generate it
    // appending it as we go.
    for (var i = 0; i < schedule.length; i++) {
        var route = schedule[i];
        var tableOuter = renderRoute(route);
        scheduleEl.appendChild(tableOuter);
    }
    return scheduleEl;
}

// Create a table for a route
function renderRoute(data) {
    var routeEl = document.createElement("div");
    routeEl.className = "route";

    // Create the table
    var table = document.createElement("table");

    // Insert title
    var title = document.createElement("h3");
    title.appendChild(document.createTextNode(data.title));
    routeEl.appendChild(title);

    // Add another title for line wrapping purposes
    var title2 = title.cloneNode(true);
    title2.className = "wrapfix";
    routeEl.appendChild(title2);

    // Loop through destinations
    for (var i = 0; i < data.stops.length; i++) {
        var stop = data.stops[i];
        var tr = document.createElement("tr");

        // Add destination name
        var th = document.createElement("th");
        th.appendChild(document.createTextNode(stop.place));
        tr.appendChild(th);

        // Add notes to times
        var notes = [];
        for (var note in stop.notes) {
            var times = stop.notes[note];
            for (var j = 0; j < times.length; j++) {
                notes[times[j]] = note;
            }
        }
        // Add times
        insertTimes(tr, stop.times, notes);
        table.appendChild(tr);
    }

    routeEl.appendChild(table);

    // Add notes info
    for (var indicator in data.notes) {
        var noteEl = document.createElement("div");
        noteEl.className = "indicator-note";
        var note = indicator + " indicates " + data.notes[note];
        noteEl.appendChild(document.createTextNode(note));
        routeEl.appendChild(noteEl);
    }

    return routeEl;
}

// Convert JSON military time to 12-hour time
function timeNumToStr(timeNum) {
    return timeNum == null ? "—" :
        (Math.floor(timeNum / 100) % 12 || 12) +
        ":" + ("0" + timeNum).substr(-2);
}

function insertTimes(tr, data, notes) {
    for (var i = 0; i < data.length; i++) {
        var td = document.createElement("td");
        var timeNum = data[i];
        td.className = timeNum < 1200 ? "am" : "pm";
        var note = notes[i] || "";
        var timeStr = timeNumToStr(timeNum) + note;
        td.appendChild(document.createTextNode(timeStr));
        tr.appendChild(td);
    }
}

// Fancy scrolling

// The THs (table headers) contain the stop names.
// When the user scrolls horizontally through the tables,
// shrink the THs but keep them visible and at least a certain width.
// This helps the user see which stop each row is for.

var scrollLeft,
    thWidth,
    tables = [],
    ths = [];

function initTH(th) {
    th.className = "fancyscroll";
}

// This has to to be reset when the table is hidden, otherwise 
// the space taken up by each TH collapses.
function resetTH(th) {
    th.className = "";
    th.style.width = "";
}

function updateTH(th) {
    th.style.width = thWidth + "px";
}

function initScrolling(scheduleEl) {
    tables = [].slice.call(scheduleEl.getElementsByTagName("table"));
    tables.forEach(initTableScrolling);
    ths = [].slice.call(scheduleEl.getElementsByTagName("th"));
    ths.forEach(resetTH);
}

function initTableScrolling(table) {
    table._ths = [].slice.call(table.getElementsByTagName("th"));
    var firstTH = table._ths[0];
    setTimeout(function () {
        var maxTHWidth = firstTH.offsetWidth - 6; // subtract padding & border
        table.setAttribute("data-max-th-width", maxTHWidth);
        table._ths.forEach(initTH);
        updateTable(table);
    }, 10);
}

function resetScrolling(scheduleEl) {
    ths.forEach(resetTH);
}

function onScheduleScroll(e) {
    tables.forEach(updateTable);
}

function updateTable(table) {
    var scheduleEl = table.parentNode.parentNode;
    scrollLeft = scheduleEl.scrollLeft;
    var maxTHWidth = table.getAttribute("data-max-th-width");
    thWidth = Math.max(maxTHWidth - scrollLeft, 58);
    table._ths.forEach(updateTH);
}

