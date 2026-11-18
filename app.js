(function () {
  var S = null;
  var REFRESH_MS = 60000;
  var lastTxt = '';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function team(code) { for (var i = 0; i < S.teams.length; i++) if (S.teams[i].code === code) return S.teams[i]; return null; }
  function t12(hm) { var p = hm.split(':'), h = +p[0], m = p[1]; var ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + m + ' ' + ap; }
  function clock(iso) { try { return new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

  function standings(g) {
    var rows = S.teams.filter(function (t) { return t.group === g; }).map(function (t) { return { code: t.code, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
    var by = {}; rows.forEach(function (r) { by[r.code] = r; });
    S.matches.forEach(function (m) {
      if (m.stage !== 'group' || m.group !== g || m.status === 'upcoming') return;
      var h = by[m.home], a = by[m.away]; if (!h || !a) return;
      h.p++; a.p++; h.gf += m.hs; h.ga += m.as; a.gf += m.as; a.ga += m.hs;
      if (m.hs > m.as) { h.w++; h.pts += 3; a.l++; } else if (m.hs < m.as) { a.w++; a.pts += 3; h.l++; } else { h.d++; a.d++; h.pts++; a.pts++; }
    });
    rows.sort(function (x, y) { return (y.pts - x.pts) || ((y.gf - y.ga) - (x.gf - x.ga)) || (y.gf - x.gf) || x.code.localeCompare(y.code); });
    return rows;
  }
  function groupDone(g) { return S.matches.filter(function (m) { return m.stage === 'group' && m.group === g; }).every(function (m) { return m.status === 'ft'; }); }
  function byId(id) { for (var i = 0; i < S.matches.length; i++) if (S.matches[i].id === id) return S.matches[i]; return null; }
  function winner(m) {
    if (!m || m.status !== 'ft') return null;
    var h = resolve(m.home), a = resolve(m.away); if (!h || !a) return null;
    if (m.hs > m.as) return h; if (m.as > m.hs) return a;
    if ((m.hp || 0) > (m.ap || 0)) return h; if ((m.ap || 0) > (m.hp || 0)) return a; return null;
  }
  function resolve(slot) {
    var mm = /^([AB])([12])$/.exec(slot);
    if (mm) { if (!groupDone(mm[1])) return null; var r = standings(mm[1])[+mm[2] - 1]; return r ? r.code : null; }
    if (slot.indexOf('W:') === 0) return winner(byId(slot.slice(2)));
    return slot;
  }
  function slotLabel(slot) {
    var mm = /^([AB])([12])$/.exec(slot);
    if (mm) return (mm[2] === '1' ? '1st' : '2nd') + ' Group ' + mm[1];
    if (slot === 'W:sf1') return 'Winner SF1'; if (slot === 'W:sf2') return 'Winner SF2';
    return slot;
  }
  function trophy(sz) { return '<svg aria-hidden="true" width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"></path></svg>'; }

  function pill(m) {
    if (m.status === 'live') return '<span class="pill live"><span class="dot pulse" style="background:#FFFFFF"></span>LIVE</span>';
    if (m.status === 'ft') return '<span class="pill ft">FULL TIME</span>';
    return '<span class="pill">' + esc(t12(m.start)) + '</span>';
  }
  function sideHtml(m, which) {
    var slot = which === 'h' ? m.home : m.away, code = resolve(slot), score = which === 'h' ? m.hs : m.as;
    var w = winner(m), isWin = code && w === code;
    var left = code ? '<span class="code">' + esc(code) + '</span><span class="nm">' + esc((team(code) || {}).name || '') + '</span>' : '<span class="slot">' + esc(slotLabel(slot)) + '</span>';
    var sc = m.status === 'upcoming' ? '<span class="score muted">–</span>' : '<span class="score">' + esc(score) + '</span>';
    return '<div class="side' + (isWin && m.status === 'ft' ? ' win' : '') + '"><div class="t">' + left + '</div>' + sc + '</div>';
  }
  function matchHtml(m) {
    var tag = m.stage === 'group' ? '<span class="tag ' + m.group + '">GROUP ' + m.group + '</span>' : '<span class="tag K">' + esc(m.label).toUpperCase() + '</span>';
    var pensLine = (m.stage === 'ko' && m.status === 'ft' && m.hs === m.as && (m.hp || m.ap)) ? '<div class="pens">Penalties ' + esc(m.hp || 0) + '–' + esc(m.ap || 0) + '</div>' : '';
    return '<article class="match' + (m.status === 'live' ? ' live' : '') + '"><div class="mhead"><span>' + esc(t12(m.start)) + ' – ' + esc(t12(m.end)) + '</span>' + tag + pill(m) + '</div>' + sideHtml(m, 'h') + sideHtml(m, 'a') + pensLine + '</article>';
  }
  function venueHtml(key) { var v = S.venues[key]; var link = v.map ? '<a href="' + esc(v.map) + '" target="_blank" rel="noopener" aria-label="Directions to ' + esc(v.en) + '">Directions ↗</a>' : ''; return '<div class="venue"><b>' + esc(v.en).toUpperCase() + '</b><span class="vr"><span dir="rtl" lang="ar">' + esc(v.ar) + '</span>' + link + '</span></div>'; }

  function nowHtml() {
    var champ = winner(byId('final'));
    if (champ) { var t = team(champ) || {}; return '<div class="champ" role="status">' + trophy(44) + '<div><div class="eyebrow">GMP Champions</div><div class="n">' + esc(champ) + ' · ' + esc(t.name) + '</div></div></div>'; }
    var live = S.matches.filter(function (m) { return m.status === 'live'; });
    var pick = live.length ? live : S.matches.filter(function (m) { return m.status === 'upcoming'; }).slice(0, 1);
    if (!pick.length) return '<div class="now"><div class="eyebrow">Tournament</div><div class="vs">All matches played</div></div>';
    return pick.map(function (m) {
      var h = resolve(m.home), a = resolve(m.away), isLive = m.status === 'live';
      var mid = isLive ? '<span class="sc">' + m.hs + ' – ' + m.as + '</span>' : '<span class="sc" style="font-size:.5em">vs</span>';
      return '<div class="now" role="status"><div class="eyebrow">' + (isLive ? '<span class="dot pulse"></span>Live now' : 'Next up · ' + esc(t12(m.start))) + '</div><div class="vs"><span>' + esc(h || slotLabel(m.home)) + '</span>' + mid + '<span>' + esc(a || slotLabel(m.away)) + '</span></div><div class="sub">' + esc(m.stage === 'group' ? 'Group ' + m.group : m.label) + ' · ' + esc(S.venues[m.venue].en) + ' · ' + esc(t12(m.start)) + '–' + esc(t12(m.end)) + '</div></div>';
    }).join('');
  }

  function tableHtml(g) {
    var rows = standings(g), done = groupDone(g);
    var body = rows.map(function (r, i) {
      var t = team(r.code) || {}, gd = r.gf - r.ga;
      return '<tr class="' + (i < 2 ? 'q' : '') + '"><td>' + (i + 1) + '</td><td class="tm">' + esc(r.code) + '<small>' + esc(t.name) + '</small></td><td>' + r.p + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td><td>' + r.gf + '</td><td>' + r.ga + '</td><td>' + (gd > 0 ? '+' : '') + gd + '</td><td class="pts">' + r.pts + '</td></tr>';
    }).join('');
    return '<div class="tbl"><h3 class="' + g + '">GROUP ' + g + (done ? ' · FINAL' : '') + '</h3><table><thead><tr><th>#</th><th style="text-align:left">TEAM</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>PTS</th></tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  function render() {
    var groups = S.matches.filter(function (m) { return m.stage === 'group'; });
    var ko = S.matches.filter(function (m) { return m.stage === 'ko'; });
    var champ = winner(byId('final'));
    var html = '<div class="wrap">';
    html += '<header class="top"><div class="row eyebrow"><span>BMC Medicine · M1–M5</span><span class="accent">' + esc(S.date) + '</span></div><h1>GMP CUP</h1><div class="aware"><svg role="img" aria-label="Prostate cancer awareness ribbon" width="26" height="30" viewBox="0 0 24 28"><path d="M12 1C9 1 7.2 3.4 7.2 6.2c0 2.3 1.2 4.2 2.8 6.4L4 25l3 1.4 5-8.2 5 8.2 3-1.4-6-12.4c1.6-2.2 2.8-4.1 2.8-6.4C16.8 3.4 15 1 12 1zm0 3.2c1.2 0 1.8 1 1.8 2.1 0 1-.6 2.2-1.8 3.8-1.2-1.6-1.8-2.8-1.8-3.8 0-1.1.6-2.1 1.8-2.1z" fill="#3E9AD6"></path></svg><span class="en">Kicking off for prostate cancer awareness</span><span class="ar" dir="rtl" lang="ar">التوعية بسرطان البروستاتا</span></div><div class="row"><span class="eyebrow accent">Live scoreboard</span><span class="stamp">' + (S.updatedAt ? 'Last updated ' + esc(clock(S.updatedAt)) + ' (Riyadh time) · refreshes every minute' : 'No results yet. Scores appear here during the matches.') + '</span></div></header>';
    html += '<section aria-label="Now">' + nowHtml() + '</section>';
    html += '<section><h2>Stage 1 · Groups <small>5:00 – 8:40 PM</small></h2><div class="grid2">';
    ['majid', 'thaghr'].forEach(function (v) {
      html += '<div class="col">' + venueHtml(v) + groups.filter(function (m) { return m.venue === v; }).map(matchHtml).join('') + '</div>';
    });
    html += '</div></section>';
    html += '<section><h2>Group tables <small>Top 2 go through</small></h2><div class="tables">' + tableHtml('A') + tableHtml('B') + '</div><p class="note">Order: points, then goal difference, then goals scored. Green marks the qualifying places.</p></section>';
    html += '<section><h2>Stage 2 · Knockouts <small>9:00 – 11:00 PM</small></h2>' + venueHtml('barca') + '<div class="ko">' + ko.map(matchHtml).join('') + '</div>';
    html += '<div class="champ">' + trophy(40) + '<div><div class="eyebrow">GMP Champions</div><div class="n">' + (champ ? esc(champ) + ' · ' + esc((team(champ) || {}).name) : 'To be decided') + '</div></div></div></section>';
    html += '<section><h2>Teams &amp; captains</h2><div class="caps">' + S.teams.map(function (t) {
      return '<div class="cap"><span class="code" style="color:var(' + (t.group === 'A' ? '--accent' : '--groupB') + ')">' + esc(t.code) + '</span><span class="nm">' + esc(t.name) + '</span><span class="who">Captain: ' + esc(t.captain) + ' · Group ' + esc(t.group) + '</span></div>';
    }).join('') + '</div></section>';
    html += '<section><h2>Updates</h2>';
    html += S.updates.length ? '<div class="updates">' + S.updates.map(function (u) { return '<div class="upd"><time>' + esc(clock(u.at)) + '</time><p>' + esc(u.text) + '</p></div>'; }).join('') + '</div>' : '<div class="empty">No updates yet. Delays, venue changes and results will be posted here on match day.</div>';
    html += '</section><section><div class="health"><svg role="img" aria-label="Prostate cancer awareness ribbon" width="26" height="30" viewBox="0 0 24 28"><path d="M12 1C9 1 7.2 3.4 7.2 6.2c0 2.3 1.2 4.2 2.8 6.4L4 25l3 1.4 5-8.2 5 8.2 3-1.4-6-12.4c1.6-2.2 2.8-4.1 2.8-6.4C16.8 3.4 15 1 12 1zm0 3.2c1.2 0 1.8 1 1.8 2.1 0 1-.6 2.2-1.8 3.8-1.2-1.6-1.8-2.8-1.8-3.8 0-1.1.6-2.1 1.8-2.1z" fill="#3E9AD6"></path></svg><span>Men 50+, or earlier with a family history: talk to your doctor about prostate screening.</span></div></section><footer>GMP Cup · BMC Medicine inter-batch tournament for Prostate Cancer Awareness Month. Scores refresh automatically every minute.</footer></div>';
    document.getElementById('app').innerHTML = html;
  }

  function load() {
    fetch('data.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (txt) { if (txt === lastTxt) return; lastTxt = txt; S = JSON.parse(txt); render(); })
      .catch(function () {
        if (!S) document.querySelector('#app .stamp').textContent = 'Could not load scores. Check your connection and refresh.';
      });
  }

  load();
  setInterval(function () { if (!document.hidden) load(); }, REFRESH_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
})();
