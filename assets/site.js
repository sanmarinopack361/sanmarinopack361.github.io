/* Pack 361 website behavior. Content lives in settings.js; you shouldn't need to edit this file. */
(function () {
  var S = window.PACK361 || {};
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  // Simple text values
  $$("[data-s]").forEach(function (el) { var v = S[el.getAttribute("data-s")]; if (v != null && v !== "") el.textContent = v; });
  $$("[data-show-if]").forEach(function (el) { el.hidden = !S[el.getAttribute("data-show-if")]; });
  $$("[data-href]").forEach(function (el) { var v = S[el.getAttribute("data-href")]; if (v) { el.href = v; if (v.charAt(0) === "/") { el.removeAttribute("target"); el.removeAttribute("rel"); } } });
  $$("[data-school]").forEach(function (el) { if (S.schoolLine) el.textContent = S.schoolLine; });

  // Banner
  var B = S.banner || {};
  [["eyebrow", ".a-eyebrow"], ["title", ".a-title"], ["text", ".a-sub"], ["bubbleTag", ".b-tag"]].forEach(function (p) {
    if (B[p[0]]) $$(p[1]).forEach(function (el) { el.textContent = B[p[0]]; });
  });
  if (B.bubbleText) $$(".b-text").forEach(function (el) { el.innerHTML = B.bubbleText; });

  // Big events
  if (S.bigEvents) $$("[data-events]").forEach(function (el) {
    el.innerHTML = S.bigEvents.map(function (e) { return "<a><b>" + esc(e[0]) + "</b><span>" + esc(e[1]) + "</span></a>"; }).join("");
  });

  // Den tables
  var dens = S.dens || [];
  if (dens.length) $$("[data-dens]").forEach(function (el) {
    el.innerHTML = '<div class="tw"><table class="t"><thead><tr><th>Rank</th><th>Grade</th><th>Boys\' den</th><th>Girls\' den</th></tr></thead><tbody>' +
      dens.map(function (d) { return "<tr><td><b>" + esc(d[0]) + "</b></td><td>" + esc(d[1]) + '</td><td><span class="pill b">Den ' + esc(d[2]) + '</span></td><td><span class="pill g">Den ' + esc(d[3]) + "</span></td></tr>"; }).join("") +
      "</tbody></table></div>";
  });

  // Phone menu
  var btn = document.getElementById("menuBtn"), links = document.getElementById("links");
  if (btn && links) btn.addEventListener("click", function () { var open = links.classList.toggle("open"); btn.setAttribute("aria-expanded", open); });

  // Cub Scouting: rank switcher
  var RANK_TEXT = {
    "Lion": ["L", "Lions explore themed adventures and earn a belt loop for each one. A parent or guardian comes to every meeting as the scout's Lion Guide. Lions can wear either the Lion T-shirt or the blue Cub Scout uniform."],
    "Tiger": ["T", "Tigers work through adventures with their adult partner and earn a belt loop for each one."],
    "Wolf": ["W", "Wolves take on new adventures and keep earning belt loops."],
    "Bear": ["B", "Bears take on bigger outdoor and skill adventures, still earning belt loops."],
    "Webelos": ["We", "Webelos earn pins instead of belt loops, worn on the Webelos colors or cap. They still wear the blue uniform."],
    "Arrow of Light": ["AoL", "The highest Cub Scout rank. Arrow of Light scouts earn pins and wear the tan Scouts BSA uniform with blue shoulder loops."]
  };
  var detail = document.getElementById("rdetail");
  if (detail) {
    var show = function (i) {
      var d = dens[i] || [], t = RANK_TEXT[d[0]] || ["", ""];
      $$("[data-rk]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-rk") === i)); });
      detail.innerHTML = '<div style="display:flex;gap:12px;align-items:center"><span class="badge">' + esc(t[0]) + '</span><span><span class="eyebrow">' + esc(d[1]) + '</span><h3 style="font-size:1.35rem">' + esc(d[0]) + "</h3></span></div><p>" + esc(t[1]) + '</p><p><span class="pill b">Boys: Den ' + esc(d[2]) + '</span> <span class="pill g">Girls: Den ' + esc(d[3]) + "</span></p>";
    };
    $$("[data-rk]").forEach(function (b) { b.addEventListener("click", function () { show(+b.getAttribute("data-rk")); }); });
    show(0);
  }

  // Registration links: every [data-reg-link] opens the registration app in the same tab
  var url = S.registrationAppUrl || "";
  var ok = /^https:\/\/script\.google\.com\//.test(url);
  $$("[data-reg-link]").forEach(function (a) { if (ok) a.href = url; });
  $$("[data-reg-ready]").forEach(function (el) { el.hidden = !ok; });
  $$("[data-reg-missing]").forEach(function (el) { el.hidden = ok; });

  // Medical form: use the same link the registration app uses (one place to change it)
  var med = $$('[data-href="medicalFormUrl"]');
  if (ok && med.length && window.fetch) {
    fetch(url + "?api=boot").then(function (r) { return r.json(); }).then(function (b) {
      var m = /(?:^|\n)medical_form_url,"?([^"\n]+)/.exec((b && b.settingsCsv) || "");
      if (m && /^https:\/\//.test(m[1])) med.forEach(function (a) { a.href = m[1]; });
    }).catch(function () { /* keep the backup link */ });
  }
})();
