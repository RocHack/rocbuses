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

// Make a Date out of an object loaded from JSON
function makeDate(arr) {
    return new Date(arr[0], arr[1], arr[2], 0, 0, 0, 0);
}

// Make a string for a date or date range
function makeDateString(arr) {
    return makeDate(arr[0]).toDateString() +
        (arr[1] ? "–" + makeDate(arr[1]).toDateString() : "");
}

// Convert JSON military time to 12-hour time
function timeNumToString(timeNum) {
    return timeNum == null ? "–" :
        (Math.floor(timeNum / 100) % 12 || 12) +
        ":" + ("0" + timeNum).substr(-2);
}

// Convert a time range array to a string
// e.g. given [800, 1430] returns "8:00 AM – 2:30 PM"
function timeRangeToString(times) {
	return timeNumToString(times[0]) + (times[0]<1200 ? " AM" : " PM") +
		"–" + timeNumToString(times[1]) + (times[1]<1200 ? " AM" : " PM");
}

// Day ranges are represented in the JSON by a string with characters from
// the following string dayChars:
var dayChars = "MTWRFSU";
var dayNames = {
    M: "Monday",
    T: "Tuesday",
    W: "Wednesday",
    R: "Thursday",
    F: "Friday",
    S: "Saturday",
    U: "Sunday"
};

// Convert a dayChars representation to a readable string, with optional AM/PM
function formatDaysString(days, timeOfDay) {
    var daysStr = !days ? "" :
        days.length == 1 ? dayNames[days] + " Only":
        ~dayChars.indexOf(days) ? // substring -> it's a range
            dayNames[days[0]] + "–" + dayNames[days[days.length-1]] :
        days.split("").map(function (c) { return dayNames[c]; }).join(", ");
    var timeStr = timeOfDay ? timeOfDay.toUpperCase() : "";
    return daysStr + (daysStr && timeStr ? ", " : "") + timeStr;
}

