/* App do aluno — núcleo: navegação, Home, Treino e execução do treino */
(function () {
  "use strict";
  var P = window.Proto;
  var esc = P.esc;
  var AKEY = "teamgarcia.treinoAtivo";

  var A = window.A = {
    uid: null, state: "loading", stack: [{ v: "home", p: {} }], views: {}, actions: {}, tabRoot: "home",
    active: null, timerInt: null, unitPref: {}
  };
  try { A.active = JSON.parse(localStorage.getItem(AKEY) || "null"); } catch (e) {}
  try { A.unitPref = JSON.parse(localStorage.getItem("teamgarcia.unidades") || "{}"); } catch (e) {}

  A.me = function () { return P.student(A.uid); };
  A.logs = function () { return P.logsOf(A.uid); };
  A.wplan = function () { return P.db.workoutPlans[A.uid]; };
  A.dplan = function () { return P.db.dietPlans[A.uid]; };
  A.saveActive = function () { try { localStorage.setItem(AKEY, JSON.stringify(A.active)); } catch (e) {} };

  /* ---------- Navegação ---------- */
  A.cur = function () { return A.stack[A.stack.length - 1]; };
  A.go = function (v, p) { A.stack.push({ v: v, p: p || {} }); A.render(true); };
  A.back = function () { if (A.stack.length > 1) A.stack.pop(); A.render(true); };
  A.tab = function (v) { A.stack = [{ v: v, p: {} }]; A.tabRoot = v; A.render(true); };

  var ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    treinos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/></svg>',
    dieta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M16 3c-2 2-2 6 0 8v10"/></svg>',
    evo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>'
  };

  A.render = function (scrollTop) {
    var root = document.getElementById("root");
    if (A.state !== "ready" || !A.uid || !A.me()) { root.innerHTML = A.state === "login" ? A.views.login() : A.views.status(); return; }
    var c = A.cur(), fn = A.views[c.v] || A.views.home;
    var showNav = c.v !== "exec";
    root.innerHTML = fn(c.p) + (showNav ? A.navHtml() : "");
    if (A.after && A.after[c.v]) A.after[c.v](c.p);
    if (scrollTop) window.scrollTo(0, 0);
  };
  A.navHtml = function () {
    var pl = (A.me() && A.me().plans) || { treino: true, dieta: true };
    var items = [["home", "Início"], ["treinos", "Treino"], ["dieta", "Dieta"], ["evo", "Evolução"]].filter(function (i) { return (i[0] !== "treinos" || pl.treino !== false) && (i[0] !== "dieta" || pl.dieta !== false); });
    return '<nav class="nav"><div class="nav-in">' + items.map(function (i) {
      return '<button data-act="tab" data-v="' + i[0] + '" class="' + (A.tabRoot === i[0] ? "on" : "") + '">' + ICONS[i[0]] + i[1] + "</button>";
    }).join("") + "</div></nav>";
  };
  A.top = function (title, right) {
    return '<div class="top"><button class="back" data-act="back">‹ Voltar</button><div class="grow" style="text-align:center;font-weight:700">' + esc(title || "") + '</div><div style="min-width:60px;text-align:right">' + (right || "") + "</div></div>";
  };

  /* ---------- Modais e avisos ---------- */
  A.sheet = function (title, body, opts) {
    opts = opts || {};
    document.getElementById("modal").innerHTML = '<div class="overlay" data-act="closeSheetBg"><div class="sheet"><div class="sheet-head"><h3>' + esc(title) + '</h3><button class="x" data-act="closeSheet">×</button></div>' + body + "</div></div>";
    if (opts.after) opts.after();
  };
  A.closeSheet = function () { document.getElementById("modal").innerHTML = ""; };
  A.toast = function (msg) {
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  };

  /* ---------- Delegação de eventos ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el) return;
    if (el.getAttribute("data-act") === "closeSheetBg" && e.target !== el) return;
    var fn = A.actions[el.getAttribute("data-act")]; if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener("change", function (e) {
    var el = e.target.closest("[data-change]"); if (!el) return;
    var fn = A.actions[el.getAttribute("data-change")]; if (fn) fn(el, e);
  });
  A.actions.tab = function (el) { A.tab(el.dataset.v); };
  A.actions.back = function () { A.back(); };
  A.actions.go = function (el) { A.go(el.dataset.v, el.dataset.p ? JSON.parse(el.dataset.p) : {}); };
  A.actions.closeSheet = A.closeSheet;
  A.actions.closeSheetBg = function (el, e) { if (e.target === el) A.closeSheet(); };
  A.dp = function (o) { return esc(JSON.stringify(o)); };

  /* ---------- Login ---------- */
  A.views.login = function () {
    return '<div class="login stack"><div class="logo">TG</div><div><div class="title-xl">' + esc(P.APP_NAME) + '</div><div class="muted">Seu treino e sua dieta, num lugar só.</div></div>' +
      '<div class="field"><label>E-mail</label><input id="lgEmail" type="email" autocomplete="username" inputmode="email"></div>' +
      '<div class="field"><label>Senha</label><input id="lgPass" type="password" autocomplete="current-password"></div>' +
      '<button class="btn primary block" data-act="login">Entrar</button>' +
      '<button class="btn block ghost" data-act="forgot">Esqueci minha senha</button>' +
      '<div class="small muted" style="text-align:center">O acesso é criado pelo seu treinador.</div></div>';
  };
  A.views.status = function () {
    var msg = {
      loading: "Carregando…",
      denied: "Esta conta não é de aluno. Confira o e-mail com seu treinador.",
      inactive: "Seu acesso está pausado. Fale com seu treinador.",
      error: "Não foi possível carregar seus dados. Confira a internet e tente de novo."
    }[A.state] || "Carregando…";
    return '<div class="login stack" style="text-align:center"><div class="logo" style="margin:0 auto">TG</div><div class="muted">' + esc(msg) + "</div>" +
      (A.state === "loading" ? "" : '<button class="btn block" data-act="logout">Sair</button>') + "</div>";
  };
  A.actions.login = function (el) {
    var em = document.getElementById("lgEmail").value.trim(), pw = document.getElementById("lgPass").value;
    if (!em || !pw) { A.toast("Preencha e-mail e senha."); return; }
    el.disabled = true; el.textContent = "Entrando…";
    window.FB.signIn(em, pw).catch(function (e) { el.disabled = false; el.textContent = "Entrar"; A.toast(P.authError(e)); });
  };
  A.actions.forgot = function () {
    var em = document.getElementById("lgEmail").value.trim();
    if (!em) { A.toast("Digite seu e-mail no campo acima."); return; }
    window.FB.resetPassword(em).then(function () { A.toast("Enviamos um e-mail para criar nova senha."); }, function (e) { A.toast(P.authError(e)); });
  };
  A.actions.logout = function () {
    P.flush(); A.closeSheet(); A.stack = [{ v: "home", p: {} }]; A.tabRoot = "home";
    window.FB.signOut();
  };

  /* ---------- Utilidades de treino ---------- */
  function weekStart() { var d = new Date(); var dow = d.getDay(); var diff = dow === 0 ? -6 : 1 - dow; return P.addDays(P.todayISO(), diff); }
  A.weekCount = function () {
    var ws = weekStart();
    return A.logs().sessions.filter(function (s) { return s.date >= ws; }).length;
  };
  A.nextWorkout = function () {
    var plan = A.wplan(); if (!plan || !plan.workouts.length) return null;
    var ses = A.logs().sessions.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var main = plan.workouts.filter(function (w) { return !w.optional; });
    if (!ses.length) return main[0] || plan.workouts[0];
    var idx = main.map(function (w) { return w.id; }).indexOf(ses[0].workoutId);
    return main[(idx + 1) % main.length] || main[0];
  };
  A.setList = function (it) {
    var out = [];
    for (var i = 0; i < (it.warmup.sets || 0); i++) out.push({ key: it.id + ":warm" + i, type: "warm", idx: i, label: (i + 1) + "ª", reps: it.warmup.reps, rest: it.warmup.rest });
    for (i = 0; i < (it.prep.sets || 0); i++) out.push({ key: it.id + ":prep" + i, type: "prep", idx: i, label: (i + 1) + "ª", reps: it.prep.reps, rest: it.prep.rest });
    for (i = 0; i < (it.valid.sets || 0); i++) out.push({ key: it.id + ":valid" + i, type: "valid", idx: i, label: (i + 1) + "ª", reps: (it.valid.reps || [])[i] || (it.valid.reps || [])[0] || "", rest: it.valid.rest });
    return out;
  };
  A.seriesLine = function (it) {
    var h = [];
    if (it.warmup.sets) h.push('<span><i class="dot warm"></i> ' + it.warmup.sets + "</span>");
    if (it.prep.sets) h.push('<span><i class="dot prep"></i> ' + it.prep.sets + "</span>");
    if (it.valid.sets) h.push('<span><i class="dot valid"></i> ' + it.valid.sets + "</span>");
    return h.join("");
  };

  /* ---------- Home ---------- */
  A.views.home = function () {
    var me = A.me(), plan = A.wplan(), next = A.nextWorkout(), goal = (plan && plan.weeklyGoal) || 3, done = A.weekCount();
    var dplan = A.dplan(), v = P.variationForDay(dplan, new Date().getDay()), today = P.todayISO();
    var doneMeals = (A.logs().mealsDone[today] || []);
    var nextMeal = v ? (v.meals.filter(function (m) { return doneMeals.indexOf(m.id) < 0; })[0]) : null;
    var daysCk = Math.round((new Date(me.nextCheckin + "T12:00:00") - new Date(today + "T12:00:00")) / 864e5);
    var water = A.logs().water[today] || 0, wGoal = (v && v.waterGoal) || (plan && plan.waterGoal) || 3;
    var ck = daysCk <= 0 ? "Seu check-in está liberado. Responda agora!" : "Faltam " + daysCk + " dia" + (daysCk > 1 ? "s" : "") + " para o seu check-in.";
    var html = '<div class="screen stack">' +
      '<div class="row between"><div><div class="muted">Olá,</div><div class="title-xl">' + esc(me.name.split(" ")[0]) + '</div></div><button class="btn sm" data-act="go" data-v="perfil">Perfil</button></div>' +
      '<button class="hero-banner" data-act="go" data-v="checkin"><div class="small" style="opacity:.85">Check-in semanal</div><b>' + esc(ck) + "</b></button>" +
      (me.nextMonthly && me.nextMonthly <= today ? '<button class="hero-banner" data-act="go" data-v="checkin" data-p="' + A.dp({ kind: "mensal" }) + '"><div class="small" style="opacity:.85">Check-in mensal</div><b>Hora das medidas e fotos do mês. Responda agora!</b></button>' : "");
    if (A.active) html += '<button class="card big-card" data-act="go" data-v="exec" style="border-color:var(--accent)"><div class="ico">▶</div><div class="grow"><b>Treino em andamento</b><div class="small muted">' + esc(A.active.workoutName) + " · toque para continuar</div></div></button>";
    html += '<div class="card"><div class="row between"><b>Treinos da semana</b><span class="muted small">' + done + "/" + goal + '</span></div><div class="progress" style="margin-top:10px"><i style="width:' + Math.min(100, done / goal * 100) + '%"></i></div></div>';
    if (next) html += '<button class="card big-card" data-act="go" data-v="treino" data-p="' + A.dp({ id: next.id }) + '"><div class="ico">🏋️</div><div class="grow"><div class="small muted">Próximo treino</div><b style="font-size:18px">' + esc(next.name) + '</b><div class="small muted">' + esc(next.subtitle || "") + "</div></div><span>›</span></button>";
    if (nextMeal) html += '<button class="card big-card" data-act="go" data-v="refeicao" data-p="' + A.dp({ id: nextMeal.id, date: today }) + '"><div class="ico">🍽️</div><div class="grow"><div class="small muted">Próxima refeição · ' + esc(nextMeal.time) + '</div><b style="font-size:18px">' + esc(nextMeal.name) + "</b></div><span>›</span></button>";
    else if (v) html += '<div class="card big-card"><div class="ico">✅</div><div class="grow"><b>Todas as refeições de hoje concluídas</b></div></div>';
    if (plan && plan.cardio && plan.cardio.minPerDay) html += '<button class="card big-card" data-act="cardio"><div class="ico">🏃</div><div class="grow"><div class="small muted">Cardio</div><b>' + plan.cardio.minPerDay + ' min</b> <span class="small muted">· ' + plan.cardio.days.map(function (d) { return P.DOW[d]; }).join(", ") + '</span></div><span class="pill accent">Registrar</span></button>';
    html += '<div class="card"><div class="water"><div class="glass">💧</div><div class="grow"><div class="row between"><b>Água</b><span class="small muted">' + (water / 1000).toFixed(1).replace(".", ",") + " de " + String(wGoal).replace(".", ",") + ' L</span></div><div class="progress" style="margin-top:8px"><i style="width:' + Math.min(100, water / (wGoal * 1000) * 100) + '%;background:var(--blue)"></i></div></div></div>' +
      '<div class="row" style="margin-top:12px"><button class="btn sm grow" data-act="water" data-ml="250">+250 ml</button><button class="btn sm grow" data-act="water" data-ml="500">+500 ml</button><button class="btn sm" data-act="water" data-ml="-250">−</button></div></div>';
    return html + "</div>";
  };
  A.actions.water = function (el) {
    var t = P.todayISO(), l = A.logs(); l.water[t] = Math.max(0, (l.water[t] || 0) + parseInt(el.dataset.ml, 10)); P.save(); A.render();
  };
  A.actions.cardio = function () {
    A.sheet("Registrar cardio", '<div class="stack"><div class="field"><label>Atividade</label><select id="cdTipo"><option>Esteira</option><option>Bicicleta</option><option>Caminhada na rua</option><option>Corrida</option><option>Elíptico</option></select></div>' +
      '<div class="row"><div class="field grow"><label>Minutos</label><input id="cdMin" type="number" inputmode="numeric" value="30"></div><div class="field grow"><label>Distância (km, opcional)</label><input id="cdKm" type="number" inputmode="decimal"></div></div>' +
      '<button class="btn primary block" data-act="saveCardio">Salvar cardio</button>' + cardioList() + "</div>");
  };
  function cardioList() {
    var l = A.logs().cardio.slice(-5).reverse();
    if (!l.length) return "";
    return '<div class="small muted" style="margin-top:6px">Últimos registros</div><div class="list">' + l.map(function (c) { return '<div class="list-item small"><span class="grow">' + P.fmtDate(c.date) + " · " + esc(c.type) + "</span><b>" + c.min + " min</b>" + (c.km ? " · " + c.km + " km" : "") + "</div>"; }).join("") + "</div>";
  }
  A.actions.saveCardio = function () {
    var min = parseInt(document.getElementById("cdMin").value, 10); if (!min) { A.toast("Informe os minutos."); return; }
    A.logs().cardio.push({ date: P.todayISO(), type: document.getElementById("cdTipo").value, min: min, km: parseFloat(document.getElementById("cdKm").value) || null });
    P.save(); A.closeSheet(); A.toast("Cardio registrado!");
  };

  /* ---------- Treinos ---------- */
  A.views.treinos = function () {
    var plan = A.wplan();
    if (!plan) return '<div class="screen"><div class="title-xl">Treinos</div><div class="empty">Seu treinador ainda não enviou um treino.</div></div>';
    var html = '<div class="screen stack"><div class="row between"><div class="title-xl">Treinos</div><span class="small muted">Atualizado em ' + P.fmtDate(plan.updatedAt) + "</span></div>";
    if (A.active) html += '<button class="card big-card" data-act="go" data-v="exec" style="border-color:var(--accent)"><div class="ico">▶</div><div class="grow"><b>Treino em andamento</b><div class="small muted">' + esc(A.active.workoutName) + "</div></div></button>";
    html += '<div class="wk-grid">' + plan.workouts.map(function (w) {
      return '<button class="card wk" data-act="go" data-v="treino" data-p="' + A.dp({ id: w.id }) + '"><b>' + esc(w.name) + '</b><div class="small muted">' + esc(w.subtitle || "") + '</div><div class="small muted" style="margin-top:6px">' + w.items.length + " exercícios" + (w.optional ? ' · <span class="pill">Opcional</span>' : "") + "</div></button>";
    }).join("") + "</div>";
    if (plan.notes) html += '<div class="card"><b>📝 Observações do treinador</b><div class="muted" style="white-space:pre-line;margin-top:8px">' + esc(plan.notes) + "</div></div>";
    html += '<div class="card tight small"><div class="row wrap" style="gap:14px"><span><i class="dot warm"></i> Aquecimento</span><span><i class="dot prep"></i> Preparatória</span><span><i class="dot valid"></i> Válida</span></div></div>';
    return html + "</div>";
  };

  A.views.treino = function (p) {
    var plan = A.wplan(), w = plan.workouts.filter(function (x) { return x.id === p.id; })[0];
    if (!w) return A.top("Treino") + '<div class="empty">Treino não encontrado.</div>';
    var html = A.top("") + '<div class="screen stack" style="padding-bottom:170px"><div><div class="title-xl">' + esc(w.name) + '</div><div class="muted">' + esc(w.subtitle || "") + (w.days && w.days.length ? " · sugerido: " + w.days.map(function (d) { return P.DOW[d]; }).join(", ") : "") + "</div></div>";
    html += '<div class="card" style="padding-top:4px;padding-bottom:4px"><div class="list">' + w.items.map(function (it, i) {
      var ex = P.exercise(it.exId), last = P.lastSetsFor(A.uid, it.exId), tec = P.technique(it.techniqueId);
      var lastTxt = last ? last.sets[0].weight + " kg · " + last.sets[0].reps + " reps" : "";
      return '<div class="ex-row"><div class="ex-num">' + (i + 1) + '</div><div class="grow"><div class="row" style="gap:8px"><b>' + esc(ex.name) + '</b><button class="play" data-act="video" data-ex="' + it.exId + '">▶</button></div>' +
        '<div class="series" style="margin-top:4px">' + A.seriesLine(it) + "<span>· " + esc((it.valid.reps || []).join(", ")) + " reps</span></div>" +
        (tec ? '<div style="margin-top:6px"><span class="pill" style="color:' + tec.color + ";border-color:" + tec.color + '55">' + esc(tec.name) + (it.techniqueSets && it.techniqueSets.length ? " (" + it.techniqueSets.map(function (k) { return (k + 1) + "ª"; }).join(", ") + ")" : "") + "</span></div>" : "") +
        (it.valid.load ? '<div class="small" style="margin-top:4px">🎯 Carga sugerida: <b>' + esc(it.valid.load) + " kg</b></div>" : "") +
        (it.superset && w.items[i + 1] ? '<div class="small" style="margin-top:4px;color:var(--purple)">⇅ Superset com ' + esc(P.exercise(w.items[i + 1].exId).name) + "</div>" : "") +
        "</div>" + (lastTxt ? '<button class="qty" data-act="history" data-ex="' + it.exId + '">' + lastTxt + "</button>" : "") + "</div>";
    }).join("") + "</div></div>";
    html += "</div>";
    var busy = A.active && A.active.workoutId !== w.id;
    html += '<div class="fab"><button class="btn primary block" style="padding:15px" data-act="startWorkout" data-id="' + w.id + '"' + (busy ? " disabled" : "") + ">" + (A.active && A.active.workoutId === w.id ? "▶ Continuar treino" : busy ? "Outro treino em andamento" : "▶ Iniciar treino") + "</button></div>";
    return html;
  };

  A.actions.video = function (el) {
    var ex = P.exercise(el.dataset.ex);
    var body = ex.video ? '<div style="aspect-ratio:9/16;max-height:60vh;margin:0 auto;border-radius:14px;overflow:hidden;background:#000"><iframe src="' + esc(toEmbed(ex.video)) + '" style="width:100%;height:100%;border:0" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>'
      : '<div class="empty" style="padding:40px 10px">🎬<br>O vídeo deste exercício ainda não foi cadastrado pelo treinador.</div>';
    A.sheet(ex.name, body + '<div class="small muted" style="margin-top:10px">Grupo muscular: ' + esc(ex.group) + "</div>");
  };
  function toEmbed(url) {
    var m = String(url).match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{6,})/);
    return m ? "https://www.youtube.com/embed/" + m[1] : url;
  }
  A.actions.history = function (el) { A.showHistory(el.dataset.ex); };
  A.showHistory = function (exId) {
    var h = P.exerciseHistory(A.uid, exId), ex = P.exercise(exId);
    var body = (h.best ? '<div class="pr"><div class="small" style="color:#fbbf24;font-weight:700">🏆 Recorde pessoal</div><div style="font-size:26px;font-weight:800">' + h.best.weight + ' kg</div><div class="small muted">' + h.best.reps + " reps · " + P.fmtDate(h.best.date) + "</div></div>" : "") +
      '<div class="row between" style="margin:14px 0 6px"><b>Últimas execuções</b><span class="small muted">' + h.list.length + " treinos</span></div>" +
      (h.list.length ? h.list.slice(0, 8).map(function (s) {
        return '<div class="card tight" style="margin-bottom:8px"><b class="small">📅 ' + P.fmtDate(s.date) + '</b><table class="hist"><tr><th>Série</th><th>Carga</th><th style="text-align:right">Reps</th></tr>' + s.sets.map(function (x) {
          return "<tr><td>" + (x.type === "warm" ? '<i class="dot warm"></i> ' : x.type === "prep" ? '<i class="dot prep"></i> ' : '<i class="dot valid"></i> ') + (x.idx + 1) + "ª</td><td>" + (x.weight != null ? x.weight + " kg" : "—") + '</td><td style="text-align:right">' + x.reps + "</td></tr>";
        }).join("") + "</table></div>";
      }).join("") : '<div class="empty">Nenhum registro ainda.</div>');
    A.sheet(ex.name, '<div class="small muted" style="margin-top:-8px;margin-bottom:10px">Seu desempenho</div>' + body);
  };

  /* ---------- Execução ---------- */
  A.actions.startWorkout = function (el) {
    if (!A.active) {
      var w = A.wplan().workouts.filter(function (x) { return x.id === el.dataset.id; })[0];
      A.active = { workoutId: w.id, workoutName: w.name, start: Date.now(), itemIdx: 0, setKey: null, done: {}, timer: null, exNotes: {}, pse: {} };
      A.saveActive();
    }
    A.stack.push({ v: "exec", p: {} }); A.render(true);
  };
  A.activeWorkout = function () { return A.wplan().workouts.filter(function (x) { return x.id === A.active.workoutId; })[0]; };

  A.views.exec = function () {
    if (!A.active) { A.stack.pop(); return A.views[A.cur().v](A.cur().p); }
    var w = A.activeWorkout(), it = w.items[A.active.itemIdx], ex = P.exercise((A.active.swaps || {})[it.id] || it.exId), sets = A.setList(it);
    if (!A.active.setKey || !sets.some(function (s) { return s.key === A.active.setKey; })) {
      var firstOpen = sets.filter(function (s) { return !A.active.done[s.key]; })[0] || sets[0]; A.active.setKey = firstOpen.key;
    }
    var cur = sets.filter(function (s) { return s.key === A.active.setKey; })[0];
    var doneCount = sets.filter(function (s) { return A.active.done[s.key]; }).length;
    var tec = P.technique(it.techniqueId), last = P.lastSetsFor(A.uid, it.exId);
    var rec = A.active.done[cur.key] || {};
    var lastSet = last && last.sets.filter(function (s) { return s.idx === cur.idx; })[0];
    var wVal = rec.weight != null ? rec.weight : lastSet ? lastSet.weight : (cur.type === "valid" && it.valid.load ? parseFloat(it.valid.load) || "" : "");
    var cfg = P.db.settings, needLoad = cur.type === "valid" || cfg.logWarmPrepLoad !== false;
    var tecHere = tec && cur.type === "valid" && (!(it.techniqueSets && it.techniqueSets.length) || it.techniqueSets.indexOf(cur.idx) >= 0);
    A.active.exDone = A.active.exDone || {};
    var nextIt = w.items[A.active.itemIdx + 1], prevIt = w.items[A.active.itemIdx - 1];
    var rVal = rec.reps != null ? rec.reps : lastSet ? lastSet.reps : "";
    var r = P.parseRestRange(cur.rest);
    var t = A.active.timer || { mode: "timer", dur: r.min, running: false, endAt: 0, startAt: 0 };
    var typeName = { warm: "Aquecimento", prep: "Preparatória", valid: "Válida" };
    var html = '<div class="top"><button class="back" data-act="back">‹ Voltar</button><div class="exec-head"><div class="small muted">Tempo total</div><div class="exec-time" id="totalTime">' + P.fmtSec((Date.now() - A.active.start) / 1000) + '</div></div><button class="btn sm danger ghost" data-act="cancelWorkout">Cancelar</button></div>' +
      '<div class="screen stack" style="padding-bottom:30px">' +
      '<div class="row between"><button class="btn sm" data-act="exNav" data-d="-1"' + (A.active.itemIdx === 0 ? " disabled" : "") + '>‹</button><div style="text-align:center" class="grow"><div class="small muted">Exercício ' + (A.active.itemIdx + 1) + " de " + w.items.length + '</div><div class="title-lg">' + esc(ex.name) + '</div></div><button class="btn sm" data-act="exNav" data-d="1"' + (A.active.itemIdx === w.items.length - 1 ? " disabled" : "") + ">›</button></div>" +
      '<div class="row" style="justify-content:center;gap:8px"><button class="btn sm" data-act="video" data-ex="' + it.exId + '">▶ Vídeo</button><button class="btn sm" data-act="history" data-ex="' + it.exId + '">Histórico</button>' + (it.subs && it.subs.length && cfg.allowSubs !== false ? '<button class="btn sm" data-act="swapEx">Trocar</button>' : "") + "</div>" +
      (it.superset && nextIt ? '<div class="card tight small" style="border-color:var(--purple)">⇅ <b>Superset</b> com <b>' + esc(P.exercise(nextIt.exId).name) + "</b>: faça uma série aqui e já vá para o próximo, sem descanso.</div>" : "") +
      (prevIt && prevIt.superset ? '<div class="card tight small" style="border-color:var(--purple)">⇅ <b>Superset</b> com <b>' + esc(P.exercise(prevIt.exId).name) + "</b>: descanse só depois desta série.</div>" : "") +
      '<div class="card tight small">' +
      (it.warmup.sets ? '<div><i class="dot warm"></i> Aquecimento ' + it.warmup.sets + " · reps <b>" + esc(it.warmup.reps) + "</b> · intervalo <b>" + esc(it.warmup.rest) + "</b></div>" : "") +
      (it.prep.sets ? '<div><i class="dot prep"></i> Preparatória ' + it.prep.sets + " · reps <b>" + esc(it.prep.reps) + "</b> · intervalo <b>" + esc(it.prep.rest) + "</b></div>" : "") +
      '<div><i class="dot valid"></i> Válidas ' + it.valid.sets + " · reps <b>" + esc((it.valid.reps || []).join(" / ")) + "</b> · intervalo <b>" + esc(it.valid.rest) + "</b>" + (it.rir ? " · RIR <b>" + esc(it.rir) + "</b>" : "") + "</div>" +
      (it.valid.load ? '<div style="margin-top:4px">🎯 Carga sugerida: <b>' + esc(it.valid.load) + " kg</b></div>" : "") +
      (it.notes ? '<div class="muted" style="margin-top:6px">📝 ' + esc(it.notes) + "</div>" : "") + "</div>" +
      '<label class="row" style="justify-content:center"><input type="checkbox" style="width:auto" data-change="exDone"' + (A.active.exDone[it.id] || doneCount === sets.length ? " checked" : "") + '> <b>Exercício concluído</b> <span class="small muted">· ' + doneCount + "/" + sets.length + "</span></label>" +
      '<div class="set-chips">' + sets.map(function (s) {
        var cls = "set-chip" + (s.key === cur.key ? " on" : "") + (A.active.done[s.key] ? " done" : "");
        return '<button class="' + cls + '" data-act="pickSet" data-k="' + s.key + '"><i class="dot ' + s.type + '"></i>' + s.label + (A.active.done[s.key] ? " ✓" : "") + "</button>";
      }).join("") + '</div><div class="small muted" style="text-align:center">' + doneCount + " de " + sets.length + " séries concluídas</div>" +
      '<div class="card stack"><div class="row between"><b><i class="dot ' + cur.type + '"></i> ' + typeName[cur.type] + " " + cur.label + '</b><span class="small muted">meta: ' + esc(cur.reps) + " reps</span></div>" +
      (tecHere ? '<div class="card tight small" style="border-color:' + tec.color + '"><div class="muted">Orientações desta série</div><span class="pill" style="color:' + tec.color + '">' + esc(tec.name) + "</span></div>" : "") +
      '<div class="row">' + (needLoad ? '<div class="num-box grow"><div class="small muted">Peso (kg)</div><input id="inW" type="number" inputmode="decimal" step="0.5" value="' + wVal + '"><div class="row"><button class="step" data-act="stepIn" data-f="inW" data-d="-2.5">−</button><button class="step" data-act="stepIn" data-f="inW" data-d="2.5">+</button></div></div>' : "") +
      '<div class="num-box grow"><div class="small muted">Reps feitas</div><input id="inR" type="number" inputmode="numeric" value="' + rVal + '"><div class="row"><button class="step" data-act="stepIn" data-f="inR" data-d="-1">−</button><button class="step" data-act="stepIn" data-f="inR" data-d="1">+</button></div></div></div>' +
      (lastSet ? '<div class="small muted" style="text-align:center">Última vez: ' + lastSet.weight + " kg × " + lastSet.reps + " (" + P.fmtDate(last.date) + ")</div>" : "") +
      '<button class="btn primary block" data-act="doneSet">' + (A.active.done[cur.key] ? "Atualizar série" : "✓ Concluir série") + "</button></div>" +
      '<div class="card stack"><div class="tabs"><button class="' + (t.mode === "timer" ? "on" : "") + '" data-act="tMode" data-m="timer">Timer</button><button class="' + (t.mode === "crono" ? "on" : "") + '" data-act="tMode" data-m="crono">Cronômetro</button></div>' +
      '<div class="timer' + (t.running ? " run" : "") + '" id="timerTxt">' + timerText(t) + "</div>" +
      (t.mode === "timer" ? '<div class="presets">' + [["Mín", r.min], ["Méd", r.mid], ["Máx", r.max]].map(function (x) { return '<button data-act="tPreset" data-s="' + x[1] + '" class="' + (t.dur === x[1] ? "on" : "") + '">' + x[0] + "<br><b>" + P.fmtSec(x[1]) + "</b></button>"; }).join("") + "</div>" : "") +
      '<div class="row" style="justify-content:center"><button class="btn primary" style="min-width:120px" data-act="tToggle">' + (t.running ? "Pausar" : "▶ Iniciar") + '</button><button class="btn" data-act="tReset">↺</button>' + (t.mode === "timer" ? '<button class="btn" title="Escolher o tempo" data-act="tEdit">✏️</button>' : "") + "</div></div>" +
      (cfg.pseByExercise !== false ? '<div class="card tight"><div class="small muted" style="margin-bottom:6px">Como foi este exercício? (esforço de 1 a 10)</div><div class="scale">' + [6, 7, 8, 9, 10].map(function (n) { return '<button data-act="pse" data-n="' + n + '" class="' + (A.active.pse[it.id] === n ? "on" : "") + '">' + n + "</button>"; }).join("") + '</div><input id="exNote" style="margin-top:8px" placeholder="Observação sobre o exercício (opcional)" value="' + esc(A.active.exNotes[it.id] || "") + '" data-change="exNote"></div>' : "") +
      '<button class="btn block" style="padding:15px;background:var(--valid);color:#052e1c;border:0" data-act="finishWorkout">🏁 Finalizar treino</button></div>';
    A.saveActive();
    return html;
  };
  function timerText(t) {
    if (t.mode === "crono") return P.fmtSec(t.running ? (Date.now() - t.startAt) / 1000 + (t.acc || 0) : (t.acc || 0));
    return P.fmtSec(t.running ? (t.endAt - Date.now()) / 1000 : (t.left != null ? t.left : t.dur));
  }
  function ensureTimer() {
    if (!A.active.timer) { var it = A.activeWorkout().items[A.active.itemIdx]; var s = A.setList(it).filter(function (x) { return x.key === A.active.setKey; })[0]; A.active.timer = { mode: "timer", dur: P.parseRestRange(s.rest).min, running: false }; }
    return A.active.timer;
  }
  A.after = A.after || {};
  A.after.exec = function () {
    clearInterval(A.timerInt);
    A.timerInt = setInterval(function () {
      if (!A.active || A.cur().v !== "exec") { clearInterval(A.timerInt); return; }
      var tt = document.getElementById("totalTime"); if (tt) tt.textContent = P.fmtSec((Date.now() - A.active.start) / 1000);
      var t = A.active.timer; if (!t) return;
      var el = document.getElementById("timerTxt"); if (el) el.textContent = timerText(t);
      if (t.mode === "timer" && t.running && Date.now() >= t.endAt) {
        t.running = false; t.left = null; A.saveActive(); beep(); A.toast("⏰ Descanso concluído! Próxima série."); A.render();
      }
    }, 250);
  };
  function beep() { try { var c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(); o.connect(c.destination); o.frequency.value = 880; o.start(); setTimeout(function () { o.stop(); c.close(); }, 350); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {} }

  A.actions.pickSet = function (el) {
    A.active.setKey = el.dataset.k;
    var it = A.activeWorkout().items[A.active.itemIdx], s = A.setList(it).filter(function (x) { return x.key === el.dataset.k; })[0];
    if (!A.active.timer || !A.active.timer.running) A.active.timer = { mode: (A.active.timer || {}).mode || "timer", dur: P.parseRestRange(s.rest).min, running: false };
    A.render();
  };
  A.actions.exNav = function (el) {
    var w = A.activeWorkout(); A.active.itemIdx = Math.max(0, Math.min(w.items.length - 1, A.active.itemIdx + parseInt(el.dataset.d, 10)));
    A.active.setKey = null; if (A.active.timer && !A.active.timer.running) A.active.timer = null; A.render(true);
  };
  A.actions.stepIn = function (el) {
    var i = document.getElementById(el.dataset.f), v = parseFloat(i.value) || 0; i.value = Math.max(0, Math.round((v + parseFloat(el.dataset.d)) * 10) / 10);
  };
  A.actions.doneSet = function () {
    var wEl = document.getElementById("inW"), w = wEl ? parseFloat(wEl.value) : null, r = parseInt(document.getElementById("inR").value, 10);
    if ((wEl && isNaN(w)) || isNaN(r)) { A.toast(wEl ? "Preencha peso e repetições." : "Preencha as repetições."); return; }
    var wk = A.activeWorkout(), it = wk.items[A.active.itemIdx], sets = A.setList(it), cur = sets.filter(function (s) { return s.key === A.active.setKey; })[0];
    A.active.done[cur.key] = { weight: wEl ? w : null, reps: r, itemId: it.id, exId: it.exId, type: cur.type, idx: cur.idx };
    var next = sets.filter(function (s) { return !A.active.done[s.key]; })[0];
    if (next) A.active.setKey = next.key;
    if (it.superset && wk.items[A.active.itemIdx + 1]) {
      A.active.itemIdx++; A.active.setKey = null; A.toast("⇅ Superset: vá direto para " + P.exercise(wk.items[A.active.itemIdx].exId).name); A.render(true); return;
    }
    var rr = P.parseRestRange(cur.rest);
    var t = ensureTimer(); t.mode = "timer"; t.dur = t.dur && t.dur >= rr.min && t.dur <= rr.max ? t.dur : rr.min; t.running = true; t.left = null; t.endAt = Date.now() + t.dur * 1000;
    var prev = wk.items[A.active.itemIdx - 1];
    if (prev && prev.superset && A.setList(prev).some(function (z) { return !A.active.done[z.key]; })) { A.active.itemIdx--; A.active.setKey = null; }
    if (!next) { A.active.exDone[it.id] = true; A.toast("Exercício concluído! Avance para o próximo ›"); }
    A.render();
  };
  A.actions.tMode = function (el) { var t = ensureTimer(); t.mode = el.dataset.m; t.running = false; t.left = null; t.acc = 0; A.render(); };
  A.actions.tPreset = function (el) { var t = ensureTimer(); t.dur = parseInt(el.dataset.s, 10); t.running = false; t.left = null; A.render(); };
  A.actions.tToggle = function () {
    var t = ensureTimer();
    if (t.mode === "crono") { if (t.running) { t.acc = (t.acc || 0) + (Date.now() - t.startAt) / 1000; t.running = false; } else { t.startAt = Date.now(); t.running = true; } }
    else if (t.running) { t.left = Math.max(0, (t.endAt - Date.now()) / 1000); t.running = false; }
    else { t.endAt = Date.now() + (t.left != null ? t.left : t.dur) * 1000; t.running = true; }
    A.render();
  };
  A.actions.tReset = function () { var t = ensureTimer(); t.running = false; t.left = null; t.acc = 0; A.render(); };
  A.actions.tEdit = function () {
    var t = ensureTimer();
    A.sheet("Tempo de descanso", '<div class="stack"><div class="row"><div class="field grow"><label>Minutos</label><input id="teM" type="number" min="0" value="' + Math.floor(t.dur / 60) + '"></div><div class="field grow"><label>Segundos</label><input id="teS" type="number" min="0" max="59" value="' + (t.dur % 60) + '"></div></div><button class="btn primary block" data-act="tEditOk">Usar este tempo</button></div>');
  };
  A.actions.tEditOk = function () { var t = ensureTimer(); t.dur = Math.max(5, (parseInt(document.getElementById("teM").value, 10) || 0) * 60 + (parseInt(document.getElementById("teS").value, 10) || 0)); t.running = false; t.left = null; A.closeSheet(); A.render(); };
  A.actions.exDone = function (el) { var it = A.activeWorkout().items[A.active.itemIdx]; A.active.exDone = A.active.exDone || {}; A.active.exDone[it.id] = el.checked; A.saveActive(); if (el.checked && A.active.itemIdx < A.activeWorkout().items.length - 1) { A.active.itemIdx++; A.active.setKey = null; A.render(true); } else A.render(); };
  A.actions.pse = function (el) { var it = A.activeWorkout().items[A.active.itemIdx]; A.active.pse[it.id] = parseInt(el.dataset.n, 10); A.render(); };
  A.actions.exNote = function (el) { var it = A.activeWorkout().items[A.active.itemIdx]; A.active.exNotes[it.id] = el.value; A.saveActive(); };
  A.actions.swapEx = function () {
    var it = A.activeWorkout().items[A.active.itemIdx];
    A.sheet("Trocar exercício", '<div class="small muted" style="margin-bottom:8px">Opções liberadas pelo treinador (só para hoje):</div><div class="list">' + [it.exId].concat(it.subs).map(function (id, i) {
      return '<button class="list-item" data-act="doSwap" data-ex="' + id + '"><span class="grow"><b>' + esc(P.exercise(id).name) + "</b>" + (i === 0 ? ' <span class="pill">original</span>' : "") + '<div class="small muted">' + esc(P.exercise(id).group) + "</div></span>›</button>";
    }).join("") + "</div>");
  };
  A.actions.doSwap = function (el) {
    A.active.swaps = A.active.swaps || {}; var it = A.activeWorkout().items[A.active.itemIdx];
    A.active.swaps[it.id] = el.dataset.ex; A.closeSheet(); A.toast("Trocado para " + P.exercise(el.dataset.ex).name); A.render();
  };
  A.actions.cancelWorkout = function () {
    A.sheet("Cancelar treino?", '<p class="muted">As séries registradas neste treino serão descartadas.</p><div class="row"><button class="btn grow" data-act="closeSheet">Voltar</button><button class="btn grow danger" data-act="confirmCancel">Cancelar treino</button></div>');
  };
  A.actions.confirmCancel = function () { A.active = null; A.saveActive(); clearInterval(A.timerInt); A.closeSheet(); A.stack = [{ v: "treinos", p: {} }]; A.tabRoot = "treinos"; A.render(true); };
  A.actions.finishWorkout = function () {
    var n = Object.keys(A.active.done).length;
    var mins = Math.round((Date.now() - A.active.start) / 60000);
    A.sheet("Finalizar treino", '<div class="stack"><div class="card tight row between"><span>Séries registradas</span><b>' + n + '</b></div><div class="field"><label>Duração (min)</label><input id="fnDur" type="number" value="' + Math.max(1, mins) + '"></div>' +
      (P.db.settings.askEffortOnFinish ? '<div class="field"><label>Esforço percebido no treino (1 a 10)</label><div class="scale" id="fnEff">' + [5, 6, 7, 8, 9, 10].map(function (x) { return '<button data-act="fnEff" data-n="' + x + '">' + x + "</button>"; }).join("") + '</div></div><div class="field"><label>Observação para o treinador (opcional)</label><textarea id="fnNote" rows="3" placeholder="Ex: senti o ombro no supino"></textarea></div>' : "") +
      '<button class="btn primary block" data-act="confirmFinish">Salvar treino</button></div>');
  };
  A.actions.fnEff = function (el) { [].forEach.call(document.querySelectorAll("#fnEff button"), function (b) { b.classList.toggle("on", b === el); }); A._eff = parseInt(el.dataset.n, 10); };
  A.actions.confirmFinish = function () {
    var sets = Object.keys(A.active.done).map(function (k) { var d = A.active.done[k]; var swapped = (A.active.swaps || {})[d.itemId]; return { itemId: d.itemId, exId: swapped || d.exId, type: d.type, idx: d.idx, weight: d.weight, reps: d.reps }; });
    var note = (document.getElementById("fnNote") || {}).value || "";
    A.logs().sessions.push({ id: P.uid("ses"), workoutId: A.active.workoutId, workoutName: A.active.workoutName, date: P.todayISO(), durationSec: (parseInt(document.getElementById("fnDur").value, 10) || 1) * 60, effort: A._eff || null, note: note, pse: A.active.pse, exNotes: A.active.exNotes, exDone: Object.keys(A.active.exDone || {}).filter(function (k) { return A.active.exDone[k]; }), sets: sets });
    P.save(); A.active = null; A.saveActive(); A._eff = null; clearInterval(A.timerInt); A.closeSheet();
    A.stack = [{ v: "home", p: {} }]; A.tabRoot = "home"; A.render(true); A.toast("🎉 Treino salvo! Bom trabalho.");
  };

  window.addEventListener("load", function () {
    P.hooks.onError = function (e) { A.toast("Não foi possível salvar: " + P.authError(e)); };
    P.hooks.onPhoto = function () { if (!document.getElementById("modal").innerHTML) A.render(); };
    P.start("student", function (st) {
      A.state = st; A.uid = st === "ready" ? P.myUid : null;
      if (st === "ready" && A.cur().v === "exec" && !A.active) A.stack = [{ v: "home", p: {} }];
      A.render(true);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible" || A.state !== "ready") return;
      P.refresh(function () { if (!document.getElementById("modal").innerHTML && A.cur().v !== "exec") A.render(); });
    });
  });
})();
