/* App do aluno — avisos (sino), atualizações programadas, envio de fotos, "o que mudou",
   módulos de materiais, anexos do aluno, foto de perfil, fichas antigas e detalhes da lista de compras */
(function () {
  "use strict";
  var P = window.Proto, A = window.A, esc = P.esc;
  A.unitOk = function () { var d = A.dplan(); return P.db.settings.allowUnitChange !== false && (!d || d.allowUnitChange !== false); };
  A.plans = function () { return A.me().plans || { treino: true, dieta: true }; };

  /* Último acesso ao app (o treinador vê na ficha) */
  var markedSeen = false, baseRender = A.render;
  A.render = function (top) {
    if (A.state === "ready" && A.uid && A.me() && !markedSeen) { markedSeen = true; A.logs().lastSeen = new Date().toISOString(); P.save(); }
    if (A.state !== "ready") markedSeen = false;
    baseRender(top);
  };

  /* ---------- Sino: avisos do treinador, respostas e fichas atualizadas ---------- */
  A.inbox = function () {
    var me = A.me(), l = A.logs(), seen = l.noticesSeen || [], out = [];
    P.noticesFor(me).forEach(function (n) { out.push({ key: "n:" + n.id, at: n.at, ico: "🔔", title: n.title, desc: n.desc }); });
    l.checkins.forEach(function (c) { if (c.feedback && c.feedback.text && !c.byTrainer) out.push({ key: "f:" + c.id + ":" + c.feedback.date, at: c.feedback.date, ico: "💬", title: "Seu treinador respondeu", desc: P.formName(c.kind) + " de " + P.fmtDate(c.date), go: "feedbacks" }); });
    if (P.db.settings.showChanges !== false) [["treino", A.wplan()], ["dieta", A.dplan()]].forEach(function (x) {
      var pl = x[1], last = pl && (pl.changes || []).slice(-1)[0];
      if (last) out.push({ key: "c:" + x[0] + ":" + (last.at || last.date), at: last.at || last.date, ico: x[0] === "treino" ? "🏋️" : "🍽️", title: "Seu " + (x[0] === "treino" ? "treino" : "plano alimentar") + " foi atualizado", desc: last.lines.slice(0, 2).join(" ") + (last.lines.length > 2 ? "…" : ""), go: "mudancas", p: { k: x[0] } });
    });
    out.sort(function (a, b) { return String(a.at) < String(b.at) ? 1 : -1; });
    out.forEach(function (x) { x.unread = seen.indexOf(x.key) < 0; });
    return out;
  };
  A.bell = function () { var n = A.inbox().filter(function (x) { return x.unread; }).length; return '<button class="btn sm" style="position:relative" data-act="go" data-v="avisos">🔔' + (n ? '<span style="position:absolute;top:-6px;right:-6px;background:var(--warm);color:#fff;border-radius:99px;font-size:11px;padding:1px 6px">' + n + "</span>" : "") + "</button>"; };
  A.views.avisos = function () {
    var list = A.inbox(), l = A.logs();
    var html = A.top("Notificações") + '<div class="screen stack"><div class="title-xl">Notificações</div>' + (list.length ? list.map(function (x) {
      return '<button class="card big-card"' + (x.go ? ' data-act="go" data-v="' + x.go + '"' + (x.p ? ' data-p="' + A.dp(x.p) + '"' : "") : "") + ' style="' + (x.unread ? "border-color:var(--accent)" : "") + '"><div class="ico">' + x.ico + '</div><div class="grow"><b>' + esc(x.title) + "</b>" + (x.unread ? ' <span class="pill accent">nova</span>' : "") + '<div class="small muted">' + esc(x.desc || "") + '</div><div class="small muted">' + (x.at ? P.fmtDate(String(x.at).slice(0, 10)) : "") + "</div></div>" + (x.go ? "›" : "") + "</button>";
    }).join("") : '<div class="empty">Nenhuma notificação.</div>') + "</div>";
    var keys = list.map(function (x) { return x.key; });
    if (keys.some(function (k) { return (l.noticesSeen || []).indexOf(k) < 0; })) { l.noticesSeen = keys.slice(0, 200); P.save(); }
    return html;
  };
  A.views.mudancas = function (p) {
    var pl = p.k === "dieta" ? A.dplan() : A.wplan(), ch = (pl && pl.changes || []).slice().reverse();
    return A.top("O que mudou") + '<div class="screen stack"><div class="title-xl">O que mudou ' + (p.k === "dieta" ? "na dieta" : "no treino") + "</div>" + (ch.length ? ch.slice(0, 10).map(function (c) { return '<div class="card"><b class="small">📅 ' + P.fmtDate(c.date) + '</b><ul style="margin:6px 0 0;padding-left:18px">' + c.lines.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>"; }).join("") : '<div class="empty">Nenhuma mudança registrada.</div>') + "</div>";
  };

  /* ---------- Início: atualização programada, sino, planos ligados ---------- */
  var baseHome = A.views.home;
  A.views.home = function () {
    var html = baseHome(), pl = A.plans(), nx = P.nextPending(A.uid), today = P.todayISO();
    html = html.replace('<button class="btn sm" data-act="go" data-v="perfil">Perfil</button>', '<div class="row">' + A.bell() + '<button class="btn sm" data-act="go" data-v="perfil">Perfil</button></div>');
    if (nx) {
      var dd = Math.round((new Date(nx.date + "T12:00:00") - new Date(today + "T12:00:00")) / 864e5);
      var msg = dd > 0 ? "Faltam " + dd + " dia" + (dd > 1 ? "s" : "") + " para atualizar seu treinador, responda o questionário" : dd === 0 ? "Hoje é dia de atualizar seu treinador!" : "Sua atualização está atrasada desde " + P.fmtDate(nx.date) + ". Responda agora!";
      html = html.replace(/<button class="hero-banner" data-act="go" data-v="checkin">[\s\S]*?<\/button>/, '<button class="hero-banner" data-act="go" data-v="atualizacao"><b>' + esc(msg) + '</b><div class="small" style="opacity:.9">Check-in semanal · ' + P.fmtDate(nx.date) + "</div></button>");
    }
    var w = A.wplan(), ch = w && (w.changes || []).slice(-1)[0], seen = A.logs().noticesSeen || [];
    if (ch && P.db.settings.showChanges !== false && seen.indexOf("c:treino:" + (ch.at || ch.date)) < 0) html = html.replace('<div class="card"><div class="row between"><b>Treinos da semana</b>', '<button class="card big-card" style="border-color:var(--purple)" data-act="go" data-v="mudancas" data-p="' + A.dp({ k: "treino" }) + '"><div class="ico">✨</div><div class="grow"><b>Seu treino foi atualizado</b><div class="small muted">Toque para ver o que mudou</div></div>›</button><div class="card"><div class="row between"><b>Treinos da semana</b>');
    if (pl.treino === false) html = html.replace(/<div class="card"><div class="row between"><b>Treinos da semana<\/b>[\s\S]*?<\/div><\/div>/, "").replace(/<button class="card big-card" data-act="go" data-v="treino"[\s\S]*?<\/button>/, "");
    if (pl.dieta === false) html = html.replace(/<button class="card big-card" data-act="go" data-v="refeicao"[\s\S]*?<\/button>/, "");
    return html;
  };

  /* ---------- Treinos: observações com "Ver mais" + aviso de mudança ---------- */
  var baseTreinos = A.views.treinos;
  A.views.treinos = function () {
    var html = baseTreinos(), plan = A.wplan();
    if (plan && plan.notes && plan.notes.length > 160 && !A._notesOpen) html = html.replace('<div class="muted" style="white-space:pre-line;margin-top:8px">' + esc(plan.notes) + "</div>", '<div class="muted" style="white-space:pre-line;margin-top:8px">' + esc(plan.notes.slice(0, 150)) + '…</div><button class="small" style="color:var(--accent);margin-top:6px" data-act="notesMore">Ver mais ▾</button>');
    if (plan && (plan.changes || []).length && P.db.settings.showChanges !== false) html = html.replace('<div class="wk-grid">', '<button class="small" style="color:var(--accent);text-align:left" data-act="go" data-v="mudancas" data-p="' + A.dp({ k: "treino" }) + '">✨ Ver o que mudou no treino (' + P.fmtDate(plan.changes.slice(-1)[0].date) + ")</button><div class=\"wk-grid\">");
    return html;
  };
  A.actions.notesMore = function () { A._notesOpen = true; A.render(); };

  /* ---------- Evolução: atualizações, questionários liberados, fotos ---------- */
  A.views.evo = function () {
    var me = A.me(), l = A.logs(), nx = P.nextPending(A.uid), forms = me.forms || ["semanal", "mensal"];
    var fb = l.checkins.filter(function (c) { return c.feedback && c.feedback.text && !c.byTrainer; }).length;
    function item(v, ico, title, desc, extra, p) { return '<button class="card big-card" data-act="go" data-v="' + v + '"' + (p ? ' data-p="' + A.dp(p) + '"' : "") + '><div class="ico">' + ico + '</div><div class="grow"><b>' + title + '</b><div class="small muted">' + desc + "</div></div>" + (extra || "›") + "</button>"; }
    return '<div class="screen stack"><div class="row between"><div class="title-xl">Evolução</div>' + A.bell() + "</div>" +
      '<div class="card tight row between"><span>Próxima atualização</span><b>' + P.fmtDate(nx ? nx.date : me.nextCheckin) + "</b></div>" +
      (nx ? item("atualizacao", "📅", "Atualização de " + P.fmtDate(nx.date), "Pedida pelo seu treinador: " + (nx.forms || []).map(P.formName).join(", ") + (nx.photos ? " + fotos" : ""), '<span class="pill accent">Responder</span>') : "") +
      '<div class="small muted" style="margin-top:4px">Fotos de atualização</div>' + item("fotos", "📸", "Enviar fotos", "Sua atualização de imagens ajuda a acompanhar sua evolução. Mesmo ângulo e mesma luz.") +
      '<div class="small muted" style="margin-top:4px">Questionários</div>' + forms.map(function (f) { var last = l.checkins.filter(function (c) { return (c.kind || "semanal") === f; }).pop(); return item("checkin", f === "mensal" ? "📏" : "📋", esc(P.formName(f)), last ? "Último em " + P.fmtDate(last.date) : "Ainda não respondido", '<span class="pill accent">Responder</span>', { kind: f }); }).join("") +
      '<div class="small muted" style="margin-top:4px">Acompanhamento</div>' +
      item("feedbacks", "💬", "Observações do profissional", fb ? fb + " resposta(s) às suas atualizações" : "Ainda sem respostas") +
      item("medidas", "📐", "Minhas medidas", "Histórico das medidas") +
      item("peso", "⚖️", "Histórico de peso", "Gráfico e registros") +
      item("progressao", "📈", "Progressão de carga", "Gráficos de carga e repetições") +
      item("historicoTreinos", "🗓️", "Treinos realizados", l.sessions.length + " treinos registrados") +
      item("materiais", "📚", "Materiais extras", "Materiais e módulos do seu treinador") +
      item("anexos", "📎", "Anexos", "Arquivos compartilhados pelo seu treinador") + "</div>";
  };

  /* Uma atualização programada: lista o que falta responder */
  A.views.atualizacao = function () {
    var nx = P.nextPending(A.uid);
    if (!nx) return A.top("Atualização") + '<div class="screen"><div class="empty">Nenhuma atualização pendente. 👏</div></div>';
    var block = P.windowBlock(nx), ans = A.logs().checkins.filter(function (c) { return c.scheduleId === nx.id; });
    function done(k) { return k === "fotos" ? ans.some(function (c) { return c.photos && c.photos.filter(Boolean).length; }) : ans.some(function (c) { return (c.kind || "semanal") === k; }); }
    var parts = (nx.forms || []).map(function (f) { return { k: f, name: P.formName(f), v: "checkin" }; }); if (nx.photos) parts.push({ k: "fotos", name: "Fotos de atualização", v: "fotos" });
    return A.top("Atualização") + '<div class="screen stack"><div class="title-xl">Atualização de ' + P.fmtDate(nx.date) + '</div><div class="muted small">Seu treinador pediu:</div>' + (block ? '<div class="card tight" style="border-color:var(--warm)">' + esc(block) + "</div>" : "") +
      parts.map(function (x) { var ok = done(x.k); return '<button class="card big-card"' + (ok || block ? "" : ' data-act="go" data-v="' + x.v + '" data-p="' + A.dp({ kind: x.k, sched: nx.id }) + '"') + '><div class="ico">' + (ok ? "✅" : x.k === "fotos" ? "📸" : "📋") + '</div><div class="grow"><b>' + esc(x.name) + '</b><div class="small muted">' + (ok ? "Enviado" : "Pendente") + "</div></div>" + (ok ? "" : '<span class="pill accent">Responder</span>') + "</button>"; }).join("") + "</div>";
  };

  /* Check-in: liga a resposta à atualização programada (e respeita a janela de envio) */
  var baseCk = A.views.checkin;
  A.views.checkin = function (p) {
    var kind = A.ckKind2(p), it = A.schedFor(p, kind);
    if (it && P.windowBlock(it)) return A.top("Check-in") + '<div class="screen"><div class="card" style="border-color:var(--warm)">' + esc(P.windowBlock(it)) + "</div></div>";
    A._ckSched = it ? it.id : null;
    var html = baseCk({ kind: kind });
    if (kind !== "semanal" && kind !== "mensal") html = html.replace(/<div class="title-xl">Check-in semanal<\/div>/, '<div class="title-xl">' + esc(P.formName(kind)) + "</div>").replace(/‹ Voltar<\/button><div class="grow" style="text-align:center;font-weight:700">Check-in semanal/, "‹ Voltar</button><div class=\"grow\" style=\"text-align:center;font-weight:700\">" + esc(P.formName(kind)));
    return html;
  };
  A.ckKind2 = function (p) { return p && p.kind ? p.kind : "semanal"; };
  A.ckKind = A.ckKind2;
  A.schedFor = function (p, kind) {
    var list = P.scheduleOf(A.uid);
    if (p && p.sched) return list.filter(function (x) { return x.id === p.sched; })[0] || null;
    var nx = P.nextPending(A.uid);
    return nx && ((nx.forms || []).indexOf(kind) >= 0 || (kind === "fotos" && nx.photos)) ? nx : null;
  };
  var baseSend = A.actions.sendCheckin;
  A.actions.sendCheckin = function () {
    var l = A.logs(), n = l.checkins.length, sched = A._ckSched, kind = A._ck && A._ck.kind, me = A.me(), keepW = me.nextCheckin, keepM = me.nextMonthly;
    baseSend();
    if (kind !== "semanal" && kind !== "mensal") { me.nextCheckin = keepW; me.nextMonthly = keepM; }
    if (l.checkins.length > n) {
      var c = l.checkins[l.checkins.length - 1]; if (sched) c.scheduleId = sched;
      if (kind !== "semanal" && kind !== "mensal" && A.me().nextCheckin) { /* questionário extra não mexe nas datas */ }
      P.save();
      if (sched && P.nextPending(A.uid) && P.nextPending(A.uid).id === sched) { A.stack = [{ v: "evo", p: {} }, { v: "atualizacao", p: {} }]; A.tabRoot = "evo"; A.render(true); }
    }
  };

  /* Fotos de atualização (separadas do questionário) */
  A.views.fotos = function (p) {
    var it = A.schedFor(p, "fotos");
    if (it && P.windowBlock(it)) return A.top("Fotos") + '<div class="screen"><div class="card" style="border-color:var(--warm)">' + esc(P.windowBlock(it)) + "</div></div>";
    A._ph = A._ph && A._ph.sched === (it ? it.id : null) ? A._ph : { sched: it ? it.id : null, list: [] };
    var minP = P.db.settings.minPhotos || 0, labels = ["Frente", "Lado", "Costas"];
    var slots = Math.max(3, A._ph.list.length + 1);
    var cells = ""; for (var i = 0; i < slots; i++) { var ph = A._ph.list[i]; cells += '<label class="photo" style="' + (ph ? "background-image:url(" + ph + ");border-style:solid" : "") + '">' + (ph ? "" : "📷<br>" + (labels[i] || "Extra")) + '<input type="file" accept="image/*" hidden data-change="phPick" data-i="' + i + '"></label>'; }
    return A.top("Fotos") + '<div class="screen stack"><div class="title-xl">Fotos de atualização</div><div class="muted small">A sua atualização de imagens é importante para acompanhar sua evolução e manter seu treinador informado. Procure tirar as fotos sempre com o mesmo ângulo e a mesma luz' + (minP ? " · mínimo " + minP + " fotos" : "") + '.</div><div class="photos">' + cells + '</div><button class="btn primary block" style="padding:15px" data-act="phSend">Enviar fotos</button></div>';
  };
  A.actions.phPick = function (el) { var f = el.files[0]; if (!f) return; A.readImage(f, function (u) { A._ph.list[+el.dataset.i] = u; A._ph.list = A._ph.list.filter(Boolean); A.render(); }); };
  A.actions.phSend = function () {
    var list = A._ph.list.filter(Boolean), minP = P.db.settings.minPhotos || 0;
    if (!list.length || list.length < minP) { A.toast("Envie pelo menos " + Math.max(1, minP) + " foto(s)."); return; }
    var c = { id: P.uid("ck"), kind: "fotos", date: P.todayISO(), answers: {}, photos: list, feedback: null }; if (A._ph.sched) c.scheduleId = A._ph.sched;
    A.logs().checkins.push(c); P.save(); A._ph = null; A.toast("📸 Fotos enviadas ao seu treinador!");
    A.stack = [{ v: "evo", p: {} }]; A.tabRoot = "evo"; if (P.nextPending(A.uid)) A.stack.push({ v: "atualizacao", p: {} }); A.render(true);
  };

  /* Observações do profissional: ignora as "fotos enviadas pelo treinador" */
  var baseFb = A.views.feedbacks;
  A.views.feedbacks = function () {
    var l = A.logs(), all = l.checkins; l.checkins = all.filter(function (c) { return !c.byTrainer && c.kind !== "fotos"; });
    try { return baseFb().replace(/Check-in (semanal|mensal) de/g, "Atualização de"); } finally { l.checkins = all; }
  };

  /* ---------- Progressão de carga: escolhe a ficha (atual ou antigas) ---------- */
  A.views.progressao = function (p) {
    var cur = A.wplan(), hist = ((P.db.histories[A.uid] || {}).workout || []).slice().reverse(), fichas = [{ id: "cur", name: P.fmtDate(cur ? cur.createdAt || cur.updatedAt : "") + " (Ativa)", plan: cur }].concat(hist.map(function (x, i) { return { id: "h" + i, name: P.fmtDate(x.plan.createdAt || x.plan.updatedAt) + " até " + P.fmtDate(x.archivedAt), plan: x.plan }; }));
    var fs = fichas.filter(function (f) { return f.id === (p.f || "cur"); })[0] || fichas[0], plan = fs.plan;
    if (!plan) return A.top("Progressão") + '<div class="screen"><div class="empty">Sem ficha de treino.</div></div>';
    var w = plan.workouts.filter(function (x) { return x.id === p.w; })[0] || plan.workouts[0];
    return A.top("Progressão") + '<div class="screen stack"><div class="title-xl">Progressão de carga</div><div class="card stack"><div class="field"><label>Ficha de treino</label><select data-change="progF">' + fichas.map(function (f) { return '<option value="' + f.id + '"' + (f.id === fs.id ? " selected" : "") + ">" + esc(f.name) + "</option>"; }).join("") + '</select></div><div class="field"><label>Treino</label><select data-change="progW">' + plan.workouts.map(function (x) { return '<option value="' + x.id + '"' + (x.id === w.id ? " selected" : "") + ">" + esc(x.name) + "</option>"; }).join("") + "</select></div></div>" +
      w.items.map(function (it) {
        var h = P.exerciseHistory(A.uid, it.exId), pts = h.list.slice().reverse().map(function (s) { var ws = s.sets.filter(function (x) { return x.weight != null; }).map(function (x) { return x.weight; }); return ws.length ? { y: Math.max.apply(null, ws), label: P.fmtDate(s.date).slice(0, 5) } : null; }).filter(Boolean);
        var reps = h.list.slice().reverse().map(function (s) { return { y: s.sets.reduce(function (a, x) { return a + (x.reps || 0); }, 0), label: P.fmtDate(s.date).slice(0, 5) }; });
        return '<div class="card"><div class="row between"><b>' + esc(P.exercise(it.exId).name) + "</b>" + (h.best ? '<span class="pill">🏆 ' + h.best.weight + " kg</span>" : "") + "</div>" + (pts.length ? '<div class="small muted">Carga máxima (kg)</div>' + P.lineChart(pts, { h: 120 }) + '<div class="small muted">Repetições totais</div>' + P.lineChart(reps, { h: 100 }) : '<div class="empty">Nenhum dado de evolução encontrado para este exercício. Execute alguns treinos para ver sua evolução aqui.</div>') + "</div>";
      }).join("") + "</div>";
  };
  A.actions.progF = function (el) { A.cur().p.f = el.value; A.cur().p.w = null; A.render(); };

  /* ---------- Lista de compras: + detalhes por refeição ---------- */
  var baseCompras = A.views.compras;
  A.views.compras = function (p) {
    var html = baseCompras(p), plan = A.dplan(), mult = p.m === "mes" ? 30 / 7 : 1;
    var det = '<div class="title-lg" style="margin-top:8px">Detalhes por refeição</div><div class="small muted">Toque nos alimentos para ver ou trocar substituições.</div>';
    plan.variations.forEach(function (v) {
      var freq = v.days.length * mult;
      v.meals.forEach(function (m) {
        det += '<div class="card"><div class="row between"><b>' + esc(m.name) + (plan.variations.length > 1 ? ' <span class="small muted">· ' + esc(v.name) + "</span>" : "") + '</b><span class="pill">' + Math.round(freq) + "x por " + (p.m === "mes" ? "mês" : "semana") + "</span></div>" +
          m.options.map(function (o, oi) { return (m.options.length > 1 ? '<div class="small muted" style="margin-top:8px">Opção ' + (oi + 1) + "</div>" : "") + '<div class="list">' + o.items.map(function (fi) { return '<button class="list-item small" data-act="go" data-v="refeicao" data-p="' + A.dp({ id: m.id, date: P.todayISO(), opt: oi }) + '"><span class="grow">' + esc(P.food(fi.foodId).name) + (fi.subs && fi.subs.length ? ' <span class="muted">· ' + fi.subs.length + " subst.</span>" : "") + '</span><span class="qty">' + Math.round(fi.grams * freq) + " g</span></button>"; }).join("") + "</div>"; }).join("") + "</div>";
      });
    });
    return html.replace(/<\/div>$/, det + "</div>");
  };

  /* ---------- Materiais agrupados por módulo ---------- */
  A.views.materiais = function () {
    var seen = A.logs().materialsSeen, q = (A._matQ || "").toLowerCase(), mods = {};
    P.db.materials.filter(function (m) { return !q || (m.title + m.desc + (m.module || "")).toLowerCase().indexOf(q) >= 0; }).forEach(function (m) { var k = m.module || ""; (mods[k] = mods[k] || []).push(m); });
    var keys = Object.keys(mods).sort(function (a, b) { return a === "" ? 1 : b === "" ? -1 : a.localeCompare(b); });
    return A.top("Materiais") + '<div class="screen stack"><div class="title-xl">Materiais extras</div><div class="muted small">Conteúdos disponibilizados pelo seu profissional para acompanhar no seu ritmo.</div><input placeholder="🔍 Buscar materiais e módulos" value="' + esc(A._matQ || "") + '" data-change="matQ">' +
      keys.map(function (k) { return '<div class="small muted" style="margin-top:6px">' + (k ? "📦 " + esc(k) : "Materiais") + "</div>" + mods[k].map(function (m) { var s = seen.indexOf(m.id) >= 0; return '<button class="card big-card" data-act="go" data-v="material" data-p="' + A.dp({ id: m.id }) + '"><div class="ico">' + (s ? "✓" : "📄") + '</div><div class="grow"><b>' + esc(m.title) + '</b><div class="small muted">' + esc(m.desc) + "</div></div>›</button>"; }).join(""); }).join("") + (keys.length ? "" : '<div class="empty">Nada encontrado.</div>') + "</div>";
  };

  /* ---------- Anexos: do treinador + envio do aluno ---------- */
  var baseAnexos = A.views.anexos;
  A.views.anexos = function () {
    var html = baseAnexos(), ups = A.logs().uploads || [];
    if (!P.db.settings.allowStudentFiles && !ups.length) return html;
    var extra = '<div class="title-lg" style="margin-top:10px">Meus arquivos</div><div class="small muted">Exames, laudos e outros arquivos para o seu treinador (até 300 KB cada).</div>' + ups.slice().reverse().map(function (u) { return '<div class="card big-card"><div class="ico">📎</div><div class="grow"><b>' + esc(u.name) + '</b><div class="small muted">' + P.fmtDate(u.date) + "</div></div></div>"; }).join("") + (P.db.settings.allowStudentFiles ? '<label class="btn block">+ Enviar arquivo<input type="file" hidden data-change="upFile"></label>' : "");
    return html.replace(/<\/div>$/, extra + "</div>");
  };
  A.actions.upFile = function (el) {
    var f = el.files[0]; if (!f) return; if (f.size > 200000) { A.toast("Arquivo grande demais (até ~200 KB). Tente uma foto ou PDF menor."); return; }
    var r = new FileReader(); r.onload = function () { A.logs().uploads = A.logs().uploads || []; A.logs().uploads.push({ name: f.name, date: P.todayISO(), ref: r.result }); P.save(); A.toast("Arquivo enviado ao seu treinador."); A.render(); }; r.readAsDataURL(f);
  };

  /* ---------- Perfil: foto, sino ---------- */
  var basePerfil = A.views.perfil;
  A.views.perfil = function () {
    var html = basePerfil(), av = A.logs().avatar, me = A.me();
    var pic = '<label style="display:inline-block;position:relative;cursor:pointer">' + (av ? '<img src="' + av + '" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin:0 auto 10px;display:block">' : '<div class="logo" style="margin:0 auto 10px">' + esc(me.name[0]) + "</div>") + '<span style="position:absolute;right:-4px;bottom:6px;background:var(--card2);border-radius:99px;padding:2px 5px;font-size:12px">📷</span><input type="file" accept="image/*" hidden data-change="avatarPick"></label>';
    html = html.replace('<div class="logo" style="margin:0 auto 10px">' + esc(me.name[0]) + "</div>", pic);
    return html.replace('<button class="btn sm" data-act="go" data-v="config">⚙︎</button>', '<div class="row">' + A.bell() + '<button class="btn sm" data-act="go" data-v="config">⚙︎</button></div>').replace('<div class="small muted">' + esc(me.email) + " · " + esc(me.phone) + "</div>", '<div class="small muted">' + esc(me.email) + "</div><div class=\"small muted\">" + esc(me.phone || "") + (me.birth ? " · " + P.fmtDate(me.birth) : "") + "</div>");
  };
  A.actions.avatarPick = function (el) {
    var f = el.files[0]; if (!f) return;
    var r = new FileReader(); r.onload = function () { var img = new Image(); img.onload = function () { var c = document.createElement("canvas"), s = 220 / Math.min(img.width, img.height); c.width = c.height = 220; c.getContext("2d").drawImage(img, (220 - img.width * s) / 2, (220 - img.height * s) / 2, img.width * s, img.height * s); A.logs().avatar = c.toDataURL("image/jpeg", 0.7); P.save(); A.render(); }; img.src = r.result; }; r.readAsDataURL(f);
  };
})();
