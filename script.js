// Utility for loading JSON
function loadJSON(url, cb) {
    var r = new XMLHttpRequest();
    r.open("GET", url, true);
    r.onreadystatechange = function () {
        var data;
        if (r.readyState != 4) return;
        try {
            data = JSON.parse(r.responseText);
        } finally {
            cb(data);
            delete r.onreadystatechange;
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
var dayChars = "UMTWRFSU";
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

// Make a nice name for a line
function formatLineName(line, days) {
    return line[0].toUpperCase() + line.substr(1) + " Line" +
        (days ? " " + formatDaysString(days) : "");
}

// Check if a date is fits into a date string.
function isDayInString(date, dayStr) {
    // We consider the day to change at 3AM instead of midnight.
    var date2 = new Date(date - 3 * 3600000);
    return dayStr.indexOf(dayChars[date2.getDay()]) != -1;
}

// Check if a date is within a date range
function isDateInRange(date, range) {
    if (!range || range.length != 2) return true;
    // Start day at 3AM instead of midnight.
    var date2 = new Date(date - 3 * 3600000);
    return makeDate(range[0]) < date2 && date2 < makeDate(range[1]);
}

// Reveal an element by scrolling if it is out of view
function scrollIntoViewIfNeeded(el) {
    if (window.pageYOffset + window.innerHeight - 50 < el.offsetTop) {
        window.scroll(0, el.offsetTop);
    }
}

var lines = "red green orange blue silver gold".split(" ");
var currentLine;
var currentScheduleEl;
var schedulesEl = document.getElementById("schedules");
var schedulesData;

// Update Line on hash change
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
        currentLine = line;
        currentScheduleEl = scheduleEl;
        if (currentScheduleEl) {
            currentScheduleEl.style.display = "block";
            // If the table is not visible, the browser will not scroll to it.
            // So we scroll for it.
            scrollIntoViewIfNeeded(currentScheduleEl);
            updateFancyScroll(currentScheduleEl);
        }
        highlightUpcomingStops();
    }
}

// Highlight upcoming stops
var highlightedTds = [];
function highlightUpcomingStops() {
    if (!currentScheduleEl) return;
    // unhighlight stops from last time
    highlightedTds.forEach(function (td) {
        if (td.className.indexOf("upcoming") != -1) {
            td.className = td.className.replace(/(^| )upcoming( |$)/, "");
        }
    });
    highlightedTds.length = 0;

    var now = new Date();
    var nowNum = now.getHours() * 100 + now.getMinutes();

    // Get selected line schedule (array of routes).
    var schedule = schedulesData[currentLine];

    schedule.forEach(function (route) {
        // Check if this route is for today
        if (route.noService ||
            (route.days && !isDayInString(now, route.days))) return;
        route.directions.forEach(function (direction) {
            // Check if this route direction is for today
            if (direction.days && !isDayInString(now, direction.days)) return;

            direction.stops.forEach(function (stop) {
                if (!stop.tds) return;
                for (var i = 0; i < stop.times.length; i++) {
                    var timeNum = stop.times[i];
                    // Account for day change at 3:00 AM
                    if (timeNum != null &&
                       (timeNum > 300 == nowNum > 300 ? timeNum > nowNum :
                        timeNum < 300 && timeNum+2400 > nowNum)) {

                        var td = stop.tds[i];
                        td.className += " upcoming";
                        highlightedTds.push(td);
                        break;
                    }
                }
            });
        });
    });
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
    schedulesData = schedules;
    renderSchedules();
    setInterval(highlightUpcomingStops, 60000);
});

function renderSchedules() {
    schedulesEl.innerHTML = "";
    for (var line in schedulesData) {
        var scheduleEl = renderSchedule(line, schedulesData[line]);
        schedulesEl.appendChild(scheduleEl);
    }
    onHashChange();
    highlightUpcomingStops();
}

var prefs = {
    storage: window.localStorage || window.sessionStorage || {},
    prefix: "rocbuses-",
    set: function (key, value) {
        this.storage[this.prefix+key] = value;
    },
    get: function (key) {
        return this.storage[this.prefix+key];
    }
};

