// The terminal reads each post from a randomly chosen replica, so the node
// shown in the console (--replica node-N) changes on every refresh. We pick the
// node once and use it for BOTH the console label and the cluster schematic, so
// the highlighted node always matches the command. Nodes are 0-indexed.
(function () {
  var cluster = document.querySelector(".cluster");
  var labels = document.querySelectorAll(".rc-node");
  if (!cluster && !labels.length) return;

  var r = Math.floor(Math.random() * 3); // node-0 .. node-2
  if (cluster) {
    var node = cluster.querySelector(".n" + r);
    if (node) node.classList.add("active"); // the replica being read from
  }
  for (var i = 0; i < labels.length; i++) labels[i].textContent = "node-" + r;
})();
