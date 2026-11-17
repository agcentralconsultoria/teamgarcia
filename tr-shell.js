/* Site do treinador — moldura: menu fino só com ícones (submenus ao passar o mouse), barra do topo
   (tema claro/escuro, sino, conta) e ícone ao lado do título de cada página. */
(function () {
  "use strict";
  var P = window.Proto, T = window.T, esc = P.esc;
  var V = "20261116c";

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
    voltar: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    menu: svg('<path d="M4 6h16M4 12h10M4 18h16M17 9l3 3-3 3"/>'),
    cima: svg('<path d="M6 15l6-6 6 6"/>'),
    baixo: svg('<path d="M6 9l6 6 6-6"/>'),
    lua: svg('<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/>')
  };
  var MENU = [
    { k: "inicio", label: "Início", go: "dash", pages: ["dash"] },
    { k: "alunos", label: "Alunos", items: [["alunos", "Alunos"], ["questionario", "Questionários"], ["notificacoes", "Notificações"]], pages: ["alunos", "aluno", "questionario", "notificacoes"] },
    { k: "treino", label: "Treino", items: [["modelosT", "Treinos pré-definidos"], ["exercicios", "Exercícios"], ["substEx", "Substituição de exercício"], ["tecnicas", "Técnicas de exercício"], ["grupos", "Grupamentos musculares"]], pages: ["modelosT", "exercicios", "substEx", "tecnicas", "grupos"] },
    { k: "dieta", label: "Dieta", items: [["modelosD", "Dietas pré-definidas"], ["alimentos", "Alimentos"], ["substAl", "Substituição de alimentos"], ["modelosR", "Refeições pré-definidas"]], pages: ["modelosD", "alimentos", "substAl", "modelosR"] },
    { k: "conteudo", label: "Conteúdo", items: [["materiais", "Materiais extras"]], pages: ["materiais"] },
    { k: "config", label: "Configurações", go: "config", pages: ["config"] }
  ];
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
    var cur = groupOf(T.page);
    return '<div class="rail-logo"><img src="icons/logo.png?v=' + V + '" alt="AG"><b>' + esc(P.APP_NAME) + '</b><button class="rail-close" data-act="menu" title="Fechar menu">' + IC.voltar + "</button></div>" + MENU.map(function (m) {
      var on = (m === cur ? " on" : "") + (m.k === T._railOpen ? " open" : "");
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

  var baseNav = T.actions.nav;
  T.actions.nav = function (el) { T._railOpen = null; baseNav(el); };

  /* ---------- Barra do topo ---------- */
  function pending() {
    return P.db.students.filter(function (s) { return s.active && !s.__tpl && P.logsOf(s.id).checkins.some(function (c) { return !c.feedback && c.kind !== "fotos"; }); });
  }
  function topHtml() {
    var u = window.FB && window.FB.user && window.FB.user(), mail = u && u.email || "", n = pending().length, light = theme() === "claro";
    return '<div class="topbar"><button class="top-menu" data-act="menu" title="Menu">' + IC.menu + '</button><button class="theme-sw' + (light ? " light" : "") + '" data-act="themeToggle" title="' + (light ? "Mudar para o tema escuro" : "Mudar para o tema claro") + '"><i>' + (light ? IC.sol : IC.lua) + "</i></button>" +
      '<button class="top-ico" data-act="bellOpen" title="Atualizações aguardando sua resposta">' + IC.sino + (n ? '<span class="badge">' + n + "</span>" : "") + "</button>" +
      '<button class="top-user" data-act="userMenu"><span class="top-name"><b>' + esc((u && u.displayName) || "Ângelo") + '</b><span class="small muted">Treinador</span></span><img src="icons/logo.png?v=' + V + '" alt=""></button></div>';
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
    var u = window.FB && window.FB.user && window.FB.user();
    T.sheet("Conta", '<div class="stack"><div class="small muted">' + esc(u && u.email || "") + '</div><a class="btn block" style="text-decoration:none;color:var(--text)" href="aluno.html" target="_blank">Abrir app do aluno</a><button class="btn block" data-act="userTheme">Trocar tema (claro / escuro)</button><button class="btn block danger" data-act="logout">Sair</button></div>');
  };
  T.actions.userTheme = function () { T.closeSheet(); T.actions.themeToggle(); };

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
