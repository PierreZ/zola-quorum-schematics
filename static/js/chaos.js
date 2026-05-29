// Fault-injection toggle. Entirely opt-in: nothing moves until clicked.
// Toggling flips a red PARTITION banner, turns node-3 of the cluster red,
// and degrades the status bar. Independent from the color-theme toggle.
(function () {
  var btn = document.getElementById("chaosbtn");
  if (!btn) return;

  btn.addEventListener("click", function () {
    var on = document.body.classList.toggle("chaos");
    btn.textContent = on ? "heal partition" : "inject partition";
    var nodes = document.getElementById("sb-nodes");
    if (nodes) nodes.textContent = on ? "nodes: 2/3 degraded" : "nodes: 1/1 healthy";
    var dot = document.getElementById("sb-dot");
    if (dot) dot.style.color = on ? "var(--red)" : "";
  });
})();
