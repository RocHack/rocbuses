$(document).ready(function() {
    // Set up a listener for each line color box
    $("div.lines a").click(function(e) {
        e.preventDefault();

        var line = $(this).attr("href").replace("#", "");
        $(".schedule").hide();
        $("#schedule_" + line).show();
    });
});
