/* Site do treinador — núcleo: menu, painel, alunos, check-ins, progresso, bibliotecas e configurações */
(function () {
  "use strict";
  var P = window.Proto;
  var esc = P.esc;
  var T = window.T = { page: "dash", p: {}, actions: {}, pages: {}, after: {}, state: "loading" };

  T.go = function (page, p) { T.page = page; T.p = p || {}; T.render(true); document.getElementById("side").classList.remove("open"); };
  T.render = function (top) {
    document.body.classList.toggle("nologin", T.state !== "ready");
    if (T.state !== "ready") { document.getElementById("side").innerHTML = ""; document.getElementById("main").innerHTML = T.views.login(); return; }
    var menu = [["sec", "Geral"], ["dash", "📊 Painel"], ["alunos", "👥 Alunos"], ["sec", "Bibliotecas"], ["exercicios", "🏋️ Exercícios"], ["tecnicas", "🎯 Técnicas"], ["alimentos", "🥗 Alimentos"], ["sec", "Acompanhamento"], ["questionario", "📋 Questionário de check-in"], ["materiais", "📚 Materiais extras"], ["config", "⚙️ Configurações"]];
    var root = T.page === "aluno" ? "alunos" : T.page;
    document.getElementById("side").innerHTML = '<div class="brand"><i>TG</i>' + esc(P.APP_NAME) + ' <span class="small muted" style="font-weight:600">treinador</span></div>' + menu.map(function (m) {
      return m[0] === "sec" ? '<div class="sec">' + m[1] + "</div>" : '<button class="' + (root === m[0] ? "on" : "") + '" data-act="nav" data-v="' + m[0] + '">' + m[1] + "</button>";
    }).join("") + '<div class="sec">Conta</div><a class="side-link" href="aluno.html" target="_blank">📱 Abrir app do aluno</a><button data-act="logout">🚪 Sair</button>';
    document.getElementById("main").innerHTML = (T.pages[T.page] || T.pages.dash)(T.p);
    if (T.after[T.page]) T.after[T.page](T.p);
    if (top) window.scrollTo(0, 0);
  };
  T.sheet = function (title, body, wide) {
    document.getElementById("modal").innerHTML = '<div class="overlay" data-act="closeSheetBg"><div class="sheet" style="' + (wide ? "max-width:760px" : "") + '"><div class="sheet-head"><h3>' + esc(title) + '</h3><button class="x" data-act="closeSheet">×</button></div>' + body + "</div></div>";
  };
  T.closeSheet = function () { document.getElementById("modal").innerHTML = ""; };
  T.toast = function (msg) { var t = document.createElement("div"); t.className = "toast"; t.style.bottom = "28px"; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200); };
  T.dp = function (o) { return esc(JSON.stringify(o)); };

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el) return;
    if (el.getAttribute("data-act") === "closeSheetBg" && e.target !== el) return;
    var fn = T.actions[el.getAttribute("data-act")]; if (fn) { e.preventDefault(); fn(el, e); }
  });
  ["change", "input"].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      var el = e.target.closest("[data-" + ev + "]"); if (!el) return;
      var fn = T.actions[el.getAttribute("data-" + ev)]; if (fn) fn(el, e);
    });
  });
  /* ---------- Login do treinador ---------- */
  T.views = {};
  T.views.login = function () {
    if (T.state === "login") return '<div class="card stack" style="max-width:380px;margin:40px auto"><div class="brand" style="padding:0"><i>TG</i>' + esc(P.APP_NAME) + ' <span class="small muted" style="font-weight:600">treinador</span></div>' +
      '<div class="field"><label>E-mail</label><input id="tlEmail" type="email" autocomplete="username"></div><div class="field"><label>Senha</label><input id="tlPass" type="password" autocomplete="current-password"></div>' +
      '<button class="btn primary block" data-act="login">Entrar</button><button class="btn ghost block" data-act="forgot">Esqueci minha senha</button></div>';
    var msg = { loading: "Carregando…", denied: "Esta conta não tem acesso ao site do treinador.", error: "Não foi possível carregar os dados. Confira a internet e recarregue a página." }[T.state] || "Carregando…";
    return '<div class="card stack" style="max-width:380px;margin:40px auto;text-align:center"><div class="muted">' + esc(msg) + "</div>" + (T.state === "loading" ? "" : '<button class="btn block" data-act="logout">Sair</button>') + "</div>";
  };
  T.actions.login = function (el) {
    var em = document.getElementById("tlEmail").value.trim(), pw = document.getElementById("tlPass").value;
    if (!em || !pw) { T.toast("Preencha e-mail e senha."); return; }
    el.disabled = true; el.textContent = "Entrando…";
    window.FB.signIn(em, pw).catch(function (e) { el.disabled = false; el.textContent = "Entrar"; T.toast(P.authError(e)); });
  };
  T.actions.forgot = function () {
    var em = document.getElementById("tlEmail").value.trim(); if (!em) { T.toast("Digite seu e-mail no campo acima."); return; }
    window.FB.resetPassword(em).then(function () { T.toast("Enviamos um e-mail para criar nova senha."); }, function (e) { T.toast(P.authError(e)); });
  };
  T.actions.logout = function () { P.flush(); T.closeSheet(); T.page = "dash"; T.p = {}; window.FB.signOut(); };

  T.actions.nav = function (el) { T.go(el.dataset.v); };
  T.actions.menu = function () { document.getElementById("side").classList.toggle("open"); };
  T.actions.closeSheet = T.closeSheet;
  T.actions.closeSheetBg = function () { T.closeSheet(); };

  function daysUntil(iso) { return Math.round((new Date(iso + "T12:00:00") - new Date(P.todayISO() + "T12:00:00")) / 864e5); }
  T.daysUntil = daysUntil;

  /* ---------- Painel ---------- */
  T.pages.dash = function () {
    var st = P.db.students.filter(function (s) { return s.active; }), today = P.todayISO();
    var pend = [], venc = [], ck = [], trained = 0;
    st.forEach(function (s) {
      var l = P.logsOf(s.id);
      l.checkins.forEach(function (c) { if (!c.feedback) pend.push({ s: s, c: c }); });
      var d = daysUntil(s.planEnd); if (d <= 7) venc.push({ s: s, d: d });
      if (daysUntil(s.nextCheckin) <= 0) ck.push(s);
      if (l.sessions.some(function (x) { return x.date === today; })) trained++;
    });
    function kpi(t, v, c) { return '<div class="card kpi"><span class="small muted">' + t + '</span><b style="color:' + (c || "var(--text)") + '">' + v + "</b></div>"; }
    var recent = [];
    st.forEach(function (s) { P.logsOf(s.id).sessions.forEach(function (x) { recent.push({ s: s, x: x }); }); });
    recent.sort(function (a, b) { return a.x.date < b.x.date ? 1 : -1; });
    return '<div class="page-title">Painel</div><div class="muted" style="margin-bottom:16px">Resumo de hoje, ' + P.fmtDate(today) + "</div>" +
      '<div class="kpis">' + kpi("Alunos ativos", st.length, "var(--blue)") + kpi("Check-ins para responder", pend.length, pend.length ? "var(--prep)" : "") + kpi("Check-in liberado hoje", ck.length) + kpi("Treinaram hoje", trained, "var(--valid)") + kpi("Planos vencendo em 7 dias", venc.length, venc.length ? "var(--warm)" : "") + "</div>" +
      '<div class="grid2" style="margin-top:16px"><div class="card"><b>📋 Check-ins aguardando sua resposta</b>' + (pend.length ? '<div class="list" style="margin-top:8px">' + pend.map(function (x) { return '<button class="list-item" data-act="openStudent" data-id="' + x.s.id + '" data-tab="checkins"><span class="grow"><b>' + esc(x.s.name) + '</b><div class="small muted">Enviado em ' + P.fmtDate(x.c.date) + '</div></span><span class="pill accent">Responder</span></button>'; }).join("") + "</div>" : '<div class="empty">Tudo respondido 👏</div>') + "</div>" +
      '<div class="card"><b>⏰ Planos vencendo</b>' + (venc.length ? '<div class="list" style="margin-top:8px">' + venc.map(function (x) { return '<button class="list-item" data-act="openStudent" data-id="' + x.s.id + '"><span class="grow"><b>' + esc(x.s.name) + '</b><div class="small muted">Vence em ' + P.fmtDate(x.s.planEnd) + "</div></span>" + (x.d < 0 ? '<span class="pill" style="color:var(--warm)">Vencido</span>' : '<span class="pill">' + x.d + " dias</span>") + "</button>"; }).join("") + "</div>" : '<div class="empty">Nenhum plano vencendo.</div>') + "</div></div>" +
      '<div class="card" style="margin-top:14px"><b>📲 Check-in liberado (lembrar no WhatsApp)</b>' + (ck.length ? '<div class="list" style="margin-top:8px">' + ck.map(function (s) { return '<div class="list-item"><span class="grow"><b>' + esc(s.name) + '</b><div class="small muted">Check-in desde ' + P.fmtDate(s.nextCheckin) + "</div></span>" + T.waBtn(s) + "</div>"; }).join("") + "</div>" : '<div class="empty">Nenhum check-in liberado hoje.</div>') + "</div>" +
      '<div class="card" style="margin-top:14px"><b>🏋️ Últimos treinos realizados</b>' + (recent.length ? '<table class="t" style="margin-top:6px"><tr><th>Aluno</th><th>Treino</th><th>Data</th><th class="hide-m">Duração</th><th class="hide-m">Esforço</th></tr>' + recent.slice(0, 8).map(function (r) { return '<tr class="click" data-act="openStudent" data-id="' + r.s.id + '" data-tab="progresso"><td>' + esc(r.s.name) + "</td><td>" + esc(r.x.workoutName) + "</td><td>" + P.fmtDate(r.x.date) + '</td><td class="hide-m">' + Math.round(r.x.durationSec / 60) + ' min</td><td class="hide-m">' + (r.x.effort || "—") + "</td></tr>"; }).join("") + "</table>" : '<div class="empty">Nenhum treino ainda.</div>') + "</div>";
  };
  /* Botão "Lembrar no WhatsApp": abre o WhatsApp com a mensagem do check-in pronta. */
  T.waBtn = function (s) {
    if (!s.phone) return '<span class="small muted">sem telefone</span>';
    var link = location.href.replace(/[^/]*([?#].*)?$/, "") + "aluno.html";
    var msg = "Oi, " + String(s.name || "").split(" ")[0] + "! Passando para lembrar do seu check-in no app " + P.APP_NAME + ". É rapidinho: responda as perguntas e envie as fotos por aqui: " + link + " 💪";
    return '<a class="btn sm" style="text-decoration:none;color:var(--text);white-space:nowrap" target="_blank" rel="noopener" href="' + esc(P.waLink(s.phone, msg)) + '">📲 Lembrar no WhatsApp</a>';
  };
  T.actions.openStudent = function (el) { T.go("aluno", { id: el.dataset.id, tab: el.dataset.tab || "geral" }); };

  /* ---------- Alunos ---------- */
  T.pages.alunos = function () {
    var q = (T._q || "").toLowerCase();
    var list = P.db.students.filter(function (s) { return (T._showInactive || s.active) && (!q || (s.name + s.email).toLowerCase().indexOf(q) >= 0); });
    return '<div class="row between wrap"><div><div class="page-title">Alunos</div><div class="muted">' + P.db.students.filter(function (s) { return s.active; }).length + ' ativos</div></div><button class="btn primary" data-act="newStudent">+ Novo aluno</button></div>' +
      '<div class="row wrap" style="margin:16px 0"><input class="grow" style="max-width:360px" placeholder="🔍 Buscar por nome ou e-mail" value="' + esc(T._q || "") + '" data-input="searchSt"><label class="row small muted"><input type="checkbox" style="width:auto" data-change="toggleInactive"' + (T._showInactive ? " checked" : "") + "> Mostrar inativos</label></div>" +
      '<div class="card" style="padding:4px 8px"><table class="t"><tr><th>Nome</th><th class="hide-m">E-mail</th><th>Plano até</th><th class="hide-m">Último treino</th><th>Status</th></tr>' + list.map(function (s) {
        var l = P.logsOf(s.id), last = l.sessions.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0], d = daysUntil(s.planEnd);
        return '<tr class="click" data-act="openStudent" data-id="' + s.id + '"><td><b>' + esc(s.name) + '</b></td><td class="hide-m muted">' + esc(s.email) + "</td><td>" + P.fmtDate(s.planEnd) + (d <= 7 ? ' <span class="pill" style="color:var(--warm)">' + (d < 0 ? "vencido" : d + "d") + "</span>" : "") + '</td><td class="hide-m">' + (last ? P.fmtDate(last.date) : "—") + "</td><td>" + (s.active ? '<span class="pill accent">Ativo</span>' : '<span class="pill">Inativo</span>') + "</td></tr>";
      }).join("") + "</table>" + (list.length ? "" : '<div class="empty">Nenhum aluno encontrado.</div>') + "</div>";
  };
  T.actions.searchSt = function (el) { T._q = el.value; var pos = el.selectionStart; T.render(); var i = document.querySelector("[data-input=searchSt]"); i.focus(); i.setSelectionRange(pos, pos); };
  T.actions.toggleInactive = function (el) { T._showInactive = el.checked; T.render(); };
  T.actions.newStudent = function () {
    T.sheet("Novo aluno", '<div class="stack"><div class="small muted">O aluno entra no app com o e-mail e a senha que você definir aqui.</div><div class="field"><label>Nome completo</label><input id="nsName"></div><div class="grid2"><div class="field"><label>E-mail</label><input id="nsEmail" type="email"></div><div class="field"><label>Senha inicial</label><input id="nsPass" value="' + Math.random().toString(36).slice(2, 10) + '"></div></div>' +
      '<div class="grid2"><div class="field"><label>Telefone</label><input id="nsPhone"></div><div class="field"><label>Plano válido até</label><input id="nsEnd" type="date" value="' + P.addDays(P.todayISO(), 90) + '"></div></div>' +
      '<div class="grid2"><div class="field"><label>Sexo</label><select id="nsSex"><option>Masculino</option><option>Feminino</option></select></div><div class="field"><label>Nascimento</label><input id="nsBirth" type="date"></div></div><div class="grid2"><div class="field"><label>Altura (cm)</label><input id="nsH" type="number"></div><div class="field"><label>Peso (kg)</label><input id="nsW" type="number" step="0.1"></div></div>' +
      '<button class="btn primary block" data-act="saveNewStudent">Criar aluno</button></div>');
  };
  T.actions.saveNewStudent = function (el) {
    function v(id) { return document.getElementById(id).value.trim(); }
    if (!v("nsName") || !v("nsEmail") || !v("nsPass")) { T.toast("Preencha nome, e-mail e senha."); return; }
    if (v("nsPass").length < 6) { T.toast("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (P.db.students.some(function (s) { return s.email.toLowerCase() === v("nsEmail").toLowerCase(); })) { T.toast("Já existe aluno com esse e-mail."); return; }
    var s = { name: v("nsName"), email: v("nsEmail").toLowerCase(), phone: v("nsPhone"), birth: v("nsBirth"), sex: v("nsSex"), height: parseFloat(v("nsH")) || 170, weight: parseFloat(v("nsW")) || 70, activity: "Moderadamente ativo", planEnd: v("nsEnd"), active: true, tags: [], nextCheckin: P.addDays(P.todayISO(), 7), privateNotes: "" };
    var pass = v("nsPass");
    el.disabled = true; el.textContent = "Criando…";
    P.createStudent(s, pass).then(function (id) {
      T.closeSheet();
      T.sheet("Aluno criado", '<div class="stack"><div>Envie estes dados para <b>' + esc(s.name) + '</b> entrar no app:</div><div class="card tight"><div>Endereço: <b>' + esc(location.href.replace(/[^/]*([?#].*)?$/, "") + "aluno.html") + "</b></div><div>E-mail: <b>" + esc(s.email) + "</b></div><div>Senha: <b>" + esc(pass) + '</b></div></div><div class="small muted">A senha não fica guardada no sistema. Se o aluno esquecer, ele usa "Esqueci minha senha" no app.</div><button class="btn primary block" data-act="closeSheet">Ok, montar treino e dieta</button></div>');
      T.go("aluno", { id: id, tab: "treino" });
    }, function (e) { el.disabled = false; el.textContent = "Criar aluno"; T.toast(P.authError(e)); });
  };

  /* ---------- Ficha do aluno ---------- */
  T.pages.aluno = function (p) {
    var s = P.student(p.id); if (!s) return '<div class="empty">Aluno não encontrado.</div>';
    var tabs = [["geral", "Visão geral"], ["treino", "Treino"], ["dieta", "Dieta"], ["checkins", "Check-ins"], ["progresso", "Progresso"], ["anexos", "Anexos"]];
    var pend = P.logsOf(s.id).checkins.filter(function (c) { return !c.feedback; }).length;
    var body = (T.tabs[p.tab] || T.tabs.geral)(s, p);
    return '<button class="back" style="color:var(--accent);font-weight:600" data-act="nav" data-v="alunos">‹ Alunos</button><div class="row between wrap" style="margin-top:8px"><div><div class="page-title">' + esc(s.name) + '</div><div class="small muted">' + esc(s.email) + " · plano até " + P.fmtDate(s.planEnd) + "</div></div>" + '<div class="row wrap">' + T.waBtn(s) + (s.active ? '<span class="pill accent">Ativo</span>' : '<span class="pill">Inativo</span>') + "</div></div>" +
      '<div class="subtabs">' + tabs.map(function (t) { return '<button class="' + (p.tab === t[0] ? "on" : "") + '" data-act="stTab" data-t="' + t[0] + '">' + t[1] + (t[0] === "checkins" && pend ? ' <span class="pill accent">' + pend + "</span>" : "") + "</button>"; }).join("") + "</div>" + body;
  };
  T.actions.stTab = function (el) { T.p.tab = el.dataset.t; T._draftW = null; T._draftD = null; T.render(); };
  T.tabs = {};

  T.tabs.geral = function (s) {
    var age = s.birth ? Math.floor((new Date() - new Date(s.birth)) / 3.15576e10) : 30;
    var tmb = s.sex === "Feminino" ? 10 * s.weight + 6.25 * s.height - 5 * age - 161 : 10 * s.weight + 6.25 * s.height - 5 * age + 5;
    var gasto = tmb * 1.55, imc = s.weight / Math.pow(s.height / 100, 2);
    function f(id, label, val, type) { return '<div class="field"><label>' + label + '</label><input data-change="stField" data-k="' + id + '" type="' + (type || "text") + '" value="' + esc(val == null ? "" : val) + '"></div>'; }
    return '<div class="grid2"><div class="card stack"><b>Dados do aluno</b><div class="grid2">' + f("name", "Nome", s.name) + ('<div class="field"><label>E-mail (login)</label><input value="' + esc(s.email) + '" readonly style="opacity:.7"></div>') + ('<div class="field"><label>Senha</label><button class="btn sm" data-act="sendReset">Enviar e-mail para nova senha</button></div>') + f("phone", "Telefone", s.phone) + f("birth", "Nascimento", s.birth, "date") + f("planEnd", "Plano válido até", s.planEnd, "date") + f("nextCheckin", "Próximo check-in", s.nextCheckin, "date") +
      '<div class="field"><label>Status</label><select data-change="stField" data-k="active"><option value="1"' + (s.active ? " selected" : "") + '>Ativo</option><option value="0"' + (!s.active ? " selected" : "") + ">Inativo (não entra no app)</option></select></div></div>" +
      (s.phone ? '<a class="btn sm" style="text-decoration:none;align-self:flex-start" target="_blank" href="https://wa.me/55' + esc(String(s.phone).replace(/\D/g, "")) + '">💬 Abrir no WhatsApp</a>' : "") + "</div>" +
      '<div class="stack"><div class="card stack"><b>Informações nutricionais</b><div class="grid2">' + f("height", "Altura (cm)", s.height, "number") + f("weight", "Peso (kg)", s.weight, "number") + "</div>" +
      '<div class="kpis"><div class="card tight kpi"><span class="small muted">TMB estimada</span><b style="font-size:20px">' + Math.round(tmb) + ' kcal</b></div><div class="card tight kpi"><span class="small muted">Gasto estimado</span><b style="font-size:20px">' + Math.round(gasto) + ' kcal</b></div><div class="card tight kpi"><span class="small muted">IMC</span><b style="font-size:20px">' + P.round1(imc) + "</b></div></div></div>" +
      '<div class="card stack"><b>Observações pessoais</b><span class="small muted">Só você vê.</span><textarea rows="5" data-change="stField" data-k="privateNotes">' + esc(s.privateNotes || "") + "</textarea></div></div></div>";
  };
  T.actions.sendReset = function () {
    var s = P.student(T.p.id); if (!confirm("Enviar para " + s.email + " um e-mail para criar nova senha?")) return;
    window.FB.resetPassword(s.email).then(function () { T.toast("E-mail enviado para " + s.email + "."); }, function (e) { T.toast(P.authError(e)); });
  };
  T.actions.stField = function (el) {
    var s = P.student(T.p.id), k = el.dataset.k, v = el.value;
    if (k === "active") v = v === "1"; else if (k === "height" || k === "weight") v = parseFloat(v) || s[k];
    s[k] = v; P.save(); T.toast("Salvo"); if (k === "height" || k === "weight" || k === "name" || k === "active") T.render();
  };

  T.tabs.checkins = function (s) {
    var l = P.logsOf(s.id).checkins.slice().reverse(), qs = P.db.questionnaire;
    if (!l.length) return '<div class="empty">Este aluno ainda não enviou check-ins.</div>';
    return l.map(function (c) {
      return '<div class="card stack" style="margin-bottom:14px"><div class="row between"><b>Check-in de ' + P.fmtDate(c.date) + "</b>" + (c.feedback ? '<span class="pill accent">Respondido</span>' : '<span class="pill" style="color:var(--prep)">Aguardando resposta</span>') + "</div>" +
        '<table class="t">' + qs.map(function (q) { var a = c.answers[q.id]; return "<tr><td class=\"muted\">" + esc(q.text) + "</td><td><b>" + (a == null || a === "" ? "—" : esc(a) + (q.type === "scale" ? " / 5" : q.unit ? " " + q.unit : "")) + "</b></td></tr>"; }).join("") + "</table>" +
        (c.photos && c.photos.filter(Boolean).length ? '<div class="row wrap">' + c.photos.filter(Boolean).map(function (ph) { return '<button class="ph" data-act="viewPhoto" data-ref="' + esc(ph) + '" style="background-image:url(' + P.photo(ph) + ')"></button>'; }).join("") + "</div>" : '<div class="small muted">Sem fotos.</div>') +
        '<div class="field"><label>Sua resposta para o aluno (aparece no app dele)</label><textarea rows="3" id="fb_' + c.id + '">' + esc(c.feedback ? c.feedback.text : "") + '</textarea></div><button class="btn primary" style="align-self:flex-start" data-act="sendFeedback" data-id="' + c.id + '">' + (c.feedback ? "Atualizar resposta" : "Enviar resposta") + "</button></div>";
    }).join("");
  };
  T.actions.viewPhoto = function (el) { var src = P.photo(el.dataset.ref); if (src) T.sheet("Foto", '<img src="' + src + '" style="width:100%;border-radius:12px">', true); };
  T.actions.sendFeedback = function (el) {
    var txt = document.getElementById("fb_" + el.dataset.id).value.trim(); if (!txt) { T.toast("Escreva a resposta."); return; }
    var c = P.logsOf(T.p.id).checkins.filter(function (x) { return x.id === el.dataset.id; })[0];
    c.feedback = { text: txt, date: P.todayISO() }; P.save(); T.toast("Resposta enviada ao aluno."); T.render();
  };

  T.tabs.progresso = function (s) {
    var l = P.logsOf(s.id), w = l.weights.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var plan = P.db.workoutPlans[s.id], exIds = [];
    if (plan) plan.workouts.forEach(function (wk) { wk.items.forEach(function (it) { if (exIds.indexOf(it.exId) < 0) exIds.push(it.exId); }); });
    var sel = T._progEx || exIds[0], h = sel ? P.exerciseHistory(s.id, sel) : { list: [] };
    var pts = h.list.slice().reverse().map(function (x) { return { y: Math.max.apply(null, x.sets.map(function (z) { return z.weight; })), label: P.fmtDate(x.date).slice(0, 5) }; });
    // adesão à dieta (últimos 14 dias)
    var dplan = P.db.dietPlans[s.id], ad = [];
    for (var i = 13; i >= 0; i--) { var d = P.addDays(P.todayISO(), -i), v = dplan ? P.variationForDay(dplan, new Date(d + "T12:00:00").getDay()) : null, n = (l.mealsDone[d] || []).length; ad.push({ d: d, n: n, t: v ? v.meals.length : 0 }); }
    var ses = l.sessions.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    return '<div class="grid2"><div class="card"><b>Peso</b>' + P.lineChart(w.map(function (x) { return { y: x.kg, label: P.fmtDate(x.date).slice(0, 5) }; })) + "</div>" +
      '<div class="card"><div class="row between"><b>Evolução de carga</b><select style="width:auto;max-width:60%" data-change="progEx">' + exIds.map(function (id) { return '<option value="' + id + '"' + (id === sel ? " selected" : "") + ">" + esc(P.exercise(id).name) + "</option>"; }).join("") + "</select></div>" + (pts.length ? P.lineChart(pts) : '<div class="empty">Sem registros deste exercício.</div>') + (h.best ? '<div class="small muted">🏆 Recorde: ' + h.best.weight + " kg × " + h.best.reps + " (" + P.fmtDate(h.best.date) + ")</div>" : "") + "</div></div>" +
      '<div class="card" style="margin-top:14px"><b>Adesão à dieta (últimos 14 dias)</b><div class="row" style="gap:4px;margin-top:10px;align-items:flex-end">' + ad.map(function (x) {
        var pct = x.t ? x.n / x.t : 0, col = pct >= 1 ? "var(--valid)" : pct > 0 ? "var(--prep)" : "var(--card2)";
        return '<div class="grow" style="text-align:center"><div title="' + P.fmtDate(x.d) + ": " + x.n + "/" + x.t + '" style="height:34px;border-radius:6px;background:' + col + '"></div><div class="small muted" style="font-size:10px">' + x.d.slice(8) + "</div></div>";
      }).join("") + '</div><div class="small muted" style="margin-top:6px">Verde: todas as refeições · Amarelo: parcial · Cinza: nada marcado</div></div>' +
      '<div class="card" style="margin-top:14px"><b>Treinos realizados</b>' + (ses.length ? '<table class="t"><tr><th>Data</th><th>Treino</th><th class="hide-m">Duração</th><th>Séries</th><th class="hide-m">Esforço</th><th class="hide-m">Observação</th></tr>' + ses.map(function (x) { return "<tr><td>" + P.fmtDate(x.date) + "</td><td>" + esc(x.workoutName) + '</td><td class="hide-m">' + Math.round(x.durationSec / 60) + " min</td><td>" + x.sets.length + '</td><td class="hide-m">' + (x.effort || "—") + '</td><td class="hide-m small">' + esc(x.note || "") + "</td></tr>"; }).join("") + "</table>" : '<div class="empty">Nenhum treino registrado.</div>') + "</div>" +
      '<div class="card" style="margin-top:14px"><b>Observações da dieta enviadas pelo aluno</b>' + (l.mealNotes.length ? l.mealNotes.slice().reverse().map(function (n) { return '<div class="list-item small"><span class="grow"><b>' + P.fmtDate(n.date) + (n.mealName ? " · " + esc(n.mealName) : "") + "</b><div>" + esc(n.text) + "</div></span>" + (n.photo ? '<button class="ph" data-act="viewPhoto" data-ref="' + esc(n.photo) + '" style="width:60px;background-image:url(' + P.photo(n.photo) + ')"></button>' : "") + "</div>"; }).join("") : '<div class="empty">Nenhuma observação.</div>') + "</div>";
  };
  T.actions.progEx = function (el) { T._progEx = el.value; T.render(); };

  T.tabs.anexos = function (s) {
    if (!P.ensureFiles(s.id, function () { if (T.page === "aluno" && T.p.id === s.id) T.render(); })) return '<div class="empty">Carregando anexos…</div>';
    var list = P.db.attachments[s.id] || [];
    return '<div class="card stack"><div class="row between wrap"><b>Arquivos para o aluno</b><label class="btn sm">+ Adicionar arquivo<input type="file" hidden data-change="addAttach"></label></div>' + (list.length ? '<div class="list">' + list.map(function (a, i) { return '<div class="list-item"><span class="grow">📎 ' + esc(a.name) + ' <span class="small muted">· ' + P.fmtDate(a.date) + " · " + Math.round(a.size / 1024) + ' KB</span></span><button class="btn sm danger" data-act="delAttach" data-i="' + i + '">Remover</button></div>'; }).join("") + "</div>" : '<div class="empty">Nenhum anexo. (Arquivos de até 500 KB.)</div>') + "</div>";
  };
  T.actions.addAttach = function (el) {
    var f = el.files[0]; if (!f) return; var used = (P.db.attachments[T.p.id] || []).reduce(function (a, x) { return a + (x.size || 0); }, 0);
    if (f.size > 500000) { T.toast("Use arquivos de até 500 KB (ex.: PDF comprimido)."); return; }
    if (used + f.size > 650000) { T.toast("Limite de anexos deste aluno atingido. Remova algum arquivo antigo."); return; }
    var r = new FileReader(); r.onload = function () { (P.db.attachments[T.p.id] = P.db.attachments[T.p.id] || []).push({ name: f.name, size: f.size, date: P.todayISO(), data: r.result }); P.save(); T.toast("Arquivo enviado."); T.render(); }; r.readAsDataURL(f);
  };
  T.actions.delAttach = function (el) { P.db.attachments[T.p.id].splice(parseInt(el.dataset.i, 10), 1); P.save(); T.render(); };

  /* ---------- Bibliotecas ---------- */
  T.pages.exercicios = function () {
    var q = (T._exQ || "").toLowerCase(), list = P.db.exercises.filter(function (e) { return !q || (e.name + e.group).toLowerCase().indexOf(q) >= 0; });
    return '<div class="row between wrap"><div><div class="page-title">Exercícios</div><div class="muted">' + P.db.exercises.length + ' na biblioteca</div></div><button class="btn primary" data-act="editEx">+ Novo exercício</button></div>' +
      '<input style="max-width:360px;margin:16px 0" placeholder="🔍 Buscar" value="' + esc(T._exQ || "") + '" data-input="exQ"><div class="card" style="padding:4px 8px"><table class="t"><tr><th>Nome</th><th>Grupo muscular</th><th class="hide-m">Vídeo</th><th></th></tr>' + list.map(function (e) {
        return "<tr><td><b>" + esc(e.name) + "</b></td><td>" + esc(e.group) + '</td><td class="hide-m">' + (e.video ? '<span class="pill accent">tem vídeo</span>' : '<span class="small muted">sem vídeo</span>') + '</td><td style="text-align:right"><button class="btn sm" data-act="editEx" data-id="' + e.id + '">Editar</button></td></tr>';
      }).join("") + "</table></div>";
  };
  T.actions.exQ = function (el) { T._exQ = el.value; var pos = el.selectionStart; T.render(); var i = document.querySelector("[data-input=exQ]"); i.focus(); i.setSelectionRange(pos, pos); };
  T.actions.editEx = function (el) {
    var e = el.dataset.id ? P.db.exercises.filter(function (x) { return x.id === el.dataset.id; })[0] : { name: "", group: P.db.groups[0], video: "" };
    T.sheet(el.dataset.id ? "Editar exercício" : "Novo exercício", '<div class="stack"><div class="field"><label>Nome</label><input id="exName" value="' + esc(e.name) + '"></div><div class="field"><label>Grupo muscular (conta no volume)</label><select id="exGroup">' + P.db.groups.map(function (g) { return "<option" + (g === e.group ? " selected" : "") + ">" + esc(g) + "</option>"; }).join("") + '</select></div><div class="field"><label>Link do vídeo (YouTube, opcional)</label><input id="exVideo" placeholder="https://youtube.com/..." value="' + esc(e.video || "") + '"></div><button class="btn primary block" data-act="saveEx" data-id="' + (el.dataset.id || "") + '">Salvar</button></div>');
  };
  T.actions.saveEx = function (el) {
    var name = document.getElementById("exName").value.trim(); if (!name) { T.toast("Informe o nome."); return; }
    var e = el.dataset.id ? P.db.exercises.filter(function (x) { return x.id === el.dataset.id; })[0] : null;
    if (!e) { e = { id: P.uid("ex"), active: true }; P.db.exercises.push(e); }
    e.name = name; e.group = document.getElementById("exGroup").value; e.video = document.getElementById("exVideo").value.trim();
    P.save(); T.closeSheet(); T.render(); T.toast("Exercício salvo.");
  };

  T.pages.tecnicas = function () {
    return '<div class="row between wrap"><div class="page-title">Técnicas de exercício</div><button class="btn primary" data-act="addTec">+ Nova técnica</button></div><div class="card" style="margin-top:16px;padding:4px 8px"><table class="t"><tr><th>Nome</th><th>Cor</th><th></th></tr>' + P.db.techniques.map(function (t) {
      return '<tr><td><input value="' + esc(t.name) + '" data-change="tecField" data-id="' + t.id + '" data-k="name"></td><td><input type="color" style="width:56px;padding:2px" value="' + t.color + '" data-change="tecField" data-id="' + t.id + '" data-k="color"></td><td style="text-align:right"><button class="btn sm danger" data-act="delTec" data-id="' + t.id + '">Remover</button></td></tr>';
    }).join("") + "</table></div>";
  };
  T.actions.addTec = function () { P.db.techniques.push({ id: P.uid("tec"), name: "Nova técnica", color: "#2dd4bf" }); P.save(); T.render(); };
  T.actions.tecField = function (el) { var t = P.technique(el.dataset.id); t[el.dataset.k] = el.value; P.save(); T.toast("Salvo"); };
  T.actions.delTec = function (el) { P.db.techniques = P.db.techniques.filter(function (t) { return t.id !== el.dataset.id; }); P.save(); T.render(); };

  T.pages.alimentos = function () {
    var q = (T._alQ || "").toLowerCase(), list = P.db.foods.filter(function (f) { return !q || f.name.toLowerCase().indexOf(q) >= 0; });
    return '<div class="row between wrap"><div><div class="page-title">Alimentos</div><div class="muted">Valores por 100 g (base: tabela TACO)</div></div><button class="btn primary" data-act="editFood">+ Novo alimento</button></div>' +
      '<input style="max-width:360px;margin:16px 0" placeholder="🔍 Buscar" value="' + esc(T._alQ || "") + '" data-input="alQ"><div class="card" style="padding:4px 8px"><table class="t"><tr><th>Alimento</th><th>kcal</th><th>P</th><th>C</th><th>G</th><th class="hide-m">Medidas caseiras</th><th></th></tr>' + list.map(function (f) {
        return "<tr><td><b>" + esc(f.name) + "</b></td><td>" + f.kcal + "</td><td>" + f.p + "</td><td>" + f.c + "</td><td>" + f.g + '</td><td class="hide-m small muted">' + (f.units || []).map(function (u) { return esc(u.name) + " (" + u.g + "g)"; }).join(", ") + '</td><td style="text-align:right"><button class="btn sm" data-act="editFood" data-id="' + f.id + '">Editar</button></td></tr>';
      }).join("") + "</table></div>";
  };
  T.actions.alQ = function (el) { T._alQ = el.value; var pos = el.selectionStart; T.render(); var i = document.querySelector("[data-input=alQ]"); i.focus(); i.setSelectionRange(pos, pos); };
  T.actions.editFood = function (el) {
    var f = el.dataset.id ? P.food(el.dataset.id) : { name: "", kcal: 0, p: 0, c: 0, g: 0, fib: 0, units: [] };
    function n(id, l, v) { return '<div class="field"><label>' + l + '</label><input id="' + id + '" type="number" step="0.1" value="' + v + '"></div>'; }
    T.sheet(el.dataset.id ? "Editar alimento" : "Novo alimento", '<div class="stack"><div class="field"><label>Nome</label><input id="fdName" value="' + esc(f.name) + '"></div><div class="ed-grid">' + n("fdK", "kcal / 100 g", f.kcal) + n("fdP", "Proteína (g)", f.p) + n("fdC", "Carboidrato (g)", f.c) + n("fdG", "Gordura (g)", f.g) + n("fdF", "Fibra (g)", f.fib || 0) + "</div>" +
      '<div class="field"><label>Medidas caseiras (uma por linha: nome = gramas)</label><textarea id="fdU" rows="3" placeholder="Colher de sopa = 15">' + esc((f.units || []).map(function (u) { return u.name + " = " + u.g; }).join("\n")) + '</textarea></div><button class="btn primary block" data-act="saveFood" data-id="' + (el.dataset.id || "") + '">Salvar</button></div>');
  };
  T.actions.saveFood = function (el) {
    var name = document.getElementById("fdName").value.trim(); if (!name) { T.toast("Informe o nome."); return; }
    var f = el.dataset.id ? P.food(el.dataset.id) : null; if (!f) { f = { id: P.uid("al") }; P.db.foods.push(f); }
    function n(id) { return parseFloat(document.getElementById(id).value) || 0; }
    f.name = name; f.kcal = n("fdK"); f.p = n("fdP"); f.c = n("fdC"); f.g = n("fdG"); f.fib = n("fdF");
    f.units = document.getElementById("fdU").value.split("\n").map(function (l) { var m = l.split("="); return m.length === 2 && parseFloat(m[1]) ? { name: m[0].trim(), g: parseFloat(m[1]) } : null; }).filter(Boolean);
    P.save(); T.closeSheet(); T.render(); T.toast("Alimento salvo.");
  };

  /* ---------- Questionário ---------- */
  T.pages.questionario = function () {
    var types = [["scale", "Escala 1 a 5"], ["choice", "Múltipla escolha"], ["number", "Número"], ["text", "Texto livre"]];
    return '<div class="row between wrap"><div><div class="page-title">Questionário de check-in</div><div class="muted">Perguntas que o aluno responde no app.</div></div><button class="btn primary" data-act="addQ">+ Nova pergunta</button></div><div class="stack" style="margin-top:16px">' + P.db.questionnaire.map(function (q, i) {
      return '<div class="card stack"><div class="row"><b class="muted">' + (i + 1) + '.</b><input class="grow" value="' + esc(q.text) + '" data-change="qField" data-i="' + i + '" data-k="text"><button class="icon-btn" data-act="moveQ" data-i="' + i + '" data-d="-1">↑</button><button class="icon-btn" data-act="moveQ" data-i="' + i + '" data-d="1">↓</button><button class="icon-btn" style="color:var(--danger)" data-act="delQ" data-i="' + i + '">×</button></div>' +
        '<div class="row wrap"><select style="width:auto" data-change="qField" data-i="' + i + '" data-k="type">' + types.map(function (t) { return '<option value="' + t[0] + '"' + (q.type === t[0] ? " selected" : "") + ">" + t[1] + "</option>"; }).join("") + "</select>" +
        (q.type === "choice" ? '<input class="grow" placeholder="Opções separadas por vírgula" value="' + esc((q.options || []).join(", ")) + '" data-change="qField" data-i="' + i + '" data-k="options">' : "") + (q.type === "number" ? '<input style="width:120px" placeholder="unidade (kg)" value="' + esc(q.unit || "") + '" data-change="qField" data-i="' + i + '" data-k="unit">' : "") + "</div></div>";
    }).join("") + "</div>";
  };
  T.actions.addQ = function () { P.db.questionnaire.push({ id: P.uid("q"), text: "Nova pergunta", type: "scale" }); P.save(); T.render(); };
  T.actions.qField = function (el) { var q = P.db.questionnaire[el.dataset.i]; q[el.dataset.k] = el.dataset.k === "options" ? el.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean) : el.value; P.save(); if (el.dataset.k === "type") T.render(); else T.toast("Salvo"); };
  T.actions.moveQ = function (el) { var a = P.db.questionnaire, i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= a.length) return; a.splice(j, 0, a.splice(i, 1)[0]); P.save(); T.render(); };
  T.actions.delQ = function (el) { P.db.questionnaire.splice(+el.dataset.i, 1); P.save(); T.render(); };

  /* ---------- Materiais ---------- */
  T.pages.materiais = function () {
    var total = P.db.students.filter(function (s) { return s.active; }).length;
    return '<div class="row between wrap"><div><div class="page-title">Materiais extras</div><div class="muted">Conteúdos que todos os alunos veem no app.</div></div><button class="btn primary" data-act="editMat">+ Novo material</button></div><div class="card" style="margin-top:16px;padding:4px 8px"><table class="t"><tr><th>Material</th><th>Aberturas</th><th></th></tr>' + P.db.materials.map(function (m) {
      var opened = P.db.students.filter(function (s) { return P.logsOf(s.id).materialsSeen.indexOf(m.id) >= 0; }).length;
      return "<tr><td><b>" + esc(m.title) + '</b><div class="small muted">' + esc(m.desc) + "</div></td><td>" + opened + " de " + total + '</td><td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="editMat" data-id="' + m.id + '">Editar</button> <button class="btn sm danger" data-act="delMat" data-id="' + m.id + '">Remover</button></td></tr>';
    }).join("") + "</table></div>";
  };
  T.actions.editMat = function (el) {
    var m = el.dataset.id ? P.db.materials.filter(function (x) { return x.id === el.dataset.id; })[0] : { title: "", desc: "", body: "" };
    T.sheet(el.dataset.id ? "Editar material" : "Novo material", '<div class="stack"><div class="field"><label>Título</label><input id="mtT" value="' + esc(m.title) + '"></div><div class="field"><label>Resumo</label><input id="mtD" value="' + esc(m.desc) + '"></div><div class="field"><label>Conteúdo</label><textarea id="mtB" rows="8">' + esc(m.body) + '</textarea></div><button class="btn primary block" data-act="saveMat" data-id="' + (el.dataset.id || "") + '">Salvar</button></div>', true);
  };
  T.actions.saveMat = function (el) {
    var t = document.getElementById("mtT").value.trim(); if (!t) { T.toast("Informe o título."); return; }
    var m = el.dataset.id ? P.db.materials.filter(function (x) { return x.id === el.dataset.id; })[0] : null; if (!m) { m = { id: P.uid("mat") }; P.db.materials.push(m); }
    m.title = t; m.desc = document.getElementById("mtD").value; m.body = document.getElementById("mtB").value; P.save(); T.closeSheet(); T.render(); T.toast("Material salvo.");
  };
  T.actions.delMat = function (el) { P.db.materials = P.db.materials.filter(function (m) { return m.id !== el.dataset.id; }); P.save(); T.render(); };

  /* ---------- Configurações ---------- */
  T.pages.config = function () {
    var c = P.db.settings;
    function tg(k, t, d) { return '<div class="list-item"><span class="grow"><b>' + t + '</b><div class="small muted">' + d + '</div></span><button class="toggle' + (c[k] ? " on" : "") + '" data-act="cfgToggle" data-k="' + k + '"></button></div>'; }
    return '<div class="page-title">Configurações</div><div class="card" style="margin-top:16px;padding-top:2px;padding-bottom:2px"><div class="list">' +
      tg("askEffortOnFinish", "Pedir esforço e observação ao finalizar treino", "O aluno dá uma nota de 1 a 10 e pode deixar um recado.") +
      tg("allowUnitChange", "Aluno pode trocar a unidade de medida", "Ex: ver 150 g de arroz como 10 colheres de sopa.") +
      '<div class="list-item"><span class="grow"><b>Mínimo de fotos no check-in</b><div class="small muted">O app não deixa enviar com menos fotos.</div></span><input type="number" min="0" max="3" style="width:80px" value="' + (c.minPhotos || 0) + '" data-change="cfgMin"></div></div></div>';
  };
  T.actions.cfgToggle = function (el) { P.db.settings[el.dataset.k] = !P.db.settings[el.dataset.k]; P.save(); T.render(); };
  T.actions.cfgMin = function (el) { P.db.settings.minPhotos = Math.max(0, Math.min(3, parseInt(el.value, 10) || 0)); P.save(); T.toast("Salvo"); };

  window.addEventListener("load", function () {
    P.hooks.onError = function (e) { T.toast("Não foi possível salvar: " + P.authError(e)); };
    P.hooks.onPhoto = function () { if (!document.getElementById("modal").innerHTML) T.render(); };
    P.start("trainer", function (st) { T.state = st; T.render(true); });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible" || T.state !== "ready" || T._dirty) return;
      P.refresh(function () { if (!document.getElementById("modal").innerHTML && !document.activeElement.matches("input,textarea,select")) T.render(); });
    });
  });
})();
