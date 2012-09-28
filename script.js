function onHashChange() {
	var line = location.hash.substr(1);
	var lines = ["red", "green", "orange", "blue", "silver", "gold"];
	if (lines.indexOf(line) != -1) {
		// let css handle showing and hiding the schedules
		document.body.className = "line_" + line + "_selected";
	}
}
onHashChange();
window.addEventListener("hashchange", onHashChange, false);
