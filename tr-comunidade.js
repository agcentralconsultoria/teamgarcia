/* Site do treinador — Comunidade: Feed (posts, curtidas, comentários, fixar, moderação) e
   Competições (gamificação: regras de pontos, ranking do mês/geral, competições com período e prêmio).
   O ranking é calculado aqui e publicado em library/ranking para o app do aluno. */
(function () {
  "use strict";
  var P = window.Proto, T = window.T, esc = P.esc;

  function S() { return P.db.settings; }
  function when(iso) { try { return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } }
  function post(id) { return (P.db.posts || []).filter(function (p) { return p.id === id; })[0]; }
  function sorted() { return (P.db.posts || []).slice().sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.at < b.at ? 1 : -1); }); }

  /* Carrega os posts uma vez por sessão; depois, se a gamificação estiver ligada e o ranking estiver velho, republica. */
  function ensurePosts(force) {
    if (T._postsLoading || (T._postsLoaded && !force)) return;
    T._postsLoading = true;
    P.loadPosts(function () { T._postsLoading = false; T._postsLoaded = true; autoPublish(); if (T.page === "feed" || T.page === "competicoes") T.render(); });
  }
  function autoPublish() {
    if (!S().gameOn) return;
    var r = P.db.ranking, old = !r || !r.updatedAt || Date.now() - new Date(r.updatedAt).getTime() > 3 * 3600 * 1000;
    if (old) P.publishRanking().catch(function (e) { console.warn(e); });
  }
  /* Ao abrir o Painel, atualiza o ranking do app sozinho (uma vez por sessão). */
  var baseInicio = T.pages.inicio;
  if (baseInicio) T.pages.inicio = function () { if (P.db && S().gameOn && !T._postsLoaded) setTimeout(function () { ensurePosts(); }, 1500); return baseInicio.apply(this, arguments); };

  function activation(title, text, items, act) {
    return '<div class="card" style="max-width:620px;margin:30px auto;text-align:center;padding:28px 22px"><div style="font-size:44px">' + (act === "gmOn" ? "🏆" : "💬") + '</div><div class="page-title" style="justify-content:center;margin-top:6px">' + esc(title) + '</div><div class="muted" style="margin-top:6px">' + esc(text) + '</div>' +
      '<ul class="small" style="text-align:left;margin:16px auto;max-width:460px;line-height:1.8;padding-left:20px">' + items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
      '<button class="btn primary" data-act="' + act + '">' + (act === "gmOn" ? "Ativar gamificação" : "Ativar comunidade") + "</button></div>";
  }

  /* ---------- Feed ---------- */
  function avatar(name, team) { return '<span class="pav' + (team ? " team" : "") + '">' + esc(String(name || "?").trim().charAt(0).toUpperCase()) + "</span>"; }
  function postHtml(p) {
    var likes = Object.keys(p.likes || {}).length, mine = (p.likes || {})[P.myUid], cs = p.comments || [];
    return '<div class="card post">' +
      '<div class="row">' + avatar(p.authorName, p.team) + '<div class="grow"><b>' + esc(p.authorName || "") + "</b>" + (p.team ? ' <span class="pill accent">Equipe</span>' : "") + '<div class="small muted">' + when(p.at) + (p.pinned ? " · 📌 Fixado" : "") + "</div></div>" +
      '<button class="btn sm ghost" title="Fixar no topo" data-act="fdPin" data-id="' + p.id + '">' + (p.pinned ? "Desafixar" : "📌") + '</button><button class="btn sm ghost danger" title="Apagar" data-act="fdDel" data-id="' + p.id + '">🗑</button></div>' +
      (p.text ? '<div class="post-text">' + esc(p.text) + "</div>" : "") + (p.photo ? '<img class="post-img" src="' + esc(p.photo) + '" alt="">' : "") +
      '<div class="row small post-bar"><button class="btn sm ghost' + (mine ? " liked" : "") + '" data-act="fdLike" data-id="' + p.id + '">' + (mine ? "❤️" : "🤍") + " " + likes + '</button><span class="muted">💬 ' + cs.length + "</span></div>" +
      (cs.length ? '<div class="cmts">' + cs.map(function (c) { return '<div class="cmt"><b>' + esc(c.authorName || "") + "</b>" + (c.team ? ' <span class="pill accent" style="font-size:10px">Equipe</span>' : "") + " " + esc(c.text) + ' <span class="muted small">' + when(c.at) + '</span> <button class="lnk danger small" data-act="fdDelC" data-id="' + p.id + '" data-c="' + esc(c.id) + '">apagar</button></div>'; }).join("") + "</div>" : "") +
      '<div class="row" style="margin-top:8px"><input class="grow" placeholder="Escreva um comentário…" data-cmt="' + p.id + '"><button class="btn sm" data-act="fdCmt" data-id="' + p.id + '">Enviar</button></div></div>';
  }
  T.pages.feed = function () {
    var st = S();
    if (!st.communityOn) return '<div class="page-title">Feed da comunidade</div>' + activation("Comunidade dos seus alunos", "Um espaço só do seu time para trocar experiências, mostrar conquistas e receber seus avisos.", ["Você e seus alunos postam textos e fotos.", "Todos podem curtir e comentar (você decide).", "Fixe avisos importantes no topo.", "Só os seus alunos ativos veem o feed."], "fdOn");
    ensurePosts();
    var list = sorted();
    return '<div class="row between wrap"><div class="page-title">Feed da comunidade</div><button class="btn sm" data-act="fdReload">↻ Atualizar</button></div>' +
      '<div class="card stack" style="margin:12px 0"><div class="row wrap small" style="gap:16px">' +
      '<label class="row"><input type="checkbox" style="width:auto" data-change="cfgToggle" data-k="studentPosts"' + (st.studentPosts ? " checked" : "") + '> Alunos podem postar</label>' +
      '<label class="row"><input type="checkbox" style="width:auto" data-change="cfgToggle" data-k="studentComments"' + (st.studentComments ? " checked" : "") + '> Alunos podem comentar</label>' +
      '<button class="lnk danger small" data-act="fdOff">Desativar comunidade</button></div></div>' +
      '<div class="feed">' +
      '<div class="card stack"><textarea id="fdText" rows="3" placeholder="Escreva um aviso, uma dica ou comemore uma conquista…"></textarea>' + (T._fdPhoto ? '<div class="row"><img src="' + T._fdPhoto + '" style="height:70px;border-radius:8px"><button class="lnk danger small" data-act="fdPhotoDel">remover foto</button></div>' : "") +
      '<div class="row between"><label class="btn sm">📷 Foto<input type="file" accept="image/*" hidden data-change="fdPhoto"></label><button class="btn sm primary" data-act="fdPost">Publicar</button></div></div>' +
      (T._postsLoaded ? (list.length ? list.map(postHtml).join("") : '<div class="empty">Nenhum post ainda. Que tal começar com um recado de boas-vindas?</div>') : '<div class="empty">Carregando…</div>') + "</div>";
  };
  T.actions.fdOn = function () { S().communityOn = true; P.save(); P.audit("Comunidade", "Ativação"); T.render(); };
  T.actions.fdOff = function () { if (!confirm("Desativar a comunidade? A aba some do app dos alunos (os posts continuam guardados).")) return; S().communityOn = false; P.save(); T.render(); };
  T.actions.fdReload = function () { ensurePosts(true); T.render(); };
  T.actions.fdPhoto = function (el) { var f = el.files[0]; if (!f) return; var tx = (document.getElementById("fdText") || {}).value || ""; T.readImage(f, function (u) { T._fdPhoto = u; T._fdDraft = tx; T.render(); var t = document.getElementById("fdText"); if (t) t.value = tx; }); };
  T.actions.fdPhotoDel = function () { var tx = (document.getElementById("fdText") || {}).value || ""; T._fdPhoto = ""; T.render(); var t = document.getElementById("fdText"); if (t) t.value = tx; };
  T.actions.fdPost = function (el) {
    var tx = (document.getElementById("fdText").value || "").trim();
    if (!tx && !T._fdPhoto) { T.toast("Escreva algo ou escolha uma foto."); return; }
    el.disabled = true;
    P.addPost(tx, T._fdPhoto).then(function () { T._fdPhoto = ""; T.toast("Publicado"); T.render(); }, function (e) { el.disabled = false; T.toast("Não foi possível publicar: " + e.message); });
  };
  T.actions.fdLike = function (el) { P.likePost(post(el.dataset.id)).catch(function (e) { T.toast(e.message); }); T.render(); };
  T.actions.fdCmt = function (el) {
    var i = document.querySelector('[data-cmt="' + el.dataset.id + '"]'), tx = (i.value || "").trim(); if (!tx) return;
    P.commentPost(post(el.dataset.id), tx).catch(function (e) { T.toast(e.message); }); T.render();
  };
  T.actions.fdDel = function (el) { if (!confirm("Apagar este post?")) return; P.delPost(post(el.dataset.id)).catch(function (e) { T.toast(e.message); }); T.render(); };
  T.actions.fdDelC = function (el) { P.delComment(post(el.dataset.id), el.dataset.c).catch(function (e) { T.toast(e.message); }); T.render(); };
  T.actions.fdPin = function (el) { P.pinPost(post(el.dataset.id)).catch(function (e) { T.toast(e.message); }); T.render(); };

  /* ---------- Competições ---------- */
  var RULES = [["treino", "Treino concluído"], ["dieta", "Dieta do dia completa"], ["cardio", "Cardio registrado"], ["checkin", "Atualização (check-in) respondida"], ["post", "Post na comunidade"], ["maxDia", "Limite de pontos por dia"]];
  function medal(i) { return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1) + "º"; }
  function table(rows) {
    if (!rows.length) return '<div class="empty">Nenhum aluno ativo.</div>';
    return '<div class="card" style="padding:4px 8px"><table class="t"><tr><th style="width:56px">Posição</th><th>Aluno</th><th style="text-align:right">Pontos</th></tr>' + rows.map(function (r, i) {
      var s = P.student(r.id);
      return '<tr><td class="rk-pos">' + medal(i) + '</td><td><a class="lnk" data-act="openStudent" data-id="' + r.id + '">' + esc(s ? s.name : r.n) + '</a></td><td style="text-align:right"><b>' + r.p + "</b></td></tr>";
    }).join("") + "</table></div>";
  }
  T.pages.competicoes = function () {
    var st = S();
    if (!st.gameOn) return '<div class="page-title">Competições</div>' + activation("Gamificação e ranking", "Motive seus alunos com pontos por cada ação e um ranking dentro do app.", ["Pontos por treino, dieta completa, cardio, check-in e post na comunidade.", "Ranking do mês e ranking geral.", "Crie competições com período e prêmio.", "O aluno vê a posição dele; dos colegas aparece só o primeiro nome e a inicial."], "gmOn");
    ensurePosts();
    var tab = T._gmTab || "rank", g = P.gameCfg(), r = P.buildRanking(), comps = st.competitions || [], pub = P.db.ranking && P.db.ranking.updatedAt;
    var h = '<div class="row between wrap"><div class="page-title">Competições</div><div class="row wrap"><span class="small muted">' + (pub ? "App atualizado em " + when(pub) : "Ranking ainda não publicado") + '</span><button class="btn sm primary" data-act="gmPub">↻ Atualizar no app</button></div></div>' +
      '<div class="tabs" style="margin:12px 0">' + [["rank", "Ranking"], ["comps", "Competições"], ["rules", "Regras de pontos"]].map(function (t) { return '<button class="tab' + (tab === t[0] ? " on" : "") + '" data-act="gmTab" data-t="' + t[0] + '">' + t[1] + "</button>"; }).join("") + "</div>";
    if (tab === "rank") {
      var k = T._rk || "month", rows = k === "month" ? r.month.rows : k === "all" ? r.all.rows : ((r.comps.filter(function (c) { return c.id === k; })[0] || {}).rows || []);
      h += '<div class="row wrap" style="gap:6px;margin-bottom:12px"><button class="chip' + (k === "month" ? " on" : "") + '" data-act="gmRk" data-k="month">Este mês</button><button class="chip' + (k === "all" ? " on" : "") + '" data-act="gmRk" data-k="all">Geral (desde ' + P.fmtDate(r.start) + ")</button>" +
        r.comps.map(function (c) { return '<button class="chip' + (k === c.id ? " on" : "") + '" data-act="gmRk" data-k="' + c.id + '">🏆 ' + esc(c.name) + "</button>"; }).join("") + "</div>" + table(rows);
    } else if (tab === "comps") {
      h += '<div class="row between" style="margin-bottom:12px"><span class="muted small">Cada competição tem período e prêmio próprios. Os pontos seguem as mesmas regras.</span><button class="btn sm primary" data-act="cpEdit">+ Nova competição</button></div>' +
        (comps.length ? '<div class="stack">' + comps.map(function (c) {
          var t = P.todayISO(), stt = t < c.from ? ["Em breve", ""] : t > c.to ? ["Encerrada", ""] : ["Em andamento", " accent"];
          var top = (r.comps.filter(function (x) { return x.id === c.id; })[0] || { rows: [] }).rows.slice(0, 3);
          return '<div class="card"><div class="row between wrap"><div><b>🏆 ' + esc(c.name) + '</b> <span class="pill' + stt[1] + '">' + stt[0] + '</span><div class="small muted">' + P.fmtDate(c.from) + " a " + P.fmtDate(c.to) + (c.prize ? " · Prêmio: " + esc(c.prize) : "") + '</div></div><div class="row"><button class="btn sm" data-act="cpEdit" data-id="' + c.id + '">Editar</button><button class="btn sm ghost danger" data-act="cpDel" data-id="' + c.id + '">🗑</button></div></div>' +
            (top.length ? '<div class="small" style="margin-top:8px">' + top.map(function (x, i) { var s = P.student(x.id); return medal(i) + " " + esc(s ? s.name : x.n) + " — " + x.p + " pts"; }).join(" &nbsp; ") + "</div>" : "") + "</div>";
        }).join("") + "</div>" : '<div class="empty">Nenhuma competição criada.</div>');
    } else {
      h += '<div class="card stack" style="max-width:520px">' + RULES.map(function (x) { return '<div class="row between"><span>' + x[1] + '</span><input type="number" min="0" style="width:90px" value="' + g[x[0]] + '" data-change="gmNum" data-k="' + x[0] + '"></div>'; }).join("") +
        '<div class="small muted">Cada tipo de ação conta uma vez por dia. O limite diário evita exageros (0 = sem limite).</div>' +
        '<div class="row between"><span>Início da contagem</span><input type="date" style="width:170px" value="' + esc(st.gameStart || "") + '" data-change="gmStart"></div>' +
        '<button class="lnk danger small" style="align-self:flex-start" data-act="gmOff">Desativar gamificação</button></div>';
    }
    return h;
  };
  T.actions.gmOn = function () { var st = S(); st.gameOn = true; st.communityOn = true; if (!st.gameStart) st.gameStart = P.todayISO(); P.save(); P.audit("Competições", "Ativação"); ensurePosts(); P.publishRanking().catch(function () {}); T.render(); };
  T.actions.gmOff = function () { if (!confirm("Desativar a gamificação? O ranking some do app dos alunos.")) return; S().gameOn = false; P.save(); T.render(); };
  T.actions.gmTab = function (el) { T._gmTab = el.dataset.t; T.render(); };
  T.actions.gmRk = function (el) { T._rk = el.dataset.k; T.render(); };
  T.actions.gmNum = function (el) { var st = S(); st.game = st.game || {}; st.game[el.dataset.k] = Math.max(0, parseInt(el.value, 10) || 0); P.save(); T.toast("Salvo"); T.render(); };
  T.actions.gmStart = function (el) { S().gameStart = el.value; P.save(); T.toast("Salvo"); T.render(); };
  T.actions.gmPub = function (el) { el.disabled = true; P.publishRanking().then(function () { T.toast("Ranking atualizado no app"); T.render(); }, function (e) { el.disabled = false; T.toast("Erro: " + e.message); }); };
  T.actions.cpEdit = function (el) {
    var c = (S().competitions || []).filter(function (x) { return x.id === el.dataset.id; })[0] || { id: "", name: "", from: P.todayISO(), to: P.addDays(P.todayISO(), 30), prize: "", desc: "" };
    T.sheet(c.id ? "Editar competição" : "Nova competição", '<div class="stack"><label>Nome<input id="cpName" value="' + esc(c.name) + '" placeholder="Ex.: Desafio 30 dias"></label>' +
      '<div class="row"><label class="grow">Início<input type="date" id="cpFrom" value="' + esc(c.from) + '"></label><label class="grow">Fim<input type="date" id="cpTo" value="' + esc(c.to) + '"></label></div>' +
      '<label>Prêmio (opcional)<input id="cpPrize" value="' + esc(c.prize || "") + '" placeholder="Ex.: 1 mês de consultoria grátis"></label>' +
      '<label>Descrição (opcional)<textarea id="cpDesc" rows="3">' + esc(c.desc || "") + '</textarea></label>' +
      '<button class="btn primary block" data-act="cpSave" data-id="' + c.id + '">Salvar</button></div>');
  };
  T.actions.cpSave = function (el) {
    var v = function (id) { return (document.getElementById(id).value || "").trim(); }, n = v("cpName"), f = v("cpFrom"), t = v("cpTo");
    if (!n || !f || !t) { T.toast("Preencha nome, início e fim."); return; }
    if (t < f) { T.toast("O fim precisa ser depois do início."); return; }
    var st = S(), l = st.competitions = st.competitions || [], c = l.filter(function (x) { return x.id === el.dataset.id; })[0];
    if (!c) { c = { id: P.uid("cp") }; l.push(c); }
    c.name = n; c.from = f; c.to = t; c.prize = v("cpPrize"); c.desc = v("cpDesc");
    P.save(); T.closeSheet(); T._gmTab = "comps"; P.publishRanking().catch(function () {}); T.render();
  };
  T.actions.cpDel = function (el) { if (!confirm("Apagar esta competição?")) return; var st = S(); st.competitions = (st.competitions || []).filter(function (x) { return x.id !== el.dataset.id; }); P.save(); P.publishRanking().catch(function () {}); T.render(); };
})();
