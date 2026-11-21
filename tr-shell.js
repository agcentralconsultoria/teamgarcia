/* Site do treinador — moldura: menu fino só com ícones (submenus ao passar o mouse), barra do topo
   (tema claro/escuro, sino, conta) e ícone ao lado do título de cada página. */
(function () {
  "use strict";
  var P = window.Proto, T = window.T, esc = P.esc;
  var V = "20261116d";

  function svg(d) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>"; }
  var IC = {
    inicio: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    alunos: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'),
    treino: svg('<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>'),
    dieta: svg('<path d="M7 3v7a2 2 0 0 0 4 0V3M9 12v9M17 3c-2 2-2 6 0 8v10"/>'),
    conteudo: svg('<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>'),
    config: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
    app: svg('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'),
    sair: svg('<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>'),
    sino: svg('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>'),
    sol: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>'),
    lampada: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>'),
    ajuda: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>'),
    voltar: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    menu: svg('<path d="M4 6h16M4 12h10M4 18h16M17 9l3 3-3 3"/>'),
    cima: svg('<path d="M6 15l6-6 6 6"/>'),
    baixo: svg('<path d="M6 9l6 6 6-6"/>'),
    comunidade: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
    equipe: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.6c2 .6 3.5 2.3 3.5 5.4"/>'),
    lua: svg('<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/>')
  };
  var MENU = [
    { k: "inicio", label: "Início", go: "dash", pages: ["dash"] },
    { k: "alunos", label: "Alunos", items: [["alunos", "Alunos"], ["questionario", "Questionários dinâmicos"], ["notificacoes", "Notificações"]], pages: ["alunos", "aluno", "questionario", "notificacoes"] },
    { k: "treino", label: "Treino", items: [["modelosT", "Treinos pré-definidos"], ["exercicios", "Exercícios"], ["substEx", "Substituição de exercício"], ["tecnicas", "Técnicas de exercício"], ["grupos", "Grupamentos musculares"]], pages: ["modelosT", "exercicios", "substEx", "tecnicas", "grupos"] },
    { k: "dieta", label: "Dieta", items: [["modelosD", "Dietas pré-definidas"], ["alimentos", "Alimentos"], ["substAl", "Substituição de alimentos"], ["modelosR", "Refeições pré-definidas"]], pages: ["modelosD", "alimentos", "substAl", "modelosR"] },
    { k: "comunidade", label: "Comunidade", items: [["feed", "Feed da comunidade"], ["competicoes", "Competições"]], pages: ["feed", "competicoes"] },
    { k: "conteudo", label: "Conteúdo", items: [["materiais", "Materiais extras"]], pages: ["materiais"] },
    { k: "equipe", label: "Equipe", items: [["funcionarios", "Funcionários"], ["permissoes", "Permissões de funcionário"], ["logs", "Logs de auditoria"]], pages: ["funcionarios", "permissoes", "logs", "grupoEdit"] },
    { k: "ajuda", label: "Ajuda", items: [["ajuda", "Central de ajuda"], ["aulas", "Aulas"], ["suporte", "Suporte"]], pages: ["ajuda", "aulas", "suporte", "conta"] },
    { k: "config", label: "Configurações", go: "config", pages: ["config"] }
  ];
  /* Permissão que cada página exige ("dono" = só o treinador dono da conta). Sem entrada = livre para a equipe. */
  var NEED = { alunos: "alunos", aluno: "alunos", questionario: "questionarios", notificacoes: "notificacoes", modelosT: "modelosT", exercicios: "exercicios", tecnicas: "exercicios", grupos: "exercicios",
    substEx: "substEx", modelosD: "modelosD", alimentos: "alimentos", substAl: "substAl", modelosR: "refeicoes", materiais: "materiais", config: "config",
    feed: "comunidade", competicoes: "comunidade", funcionarios: "dono", permissoes: "dono", logs: "dono", grupoEdit: "dono" };
  T.needOf = function (page, p) { if (page === "tplEdit") return p && p.k === "d" ? "modelosD" : "modelosT"; return NEED[page] || ""; };
  T.allowed = function (page, p) { var n = T.needOf(page, p); if (!n) return true; if (n === "dono") return P.isOwner; return P.can(n); };
  function visibleMenu() {
    return MENU.map(function (m) {
      if (m.go) return T.allowed(m.go) ? m : null;
      var items = m.items.filter(function (i) { return T.allowed(i[0]); });
      if (!items.length) return null;
      var c = {}; Object.keys(m).forEach(function (k) { c[k] = m[k]; }); c.items = items; return c;
    }).filter(Boolean);
  }
  function groupOf(page) {
    if (page === "tplEdit") return T.p && T.p.k === "d" ? MENU[3] : MENU[2];
    return MENU.filter(function (m) { return m.pages.indexOf(page) >= 0; })[0] || MENU[0];
  }

  /* ---------- Tema claro/escuro ---------- */
  function theme() { try { return localStorage.getItem("teamgarcia.tema") || "escuro"; } catch (e) { return "escuro"; } }
  function applyTheme() { document.documentElement.setAttribute("data-theme", theme() === "claro" ? "light" : "dark"); }
  applyTheme();
  T.actions.themeToggle = function () { try { localStorage.setItem("teamgarcia.tema", theme() === "claro" ? "escuro" : "claro"); } catch (e) {} applyTheme(); T.render(); };

  /* ---------- Menu lateral ---------- */
  function sideHtml() {
    var cur = groupOf(T.page).k;
    return '<div class="rail-logo"><img src="icons/logo.png?v=' + V + '" alt="AG"><b>' + esc(P.APP_NAME) + '</b><button class="rail-close" data-act="menu" title="Fechar menu">' + IC.voltar + "</button></div>" + visibleMenu().map(function (m) {
      var on = (m.k === cur ? " on" : "") + (m.k === T._railOpen ? " open" : "");
      if (m.go) return '<div class="rail-item' + on + '"><button class="rail-btn" data-act="nav" data-v="' + m.go + '" title="' + m.label + '">' + IC[m.k] + '<span class="rail-label">' + m.label + '</span></button><div class="fly"><div class="fly-in"><button data-act="nav" data-v="' + m.go + '">' + m.label + "</button></div></div></div>";
      return '<div class="rail-item' + on + '"><button class="rail-btn" ' + (m.items.length === 1 ? 'data-act="nav" data-v="' + m.items[0][0] + '"' : 'data-act="railOpen" data-k="' + m.k + '"') + ' title="' + m.label + '">' + IC[m.k] + '<span class="rail-label">' + m.label + '</span></button><div class="fly"><div class="fly-in">' + m.items.map(function (i) {
        return '<button class="' + (T.page === i[0] || (i[0] === "alunos" && T.page === "aluno") ? "on" : "") + '" data-act="nav" data-v="' + i[0] + '">' + i[1] + "</button>";
      }).join("") + "</div></div></div>";
    }).join("") + '<div class="rail-sep"></div>' +
      '<div class="rail-item"><a class="rail-btn" href="aluno.html" target="_blank" title="Abrir app do aluno">' + IC.app + '<span class="rail-label">Abrir app do aluno</span></a><div class="fly"><div class="fly-in"><a href="aluno.html" target="_blank">Abrir app do aluno</a></div></div></div>' +
      '<div class="rail-item"><button class="rail-btn" data-act="logout" title="Sair">' + IC.sair + '<span class="rail-label">Sair</span></button><div class="fly"><div class="fly-in"><button data-act="logout">Sair</button></div></div></div>';
  }
  T.actions.railOpen = function (el) {
    var it = el.closest(".rail-item"), was = it.classList.contains("open");
    [].forEach.call(document.querySelectorAll(".rail-item.open"), function (x) { x.classList.remove("open"); });
    if (!was) it.classList.add("open");
    T._railOpen = was ? null : el.dataset.k; // lembra o grupo aberto se a tela for redesenhada
  };
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".rail-item")) { T._railOpen = null; [].forEach.call(document.querySelectorAll(".rail-item.open"), function (x) { x.classList.remove("open"); }); }
    // celular: tocar fora do menu aberto fecha a gaveta
    var side = document.getElementById("side");
    if (side && side.classList.contains("open") && !e.target.closest("#side") && !e.target.closest("[data-act=menu]")) side.classList.remove("open");
  });

  var shellGo = T.go;
  T.go = function (page, p) {
    if (T.state === "ready" && !T.allowed(page, p)) { T.toast("Você não tem permissão para esta área. Fale com o responsável pela conta."); page = "dash"; p = {}; }
    shellGo(page, p);
  };
  var baseNav = T.actions.nav;
  T.actions.nav = function (el) { T._railOpen = null; baseNav(el); };

  /* ---------- Barra do topo ---------- */
  function pending() {
    return P.db.students.filter(function (s) { return s.active && !s.__tpl && P.logsOf(s.id).checkins.some(function (c) { return !c.feedback && c.kind !== "fotos"; }); });
  }
  function topHtml() {
    var u = window.FB && window.FB.user && window.FB.user(), mail = u && u.email || "", n = pending().length, light = theme() === "claro";
    return '<div class="topbar"><button class="top-menu" data-act="menu" title="Menu">' + IC.menu + '</button><span class="top-bulb" title="Tema claro ou escuro">' + IC.lampada + '</span><button class="theme-sw' + (light ? " light" : "") + '" data-act="themeToggle" title="' + (light ? "Mudar para o tema escuro" : "Mudar para o tema claro") + '"><i>' + (light ? IC.sol : IC.lua) + "</i></button>" +
      '<button class="top-sup" data-act="nav" data-v="suporte" title="Ajuda e suporte">' + IC.ajuda + "<span>Suporte</span></button>" +
      '<button class="top-ico" data-act="bellOpen" title="Atualizações aguardando sua resposta">' + IC.sino + (n ? '<span class="badge">' + n + "</span>" : "") + "</button>" +
      '<button class="top-user" data-act="userMenu"><span class="top-name"><b>' + esc(P.isOwner ? (P.db.settings.trainerName || "Ângelo") : P.whoName()) + '</b><span class="small muted">' + esc(P.isOwner ? (P.db.settings.trainerRole || "Treinador") : "Equipe") + '</span></span><img src="icons/logo.png?v=' + V + '" alt=""></button></div>';
  }
  T.actions.bellOpen = function () {
    var list = pending();
    T.sheet("Aguardando sua resposta", list.length ? '<div class="list">' + list.map(function (s) {
      var c = P.logsOf(s.id).checkins.filter(function (x) { return !x.feedback && x.kind !== "fotos"; }).pop();
      return '<button class="list-item" data-act="bellGo" data-id="' + s.id + '"><span class="grow"><b>' + esc(s.name) + '</b><div class="small muted">' + esc(P.formName(c.kind)) + " · " + P.fmtDate(c.date) + '</div></span><span class="pill accent">Responder</span></button>';
    }).join("") + "</div>" : '<div class="empty">Nenhuma atualização esperando resposta. 👏</div>');
  };
  T.actions.bellGo = function (el) { T.closeSheet(); T.go("aluno", { id: el.dataset.id, tab: "atualizacoes" }); };
  T.actions.userMenu = function () {
    var old = document.querySelector(".user-dd"); if (old) { old.remove(); return; }
    function item(act, ico, label, extra) { return "<button " + act + (extra || "") + ">" + ico + "<span>" + label + "</span></button>"; }
    document.querySelector(".topbar").insertAdjacentHTML("beforeend", '<div class="user-dd">' +
      item('data-act="nav" data-v="conta"', IC.alunos, "Conta") + item('data-act="nav" data-v="suporte"', IC.ajuda, "Suporte") +
      '<a href="aluno.html" target="_blank">' + IC.app + "<span>Abrir app do aluno</span></a>" +
      item('data-act="userTheme"', theme() === "claro" ? IC.lua : IC.sol, theme() === "claro" ? "Tema escuro" : "Tema claro") +
      item('data-act="logout"', IC.sair, "Sair", ' class="danger"') + "</div>");
  };
  document.addEventListener("click", function (e) { if (!e.target.closest(".top-user") && !e.target.closest(".user-dd")) { var d = document.querySelector(".user-dd"); if (d) d.remove(); } });
  T.actions.userTheme = function () { T.actions.themeToggle(); };

  /* ---------- Página Conta ---------- */
  T.pages.conta = function () {
    var u = window.FB && window.FB.user && window.FB.user(), c = P.db.settings;
    function f(k, label, ph) { return '<div class="field"><label>' + label + '</label><input value="' + esc(c[k] || "") + '" placeholder="' + (ph || "") + '" data-change="contaField" data-k="' + k + '"></div>'; }
    return '<div class="page-title">Conta</div><div class="muted" style="margin-bottom:14px">Seus dados no site do treinador.</div>' +
      '<div class="grid2"><div class="card stack"><b>Como você aparece</b><div class="grid2">' + f("trainerName", "Nome (aparece no topo)") + f("trainerRole", "Função (ex.: Treinador, Nutricionista)") + '</div><div class="small muted">Salva sozinho ao sair do campo.</div></div>' +
      '<div class="card stack"><b>Acesso</b><div class="field"><label>E-mail de login</label><input value="' + esc(u && u.email || "") + '" readonly style="opacity:.7"></div><button class="btn" style="align-self:flex-start" data-act="contaSenha">✉️ Enviar e-mail para trocar a senha</button><div class="small muted">A senha não fica guardada no sistema. O link chega no e-mail acima.</div></div></div>' +
      '<div class="card stack" style="margin-top:14px"><b>Contato de suporte para os seus alunos</b><div class="small muted">Aparece na página Suporte e no perfil do aluno, no app, como "Falar com meu treinador".</div><div class="grid2">' + f("supportWhats", "WhatsApp (com DDD)", "21999990000") + f("supportEmail", "E-mail (opcional)", "voce@exemplo.com") + "</div></div>";
  };
  T.actions.contaField = function (el) { P.db.settings[el.dataset.k] = el.value.trim(); P.save(); T.toast("Salvo"); if (/trainer/.test(el.dataset.k)) T.render(); };
  T.actions.contaSenha = function () {
    var u = window.FB && window.FB.user && window.FB.user(); if (!u || !u.email) return;
    if (!confirm("Enviar para " + u.email + " um e-mail para criar nova senha?")) return;
    window.FB.resetPassword(u.email).then(function () { T.toast("E-mail enviado para " + u.email + "."); }, function (e) { T.toast(P.authError(e)); });
  };

  /* ---------- Página Suporte: ajuda rápida, contato e registro de problemas ---------- */
  var GUIA = [
    ["Cadastrar um aluno", "Vá em Alunos e toque em + Novo aluno. Defina o e-mail e a senha inicial e envie esses dados para ele. Depois monte o treino e a dieta nas abas da ficha."],
    ["Montar ou trocar o treino", "Abra o aluno e entre em Ficha de treino. Adicione os exercícios, séries e intervalos e toque em Salvar e enviar ao aluno. Para começar de um modelo, use Importar treino pré-definido."],
    ["Montar ou trocar a dieta", "Abra o aluno e entre em Ficha de dieta. Crie as refeições, opções e substituições e salve. O app mostra ao aluno o que mudou."],
    ["Pedir check-in e fotos", "Na aba Atualizações do aluno, em Programados, crie uma atualização com data, questionários e fotos. Ela pode se repetir sozinha toda semana."],
    ["Responder um check-in", "O sino no topo mostra quem está esperando resposta. Abra, leia as respostas e escreva o seu retorno: ele aparece no app do aluno."],
    ["Mandar um aviso para os alunos", "Em Alunos > Notificações, crie o aviso para todos, para uma etiqueta ou para alunos específicos. Ele aparece no sino do app."],
    ["Colocar o app na tela do celular do aluno", "O aluno abre o endereço do app no navegador, toca em Compartilhar e escolhe Adicionar à Tela de Início."]
  ];
  T.pages.suporte = function () {
    var c = P.db.settings, list = (P.db.issues || []).slice().reverse(), open = list.filter(function (x) { return !x.done; }).length;
    var wa = c.supportWhats ? P.waLink(c.supportWhats, "") : "";
    return '<div class="page-title">Suporte</div><div class="muted" style="margin-bottom:14px">Ajuda rápida, o seu contato para os alunos e o registro de problemas do app.</div>' +
      '<div class="card stack"><b style="font-size:17px">Precisa de ajuda?</b><div class="small muted">Toque numa pergunta para ver o passo a passo.</div>' + GUIA.map(function (g, i) {
        var on = T._guia === i;
        return '<div class="guia"><button class="guia-q" data-act="guiaTog" data-i="' + i + '"><span class="grow">' + esc(g[0]) + "</span><span>" + (on ? "−" : "+") + "</span></button>" + (on ? '<div class="guia-a">' + esc(g[1]) + "</div>" : "") + "</div>";
      }).join("") + "</div>" +
      '<div class="grid2" style="margin-top:14px"><div class="card stack"><b>Contato de suporte dos seus alunos</b>' + (c.supportWhats || c.supportEmail ?
        (c.supportWhats ? '<a class="btn" style="text-decoration:none;color:var(--text);align-self:flex-start" target="_blank" rel="noopener" href="' + esc(wa) + '">💬 WhatsApp: ' + esc(c.supportWhats) + "</a>" : "") + (c.supportEmail ? '<div>✉️ ' + esc(c.supportEmail) + "</div>" : "") + '<div class="small muted">É o que o aluno vê em "Falar com meu treinador" no app.</div>'
        : '<div class="small muted">Nenhum contato cadastrado ainda.</div>') + '<button class="btn sm" style="align-self:flex-start" data-act="nav" data-v="conta">Editar contato</button></div>' +
      '<div class="card stack"><b>Registrar um problema ou ideia</b><div class="small muted">Anote aqui o que você ou seus alunos encontrarem. Fica guardado para a gente corrigir depois.</div><textarea id="issTxt" rows="3" placeholder="Ex.: no celular do João o botão de enviar fotos não respondeu"></textarea><button class="btn primary" style="align-self:flex-start" data-act="issAdd">Registrar</button></div></div>' +
      '<div class="card" style="margin-top:14px"><b>Registros (' + open + " em aberto)</b>" + (list.length ? '<div class="list" style="margin-top:6px">' + list.map(function (x) {
        return '<div class="list-item"><input type="checkbox" style="width:auto" data-change="issDone" data-id="' + x.id + '"' + (x.done ? " checked" : "") + '><span class="grow" style="' + (x.done ? "opacity:.55;text-decoration:line-through" : "") + '">' + esc(x.text) + '<div class="small muted">' + P.fmtDate(x.date) + (x.done ? " · resolvido" : "") + '</div></span><button class="icon-btn" style="color:var(--danger)" data-act="issDel" data-id="' + x.id + '">×</button></div>';
      }).join("") + "</div>" : '<div class="empty">Nenhum registro ainda.</div>') + "</div>";
  };
  T.actions.guiaTog = function (el) { T._guia = T._guia === +el.dataset.i ? null : +el.dataset.i; T.render(); };
  T.actions.issAdd = function () {
    var t = document.getElementById("issTxt").value.trim(); if (!t) { T.toast("Escreva o que aconteceu."); return; }
    P.db.issues = P.db.issues || []; P.db.issues.push({ id: P.uid("iss"), date: P.todayISO(), text: t, done: false }); P.save(); T.toast("Registrado."); T.render();
  };
  T.actions.issDone = function (el) { var x = (P.db.issues || []).filter(function (y) { return y.id === el.dataset.id; })[0]; if (x) { x.done = el.checked; P.save(); T.render(); } };
  T.actions.issDel = function (el) { if (!confirm("Apagar este registro?")) return; P.db.issues = (P.db.issues || []).filter(function (y) { return y.id !== el.dataset.id; }); P.save(); T.render(); };

  /* ---------- Barra de atalhos no celular (recolhível) ---------- */
  function barOpen() { try { return localStorage.getItem("teamgarcia.barra") !== "fechada"; } catch (e) { return true; } }
  function bottomHtml() {
    var g = groupOf(T.page).k, n = pending().length, open = barOpen();
    function tab(on, act, ico, label, badge) { return '<button class="' + (on ? "on" : "") + '" ' + act + ">" + ico + (badge ? '<span class="badge">' + badge + "</span>" : "") + "<span>" + label + "</span></button>"; }
    return '<button class="bbar-handle" data-act="bbarToggle" title="' + (open ? "Recolher atalhos" : "Mostrar atalhos") + '">' + (open ? IC.baixo : IC.cima) + '</button><div class="bbar-in">' +
      tab(g === "inicio", 'data-act="nav" data-v="dash"', IC.inicio, "Início") + tab(g === "alunos", 'data-act="nav" data-v="alunos"', IC.alunos, "Alunos") +
      tab(false, 'data-act="bellOpen"', IC.sino, "Pendentes", n) + tab(g === "config", 'data-act="nav" data-v="config"', IC.config, "Ajustes") + "</div>";
  }
  T.actions.bbarToggle = function () { try { localStorage.setItem("teamgarcia.barra", barOpen() ? "fechada" : "aberta"); } catch (e) {} T.render(); };

  /* ---------- Render: aplica a moldura por cima das páginas ---------- */
  var baseRender = T.render;
  T.render = function (top) {
    baseRender.call(T, top);
    var bar = document.getElementById("bbar");
    if (T.state !== "ready") { if (bar) bar.innerHTML = ""; return; }
    if (bar) { bar.innerHTML = bottomHtml(); bar.classList.toggle("open", barOpen()); document.body.classList.toggle("bbar-open", barOpen()); }
    var side = document.getElementById("side"), wasOpen = side.classList.contains("open");
    side.innerHTML = sideHtml(); if (wasOpen) side.classList.add("open");
    var main = document.getElementById("main");
    main.insertAdjacentHTML("afterbegin", topHtml());
    var t = main.querySelector(".page-title");
    if (t && !t.querySelector(".pt-ico")) t.insertAdjacentHTML("afterbegin", '<span class="pt-ico">' + IC[groupOf(T.page).k] + "</span>");
  };
})();
