$(document).ready(function() {
    // Set up a listener for each line color box
    $("div.lines a").click(function(e) {
        e.preventDefault();

        var line = $(this).attr("href").replace("#", "");

        // Remove all existing schedules
        $(".schedule").remove();
        $.getJSON("/bus_data/"+ line +".json", getLineCallback);
    });
});

function getLineCallback(data) {
    // Loop through each table and generate it
    // appending it as we go.
    $("#schedule_title").show();
    for(var i in data) {
        generateTable(data[i]).insertAfter("#schedule_title");
    }
}

function generateTable(data) {
    // Create the table
    var table = $("<table></table>")
        .addClass("schedule")

    // Loop through destinations
    for(var di in data['stops']) {
        var stop = data['stops'][di];

        var tr = $("<tr><td>"+stop['place']+"</tr>");
        tr = insertTimes(tr, stop['times']);
        table.append(tr);
    }

    return table
}

function insertTimes(tr, data) {
    for(var i in data) {
        tr.append("<td>" + data[i] + "</td>");
    }
    return tr;
}
