// Fault injection — entirely opt-in. Injecting a disk failure simulates a
// failing data disk: the page is served from corrupted blocks, so a few words
// get their middle letters scrambled — typoglycemia: first and last letters
// stay put, so the text remains (barely) readable, the way bit rot degrades
// data without destroying it. Works on every page (hero, post list, article).
// Re-rolled on every reload (a failing disk is not deterministic). Healing
// restores the exact original. Independent from the color-theme toggle.
(function () {
  var btn = document.getElementById("chaosbtn");
  if (!btn) return;

  var KEY = "bp-chaos";
  // Content regions that hold "stored data" — NOT the terminal chrome (nav,
  // console, fault bar, footer, status bar).
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

  // Scramble a bounded number of words within one root. Re-rolled each call.
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

    var budget = 8; // words to corrupt within this region
    for (var i = 0; i < textNodes.length && budget > 0; i++) {
      var node = textNodes[i];
      var parts = node.nodeValue.split(/(\s+)/); // keep whitespace tokens
      var changed = false;
      for (var j = 0; j < parts.length && budget > 0; j++) {
        if (!/^[A-Za-z]{4,}$/.test(parts[j])) continue;
        if (Math.random() < 0.22) {
          parts[j] = '<span class="rot">' + escapeHtml(typoglyce(parts[j])) + "</span>";
          changed = true;
          budget--;
        }
      }
      if (changed) {
        for (var k = 0; k < parts.length; k++) {
          if (parts[k].charAt(0) !== "<") parts[k] = escapeHtml(parts[k]);
        }
        var span = document.createElement("span");
        span.innerHTML = parts.join("");
        node.parentNode.replaceChild(span, node);
      }
    }
  }

  function apply(on, persist) {
    document.body.classList.toggle("chaos", on);
    btn.textContent = on ? "heal disk" : "inject disk failure";
    var nodes = document.getElementById("sb-nodes");
    if (nodes) nodes.textContent = on ? "disk: read errors" : "nodes: 1/1 healthy";
    var dot = document.getElementById("sb-dot");
    if (dot) dot.style.color = on ? "var(--red)" : "";

    for (var i = 0; i < roots.length; i++) {
      roots[i].innerHTML = pristine[i];            // start pristine...
      if (on) corrupt(roots[i]);                   // ...then re-roll
    }
    if (consoleOut) {
      consoleOut.innerHTML = on
        ? '<span class="warn">✗</span> I/O error · corrupted blocks · checksum mismatch'
        : pristineOut;
    }
    if (persist) {
      try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
    }
  }

  // Restore persisted state on load (re-rolls the corruption).
  var saved = "0";
  try { saved = localStorage.getItem(KEY) || "0"; } catch (e) {}
  if (saved === "1") apply(true, false);

  btn.addEventListener("click", function () {
    apply(!document.body.classList.contains("chaos"), true);
  });
})();
