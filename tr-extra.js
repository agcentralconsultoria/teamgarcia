/* Site do treinador — painel completo, lista/Kanban de alunos, etiquetas e ficha do aluno (todas as abas) */
(function () {
  "use strict";
  var P = window.Proto, T = window.T, esc = P.esc;
  var MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  var ACT = [["Sedentário", 1.2], ["Levemente ativo", 1.375], ["Moderadamente ativo", 1.55], ["Muito ativo", 1.725], ["Extremamente ativo", 1.9]];
  var COND = ["Abaixo do peso", "Próximo do Peso Ideal", "Sobrepeso", "Obesidade"];
  function today() { return P.todayISO(); }
  function du(iso) { return iso ? T.daysUntil(iso) : null; }
  function bdayToday(s) { return s.birth && s.birth.slice(5) === today().slice(5); }
  T.age = function (s) { return s.birth ? Math.floor((new Date() - new Date(s.birth + "T12:00:00")) / 3.15576e10) : 30; };
  T.tmb = function (s) { var a = T.age(s); return s.sex === "Feminino" ? 10 * s.weight + 6.25 * s.height - 5 * a - 161 : 10 * s.weight + 6.25 * s.height - 5 * a + 5; };
  T.gasto = function (s) { var f = (ACT.filter(function (x) { return x[0] === s.activity; })[0] || ACT[2])[1]; return T.tmb(s) * f; };
  T.protGoal = function (s) { return s.protGoal ? +s.protGoal : Math.round(2 * (s.weight || 70)); };
  T.tag = function (id) { return (P.db.tags || []).filter(function (t) { return t.id === id; })[0]; };
  T.tagsHtml = function (s) { return (s.tags || []).map(function (id) { var t = T.tag(id); return t ? '<span class="tagp" style="background:' + t.color + '">' + esc(t.name) + "</span>" : ""; }).join(""); };
  T.plans = function (s) { return s.plans || { treino: true, dieta: true }; };
  T.touch = function (s) { s.updatedAt = new Date().toISOString(); };
  function stamp(iso) { if (!iso) return "—"; var d = new Date(iso); return P.fmtDate(P.todayISO(d)) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  T.stamp = stamp;

  /* Data "efetiva" da próxima atualização: a programada (se houver) ou a do check-in semanal */
  T.nextUpd = function (s) { var n = P.nextPending(s.id); return n ? n.date : s.nextCheckin; };

  /* Atualizações programadas que se repetem: cria a próxima quando a atual é respondida/cancelada,
     e cancela a que ficou atrasada mais de 7 dias sem resposta. */
  T.autoSchedule = function () {
    var changed = false;
    P.db.students.forEach(function (s) {
      if (!s.active) return;
      var list = P.scheduleOf(s.id);
      if (!list.length) return;
      list.forEach(function (it) {
        var st = P.schedStatus(s.id, it);
        if ((st === "pendente" || st === "parcial") && it.repeatDays && du(it.date) < -7) { it.status = "cancelada"; changed = true; }
      });
      var last = list.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
      if (!last || !last.repeatDays) return;
      var st = P.schedStatus(s.id, last);
      if (st === "respondida" || st === "cancelada") {
        var d = P.addDays(last.date, last.repeatDays);
        while (d < today()) d = P.addDays(d, last.repeatDays);
        list.push({ id: P.uid("upd"), date: d, photos: last.photos, forms: (last.forms || []).slice(), status: "pendente", repeatDays: last.repeatDays, createdAt: new Date().toISOString(), auto: true });
        changed = true;
      }
    });
    if (changed) P.save();
  };

  /* ---------- Painel (igual ao do Treino.io + extras) ---------- */
  T.pages.dash = function () {
    T.autoSchedule();
    var st = P.db.students.filter(function (s) { return s.active; }), t = today(), in7 = P.addDays(t, 7);
    var g = { plan: [], upd: [], vh: [], v7: [], ven: [], sv: [], ani: [], fh: [], f7: [], pend: [], late: [], ckLib: [], recov: [] };
    var cfg = P.db.settings;
    st.forEach(function (s) {
      var l = P.logsOf(s.id), nu = T.nextUpd(s), wp = P.db.workoutPlans[s.id];
      if (nu === t) g.plan.push(s);
      if (l.checkins.some(function (c) { return c.date === t; })) g.upd.push(s);
      if (!s.planEnd) g.sv.push(s); else { if (s.planEnd === t) g.vh.push(s); else if (s.planEnd > t && s.planEnd <= in7) g.v7.push(s); if (s.planEnd < t) g.ven.push(s); }
      if (bdayToday(s)) g.ani.push(s);
      if (wp && wp.validUntil) { if (wp.validUntil === t) g.fh.push(s); else if (wp.validUntil > t && wp.validUntil <= in7) g.f7.push(s); }
      if (l.checkins.some(function (c) { return !c.feedback && c.kind !== "fotos"; })) g.pend.push(s);
      if (nu && nu < t) g.late.push(s);
      if (nu && nu <= t) g.ckLib.push(s);
      var last = l.sessions.map(function (x) { return x.date; }).sort().pop(), seen = l.lastSeen ? l.lastSeen.slice(0, 10) : null;
      var noTrain = last ? -du(last) : null, noOpen = seen ? -du(seen) : null;
      if ((cfg.recoverNoTrainDays && noTrain != null && noTrain >= cfg.recoverNoTrainDays) || (cfg.recoverNoOpenDays && noOpen != null && noOpen >= cfg.recoverNoOpenDays)) g.recov.push({ s: s, noTrain: noTrain, noOpen: noOpen });
    });
    T._dashGroups = g;
    function kpi(key, label, n, color, ico) { return '<button class="card kpi" style="text-align:left" data-act="kpiList" data-k="' + key + '" data-l="' + esc(label) + '"><span class="small muted">' + label + '</span><b style="color:' + (color || "var(--text)") + '">' + (ico || "") + " " + n + "</b></button>"; }
    var recent = [];
    st.forEach(function (s) { P.logsOf(s.id).sessions.forEach(function (x) { recent.push({ s: s, x: x }); }); });
    recent.sort(function (a, b) { return a.x.date < b.x.date ? 1 : -1; });
    return '<div class="page-title">Painel</div><div class="muted" style="margin-bottom:16px">Resumo de hoje, ' + P.fmtDate(t) + ' · toque num número para ver os alunos</div>' +
      '<div class="kpis">' + kpi("plan", "Atualizações planejadas para hoje", g.plan.length, "var(--valid)", "📅") + kpi("upd", "Atualizaram hoje", g.upd.length, "var(--valid)", "✅") + kpi("vh", "Vencimentos hoje", g.vh.length, "var(--warm)", "⚠️") + kpi("v7", "Vencimentos próximos 7 dias", g.v7.length, "var(--prep)", "⚠️") +
      kpi("ativos", "Alunos ativos", st.length, "var(--blue)", "👤") + kpi("ven", "Alunos vencidos", g.ven.length, "var(--muted)", "👤") + kpi("sv", "Sem vigência", g.sv.length, "var(--prep)", "⚠️") + kpi("ani", "Aniversariantes hoje", g.ani.length, "var(--purple)", "🎁") + kpi("fh", "Fichas vencendo hoje", g.fh.length, "var(--warm)", "📝") + kpi("f7", "Fichas vencendo próximos 7 dias", g.f7.length, "var(--prep)", "📝") + "</div>" +
      T.calendarCard() +
      '<div class="grid2" style="margin-top:16px"><div class="card"><b>📋 Atualizações aguardando sua resposta</b>' + (g.pend.length ? '<div class="list" style="margin-top:8px">' + g.pend.map(function (s) { var c = P.logsOf(s.id).checkins.filter(function (x) { return !x.feedback && x.kind !== "fotos"; }).pop(); return '<button class="list-item" data-act="openStudent" data-id="' + s.id + '" data-tab="atualizacoes"><span class="grow"><b>' + esc(s.name) + '</b><div class="small muted">' + esc(P.formName(c.kind)) + " · " + P.fmtDate(c.date) + '</div></span><span class="pill accent">Responder</span></button>'; }).join("") + "</div>" : '<div class="empty">Tudo respondido 👏</div>') + "</div>" +
      '<div class="card"><b>📲 Atualização liberada / atrasada (lembrar no WhatsApp)</b>' + (g.ckLib.length ? '<div class="list" style="margin-top:8px">' + g.ckLib.map(function (s) { var nu = T.nextUpd(s); return '<div class="list-item"><span class="grow"><b>' + esc(s.name) + '</b><div class="small muted">' + (nu < t ? '<span style="color:var(--warm)">Atrasada desde ' : "Desde ") + P.fmtDate(nu) + (nu < t ? "</span>" : "") + "</div></span>" + T.waBtn(s) + "</div>"; }).join("") + "</div>" : '<div class="empty">Nenhuma atualização liberada hoje.</div>') + "</div></div>" +
      '<div class="card" style="margin-top:14px"><b>🛟 Recuperação de alunos</b> <span class="small muted">(' + (cfg.recoverNoTrainDays || "—") + " dias sem treinar ou " + (cfg.recoverNoOpenDays || "—") + ' dias sem abrir o app — muda em Configurações)</span>' + (g.recov.length ? '<div class="list" style="margin-top:8px">' + g.recov.map(function (r) { return '<div class="list-item"><button class="grow" style="text-align:left" data-act="openStudent" data-id="' + r.s.id + '"><b>' + esc(r.s.name) + '</b><div class="small muted">' + (r.noTrain != null ? r.noTrain + " dias sem treinar" : "nunca treinou pelo app") + " · " + (r.noOpen != null ? r.noOpen + " dias sem abrir o app" : "nunca abriu o app") + "</div></button>" + T.waBtn(r.s, "recuperar") + "</div>"; }).join("") + "</div>" : '<div class="empty">Todos os alunos estão em dia 💪</div>') + "</div>" +
      '<div class="card" style="margin-top:14px"><b>🏋️ Últimos treinos realizados</b>' + (recent.length ? '<table class="t" style="margin-top:6px"><tr><th>Aluno</th><th>Treino</th><th>Data</th><th class="hide-m">Duração</th><th class="hide-m">Esforço</th></tr>' + recent.slice(0, 8).map(function (r) { return '<tr class="click" data-act="openStudent" data-id="' + r.s.id + '" data-tab="treinos"><td>' + esc(r.s.name) + "</td><td>" + esc(r.x.workoutName) + "</td><td>" + P.fmtDate(r.x.date) + '</td><td class="hide-m">' + Math.round(r.x.durationSec / 60) + ' min</td><td class="hide-m">' + (r.x.effort || "—") + "</td></tr>"; }).join("") + "</table>" : '<div class="empty">Nenhum treino ainda.</div>') + "</div>";
  };
  T.actions.kpiList = function (el) {
    var k = el.dataset.k, g = T._dashGroups || {}, list = k === "ativos" ? P.db.students.filter(function (s) { return s.active; }) : g[k] || [];
    T.sheet(el.dataset.l, list.length ? '<div class="list">' + list.map(function (s) { return '<button class="list-item" data-act="openStudentSheet" data-id="' + s.id + '"><span class="grow"><b>' + esc(s.name) + '</b><div class="small muted">Plano até ' + P.fmtDate(s.planEnd) + " · próxima atualização " + P.fmtDate(T.nextUpd(s)) + "</div></span>›</button>"; }).join("") + "</div>" : '<div class="empty">Nenhum aluno.</div>');
  };
  T.actions.openStudentSheet = function (el) { T.closeSheet(); T.go("aluno", { id: el.dataset.id, tab: "geral" }); };

  /* Calendário do mês com eventos (atualizações, vencimentos, treinos, atualizaram, aniversários, fichas vencendo) */
  var EV = { upd: ["Atualizações", "#22c55e"], ven: ["Vencimentos", "#ef4444"], tre: ["Treinos", "#f97316"], fez: ["Atualizaram", "#3b82f6"], ani: ["Aniversariantes", "#a855f7"], fic: ["Fichas vencendo", "#ea580c"] };
  function monthEvents(y, m) {
    var pre = y + "-" + String(m + 1).padStart(2, "0"), ev = {};
    function add(d, type, s) { if (!d || d.slice(0, 7) !== pre) return; (ev[d] = ev[d] || []).push({ type: type, s: s }); }
    P.db.students.filter(function (s) { return s.active; }).forEach(function (s) {
      var l = P.logsOf(s.id), wp = P.db.workoutPlans[s.id];
      P.scheduleOf(s.id).forEach(function (it) { if (it.status !== "cancelada") add(it.date, "upd", s); });
      if (!P.scheduleOf(s.id).length) add(s.nextCheckin, "upd", s);
      add(s.planEnd, "ven", s);
      var seenD = {}; l.sessions.forEach(function (x) { if (!seenD[x.date]) { seenD[x.date] = 1; add(x.date, "tre", s); } });
      var seenC = {}; l.checkins.forEach(function (c) { if (!seenC[c.date]) { seenC[c.date] = 1; add(c.date, "fez", s); } });
      if (s.birth) add(y + "-" + s.birth.slice(5), "ani", s);
      if (wp && wp.validUntil) add(wp.validUntil, "fic", s);
    });
    return ev;
  }
  T.calendarCard = function () {
    var now = new Date(), ym = T._calYM || [now.getFullYear(), now.getMonth()], y = ym[0], m = ym[1];
    var ev = monthEvents(y, m), first = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate(), t = today();
    var cells = P.DOW.map(function (d) { return '<div class="h">' + d + "</div>"; }).join("");
    for (var i = 0; i < first; i++) cells += '<div class="d out"></div>';
    for (var d = 1; d <= dim; d++) {
      var iso = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"), list = ev[iso] || [], byType = {};
      list.forEach(function (e) { byType[e.type] = (byType[e.type] || 0) + 1; });
      cells += '<button class="d' + (iso === t ? " today" : "") + '" data-act="calDay" data-d="' + iso + '"><b>' + d + "</b>" + Object.keys(byType).map(function (k) { return '<span class="ev" style="background:' + EV[k][1] + '">' + byType[k] + " " + EV[k][0].toLowerCase() + "</span>"; }).join("") + "</button>";
    }
    return '<div class="card" style="margin-top:16px"><div class="row between wrap"><div class="row wrap small" style="gap:10px">' + Object.keys(EV).map(function (k) { return '<span><i class="dot" style="background:' + EV[k][1] + '"></i> ' + EV[k][0] + "</span>"; }).join("") + '</div><span class="small muted">Toque no dia para ver os detalhes</span></div>' +
      '<div class="row between" style="margin:10px 0"><button class="btn sm" data-act="calNav" data-d="-1">‹ Anterior</button><b style="font-size:17px">' + MESES[m] + " de " + y + '</b><button class="btn sm" data-act="calNav" data-d="1">Próximo ›</button></div><div class="calm">' + cells + "</div></div>";
  };
  T.actions.calNav = function (el) { var now = new Date(), ym = T._calYM || [now.getFullYear(), now.getMonth()], m = ym[1] + +el.dataset.d, y = ym[0]; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } T._calYM = [y, m]; T.render(); };
  T.actions.calDay = function (el) {
    var iso = el.dataset.d, ev = monthEvents(+iso.slice(0, 4), +iso.slice(5, 7) - 1)[iso] || [];
    T.sheet("Dia " + P.fmtDate(iso), ev.length ? '<div class="list">' + ev.map(function (e) { return '<button class="list-item" data-act="openStudentSheet" data-id="' + e.s.id + '"><i class="dot" style="background:' + EV[e.type][1] + '"></i><span class="grow"><b>' + esc(e.s.name) + '</b><div class="small muted">' + EV[e.type][0] + "</div></span>›</button>"; }).join("") + "</div>" : '<div class="empty">Nada neste dia.</div>');
  };

  /* WhatsApp com mensagem para recuperar aluno */
  var baseWa = T.waBtn;
  T.waBtn = function (s, kind) {
    if (kind !== "recuperar" || !s.phone) return baseWa(s);
    var msg = "Oi, " + String(s.name || "").split(" ")[0] + "! Senti sua falta por aqui 😊 Como estão os treinos? Qualquer dificuldade me fala que a gente ajusta. Seu app: " + location.href.replace(/[^/]*([?#].*)?$/, "") + "aluno.html";
    return '<a class="btn sm" style="text-decoration:none;color:var(--text);white-space:nowrap" target="_blank" rel="noopener" href="' + esc(P.waLink(s.phone, msg)) + '">📲 Chamar no WhatsApp</a>';
  };

  /* ---------- Alunos: indicadores, filtros, Lista/Kanban, CSV, etiquetas ---------- */
  T._af = T._af || { plan: "", vig: "", tags: [], k: "" };
  function stuGroups() {
    var all = P.db.students, act = all.filter(function (s) { return s.active; }), t = today();
    return {
      ativos: act,
      pend: act.filter(function (s) { return P.logsOf(s.id).checkins.some(function (c) { return !c.feedback && c.kind !== "fotos"; }); }),
      esq: act.filter(function (s) { var n = T.nextUpd(s); return n && n < t; }),
      venc: act.filter(function (s) { return s.planEnd && s.planEnd < t; }),
      ani: act.filter(bdayToday),
      inat: all.filter(function (s) { return !s.active; })
    };
  }
  function filtered() {
    var f = T._af, q = (T._q || "").toLowerCase(), g = stuGroups();
    var base = f.k ? g[f.k] : (f.k === "" && T._showInactive ? P.db.students : g.ativos);
    return base.filter(function (s) {
      var pl = T.plans(s);
      if (q && (s.name + " " + s.email).toLowerCase().indexOf(q) < 0) return false;
      if (f.plan === "treino" && !(pl.treino && !pl.dieta)) return false;
      if (f.plan === "dieta" && !(pl.dieta && !pl.treino)) return false;
      if (f.plan === "ambos" && !(pl.treino && pl.dieta)) return false;
      if (f.vig === "com" && !s.planEnd) return false;
      if (f.vig === "sem" && s.planEnd) return false;
      if (f.tags.length && !f.tags.some(function (t) { return (s.tags || []).indexOf(t) >= 0; })) return false;
      return true;
    });
  }
  T.pages.alunos = function () {
    var g = stuGroups(), f = T._af, list = filtered(), kan = T._view === "kanban";
    var K = [["ativos", "Alunos ativos", "var(--valid)"], ["pend", "Pendentes de atualização pelo profissional", "var(--prep)"], ["esq", "Alunos que esqueceram de atualizar", "var(--prep)"], ["venc", "Planos vencidos", "var(--warm)"], ["ani", "Aniversariantes do dia", "var(--blue)"], ["inat", "Alunos inativos", "var(--muted)"]];
    function radio(name, val, label) { return '<label class="row small" style="gap:5px"><input type="radio" style="width:auto" name="' + name + '" data-change="afSet" data-k="' + name + '" value="' + val + '"' + (f[name] === val ? " checked" : "") + ">" + label + "</label>"; }
    var html = '<div class="kpis">' + K.map(function (k) { return '<button class="card kpi" style="text-align:center;' + (f.k === k[0] ? "border-color:" + k[2] : "") + '" data-act="afKpi" data-k="' + k[0] + '"><span class="small muted">' + k[1] + '</span><b style="color:' + k[2] + '">' + g[k[0]].length + "</b></button>"; }).join("") + "</div>" +
      '<div class="row between wrap" style="margin:14px 0 6px"><button class="btn sm ghost" data-act="afToggle">⚙️ Filtros avançados ' + (T._afOpen ? "▲" : "▼") + '</button><div class="tabs" style="width:auto"><button class="' + (kan ? "" : "on") + '" data-act="view" data-v="lista">☰ Lista</button><button class="' + (kan ? "on" : "") + '" data-act="view" data-v="kanban">▦ Kanban</button></div></div>' +
      (T._afOpen ? '<div class="card stack"><div class="row wrap" style="gap:14px"><b class="small">Tipo de plano:</b>' + radio("plan", "treino", "Somente Treino") + radio("plan", "dieta", "Somente Dieta") + radio("plan", "ambos", "Ambos (Treino + Dieta)") + radio("plan", "", "Todos") + '</div><div class="row wrap" style="gap:14px"><b class="small">Vigência:</b>' + radio("vig", "com", "Com vigência definida") + radio("vig", "sem", "Sem vigência definida") + radio("vig", "", "Ambos") + '</div><div class="row wrap" style="gap:6px"><b class="small">Etiquetas:</b>' + (P.db.tags || []).map(function (t) { var on = f.tags.indexOf(t.id) >= 0; return '<button class="chip' + (on ? " on" : "") + '" data-act="afTag" data-id="' + t.id + '"><i class="dot" style="background:' + t.color + '"></i> ' + esc(t.name) + "</button>"; }).join("") + '<button class="btn sm" data-act="manageTags">Gerenciar etiquetas</button></div><label class="row small muted"><input type="checkbox" style="width:auto" data-change="toggleInactive"' + (T._showInactive ? " checked" : "") + "> Incluir inativos</label></div>" : "") +
      '<div class="row between wrap" style="margin:14px 0"><div><div class="page-title">Alunos</div><div class="muted">' + (f.k ? K.filter(function (k) { return k[0] === f.k; })[0][1] : "Todos seus alunos") + " · " + list.length + '</div></div><div class="row wrap"><input style="width:220px" placeholder="🔍 Buscar por nome ou e-mail" value="' + esc(T._q || "") + '" data-input="searchSt"><button class="btn" data-act="exportCsv">⬇ Exportar CSV</button><button class="btn primary" data-act="newStudent">+ Novo aluno</button></div></div>';
    if (kan) {
      var cols = (P.db.tags || []).map(function (t) { return { t: t, items: list.filter(function (s) { return (s.tags || []).indexOf(t.id) >= 0; }) }; });
      cols.push({ t: { id: "", name: "Sem etiqueta", color: "#64748b" }, items: list.filter(function (s) { return !(s.tags || []).length; }) });
      html += '<div class="kan">' + cols.map(function (c) {
        return '<div class="kan-col"><h4><i class="dot" style="background:' + c.t.color + '"></i>' + esc(c.t.name) + ' <span class="pill" style="margin-left:auto">' + c.items.length + "</span></h4>" + c.items.map(function (s) {
          var pl = T.plans(s);
          return '<button class="kan-card" data-act="openStudent" data-id="' + s.id + '"><b>' + esc(s.name) + '</b><div class="small muted">' + (pl.treino && pl.dieta ? "treino + dieta" : pl.treino ? "treino" : "dieta") + " · " + (s.planEnd ? P.fmtDate(s.planEnd).slice(0, 5) + "/" + s.planEnd.slice(2, 4) : "sem vigência") + "</div>" + T.tagsHtml(s) + '<div class="small" style="margin-top:6px"><span class="muted">Mover para:</span> ' + '<select style="width:auto;padding:3px 6px;font-size:12px" data-change="kanMove" data-id="' + s.id + '" data-from="' + c.t.id + '" onclick="event.stopPropagation()"><option value="">—</option>' + (P.db.tags || []).filter(function (t) { return t.id !== c.t.id; }).map(function (t) { return '<option value="' + t.id + '">' + esc(t.name) + "</option>"; }).join("") + "</select></div></button>";
        }).join("") + (c.items.length ? "" : '<div class="small muted" style="padding:8px">Ninguém aqui.</div>') + "</div>";
      }).join("") + "</div>";
    } else {
      html += '<div class="card" style="padding:4px 8px;overflow-x:auto"><table class="t"><tr><th>Nome</th><th class="hide-m">E-mail</th><th>WhatsApp</th><th class="hide-m">Etiquetas</th><th>Plano até</th><th class="hide-m">Próx. atualização</th><th>Status</th></tr>' + list.map(function (s) {
        var d = s.planEnd ? du(s.planEnd) : null, nu = T.nextUpd(s);
        return '<tr class="click" data-act="openStudent" data-id="' + s.id + '"><td><b>' + esc(s.name) + '</b></td><td class="hide-m muted">' + esc(s.email) + "</td><td>" + (s.phone ? '<a href="' + esc(P.waLink(s.phone, "")) + '" target="_blank" onclick="event.stopPropagation()" title="Abrir WhatsApp">💬</a>' : "—") + '</td><td class="hide-m">' + T.tagsHtml(s) + "</td><td>" + (s.planEnd ? P.fmtDate(s.planEnd) : '<span class="muted">sem vigência</span>') + (d != null && d <= 7 ? ' <span class="pill" style="color:var(--warm)">' + (d < 0 ? "vencido" : d + "d") + "</span>" : "") + '</td><td class="hide-m">' + (nu ? (nu < today() ? '<span style="color:var(--warm)">' + P.fmtDate(nu) + "</span>" : P.fmtDate(nu)) : "—") + "</td><td>" + (s.active ? '<span class="pill accent">Ativo</span>' : '<span class="pill">Inativo</span>') + "</td></tr>";
      }).join("") + "</table>" + (list.length ? "" : '<div class="empty">Nenhum aluno encontrado.</div>') + "</div>";
    }
    return html;
  };
  T.actions.afKpi = function (el) { T._af.k = T._af.k === el.dataset.k ? "" : el.dataset.k; T.render(); };
  T.actions.afToggle = function () { T._afOpen = !T._afOpen; T.render(); };
  T.actions.afSet = function (el) { T._af[el.dataset.k] = el.value; T.render(); };
  T.actions.afTag = function (el) { var a = T._af.tags, i = a.indexOf(el.dataset.id); if (i >= 0) a.splice(i, 1); else a.push(el.dataset.id); T.render(); };
  T.actions.view = function (el) { T._view = el.dataset.v; T.render(); };
  T.actions.kanMove = function (el) {
    var s = P.student(el.dataset.id), to = el.value; if (!to) return;
    s.tags = (s.tags || []).filter(function (t) { return t !== el.dataset.from; }); if (s.tags.indexOf(to) < 0) s.tags.push(to);
    T.touch(s); P.save(); T.toast("Etiqueta alterada."); T.render();
  };
  T.actions.exportCsv = function () {
    var rows = [["Nome", "E-mail", "Telefone", "Nascimento", "Plano até", "Próxima atualização", "Etiquetas", "Status"]].concat(filtered().map(function (s) {
      return [s.name, s.email, s.phone || "", P.fmtDate(s.birth), s.planEnd ? P.fmtDate(s.planEnd) : "", P.fmtDate(T.nextUpd(s)), (s.tags || []).map(function (id) { var t = T.tag(id); return t ? t.name : ""; }).join(" | "), s.active ? "Ativo" : "Inativo"];
    }));
    var csv = "﻿" + rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"'; }).join(";"); }).join("\n");
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = "alunos-" + today() + ".csv"; a.click();
  };
  T.actions.manageTags = function () {
    T.sheet("Etiquetas", '<div class="stack"><div class="small muted">As etiquetas viram as colunas do Kanban.</div>' + (P.db.tags || []).map(function (t, i) {
      return '<div class="row"><input type="color" style="width:52px;padding:2px" value="' + t.color + '" data-change="tagField" data-i="' + i + '" data-k="color"><input class="grow" value="' + esc(t.name) + '" data-change="tagField" data-i="' + i + '" data-k="name"><button class="icon-btn" data-act="tagMove" data-i="' + i + '" data-d="-1">↑</button><button class="icon-btn" style="color:var(--danger)" data-act="tagDel" data-i="' + i + '">×</button></div>';
    }).join("") + '<button class="btn" data-act="tagAdd">+ Nova etiqueta</button><button class="btn primary" data-act="tagsDone">Pronto</button></div>');
  };
  T.actions.tagField = function (el) { P.db.tags[+el.dataset.i][el.dataset.k] = el.value; P.save(); };
  T.actions.tagAdd = function () { P.db.tags.push({ id: P.uid("tag"), name: "Nova etiqueta", color: "#2dd4bf" }); P.save(); T.actions.manageTags(); };
  T.actions.tagMove = function (el) { var a = P.db.tags, i = +el.dataset.i; if (i > 0) { a.splice(i - 1, 0, a.splice(i, 1)[0]); P.save(); } T.actions.manageTags(); };
  T.actions.tagDel = function (el) {
    var t = P.db.tags[+el.dataset.i]; if (!confirm("Apagar a etiqueta " + t.name + "? Ela sai de todos os alunos.")) return;
    P.db.tags.splice(+el.dataset.i, 1); P.db.students.forEach(function (s) { s.tags = (s.tags || []).filter(function (x) { return x !== t.id; }); }); P.save(); T.actions.manageTags();
  };
  T.actions.tagsDone = function () { T.closeSheet(); T.render(); };

  /* ---------- Ficha do aluno ---------- */
  T.pages.aluno = function (p) {
    var s = P.student(p.id); if (!s) return '<div class="empty">Aluno não encontrado.</div>';
    if (!p.tab || p.tab === "checkins") p.tab = p.tab === "checkins" ? "atualizacoes" : "geral";
    var l = P.logsOf(s.id), pl = T.plans(s);
    var pend = l.checkins.filter(function (c) { return !c.feedback && c.kind !== "fotos"; }).length;
    var lastQ = l.checkins.filter(function (c) { return c.kind !== "fotos" && c.answers && Object.keys(c.answers).length; }).map(function (c) { return c.date; }).sort().pop();
    var lastF = l.checkins.filter(function (c) { return c.photos && c.photos.filter(Boolean).length; }).map(function (c) { return c.date; }).sort().pop();
    var tabs = [["geral", "Visão geral"], ["atualizacoes", "Atualizações"], ["fotos", "Fotos"], ["treinos", "Treinos"], ["dietaAd", "Dieta"], ["progresso", "Progresso"], ["questionarios", "Questionários"], ["anexos", "Anexos"], ["treino", "✏️ Ficha de treino"], ["dieta", "✏️ Ficha de dieta"]];
    var body = (T.tabs[p.tab] || T.tabs.geral)(s, p);
    return '<button class="back" style="color:var(--accent);font-weight:600" data-act="nav" data-v="alunos">‹ Alunos</button>' +
      '<div class="row between wrap" style="margin-top:8px"><div class="row" style="gap:12px">' + (l.avatar ? '<img src="' + l.avatar + '" style="width:52px;height:52px;border-radius:50%;object-fit:cover">' : '<div class="logo" style="width:52px;height:52px;border-radius:50%;font-size:20px;display:grid;place-items:center;background:var(--card2)">' + esc((s.name || "?")[0]) + "</div>") + '<div><div class="page-title">' + esc(s.name) + '</div><div class="small muted">Última modificação em ' + stamp(s.updatedAt) + '</div><div class="small muted">Último acesso ao app em ' + (l.lastSeen ? stamp(l.lastSeen) : "—") + "</div></div></div>" +
      '<div class="row wrap">' + T.waBtn(s) + (s.active ? '<span class="pill accent">Ativo</span>' : '<span class="pill">Inativo</span>') + "</div></div>" +
      '<div class="card" style="margin-top:12px"><div class="row between"><b>👤 Informações do aluno</b><button class="btn sm" data-act="editStudent">✏️ Editar</button></div><div class="grid2" style="margin-top:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">' +
      '<div class="small"><div class="muted">Nome</div><b>' + esc(s.name) + '</b><div class="muted" style="margin-top:6px">E-mail</div>' + esc(s.email) + '<div class="muted" style="margin-top:6px">Telefone</div>' + esc(s.phone || "—") + '<div class="muted" style="margin-top:6px">Data de nascimento</div>' + P.fmtDate(s.birth) + "</div>" +
      '<div class="small stack" style="gap:8px"><div><div class="muted">Planos ativos</div><label class="row"><button class="toggle' + (pl.treino ? " on" : "") + '" data-act="planTog" data-k="treino"></button> Treino</label><label class="row" style="margin-top:4px"><button class="toggle' + (pl.dieta ? " on" : "") + '" data-act="planTog" data-k="dieta"></button> Dieta</label></div><div><div class="muted">Etiquetas</div>' + (T.tagsHtml(s) || '<span class="muted">nenhuma</span>') + ' <button class="btn sm" data-act="stTags">Etiquetas</button></div></div>' +
      '<div class="small stack" style="gap:8px"><div class="field"><label>Vigência do plano</label><input type="date" value="' + esc(s.planEnd || "") + '" data-change="stField" data-k="planEnd"></div><div><span class="muted">Última atualização de questionário:</span> ' + P.fmtDate(lastQ) + '</div><div><span class="muted">Última atualização de fotos:</span> ' + P.fmtDate(lastF) + (lastF && -du(lastF) <= 7 ? ' <span class="pill accent">NOVO</span>' : "") + '</div><div class="field"><label>Última atualização pelo profissional</label><input type="date" value="' + esc(s.lastProfUpdate || "") + '" data-change="stField" data-k="lastProfUpdate"></div></div></div></div>' +
      '<div class="subtabs">' + tabs.map(function (t) { return '<button class="' + (p.tab === t[0] ? "on" : "") + '" data-act="stTab" data-t="' + t[0] + '">' + t[1] + (t[0] === "atualizacoes" && pend ? ' <span class="pill accent">' + pend + "</span>" : "") + "</button>"; }).join("") + "</div>" + body;
  };
  T.actions.planTog = function (el) { var s = P.student(T.p.id), pl = s.plans = T.plans(s); pl[el.dataset.k] = !pl[el.dataset.k]; T.touch(s); P.save(); T.toast(pl[el.dataset.k] ? "Plano de " + el.dataset.k + " ligado: aparece no app." : "Plano de " + el.dataset.k + " desligado: some do app do aluno."); T.render(); };
  T.actions.stTags = function () {
    var s = P.student(T.p.id);
    T.sheet("Etiquetas de " + s.name, '<div class="stack">' + (P.db.tags || []).map(function (t) { var on = (s.tags || []).indexOf(t.id) >= 0; return '<label class="row"><input type="checkbox" style="width:auto" data-change="stTagSet" data-id="' + t.id + '"' + (on ? " checked" : "") + '><span class="tagp" style="background:' + t.color + '">' + esc(t.name) + "</span></label>"; }).join("") + '<div class="row"><button class="btn grow" data-act="manageTags">Gerenciar etiquetas</button><button class="btn primary grow" data-act="tagsDone">Pronto</button></div></div>');
  };
  T.actions.stTagSet = function (el) { var s = P.student(T.p.id); s.tags = s.tags || []; var i = s.tags.indexOf(el.dataset.id); if (el.checked && i < 0) s.tags.push(el.dataset.id); if (!el.checked && i >= 0) s.tags.splice(i, 1); T.touch(s); P.save(); };
  var baseStField = T.actions.stField;
  T.actions.stField = function (el) { var s = P.student(T.p.id); T.touch(s); baseStField(el); };
  T.actions.editStudent = function () {
    var s = P.student(T.p.id);
    function f(id, label, val, type) { return '<div class="field"><label>' + label + '</label><input id="' + id + '" type="' + (type || "text") + '" value="' + esc(val == null ? "" : val) + '"></div>'; }
    function sel(id, label, opts, val) { return '<div class="field"><label>' + label + '</label><select id="' + id + '">' + opts.map(function (o) { return "<option" + (o === val ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select></div>"; }
    T.sheet("Editar aluno", '<div class="stack"><div class="grid2">' + f("esName", "Nome", s.name) + f("esPhone", "Telefone", s.phone) + f("esBirth", "Nascimento", s.birth, "date") + sel("esSex", "Sexo", ["Masculino", "Feminino"], s.sex) + f("esH", "Altura (cm)", s.height, "number") + f("esW", "Peso (kg)", s.weight, "number") + sel("esAct", "Nível de atividade", ACT.map(function (a) { return a[0]; }), s.activity) + sel("esCond", "Condicionamento físico", COND, s.condition || "Próximo do Peso Ideal") + f("esKcal", "Meta de calorias (kcal/dia, opcional)", s.kcalGoal, "number") + f("esProt", "Meta de proteínas (g/dia, opcional)", s.protGoal, "number") + "</div>" +
      '<div class="field"><label>Status</label><select id="esActive"><option value="1"' + (s.active ? " selected" : "") + '>Ativo</option><option value="0"' + (!s.active ? " selected" : "") + '>Inativo (não entra no app)</option></select></div><div class="row"><button class="btn grow" data-act="sendReset">✉️ E-mail para nova senha</button><button class="btn primary grow" data-act="saveStudentEdit">Salvar</button></div></div>', true);
  };
  T.actions.saveStudentEdit = function () {
    var s = P.student(T.p.id); function v(id) { return document.getElementById(id).value; }
    s.name = v("esName").trim() || s.name; s.phone = v("esPhone"); s.birth = v("esBirth"); s.sex = v("esSex"); s.height = parseFloat(v("esH")) || s.height; s.weight = parseFloat(v("esW")) || s.weight;
    s.activity = v("esAct"); s.condition = v("esCond"); s.kcalGoal = parseFloat(v("esKcal")) || null; s.protGoal = parseFloat(v("esProt")) || null; s.active = v("esActive") === "1";
    T.touch(s); P.save(); T.closeSheet(); T.toast("Dados salvos."); T.render();
  };

  /* Visão geral */
  T.tabs.geral = function (s) {
    var nx = P.nextPending(s.id), wp = P.db.workoutPlans[s.id], dp = P.db.dietPlans[s.id], h = P.db.histories[s.id] || { workout: [], diet: [] };
    var nAns = P.scheduleOf(s.id).filter(function (it) { var x = P.schedStatus(s.id, it); return x === "pendente" || x === "parcial"; }).length;
    function fichaCard(kind, plan) {
      var isT = kind === "treino", arch = (isT ? h.workout : h.diet) || [];
      return '<div class="stack" style="gap:6px"><div class="row between wrap"><b>' + (isT ? "Treino" : "Dieta") + '</b><div class="row"><button class="btn sm" data-act="pdf" data-k="' + kind + '"' + (plan ? "" : " disabled") + '>PDF</button><button class="btn sm primary" data-act="newPlan" data-k="' + kind + '">+ ' + (isT ? "Novo treino" : "Nova dieta") + "</button></div></div>" +
        (plan ? '<button class="card tight" style="text-align:left" data-act="stTab" data-t="' + kind + '"><b>' + esc(plan.name) + '</b> <span class="pill accent">No app</span><div class="small muted">Criada em ' + P.fmtDate(plan.createdAt || plan.updatedAt) + " · Atualizada em " + P.fmtDate(plan.updatedAt) + (isT && plan.validUntil ? " · válida até " + P.fmtDate(plan.validUntil) : "") + "</div>" + (!isT ? '<div class="small muted">' + plan.variations.map(function (v) { return esc(v.name) + ": " + v.days.map(function (d) { return P.DOW[d]; }).join(", "); }).join(" · ") + "</div>" : "") + "</button>" : '<div class="small muted">Nenhuma ficha ativa.</div>') +
        '<button class="small" style="color:var(--accent);text-align:left" data-act="inactivePlans" data-k="' + kind + '">🕘 Ver fichas inativas (' + arch.length + ")</button></div>";
    }
    var cond = s.condition || "Próximo do Peso Ideal", imc = s.weight / Math.pow(s.height / 100, 2);
    return '<div class="grid2"><div class="card stack"><div class="row between"><b>📝 Próximo feedback agendado</b><button class="small" style="color:var(--accent)" data-act="stTab" data-t="atualizacoes">Ver feedbacks →</button></div>' +
      (nx ? '<div class="row between"><b>📅 ' + P.fmtDate(nx.date) + ' <span class="small muted">' + (du(nx.date) === 0 ? "hoje" : du(nx.date) > 0 ? "em " + du(nx.date) + " dias" : "há " + -du(nx.date) + " dias") + '</span></b><span class="pill" style="color:var(--prep)">' + nAns + " pendente(s)</span></div><div class=\"small\">Vai pedir: " + (nx.photos ? '<span class="pill">📷 Foto</span> ' : "") + '<span class="pill">📋 ' + (nx.forms || []).length + " questionário(s)</span></div>" : '<div class="small muted">Nenhuma atualização programada. Próximo check-in semanal: ' + P.fmtDate(s.nextCheckin) + '.</div><button class="btn sm" style="align-self:flex-start" data-act="stTab" data-t="atualizacoes">+ Programar atualização</button>') + "</div>" +
      '<div class="card stack"><b>📋 Fichas</b>' + fichaCard("treino", wp) + '<hr style="border:0;border-top:1px solid var(--line);width:100%">' + fichaCard("dieta", dp) + "</div></div>" +
      '<div class="grid2" style="margin-top:14px"><div class="card stack"><b>🔒 Observações pessoais</b><span class="small muted">Só você vê.</span><textarea rows="6" data-change="stField" data-k="privateNotes">' + esc(s.privateNotes || "") + "</textarea></div>" +
      '<div class="card stack"><div class="row between"><b>🍎 Informações nutricionais</b><button class="btn sm" data-act="editStudent">✏️ Editar</button></div><div class="kpis"><div class="card tight kpi"><span class="small muted">gasto calórico estimado</span><b style="font-size:20px">' + Math.round(T.gasto(s)) + ' kcal</b></div><div class="card tight kpi"><span class="small muted">taxa metabólica basal</span><b style="font-size:20px">' + Math.round(T.tmb(s)) + ' kcal</b></div><div class="card tight kpi"><span class="small muted">meta de proteínas</span><b style="font-size:20px">' + T.protGoal(s) + ' g</b></div><div class="card tight kpi"><span class="small muted">IMC</span><b style="font-size:20px">' + P.round1(imc) + " kg/m²</b></div></div>" +
      '<div class="small muted">' + s.height + " cm · " + s.weight + " kg · " + T.age(s) + " anos · " + esc(s.sex || "") + " · Condicionamento: " + esc(cond) + " · Atividade: " + esc(s.activity || "") + "</div></div></div>";
  };
  T.actions.inactivePlans = function (el) {
    var k = el.dataset.k, arr = (P.db.histories[T.p.id] || {})[k === "treino" ? "workout" : "diet"] || [];
    T.sheet("Fichas inativas · " + (k === "treino" ? "treino" : "dieta"), arr.length ? '<div class="list">' + arr.slice().reverse().map(function (x, i) {
      var idx = arr.length - 1 - i;
      return '<div class="list-item"><span class="grow"><b>' + esc(x.plan.name) + '</b><div class="small muted">Ativa até ' + P.fmtDate(x.archivedAt) + "</div></span><button class=\"btn sm\" data-act=\"pdfOld\" data-k=\"" + k + '" data-i="' + idx + '">PDF</button><button class="btn sm" data-act="restorePlan" data-k="' + k + '" data-i="' + idx + '">Reativar</button></div>';
    }).join("") + "</div>" : '<div class="empty">Nenhuma ficha inativa.</div>');
  };
  T.actions.restorePlan = function (el) {
    if (!confirm("Reativar esta ficha? A ficha atual vai para as inativas.")) return;
    var s = P.student(T.p.id), k = el.dataset.k, key = k === "treino" ? "workout" : "diet", store = k === "treino" ? P.db.workoutPlans : P.db.dietPlans, h = P.db.histories[s.id];
    var x = h[key].splice(+el.dataset.i, 1)[0];
    if (store[s.id]) h[key].push({ archivedAt: today(), plan: store[s.id] });
    x.plan.updatedAt = today(); store[s.id] = x.plan; T.touch(s); P.save(); T.closeSheet(); T.toast("Ficha reativada."); T.render();
  };
  /* Nova ficha: a atual vai para "fichas inativas" e abre o editor (em branco ou copiando a atual) */
  T.actions.newPlan = function (el) {
    var k = el.dataset.k, s = P.student(T.p.id), cur = (k === "treino" ? P.db.workoutPlans : P.db.dietPlans)[s.id];
    if (!cur) { T.p.tab = k; T.render(); return; }
    T.sheet(k === "treino" ? "Novo treino" : "Nova dieta", '<div class="stack"><div class="small muted">A ficha atual vai para "fichas inativas" (dá para reativar depois).</div><button class="btn primary block" data-act="doNewPlan" data-k="' + k + '" data-copy="1">Começar copiando a ficha atual</button><button class="btn block" data-act="doNewPlan" data-k="' + k + '" data-copy="0">Começar do zero</button></div>');
  };
  T.actions.doNewPlan = function (el) {
    var k = el.dataset.k, s = P.student(T.p.id), key = k === "treino" ? "workout" : "diet", store = k === "treino" ? P.db.workoutPlans : P.db.dietPlans;
    var h = P.db.histories[s.id] = P.db.histories[s.id] || { workout: [], diet: [] }; h[key] = h[key] || [];
    var cur = store[s.id], copy = el.dataset.copy === "1" ? JSON.parse(JSON.stringify(cur)) : null;
    h[key].push({ archivedAt: today(), plan: cur }); while (h[key].length > 6) h[key].shift();
    if (copy) { copy.name = copy.name + " (nova)"; copy.createdAt = today(); copy.updatedAt = today(); copy.changes = []; store[s.id] = copy; }
    else delete store[s.id];
    T.touch(s); P.save(); T.closeSheet(); T._draftW = null; T._draftD = null; T.p.tab = k; T.render();
    if (!copy) T.actions[k === "treino" ? "newPlanW" : "newPlanD"]();
  };

  /* ---------- Atualizações: respostas, programadas e histórico ---------- */
  var baseCheckins = T.tabs.checkins;
  T.tabs.atualizacoes = function (s, p) {
    var sub = p.sub || "respostas";
    var head = '<div class="tabs" style="max-width:520px"><button class="' + (sub === "respostas" ? "on" : "") + '" data-act="updSub" data-s="respostas">Respostas</button><button class="' + (sub === "prog" ? "on" : "") + '" data-act="updSub" data-s="prog">Programados</button><button class="' + (sub === "hist" ? "on" : "") + '" data-act="updSub" data-s="hist">Histórico</button></div><div style="margin-top:14px">';
    if (sub === "respostas") return head + baseCheckins(s) + "</div>";
    var list = P.scheduleOf(s.id).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    if (sub === "hist") return head + '<div class="card" style="padding:4px 8px;overflow-x:auto"><table class="t"><tr><th>Data agendada</th><th>Status</th><th>Fotos</th><th>Questionários</th><th>Respondida em</th><th class="hide-m">Criado em</th></tr>' + list.map(function (it) {
      var st = P.schedStatus(s.id, it), ans = P.logsOf(s.id).checkins.filter(function (c) { return c.scheduleId === it.id; });
      var gotF = (it.forms || []).filter(function (f) { return ans.some(function (c) { return (c.kind || "semanal") === f; }); }).length;
      var col = { respondida: "var(--valid)", pendente: "var(--prep)", parcial: "var(--blue)", cancelada: "var(--muted)" }[st];
      return "<tr><td>" + P.fmtDate(it.date) + '</td><td><i class="dot" style="background:' + col + '"></i> ' + st[0].toUpperCase() + st.slice(1) + "</td><td>" + (it.photos ? (ans.some(function (c) { return c.photos && c.photos.filter(Boolean).length; }) ? "✅" : "🕘") : "—") + "</td><td>" + gotF + "/" + (it.forms || []).length + "</td><td>" + P.fmtDate(P.answeredAt(s.id, it)) + '</td><td class="hide-m">' + T.stamp(it.createdAt) + "</td></tr>";
    }).join("") + "</table>" + (list.length ? "" : '<div class="empty">Nenhuma atualização programada ainda.</div>') + "</div></div>";
    var avail = s.forms || ["semanal", "mensal"];
    var pending = list.filter(function (it) { var x = P.schedStatus(s.id, it); return x === "pendente" || x === "parcial"; }).reverse();
    return head + '<div class="card stack"><b>Questionários disponíveis para o aluno</b><span class="small muted">O aluno pode responder estes a qualquer momento pela aba Evolução.</span><div class="row wrap">' + P.forms().map(function (f) { var on = avail.indexOf(f.id) >= 0; return '<button class="chip' + (on ? " on" : "") + '" data-act="availForm" data-id="' + f.id + '">' + esc(f.name) + "</button>"; }).join("") + "</div></div>" +
      '<div class="row between wrap" style="margin:16px 0 8px"><b>Atualizações programadas</b><button class="btn primary" data-act="newUpd">+ Nova atualização</button></div>' +
      (pending.length ? pending.map(function (it) {
        return '<div class="card stack" style="margin-bottom:10px"><div class="row wrap"><div class="field"><label>Data</label><input type="date" value="' + it.date + '" data-change="updField" data-id="' + it.id + '" data-k="date"></div><div class="field"><label>Solicitar fotos?</label><select data-change="updField" data-id="' + it.id + '" data-k="photos"><option value="1"' + (it.photos ? " selected" : "") + '>Sim</option><option value="0"' + (!it.photos ? " selected" : "") + '>Não</option></select></div><div class="field"><label>Repetir</label><select data-change="updField" data-id="' + it.id + '" data-k="repeatDays">' + [[0, "Não repetir"], [7, "Toda semana"], [14, "A cada 15 dias"], [30, "Todo mês"]].map(function (o) { return '<option value="' + o[0] + '"' + ((it.repeatDays || 0) === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + '</select></div><span class="pill" style="color:var(--prep);align-self:flex-end">' + P.schedStatus(s.id, it) + '</span></div><div class="small muted">Questionários que o aluno terá que responder</div><div class="row wrap">' +
          P.forms().map(function (f) { var on = (it.forms || []).indexOf(f.id) >= 0; return '<button class="chip' + (on ? " on" : "") + '" data-act="updForm" data-id="' + it.id + '" data-f="' + f.id + '">' + esc(f.name) + "</button>"; }).join("") + '</div><div class="row"><button class="btn sm danger" data-act="updCancel" data-id="' + it.id + '">Cancelar esta atualização</button>' + T.waBtn(s) + "</div></div>";
      }).join("") : '<div class="empty">Nenhuma atualização pendente. Crie uma acima (dá para repetir toda semana automaticamente).</div>') + "</div>";
  };
  T.actions.updSub = function (el) { T.p.sub = el.dataset.s; T.render(); };
  T.actions.availForm = function (el) { var s = P.student(T.p.id), a = s.forms = (s.forms || ["semanal", "mensal"]).slice(), i = a.indexOf(el.dataset.id); if (i >= 0) a.splice(i, 1); else a.push(el.dataset.id); s.forms = a; T.touch(s); P.save(); T.render(); };
  T.actions.newUpd = function () {
    var s = P.student(T.p.id), nx = P.addDays(today(), P.db.settings.scheduleEveryDays || 7);
    P.scheduleOf(s.id).push({ id: P.uid("upd"), date: nx, photos: false, forms: ["semanal"], status: "pendente", repeatDays: P.db.settings.scheduleEveryDays || 7, createdAt: new Date().toISOString() });
    T.touch(s); P.save(); T.toast("Atualização criada para " + P.fmtDate(nx) + ". Ajuste a data e os questionários."); T.render();
  };
  function updItem(id) { return P.scheduleOf(T.p.id).filter(function (x) { return x.id === id; })[0]; }
  T.actions.updField = function (el) { var it = updItem(el.dataset.id), k = el.dataset.k; it[k] = k === "photos" ? el.value === "1" : k === "repeatDays" ? +el.value : el.value; P.save(); T.toast("Salvo"); };
  T.actions.updForm = function (el) { var it = updItem(el.dataset.id), a = it.forms = it.forms || [], i = a.indexOf(el.dataset.f); if (i >= 0) a.splice(i, 1); else a.push(el.dataset.f); P.save(); T.render(); };
  T.actions.updCancel = function (el) { if (!confirm("Cancelar esta atualização?")) return; var it = updItem(el.dataset.id); it.status = "cancelada"; P.save(); T.render(); };

  /* ---------- Fotos: galeria por atualização + comparação ---------- */
  T.tabs.fotos = function (s) {
    var l = P.logsOf(s.id), ups = l.checkins.filter(function (c) { return c.photos && c.photos.filter(Boolean).length; }).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var cmps = l.comparisons || [];
    return '<div class="row between wrap"><b style="font-size:17px">Atualização de fotos</b><div class="row"><label class="btn primary">+ Adicionar fotos<input type="file" accept="image/*" multiple hidden data-change="addPhotos"></label><button class="btn" data-act="cmpNew">⇆ Comparar fotos</button></div></div>' +
      (ups.length ? '<div class="gallery" style="margin-top:12px">' + ups.map(function (c, i) {
        var ph = c.photos.filter(Boolean);
        return '<div class="card tight stack" style="gap:6px"><div class="row between"><b>Atualização ' + (ups.length - i) + '</b><span class="small muted">' + ph.length + ' foto(s)</span></div><div class="small muted">' + P.fmtDate(c.date) + (c.byTrainer ? " · enviada por você" : "") + '</div><div class="row wrap" style="gap:6px">' + ph.map(function (r) { return '<button class="ph" style="width:64px;background-image:url(' + P.photo(r) + ')" data-act="viewPhoto" data-ref="' + esc(r) + '"></button>'; }).join("") + "</div></div>";
      }).join("") + "</div>" : '<div class="empty">Nenhuma foto enviada ainda.</div>') +
      '<div class="row between wrap" style="margin-top:20px"><b style="font-size:17px">Comparação de fotos</b><button class="btn" data-act="cmpNew">+ Adicionar comparação</button></div>' +
      (cmps.length ? cmps.slice().reverse().map(function (c, i) { return '<div class="card stack" style="margin-top:10px"><div class="row between"><b>' + esc(c.title || "Comparação") + '</b><button class="btn sm danger" data-act="cmpDel" data-i="' + (cmps.length - 1 - i) + '">Apagar</button></div><div class="cmp">' + [c.a, c.b].map(function (x) { return '<div><img src="' + P.photo(x.ref) + '"><div class="small muted" style="text-align:center">' + P.fmtDate(x.date) + "</div></div>"; }).join("") + "</div></div>"; }).join("") : '<div class="empty">Nenhuma comparação de fotos disponível.</div>');
  };
  T.actions.addPhotos = function (el) {
    var files = [].slice.call(el.files || []); if (!files.length) return;
    var out = [], n = 0, rd = window.A && A.readImage ? A.readImage : T.readImage;
    files.forEach(function (f, i) { T.readImage(f, function (url) { out[i] = url; if (++n === files.length) { P.logsOf(T.p.id).checkins.push({ id: P.uid("ck"), kind: "fotos", date: today(), answers: {}, photos: out, feedback: { text: "", date: today() }, byTrainer: true }); P.save(); T.toast("Fotos adicionadas."); T.render(); } }); });
  };
  T.readImage = function (file, cb) {
    var r = new FileReader(); r.onload = function () { var img = new Image(); img.onload = function () { var s = Math.min(1, 640 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = img.width * s; c.height = img.height * s; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); var q = 0.7, u = c.toDataURL("image/jpeg", q); while (u.length > 200000 && q > 0.3) { q -= 0.1; u = c.toDataURL("image/jpeg", q); } cb(u); }; img.src = r.result; }; r.readAsDataURL(file);
  };
  function allPhotos(id) { var o = []; P.logsOf(id).checkins.forEach(function (c) { (c.photos || []).filter(Boolean).forEach(function (r) { o.push({ ref: r, date: c.date }); }); }); return o.sort(function (a, b) { return a.date < b.date ? -1 : 1; }); }
  T.actions.cmpNew = function () {
    var ph = allPhotos(T.p.id); T._cmp = [];
    if (ph.length < 2) { T.toast("É preciso ter pelo menos 2 fotos."); return; }
    T.sheet("Comparar fotos", '<div class="small muted" style="margin-bottom:8px">Toque em 2 fotos (antes e depois).</div><div class="gallery" style="grid-template-columns:repeat(auto-fill,minmax(80px,1fr))">' + ph.map(function (x, i) { return '<button class="ph" style="width:100%;background-image:url(' + P.photo(x.ref) + ')" data-act="cmpPick" data-i="' + i + '" title="' + P.fmtDate(x.date) + '"><span class="small" style="background:#0009;border-radius:6px;padding:1px 4px">' + P.fmtDate(x.date).slice(0, 5) + "</span></button>"; }).join("") + '</div><div id="cmpOut" style="margin-top:12px"></div>', true);
  };
  T.actions.cmpPick = function (el) {
    var ph = allPhotos(T.p.id), x = ph[+el.dataset.i]; T._cmp.push(x); el.style.outline = "3px solid var(--accent)";
    if (T._cmp.length === 2) {
      var a = T._cmp[0], b = T._cmp[1]; if (a.date > b.date) { var t = a; a = b; b = t; } T._cmp = [a, b];
      document.getElementById("cmpOut").innerHTML = '<div class="cmp">' + [a, b].map(function (x) { return '<div><img src="' + P.photo(x.ref) + '"><div class="small muted" style="text-align:center">' + P.fmtDate(x.date) + "</div></div>"; }).join("") + '</div><div class="row" style="margin-top:10px"><input id="cmpTitle" class="grow" placeholder="Título (opcional)"><button class="btn primary" data-act="cmpSave">Salvar comparação</button><button class="btn" data-act="cmpNew">Recomeçar</button></div>';
    }
  };
  T.actions.cmpSave = function () { var l = P.logsOf(T.p.id); l.comparisons = l.comparisons || []; l.comparisons.push({ title: document.getElementById("cmpTitle").value, a: T._cmp[0], b: T._cmp[1], date: today() }); P.save(); T.closeSheet(); T.render(); };
  T.actions.cmpDel = function (el) { P.logsOf(T.p.id).comparisons.splice(+el.dataset.i, 1); P.save(); T.render(); };

  /* ---------- Treinos realizados: calendário, cardio, observações, evolução ---------- */
  T.tabs.treinos = function (s) {
    var l = P.logsOf(s.id), now = new Date(), ym = T._trYM || [now.getFullYear(), now.getMonth()], y = ym[0], m = ym[1], pre = y + "-" + String(m + 1).padStart(2, "0");
    var trained = {}; l.sessions.forEach(function (x) { if (x.date.slice(0, 7) === pre) trained[x.date] = (trained[x.date] || []).concat(x.workoutName); });
    var first = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate(), cells = P.DOW.map(function (d) { return '<div class="h">' + d + "</div>"; }).join("");
    for (var i = 0; i < first; i++) cells += '<div class="d out" style="min-height:44px"></div>';
    for (var d = 1; d <= dim; d++) { var iso = pre + "-" + String(d).padStart(2, "0"); cells += '<div class="d" style="min-height:44px;cursor:default"><b>' + d + "</b>" + (trained[iso] || []).map(function (n) { return '<span class="ev" style="background:#f97316">' + esc(n) + "</span>"; }).join("") + "</div>"; }
    var cm = l.cardio.filter(function (c) { return c.date.slice(0, 7) === pre; }), tot = cm.reduce(function (a, c) { return a + (c.min || 0); }, 0), km = cm.reduce(function (a, c) { return a + (c.km || 0); }, 0), days = {}; cm.forEach(function (c) { days[c.date] = 1; });
    var since = P.addDays(today(), -30), notes = [];
    l.sessions.filter(function (x) { return x.date >= since; }).forEach(function (x) {
      if (x.note) notes.push({ date: x.date, w: x.workoutName, t: x.note, e: x.effort });
      Object.keys(x.exNotes || {}).forEach(function (itId) { if (x.exNotes[itId]) { var st = x.sets.filter(function (z) { return z.itemId === itId; })[0]; notes.push({ date: x.date, w: x.workoutName + (st ? " · " + P.exercise(st.exId).name : ""), t: x.exNotes[itId], e: (x.pse || {})[itId] }); } });
    });
    function stat(lbl, v) { return '<div class="card tight kpi"><span class="small muted">' + lbl + '</span><b style="font-size:20px">' + v + "</b></div>"; }
    return '<div class="grid2"><div class="card"><div class="row between"><button class="btn sm" data-act="trNav" data-d="-1">‹</button><b>Calendário de treinos · ' + MESES[m] + " de " + y + '</b><button class="btn sm" data-act="trNav" data-d="1">›</button></div><div class="calm" style="margin-top:10px">' + cells + "</div></div>" +
      '<div class="card stack"><b>🏃 Cardio · ' + MESES[m] + '</b><div class="kpis" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">' + stat("Total de sessões", cm.length) + stat("Tempo total", tot + "min") + stat("Tempo médio", (cm.length ? Math.round(tot / cm.length) : 0) + "min") + stat("Distância total", km ? P.round1(km) + " km" : "—") + stat("Pace médio", km ? P.fmtSec(tot * 60 / km) + "/km" : "—") + stat("Dias ativos", Object.keys(days).length) + "</div>" +
      (cm.length ? '<table class="t"><tr><th>Data</th><th>Atividade</th><th>Tempo</th><th>Km</th></tr>' + cm.slice().reverse().map(function (c) { return "<tr><td>" + P.fmtDate(c.date) + "</td><td>" + esc(c.type) + "</td><td>" + c.min + " min</td><td>" + (c.km || "—") + "</td></tr>"; }).join("") + "</table>" : '<div class="empty">Nenhum registro de cardio neste mês.</div>') + "</div></div>" +
      '<div class="card stack" style="margin-top:14px"><b>💬 Observações do aluno</b><span class="small muted">Comentários feitos nos treinos nos últimos 30 dias</span>' + (notes.length ? notes.reverse().map(function (n) { return '<div class="chg"><b class="small">' + P.fmtDate(n.date) + " · " + esc(n.w) + (n.e ? " · esforço " + n.e : "") + "</b><div>" + esc(n.t) + "</div></div>"; }).join("") : '<div class="empty">O aluno não fez nenhum comentário nos treinos nos últimos 30 dias.</div>') + "</div>" + T.evolutionCard(s);
  };
  T.actions.trNav = function (el) { var now = new Date(), ym = T._trYM || [now.getFullYear(), now.getMonth()], m = ym[1] + +el.dataset.d, y = ym[0]; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } T._trYM = [y, m]; T.render(); };
  /* Evolução de exercícios: por treino, por exercício ou por grupamento muscular */
  T.evolutionCard = function (s) {
    var mode = T._evMode || "treino", warm = !!T._evWarm, plan = P.db.workoutPlans[s.id], l = P.logsOf(s.id);
    function chartFor(exId) {
      var pts = [];
      l.sessions.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (x) { var st = x.sets.filter(function (z) { return z.exId === exId && (warm || z.type === "valid") && z.weight != null; }); if (st.length) pts.push({ y: Math.max.apply(null, st.map(function (z) { return z.weight; })), label: P.fmtDate(x.date).slice(0, 5) }); });
      return pts.length ? P.lineChart(pts, { h: 120 }) : '<div class="small muted">Não há registros de evolução para este exercício.</div>';
    }
    var html = '<div class="card stack" style="margin-top:14px"><div class="row between wrap"><b>📈 Evolução de exercícios</b><label class="row small"><input type="checkbox" style="width:auto" data-change="evWarm"' + (warm ? " checked" : "") + '> Mostrar aquecimento/preparatórias</label></div><div class="tabs" style="max-width:520px">' + [["treino", "Por treino"], ["exercicio", "Por exercício"], ["grupo", "Por grupamento muscular"]].map(function (x) { return '<button class="' + (mode === x[0] ? "on" : "") + '" data-act="evMode" data-m="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>";
    if (!plan) return html + '<div class="empty">Sem ficha de treino.</div></div>';
    if (mode === "treino") {
      var wid = T._evW || plan.workouts[0].id, w = plan.workouts.filter(function (x) { return x.id === wid; })[0] || plan.workouts[0];
      html += '<div class="field"><label>Treino</label><select data-change="evW">' + plan.workouts.map(function (x) { return '<option value="' + x.id + '"' + (x.id === w.id ? " selected" : "") + ">" + esc(x.name) + "</option>"; }).join("") + '</select></div><div class="grid2">' + w.items.map(function (it) { return '<div class="card tight"><b class="small">' + esc(P.exercise(it.exId).name) + "</b>" + chartFor(it.exId) + "</div>"; }).join("") + "</div>";
    } else if (mode === "exercicio") {
      var ids = []; l.sessions.forEach(function (x) { x.sets.forEach(function (z) { if (ids.indexOf(z.exId) < 0) ids.push(z.exId); }); });
      var sel = T._evEx || ids[0];
      html += ids.length ? '<div class="field"><label>Exercício</label><select data-change="evEx">' + ids.map(function (id) { return '<option value="' + id + '"' + (id === sel ? " selected" : "") + ">" + esc(P.exercise(id).name) + "</option>"; }).join("") + "</select></div>" + chartFor(sel) : '<div class="empty">Nenhum treino registrado.</div>';
    } else {
      // séries feitas por grupamento, por semana (últimas 8 semanas)
      var weeks = []; for (var i = 7; i >= 0; i--) weeks.push(P.addDays(today(), -7 * i - ((new Date().getDay() + 6) % 7)));
      var groups = {}, rows = {};
      l.sessions.forEach(function (x) { var wk = weeks.filter(function (w) { return x.date >= w; }).pop(); if (!wk || x.date < weeks[0]) return; x.sets.forEach(function (z) { if (!warm && z.type !== "valid") return; var g = P.exercise(z.exId).group || "Outro"; groups[g] = 1; rows[g] = rows[g] || {}; rows[g][wk] = (rows[g][wk] || 0) + 1; }); });
      var gs = Object.keys(groups).sort();
      html += gs.length ? '<div style="overflow-x:auto"><table class="t"><tr><th>Grupamento</th>' + weeks.map(function (w) { return "<th>" + P.fmtDate(w).slice(0, 5) + "</th>"; }).join("") + "</tr>" + gs.map(function (g) { return "<tr><td>" + esc(g) + "</td>" + weeks.map(function (w) { return "<td>" + ((rows[g] || {})[w] || "") + "</td>"; }).join("") + "</tr>"; }).join("") + '</table></div><div class="small muted">Séries feitas por semana (semana começando na segunda).</div>' : '<div class="empty">Nenhum treino registrado.</div>';
    }
    return html + "</div>";
  };
  T.actions.evMode = function (el) { T._evMode = el.dataset.m; T.render(); };
  T.actions.evWarm = function (el) { T._evWarm = el.checked; T.render(); };
  T.actions.evW = function (el) { T._evW = el.value; T.render(); };
  T.actions.evEx = function (el) { T._evEx = el.value; T.render(); };

  /* ---------- Dieta: adesão do mês + observações ---------- */
  T.tabs.dietaAd = function (s) {
    var l = P.logsOf(s.id), dp = P.db.dietPlans[s.id], now = new Date(), ym = T._adYM || [now.getFullYear(), now.getMonth()], y = ym[0], m = ym[1];
    var first = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate(), t = today(), cnt = { c: 0, p: 0, n: 0 }, sum = 0, nd = 0;
    var cells = P.DOW.map(function (d) { return '<span class="h" style="background:none;color:var(--muted)">' + d + "</span>"; }).join("");
    for (var i = 0; i < first; i++) cells += '<span style="background:none"></span>';
    for (var d = 1; d <= dim; d++) {
      var iso = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"), col = "var(--card2)", lab = "";
      if (dp && iso <= t) {
        var v = P.variationForDay(dp, new Date(iso + "T12:00:00").getDay()), tot = v ? v.meals.length : 0, n = (l.mealsDone[iso] || []).length, pct = tot ? Math.min(1, n / tot) : 0;
        nd++; sum += pct; if (pct >= 1) { cnt.c++; col = "var(--valid)"; } else if (pct > 0) { cnt.p++; col = "var(--prep)"; } else { cnt.n++; col = "#7f1d1d"; }
        lab = n + "/" + tot;
      }
      cells += '<span style="background:' + col + '" title="' + lab + '">' + d + "</span>";
    }
    function stat(lbl, v, sub) { return '<div class="card tight kpi"><span class="small muted">' + lbl + '</span><b style="font-size:22px">' + v + '</b><span class="small muted">' + (sub || "") + "</span></div>"; }
    return '<div class="card stack"><div class="row between"><button class="btn sm" data-act="adNav" data-d="-1">‹</button><b>Adesão à dieta · ' + MESES[m] + " " + y + '</b><button class="btn sm" data-act="adNav" data-d="1">›</button></div>' +
      '<div class="kpis">' + stat("Adesão média", (nd ? Math.round(sum / nd * 100) : 0) + "%") + stat("Dias completos", cnt.c, "de " + nd) + stat("Dias parciais", cnt.p, "de " + nd) + stat("Dias não realizados", cnt.n, "de " + nd) + '</div><div class="adh">' + cells + '</div><div class="row wrap small" style="gap:12px"><span><i class="dot" style="background:var(--valid)"></i> Completo</span><span><i class="dot" style="background:var(--prep)"></i> Parcial</span><span><i class="dot" style="background:#7f1d1d"></i> Não realizado</span></div></div>' +
      '<div class="card" style="margin-top:14px"><b>Observações da dieta (' + l.mealNotes.length + ")</b>" + (l.mealNotes.length ? l.mealNotes.slice().reverse().map(function (n) { return '<div class="list-item small"><span class="grow"><b>' + P.fmtDate(n.date) + " — " + P.DOW_FULL[new Date(n.date + "T12:00:00").getDay()] + (n.mealName ? " · " + esc(n.mealName) : "") + "</b><div>" + esc(n.text) + "</div></span>" + (n.photo ? '<button class="ph" data-act="viewPhoto" data-ref="' + esc(n.photo) + '" style="width:60px;background-image:url(' + P.photo(n.photo) + ')"></button>' : "") + "</div>"; }).join("") : '<div class="empty">Nenhuma observação.</div>') + "</div>";
  };
  T.actions.adNav = function (el) { var now = new Date(), ym = T._adYM || [now.getFullYear(), now.getMonth()], m = ym[1] + +el.dataset.d, y = ym[0]; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } T._adYM = [y, m]; T.render(); };

  /* ---------- Progresso: peso, medidas e tabela por atualização da ficha ---------- */
  T.tabs.progresso = function (s) {
    var l = P.logsOf(s.id), w = l.weights.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    function weightAt(d) { var x = null; w.forEach(function (z) { if (z.date <= d) x = z.kg; }); return x; }
    // linhas: cada alteração de prescrição (treino ou dieta) + check-ins com peso
    var rows = {}, wp = P.db.workoutPlans[s.id], dp = P.db.dietPlans[s.id], h = P.db.histories[s.id] || {};
    function addPlanRows(plan, kind) { if (!plan) return; (plan.changes || []).forEach(function (c) { var r = rows[c.date] = rows[c.date] || { date: c.date }; if (kind === "w") { r.vol = c.vol; r.cardio = c.cardio; } else r.mac = c.mac; }); }
    (h.workout || []).forEach(function (x) { addPlanRows(x.plan, "w"); }); addPlanRows(wp, "w");
    (h.diet || []).forEach(function (x) { addPlanRows(x.plan, "d"); }); addPlanRows(dp, "d");
    if (!T._onlyPresc) w.forEach(function (z) { rows[z.date] = rows[z.date] || { date: z.date }; });
    var list = Object.keys(rows).sort().map(function (k) { return rows[k]; }), prevVol = null, prevW = null, lastVol = null, lastMac = null, lastCar = null;
    list.forEach(function (r) { if (r.vol) lastVol = r.vol; else r.vol = lastVol; if (r.mac) lastMac = r.mac; else r.mac = lastMac; if (r.cardio != null) lastCar = r.cardio; else r.cardio = lastCar; });
    var body = list.map(function (r) {
      var kg = weightAt(r.date), dW = kg != null && prevW != null ? P.round1(kg - prevW) : null, vol = r.vol || {}, tot = Object.keys(vol).reduce(function (a, k) { return a + vol[k]; }, 0), ptot = prevVol ? Object.keys(prevVol).reduce(function (a, k) { return a + prevVol[k]; }, 0) : null;
      var cell = "<tr><td>" + P.fmtDate(r.date) + "</td><td>" + (kg != null ? "<b>" + kg + " kg</b>" + (dW != null ? '<div class="small" style="color:' + (dW <= 0 ? "var(--valid)" : "var(--warm)") + '">' + (dW > 0 ? "+" : "") + dW + " kg</div>" : "") : "—") + '</td><td class="small">' + (tot ? "<b>Total: " + tot + (ptot != null && ptot !== tot ? ' <span style="color:' + (tot < ptot ? "var(--warm)" : "var(--valid)") + '">(' + (tot > ptot ? "+" : "") + (tot - ptot) + ")</span>" : "") + "</b><br>" + Object.keys(vol).sort(function (a, b) { return vol[b] - vol[a]; }).map(function (g) { var dv = prevVol && prevVol[g] != null ? vol[g] - prevVol[g] : null; return esc(g) + ": " + vol[g] + (dv ? "(" + (dv > 0 ? "+" : "") + dv + ")" : ""); }).join("<br>") + (r.cardio ? "<br>Cardio: " + r.cardio + "min" : "") : "—") + '</td><td class="small">' + (r.mac ? Math.round(r.mac.kcal) + " kcal<br>P " + Math.round(r.mac.p) + "g · C " + Math.round(r.mac.c) + "g · G " + Math.round(r.mac.g) + "g" : "—") + "</td></tr>";
      if (kg != null) prevW = kg; if (r.vol) prevVol = r.vol; return cell;
    }).reverse().join("");
    return '<div class="grid2"><div class="card"><div class="row between"><b>Peso & métricas</b><button class="btn sm" data-act="trAddWeight">+ Registrar peso</button></div>' + P.lineChart(w.map(function (x) { return { y: x.kg, label: P.fmtDate(x.date).slice(0, 5) }; })) + "</div>" + T.measuresCard(s).replace('style="margin-top:14px;', 'style="') + "</div>" +
      '<div class="card" style="margin-top:14px;overflow-x:auto"><div class="row between wrap"><b>Progresso por atualização</b><label class="row small"><input type="checkbox" style="width:auto" data-change="onlyPresc"' + (T._onlyPresc ? " checked" : "") + '> só alterações de prescrição</label></div>' + (body ? '<table class="t"><tr><th>Data</th><th>Peso (kg)</th><th>Volume de treino (séries/semana)</th><th>Macros (média/dia)</th></tr>' + body + "</table>" : '<div class="empty">Os dados aparecem conforme você salva fichas e o aluno registra peso.</div>') + "</div>";
  };
  T.actions.onlyPresc = function (el) { T._onlyPresc = el.checked; T.render(); };
  T.actions.trAddWeight = function () { T.sheet("Registrar peso", '<div class="stack"><div class="field"><label>Data</label><input id="twD" type="date" value="' + today() + '"></div><div class="field"><label>Peso (kg)</label><input id="twK" type="number" step="0.1"></div><button class="btn primary block" data-act="trSaveWeight">Salvar</button></div>'); };
  T.actions.trSaveWeight = function () { var kg = parseFloat(document.getElementById("twK").value), d = document.getElementById("twD").value; if (!kg || !d) return; P.logsOf(T.p.id).weights.push({ date: d, kg: kg }); var s = P.student(T.p.id); s.weight = kg; T.touch(s); P.save(); T.closeSheet(); T.render(); };

  /* ---------- Questionários: tabela de respostas por questionário ---------- */
  T.tabs.questionarios = function (s) {
    var l = P.logsOf(s.id).checkins.filter(function (c) { return c.kind !== "fotos"; });
    var kinds = []; l.forEach(function (c) { var k = c.kind || "semanal"; if (kinds.indexOf(k) < 0) kinds.push(k); });
    if (!l.length) return '<div class="empty">Nenhum questionário respondido ainda.</div>';
    return '<div class="card" style="padding:4px 8px;overflow-x:auto"><b style="display:block;padding:8px 2px">Respostas aos questionários</b><table class="t"><tr><th>Questionário</th><th>Data de resposta</th><th>Observações</th><th></th></tr>' + l.slice().reverse().map(function (c) { return "<tr><td>" + esc(P.formName(c.kind)) + "</td><td>" + P.fmtDate(c.date) + "</td><td>" + (c.feedback && c.feedback.text ? '<span class="pill accent">Enviado</span>' : '<span class="pill" style="color:var(--prep)">Pendente</span>') + '</td><td><button class="btn sm" data-act="openCk" data-id="' + c.id + '">Ver</button></td></tr>'; }).join("") + "</table></div>" +
      kinds.map(function (k) {
        var qs = P.qList(k).filter(function (q) { return q.type !== "info" && q.type !== "text"; }), rows = l.filter(function (c) { return (c.kind || "semanal") === k; }).slice().reverse();
        if (!qs.length) return "";
        return '<div class="card" style="margin-top:14px;padding:4px 8px;overflow-x:auto"><b style="display:block;padding:8px 2px">Tabela de feedback · ' + esc(P.formName(k)) + '</b><table class="t"><tr><th>Data</th>' + qs.map(function (q) { var t = q.short || q.text; return '<th title="' + esc(q.text) + '">' + esc(t.length > 26 ? t.slice(0, 24) + "…" : t) + "</th>"; }).join("") + "</tr>" + rows.map(function (c) { return "<tr><td>" + P.fmtDate(c.date) + "</td>" + qs.map(function (q) { var a = c.answers[q.id]; var col = q.type === "scale" && typeof a === "number" ? (a >= 4 ? "var(--valid)" : a === 3 ? "var(--prep)" : "var(--warm)") : ""; return '<td style="' + (col ? "color:" + col + ";font-weight:700" : "") + '">' + (a == null || a === "" ? "-" : esc(a)) + "</td>"; }).join("") + "</tr>"; }).join("") + "</table></div>";
      }).join("");
  };
  T.actions.openCk = function (el) {
    var c = P.logsOf(T.p.id).checkins.filter(function (x) { return x.id === el.dataset.id; })[0], qs = P.qList(c.kind).filter(function (q) { return q.type !== "info"; });
    T.sheet(P.formName(c.kind) + " · " + P.fmtDate(c.date), '<table class="t">' + qs.map(function (q) { var a = c.answers[q.id]; return '<tr><td class="muted">' + esc(q.text) + "</td><td><b>" + (a == null || a === "" ? "—" : esc(a) + (q.unit ? " " + esc(q.unit) : "")) + "</b></td></tr>"; }).join("") + "</table>", true);
  };

  /* ---------- Anexos: do treinador + enviados pelo aluno ---------- */
  var baseAnexos = T.tabs.anexos;
  T.tabs.anexos = function (s) {
    var ups = P.logsOf(s.id).uploads || [];
    return baseAnexos(s) + '<div class="card stack" style="margin-top:14px"><b>Arquivos enviados pelo aluno</b>' + (ups.length ? '<div class="list">' + ups.slice().reverse().map(function (u) { return '<div class="list-item"><span class="grow">📎 ' + esc(u.name) + ' <span class="small muted">· ' + P.fmtDate(u.date) + '</span></span><button class="btn sm" data-act="dlUpload" data-ref="' + esc(u.ref) + '" data-n="' + esc(u.name) + '">Baixar</button></div>'; }).join("") + "</div>" : '<div class="empty">' + (P.db.settings.allowStudentFiles ? "Nenhum arquivo enviado." : "O envio de arquivos pelo aluno está desligado (Configurações).") + "</div>") + "</div>";
  };
  T.actions.dlUpload = function (el) {
    var d = P.photo(el.dataset.ref); if (!d) { T.toast("Carregando… toque de novo."); return; }
    var a = document.createElement("a"); a.href = d; a.download = el.dataset.n; a.click();
  };
})();
