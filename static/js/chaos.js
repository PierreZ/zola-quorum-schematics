// Fault injection — a hidden, opt-in easter egg. Two triggers, same effect:
//   1. the 👾 button next to the theme toggle
//   2. clicking a node in the cluster schematic (the quorum)
// Injecting a disk failure serves the page from corrupted blocks: a few words
// get their middle letters scrambled — typoglycemia (first & last letter kept,
// so it stays readable), the failed replica goes red, the console reports a
// checksum mismatch, and the status bar degrades. Re-rolled on every reload (a
// failing disk is not deterministic); healing restores the exact original.
(function () {
  var btn = document.getElementById("chaosbtn");
  var nodes = [].slice.call(document.querySelectorAll(".cluster .node"));
  if (!btn && !nodes.length) return;

  // Arm: lets CSS show the pointer cursor on cluster nodes only when live.
  document.body.classList.add("fault-armed");

  var KEY = "bp-chaos";
  var roots = [].slice.call(document.querySelectorAll(".hero, .bom, .prose, .article .title"));
  var consoleOut = document.getElementById("console-out");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Pristine snapshots, captured once so heal restores byte-for-byte.
  var pristine = roots.map(function (r) { return r.innerHTML; });
  var pristineOut = consoleOut ? consoleOut.innerHTML : null;

  function escapeHtml(s) {
    return s.replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }

  // Typoglycemia: keep the first and last letter, shuffle the middle.
  function typoglyce(word) {
    if (word.length < 4) return word;
    var mid = word.slice(1, -1).split("");
    for (var i = mid.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = mid[i]; mid[i] = mid[j]; mid[j] = t;
    }
    return word.charAt(0) + mid.join("") + word.charAt(word.length - 1);
  }

  var RATE = 0.05; // ~5% of words corrupted, spread across the whole region
  var MIN = 3, MAX = 20;

  // Scramble words spread uniformly across one region. Re-rolled each call.
  function corrupt(root) {
    if (reduced) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        for (var p = n.parentNode; p && p !== root; p = p.parentNode) {
          var t = p.tagName;
          if (t === "PRE" || t === "CODE") return NodeFilter.FILTER_REJECT;
          if (p.classList && p.classList.contains("toc")) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var textNodes = [], n;
    while ((n = walker.nextNode())) textNodes.push(n);

    var split = [], cands = [];
    for (var i = 0; i < textNodes.length; i++) {
      var parts = textNodes[i].nodeValue.split(/(\s+)/);
      split[i] = parts;
      for (var j = 0; j < parts.length; j++) {
        if (/^[A-Za-z]{4,}$/.test(parts[j])) cands.push([i, j]);
      }
    }
    if (!cands.length) return;

    var total = Math.min(Math.max(Math.round(cands.length * RATE), MIN), MAX);
    total = Math.min(total, cands.length);
    for (var k = 0; k < total; k++) {
      var r = k + Math.floor(Math.random() * (cands.length - k));
      var tmp = cands[k]; cands[k] = cands[r]; cands[r] = tmp;
    }
    var touched = {};
    for (var c = 0; c < total; c++) {
      var ni = cands[c][0], pj = cands[c][1];
      split[ni][pj] = '<span class="rot">' + escapeHtml(typoglyce(split[ni][pj])) + "</span>";
      touched[ni] = true;
    }
    for (var idx in touched) {
      var p2 = split[idx];
      for (var m = 0; m < p2.length; m++) {
        if (p2[m].charAt(0) !== "<") p2[m] = escapeHtml(p2[m]);
      }
      var span = document.createElement("span");
      span.innerHTML = p2.join("");
      textNodes[idx].parentNode.replaceChild(span, textNodes[idx]);
    }
  }

  function nodeIndex(el) {
    var c = (el.getAttribute("class") || "").match(/\bn(\d)\b/);
    return c ? parseInt(c[1], 10) : 0;
  }
  function markFailed(idx) {
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle("failed", nodeIndex(nodes[i]) === idx);
    }
  }
  function clearFailed() {
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove("failed");
  }

  function apply(on, idx, persist) {
    document.body.classList.toggle("chaos", on);
    if (btn) {
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.title = on ? "heal disk" : "inject disk failure";
    }
    var sbNodes = document.getElementById("sb-nodes");
    if (sbNodes) sbNodes.textContent = on ? "disk: read errors" : "nodes: 1/1 healthy";
    var dot = document.getElementById("sb-dot");
    if (dot) dot.style.color = on ? "var(--red)" : "";

    if (on) markFailed(idx); else clearFailed();

    for (var i = 0; i < roots.length; i++) {
      roots[i].innerHTML = pristine[i];   // start pristine...
      if (on) corrupt(roots[i]);          // ...then re-roll
    }
    if (consoleOut) {
      consoleOut.innerHTML = on
        ? '<span class="warn">✗</span> I/O error · corrupted blocks · checksum mismatch'
        : pristineOut;
    }
    if (persist) {
      try { localStorage.setItem(KEY, on ? String(idx) : "off"); } catch (e) {}
    }
  }

  function isOn() { return document.body.classList.contains("chaos"); }

  // Toggle the fault, failing the replica currently being read (the active node).
  function toggle() {
    if (isOn()) { apply(false, null, true); return; }
    var active = document.querySelector(".cluster .node.active");
    apply(true, active ? nodeIndex(active) : 0, true);
  }

  // Trigger 1: the 👾 button.
  if (btn) btn.addEventListener("click", toggle);

  // Trigger 2: click anywhere on the cluster block (the quorum).
  var cell = document.querySelector(".cluster-cell");
  if (cell) {
    cell.title = "click to fail the replica being read";
    cell.addEventListener("click", toggle);
  }

  // Restore persisted state on load (re-rolls the corruption).
  var saved = "off";
  try { saved = localStorage.getItem(KEY) || "off"; } catch (e) {}
  if (/^[0-9]$/.test(saved)) apply(true, parseInt(saved, 10), false);
})();
