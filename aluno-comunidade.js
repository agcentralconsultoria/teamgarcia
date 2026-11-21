/* App do aluno — Comunidade (feed com posts, curtidas e comentários) e Ranking/Competições.
   A aba só aparece quando o treinador ativa a comunidade nas configurações. */
(function () {
  "use strict";
  var P = window.Proto, A = window.A, esc = P.esc;

  var IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.9.3 5 2.7 5 5.8"/></svg>';
  function S() { return P.db.settings || {}; }
  function when(iso) { try { return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } }
  function post(id) { return (P.db.posts || []).filter(function (p) { return p.id === id; })[0]; }

  /* Barra de baixo: acrescenta "Comunidade" antes de "Evolução". */
  var baseNav = A.navHtml;
  A.navHtml = function () {
    var h = baseNav.apply(this, arguments);
    if (!S().communityOn) return h;
    var b = '<button data-act="tab" data-v="comunidade" class="' + (A.tabRoot === "comunidade" ? "on" : "") + '">' + IC + "Comunidade</button>";
    var i = h.indexOf('<button data-act="tab" data-v="evo"');
    return i >= 0 ? h.slice(0, i) + b + h.slice(i) : h.replace("</div></nav>", b + "</div></nav>");
  };

  function ensurePosts(force) {
    if (A._postsLoading || (A._postsLoaded && !force)) return;
    A._postsLoading = true;
    P.loadPosts(function () { A._postsLoading = false; A._postsLoaded = true; if (A.cur().v === "comunidade") A.render(); });
  }

  function postHtml(p, st) {
    var likes = Object.keys(p.likes || {}).length, mine = (p.likes || {})[A.uid], cs = p.comments || [];
    return '<div class="card post">' +
      '<div class="row"><span class="pav' + (p.team ? " team" : "") + '">' + esc(String(p.authorName || "?").trim().charAt(0).toUpperCase()) + '</span><div class="grow"><b>' + esc(p.authorName || "") + "</b>" + (p.team ? ' <span class="pill accent">Treinador</span>' : "") + '<div class="small muted">' + when(p.at) + (p.pinned ? " · 📌 Fixado" : "") + "</div></div>" +
      (p.authorId === A.uid ? '<button class="btn sm ghost" data-act="cmDel" data-id="' + p.id + '">🗑</button>' : "") + "</div>" +
      (p.text ? '<div class="post-text">' + esc(p.text) + "</div>" : "") + (p.photo ? '<img class="post-img" src="' + esc(p.photo) + '" alt="">' : "") +
      '<div class="row small post-bar"><button class="btn sm ghost' + (mine ? " liked" : "") + '" data-act="cmLike" data-id="' + p.id + '">' + (mine ? "❤️" : "🤍") + " " + likes + '</button><span class="muted">💬 ' + cs.length + "</span></div>" +
      (cs.length ? '<div class="cmts">' + cs.map(function (c) { return '<div class="cmt"><b>' + esc(c.authorName || "") + "</b> " + esc(c.text) + ' <span class="muted small">' + when(c.at) + "</span></div>"; }).join("") + "</div>" : "") +
      (st.studentComments !== false ? '<div class="row" style="margin-top:8px"><input class="grow" placeholder="Comentar…" data-cmt="' + p.id + '"><button class="btn sm" data-act="cmCmt" data-id="' + p.id + '">Enviar</button></div>' : "") + "</div>";
  }

  function medal(i) { return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1) + "º"; }
  function rankList(rows) {
    if (!rows || !rows.length) return '<div class="empty">O ranking ainda não foi publicado.</div>';
    var me = -1; rows.forEach(function (r, i) { if (r.id === A.uid) me = i; });
    var show = rows.slice(0, 20);
    return (me >= 0 ? '<div class="card tight row between" style="margin-bottom:10px"><span>Sua posição</span><b style="font-size:18px">' + medal(me) + " · " + rows[me].p + " pts</b></div>" : "") +
      '<div class="card" style="padding:4px 8px"><table class="t">' + show.map(function (r, i) { return '<tr class="' + (r.id === A.uid ? "rk-me" : "") + '"><td class="rk-pos" style="width:48px">' + medal(i) + "</td><td>" + (r.id === A.uid ? "<b>Você</b>" : esc(r.n)) + '</td><td style="text-align:right"><b>' + r.p + "</b> pts</td></tr>"; }).join("") + "</table></div>" +
      (me >= 20 ? '<div class="small muted" style="text-align:center;margin-top:6px">Você está em ' + (me + 1) + "º lugar.</div>" : "");
  }
  function rankingView() {
    var r = P.db.ranking, g = P.gameCfg(), k = A._rk || "month", comps = (r && r.comps) || [], cfg = S().competitions || [];
    var rows = !r ? [] : k === "month" ? r.month.rows : k === "all" ? r.all.rows : ((comps.filter(function (c) { return c.id === k; })[0] || {}).rows || []);
    var comp = cfg.filter(function (c) { return c.id === k; })[0];
    return '<div class="row wrap" style="gap:6px"><button class="chip' + (k === "month" ? " on" : "") + '" data-act="cmRk" data-k="month">Este mês</button><button class="chip' + (k === "all" ? " on" : "") + '" data-act="cmRk" data-k="all">Geral</button>' +
      comps.map(function (c) { return '<button class="chip' + (k === c.id ? " on" : "") + '" data-act="cmRk" data-k="' + c.id + '">🏆 ' + esc(c.name) + "</button>"; }).join("") + "</div>" +
      (comp ? '<div class="card tight"><b>🏆 ' + esc(comp.name) + '</b><div class="small muted">' + P.fmtDate(comp.from) + " a " + P.fmtDate(comp.to) + (comp.prize ? " · Prêmio: " + esc(comp.prize) : "") + "</div>" + (comp.desc ? '<div class="small" style="margin-top:6px">' + esc(comp.desc) + "</div>" : "") + "</div>" : "") +
      rankList(rows) +
      '<div class="card tight"><b>Como ganhar pontos</b><div class="small muted" style="margin-top:6px;line-height:1.7">🏋️ Treino concluído: ' + g.treino + " pts<br>🥗 Dieta do dia completa: " + g.dieta + " pts<br>🏃 Cardio registrado: " + g.cardio + " pts<br>📋 Atualização respondida: " + g.checkin + " pts<br>💬 Post na comunidade: " + g.post + " pts" + (g.maxDia ? "<br>Máximo de " + g.maxDia + " pts por dia." : "") + "</div></div>" +
      (r && r.updatedAt ? '<div class="small muted" style="text-align:center">Atualizado em ' + when(r.updatedAt) + "</div>" : "");
  }

  A.views.comunidade = function () {
    var st = S();
    if (!st.communityOn) return '<div class="screen"><div class="empty">A comunidade está desativada.</div></div>';
    ensurePosts();
    var tab = st.gameOn ? (A._cmTab || "feed") : "feed";
    var list = (P.db.posts || []).slice().sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.at < b.at ? 1 : -1); });
    var h = '<div class="screen stack"><div class="row between"><div class="title-xl">Comunidade</div>' + (A.bell ? A.bell() : "") + "</div>" +
      (st.gameOn ? '<div class="tabs"><button class="' + (tab === "feed" ? "on" : "") + '" data-act="cmTab" data-t="feed">Feed</button><button class="' + (tab === "rank" ? "on" : "") + '" data-act="cmTab" data-t="rank">🏆 Ranking</button></div>' : "");
    if (tab === "rank") return h + rankingView() + "</div>";
    if (st.studentPosts !== false) h += '<div class="card stack"><textarea id="cmText" rows="2" placeholder="Compartilhe uma conquista, uma dúvida ou uma foto…"></textarea>' +
      (A._cmPhoto ? '<div class="row"><img src="' + A._cmPhoto + '" style="height:64px;border-radius:8px"><button class="btn sm ghost" data-act="cmPhotoDel">remover foto</button></div>' : "") +
      '<div class="row between"><label class="btn sm">📷 Foto<input type="file" accept="image/*" hidden data-change="cmPhoto"></label><button class="btn sm primary" data-act="cmPost">Publicar</button></div></div>';
    h += A._postsLoaded ? (list.length ? list.map(function (p) { return postHtml(p, st); }).join("") : '<div class="empty">Ainda não há posts por aqui.</div>') : '<div class="empty">Carregando…</div>';
    return h + '<div style="text-align:center"><button class="btn sm ghost" data-act="cmReload">↻ Atualizar</button></div></div>';
  };

  function keepText(fn) { var t = document.getElementById("cmText"), v = t ? t.value : ""; fn(); A.render(); var n = document.getElementById("cmText"); if (n) n.value = v; }
  function readImage(file, cb) {
    var r = new FileReader(); r.onload = function () { var img = new Image(); img.onload = function () { var s = Math.min(1, 640 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = img.width * s; c.height = img.height * s; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); var q = 0.7, u = c.toDataURL("image/jpeg", q); while (u.length > 200000 && q > 0.3) { q -= 0.1; u = c.toDataURL("image/jpeg", q); } cb(u); }; img.src = r.result; }; r.readAsDataURL(file);
  }
  A.actions.cmTab = function (el) { A._cmTab = el.dataset.t; A.render(); };
  A.actions.cmRk = function (el) { A._rk = el.dataset.k; A.render(); };
  A.actions.cmReload = function () { ensurePosts(true); };
  A.actions.cmPhoto = function (el) { var f = el.files[0]; if (!f) return; readImage(f, function (u) { keepText(function () { A._cmPhoto = u; }); }); };
  A.actions.cmPhotoDel = function () { keepText(function () { A._cmPhoto = ""; }); };
  A.actions.cmPost = function (el) {
    var tx = (document.getElementById("cmText").value || "").trim();
    if (!tx && !A._cmPhoto) { A.toast("Escreva algo ou escolha uma foto."); return; }
    el.disabled = true;
    P.addPost(tx, A._cmPhoto).then(function () { A._cmPhoto = ""; A.toast("Publicado"); A.render(); }, function (e) { el.disabled = false; A.toast("Não foi possível publicar."); console.warn(e); });
  };
  A.actions.cmLike = function (el) { P.likePost(post(el.dataset.id)).catch(function (e) { console.warn(e); }); A.render(); };
  A.actions.cmCmt = function (el) {
    var i = document.querySelector('[data-cmt="' + el.dataset.id + '"]'), tx = (i.value || "").trim(); if (!tx) return;
    P.commentPost(post(el.dataset.id), tx).catch(function (e) { A.toast("Não foi possível comentar."); console.warn(e); }); A.render();
  };
  A.actions.cmDel = function (el) { if (!confirm("Apagar seu post?")) return; P.delPost(post(el.dataset.id)).catch(function (e) { console.warn(e); }); A.render(); };
})();