// Reveal an element by scrolling if it is out of view
function scrollIntoViewIfNeeded(el) {
    if (window.pageYOffset + window.innerHeight - 50 < el.offsetTop) {
        window.scroll(0, el.offsetTop);
    }
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
        resetFancyScroll(currentScheduleEl);
        currentScheduleEl.style.display = "none";
    }

    if (isLine) {
        // Show the new schedule
        currentScheduleEl = scheduleEl;
        if (currentScheduleEl) {
            currentScheduleEl.style.display = "block";
            // If the table is not visible, the browser will not scroll to it.
            // So we scroll for it.
            scrollIntoViewIfNeeded(currentScheduleEl);
            updateFancyScroll(currentScheduleEl);
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

// Update appcache if necessary
if (window.applicationCache) {
    applicationCache.addEventListener("updateready", function () {
        applicationCache.swapCache();
        location.reload();
    }, false);
}

// Render schedules for a line
function renderSchedule(line, schedule) {
    var scheduleEl = document.createElement("div");
    scheduleEl.className = "schedule";
    scheduleEl.id = line;

    // Loop through each table and generate it
    // appending it as we go.
    for (var i = 0; i < schedule.length; i++) {
        var route = schedule[i];
        if (!route.ignore) {
            renderRoute(route, line, scheduleEl);
        }
    }
    return scheduleEl;
}

// Create and insert a table for a route
function renderRoute(data, line, container) {
    var routeEl = document.createElement("div");
    routeEl.className = "route";

    // Create the table
    var table = document.createElement("table");
    
    // Insert route name and days
    var name = line[0].toUpperCase() + line.substr(1) + " Line " +
        formatDaysString(data.days);
	// Some routes specify a time range as well as days
	if (data.times) {
		name += ", " + timeRangeToString(data.times);
	}
    var h3 = document.createElement("h3");
    h3.className = "line_name";
    h3.appendChild(document.createTextNode(name));
    container.appendChild(h3);

    // Insert title
    var title = document.createElement("h3");
    title.appendChild(document.createTextNode(data.title));
    container.appendChild(title);

    if (data.directions) for (var i = 0; i < data.directions.length; i++) {
        renderRouteDirection(data.directions[i], table);
    }

    // Add notes info
    var notes = [];
    if (data.notes) {
        for (var indicator in data.notes) {
            var note = indicator + " indicates " + data.notes[indicator];
            notes.push(note);
        }
    }
    if (data.effective) {
        notes.push("Effective " + makeDateString(data.effective));
    }
    if (data.no_service) {
        notes.push("No Service " + makeDateString(data.no_service));
    }

    if (notes.length) {
        var tfoot = document.createElement("tfoot");
        for (var i = 0; i < notes.length; i++) {
            var note = notes[i];
            tr = document.createElement("tr");
            var noteEl = document.createElement("td");
            noteEl.className = "note";
            noteEl.setAttribute("colspan", "100%");
            noteEl.appendChild(document.createTextNode(note));
            tr.appendChild(noteEl);
            tfoot.appendChild(tr);
        }
        table.appendChild(tfoot);
    }

    routeEl.appendChild(table);
    setupFancyScroll(routeEl);
    container.appendChild(routeEl);
}

function renderRouteDirection(data, table) {
    // Create tbody
    var tbody = document.createElement("tbody");

    // Insert title and other headings
    var headings = [];
    if (data.title) {
        headings.push(data.title);
    }
    if (data.days) {
        headings.push(formatDaysString(data.days, data.time_of_day));
    }
    if (headings.length) {
        var thead = document.createElement("thead");
        for (var i = 0; i < headings.length; i++) {
            var heading = headings[i];
            var tr = document.createElement("tr");
            var th = document.createElement("th");
            th.setAttribute("colspan", "100%");
            var header = document.createElement("h4");
            header.appendChild(document.createTextNode(heading));
            tr.appendChild(th);
            th.appendChild(header);
            thead.appendChild(tr);
        }
        table.appendChild(thead);
    }

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
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
}

function insertTimes(tr, data, notes) {
    for (var i = 0; i < data.length; i++) {
        var td = document.createElement("td");
        var timeNum = data[i];
        if (timeNum >= 1200) td.className = "pm";
        var note = notes[i] || "";
        var timeStr = timeNumToString(timeNum) + note;
        td.appendChild(document.createTextNode(timeStr));
        tr.appendChild(td);
    }
}

// Fancy scrolling

// The THs (table headers) contain the stop names.
// When the user scrolls horizontally through the tables,
// shrink the THs but keep them visible and at least a certain width.
// This helps the user see which stop each row is for.

function initTH(th) {
    th.className = "fancyscroll";
}

// The cell has to get position static when the table is hidden, otherwise 
// the space taken up by it collapses.
function resetTH(th) {
    th.className = "";
}

var fancyScrollContainers = [];

function setupFancyScroll(container) {
    var reflowed = false,
        scrollLeft = 0,
        scrollLeftSaved = 0,
        thWidth,
        maxTHWidth,
        minTHWidth = 58,
        tbodies = [].slice.call(container.getElementsByTagName("tbody")),
        ths = [];

    tbodies.forEach(function (tbody) {
        [].slice.call(tbody.getElementsByTagName("th")).forEach(function (th) {
            ths.push(th);
            var spacer = document.createElement("td");
            spacer.className = "fancyscroll-spacer";
            th.parentNode.insertBefore(spacer, th.nextSibling);
        });
    });

    fancyScrollContainers.push(container);

    function updateTH(th) {
        th.style.width = thWidth + "px";
    }

    // If left is "", the th moves with the table. Good for centering.
    // If left is 0 (or any number), the th does not move.
    function updateTHLeft(th) {
        th.style.left = container.scrollLeft ? "0" : "";
    }

    // The spacer holds the space of the absolute positioned th.
    function updateTHSpacer(th) {
        th.nextSibling.style.minWidth = maxTHWidth + 10 + "px";
    }

    function updateScrolling() {
        thWidth = Math.max(maxTHWidth - container.scrollLeft, minTHWidth);
        ths.forEach(updateTH);
        if (scrollLeft != container.scrollLeft) {
            scrollLeft = container.scrollLeft;
            ths.forEach(updateTHLeft);
        }
    }

    function reflow() {
        if (!maxTHWidth) maxTHWidth = ths[0].offsetWidth;
        ths.forEach(updateTHSpacer);
        updateScrolling();
        ths.forEach(initTH);
        // Restore scroll position from before reset
        if (scrollLeftSaved) {
            container.scrollLeft = scrollLeftSaved;
        }
    }
    container._reflow = reflow;

    container.addEventListener("scroll", function (e) {
        if (reflowed) {
            updateScrolling();
        } else {
            reflow();
            reflowed = true;
        }
    }, false);

    container._reset = function (scheduleEl) {
        ths.forEach(resetTH);
        scrollLeftSaved = container.scrollLeft;
        container.scrollLeft = 0;
    };
}

function isNodeAncestor(maybeAncestor, node) {
    for (var el = node; el; el = el.parentNode) {
        if (el == maybeAncestor) return true;
    }
    return false;
}

// Reflow all the tables. Must be called after they are made visible
function updateFancyScroll(container) {
    fancyScrollContainers.forEach(function (scroller) {
        if (isNodeAncestor(container, scroller) && scroller._reflow) {
            scroller._reflow();
        }
    });
}

function resetFancyScroll(container) {
    fancyScrollContainers.forEach(function (scroller) {
        if (isNodeAncestor(container, scroller) && scroller._reset) {
            scroller._reset();
        }
    });
}