var showAllDays = prefs.get("show-all-days");
var toggleShowAllLink = document.getElementById("toggle-show-all-days");
function updateShowAllLink() {
    toggleShowAllLink.firstChild.nodeValue = showAllDays ?
        "Show today only" : "Show all days";
}
updateShowAllLink();
toggleShowAllLink.addEventListener("click", function (e) {
    showAllDays = !showAllDays;
    prefs.set("show-all-days", showAllDays ? "1" : "");
    updateShowAllLink();
    renderSchedules();
    e.preventDefault();
}, false);

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
    var now = new Date();

    // Loop through each table and generate it
    // appending it as we go.
    for (var i = 0; i < schedule.routes.length; i++) {
        var route = schedule.routes[i];
        if (!route.ignore &&
            (showAllDays || !route.days || isDayInString(now, route.days))) {
            renderRoute(route, line, scheduleEl);
        }
    }
    if (!scheduleEl.firstChild) {
        var note = document.createElement("h3");
        note.className = "line_name not_running_today";
        note.appendChild(document.createTextNode(
            "No " + formatLineName(line) + " running right now."));
        scheduleEl.appendChild(note);
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
    var name = formatLineName(line, data.days);
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
        var direction = data.directions[i];
        if (showAllDays || !direction.days ||
                isDayInString(new Date(), direction.days)) {
            renderRouteDirection(direction, table);
        }
    }

    // Add notes info
    var notes = [];
    if (data.notes) {
        for (var indicator in data.notes) {
            var note = indicator + " indicates " + data.notes[indicator];
            notes.push(note);
        }
    }

    var now = new Date();
    var noService = false;
    if (data.effective) {
        notes.push("Effective " + makeDateString(data.effective));
        if (!isDateInRange(now, data.effective)) {
            noService = true;
        }
    }
    if (data.no_service && data.no_service[0]) {
        // Show only the first no-service range that is not past
        var noServiceRanges = data.no_service.filter(function (dateRange) {
            var end = makeDate(dateRange[1]);
            return end > now;
        });

        if (noServiceRanges.length) {
            notes.push("No Service " + makeDateString(noServiceRanges[0]));
            if (makeDate(noServiceRanges[0][0]) < now) {
                // We are within this range
                noService = true;
            }
        }
    }
    data.noService = noService;

    if (noService) {
        // Hide the schedule and leave a link to show it.
        table.className = "no_service";
        var showLink = document.createElement("a");
        showLink.appendChild(document.createTextNode("Show schedule"));
        showLink.href = "";
        showLink.addEventListener("click", function (e) {
            // Show the schedule and hide this link.
            e.preventDefault();
            table.className = "";
            showLink.parentNode.removeChild(showLink);
            resetFancyScroll(routeEl);
        }, false);
        notes.push(showLink);
    }

    if (notes.length) {
        var tfoot = document.createElement("tfoot");
        for (var i = 0; i < notes.length; i++) {
            var note = notes[i];
            tr = document.createElement("tr");
            var noteEl = document.createElement("td");
            noteEl.className = "note";
            noteEl.setAttribute("colspan", "100%");
            noteEl.appendChild(typeof note == "string" ?
                document.createTextNode(note) : note);
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
        insertTimes(tr, stop, notes);
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
}

function insertTimes(tr, data, notes) {
    var times = data.times;
    // Save references to the tds
    var tds = data.tds = new Array(times.length);
    for (var i = 0; i < times.length; i++) {
        var td = document.createElement("td");
        tds[i] = td;
        var timeNum = times[i];
        if (timeNum >= 1200) td.className = "pm";
        var note = notes[i] || "";
        var timeStr = timeNumToString(timeNum) + note;
        td.appendChild(document.createTextNode(timeStr));
        tr.appendChild(td);
    }
    return tds;
}

function getElementsInElements(container, tag1, tag2) {
    var children = [].slice.call(container.getElementsByTagName(tag1)),
        nodes = [];

    children.forEach(function (child) {
        [].slice.call(child.getElementsByTagName(tag2)).forEach(function (el) {
            nodes.push(el);
        });
    });
    return nodes;
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
        ths = getElementsInElements(container, "tbody", "th");

    ths.forEach(function (th) {
        var spacer = document.createElement("td");
        spacer.className = "fancyscroll-spacer";
        th.parentNode.insertBefore(spacer, th.nextSibling);
    });

    fancyScrollContainers.push(container);

    function updateTH(th) {
        th.style.width = thWidth + "px";
        th.style.minWidth = thWidth + "px";
        // Use min-width also so that :hover { width: auto; }
        // doesn't collapse the th width
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

    var scrolled = false;
    container.addEventListener("scroll", function (e) {
        scrolled = true;
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

    var visibleTH;
    var manualScroll = null;
    var manualScrollStart;
    container.addEventListener("touchstart", function (e) {
        manualScrollStart = container.scrollLeft + e.touches[0].pageX;
        // Allow tap on mobile to keep a th visible
        if (visibleTH) {
            // restore normal width to previously tapped th
            visibleTH.style.width = visibleTH.style.minWidth;
        }
        if (e.target.nodeName != "TH") return;
        var th = e.target;
        // keep this th at full width until the user taps something else
        th.style.width = "auto";
        visibleTH = th;
    }, false);

    container.addEventListener("touchmove", function onTouchMove(e) {
        // On old Android browsers, scroll events do not fire, unless we
        // set scrollLeft. Feature detect here if scroll event fired.
        if (manualScroll === null) {
            setTimeout(function () {
                manualScroll = !scrolled;
                if (manualScroll) {
                    onTouchMove(e);
                } else {
                    container.removeEventListener("touchmove", onTouchMove,
                        false);
                }
            }, 10);
        } else if (manualScroll) {
            var scrollX = manualScrollStart - e.touches[0].pageX;
            container.scrollLeft = scrollX;
        }
    }, false);
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
