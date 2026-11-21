/* Site do treinador — Equipe: funcionários (contas de acesso), grupos de permissão e logs de auditoria.
   Só o dono da conta vê e altera a Equipe. Cada funcionário entra no mesmo site com o próprio e-mail. */
(function () {
  "use strict";
  var P = window.Proto, T = window.T, esc = P.esc;

  /* Permissões que um grupo pode liberar (o Chat não existe aqui). */
  var PERMS = [
    ["alunos", "Alunos", "Ver e gerenciar alunos, atualizações, fotos e progresso"],
    ["fichasDieta", "Fichas de dieta", "Montar e alterar as fichas de dieta dos alunos"],
    ["fichasTreino", "Fichas de treino", "Montar e alterar as fichas de treino dos alunos"],
    ["alimentos", "Alimentos", "Gerenciar alimentos e tabelas nutricionais"],
    ["substAl", "Substituição de alimentos", "Gerenciar tabelas de substituição de alimentos"],
    ["substEx", "Substituição de exercícios", "Gerenciar grupos reutilizáveis de exercícios"],
    ["refeicoes", "Refeições pré-definidas", "Gerenciar refeições pré-definidas"],
    ["modelosD", "Dietas pré-definidas", "Gerenciar fichas de dieta pré-definidas"],
    ["exercicios", "Exercícios", "Gerenciar exercícios, técnicas e grupamentos musculares"],
    ["modelosT", "Treinos pré-definidos", "Gerenciar treinos pré-definidos"],
    ["materiais", "Materiais extras", "Gerenciar materiais extras"],
    ["questionarios", "Questionários dinâmicos", "Gerenciar os questionários de check-in"],
    ["comunidade", "Comunidade e competições", "Postar e moderar a comunidade; regras das competições"],
    ["notificacoes", "Notificações", "Enviar notificações para os alunos"],
    ["config", "Configurações", "Alterar as configurações do app e da plataforma"]
  ];
  T.PERMS = PERMS;
  function stamp(iso) { return T.stamp ? T.stamp(iso) : P.fmtDate(String(iso || "").slice(0, 10)); }
  function siteLink() { return location.href.replace(/[^/]*([?#].*)?$/, "") + "treinador.html"; }

  /* ---------- Funcionários ---------- */
  T.pages.funcionarios = function () {
    var list = P.db.staff || [];
    return '<div class="row between wrap"><div><div class="page-title">Funcionários</div><div class="muted">Pessoas da sua equipe que entram no site do treinador com o próprio e-mail.</div></div><button class="btn primary" data-act="stfNew">+ Novo funcionário</button></div>' +
      '<div class="card" style="margin-top:16px;padding:4px 8px;overflow-x:auto"><table class="t"><tr><th>Nome</th><th class="hide-m">E-mail</th><th>Grupo</th><th>Status</th><th></th></tr>' + list.map(function (st) {
        var g = P.staffGroup(st.groupId);
        return "<tr><td><b>" + esc(st.name) + '</b></td><td class="hide-m muted">' + esc(st.email) + "</td><td>" + (g ? '<span class="pill">' + esc(g.name) + "</span>" : '<span class="small muted">sem grupo</span>') + "</td><td>" + (st.active ? '<span class="pill accent">Ativo</span>' : '<span class="pill">Inativo</span>') + '</td><td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="stfEdit" data-id="' + st.id + '">Editar</button></td></tr>';
      }).join("") + "</table>" + (list.length ? "" : '<div class="empty">Nenhum funcionário cadastrado. Crie primeiro um grupo em Permissões de funcionário e depois cadastre a pessoa aqui.</div>') + "</div>";
  };
  function groupOptions(sel) {
    var gs = P.db.staffGroups || [];
    return gs.length ? gs.map(function (g) { return '<option value="' + g.id + '"' + (g.id === sel ? " selected" : "") + ">" + esc(g.name) + (g.active === false ? " (inativo)" : "") + "</option>"; }).join("") : '<option value="">Crie um grupo primeiro</option>';
  }
  T.actions.stfNew = function () {
    if (!(P.db.staffGroups || []).length) { T.toast("Crie primeiro um grupo de permissões."); T.go("permissoes"); return; }
    T.sheet("Novo funcionário", '<div class="stack"><div class="small muted">A pessoa entra no site do treinador com este e-mail e senha e só vê o que o grupo dela permite.</div>' +
      '<div class="field"><label>Nome</label><input id="sfName"></div><div class="grid2"><div class="field"><label>E-mail</label><input id="sfEmail" type="email"></div><div class="field"><label>Senha inicial</label><input id="sfPass" value="' + Math.random().toString(36).slice(2, 10) + '"></div></div>' +
      '<div class="field"><label>Grupo de permissões</label><select id="sfGroup">' + groupOptions("") + '</select></div><button class="btn primary block" data-act="stfCreate">Criar funcionário</button></div>');
  };
  T.actions.stfCreate = function (el) {
    function v(id) { return document.getElementById(id).value.trim(); }
    if (!v("sfName") || !v("sfEmail") || !v("sfPass")) { T.toast("Preencha nome, e-mail e senha."); return; }
    if (v("sfPass").length < 6) { T.toast("A senha precisa ter pelo menos 6 caracteres."); return; }
    var st = { name: v("sfName"), email: v("sfEmail").toLowerCase(), groupId: v("sfGroup"), active: true }, pass = v("sfPass");
    el.disabled = true; el.textContent = "Criando…";
    P.createStaff(st, pass).then(function () {
      T.closeSheet();
      T.sheet("Funcionário criado", '<div class="stack"><div>Envie estes dados para <b>' + esc(st.name) + '</b>:</div><div class="card tight"><div>Endereço: <b>' + esc(siteLink()) + "</b></div><div>E-mail: <b>" + esc(st.email) + "</b></div><div>Senha: <b>" + esc(pass) + '</b></div></div><div class="small muted">A senha não fica guardada no sistema. Se esquecer, a pessoa usa "Esqueci minha senha".</div><button class="btn primary block" data-act="closeSheet">Ok</button></div>');
      T.render();
    }, function (e) { el.disabled = false; el.textContent = "Criar funcionário"; T.toast(P.authError(e)); });
  };
  function staff(id) { return (P.db.staff || []).filter(function (x) { return x.id === id; })[0]; }
  T.actions.stfEdit = function (el) {
    var st = staff(el.dataset.id);
    T.sheet("Editar funcionário", '<div class="stack"><div class="field"><label>Nome</label><input id="seName" value="' + esc(st.name) + '"></div><div class="field"><label>E-mail (login)</label><input value="' + esc(st.email) + '" readonly style="opacity:.7"></div>' +
      '<div class="field"><label>Grupo de permissões</label><select id="seGroup">' + groupOptions(st.groupId) + '</select></div><div class="field"><label>Status</label><select id="seActive"><option value="1"' + (st.active ? " selected" : "") + '>Ativo</option><option value="0"' + (!st.active ? " selected" : "") + ">Inativo (não entra mais no site)</option></select></div>" +
      '<div class="row"><button class="btn grow" data-act="stfReset" data-id="' + st.id + '">✉️ E-mail para nova senha</button><button class="btn primary grow" data-act="stfSave" data-id="' + st.id + '">Salvar</button></div></div>');
  };
  T.actions.stfSave = function (el) {
    var st = staff(el.dataset.id);
    st.name = document.getElementById("seName").value.trim() || st.name; st.groupId = document.getElementById("seGroup").value; st.active = document.getElementById("seActive").value === "1";
    P.saveStaff(st).then(function () { T.closeSheet(); T.toast("Funcionário salvo."); T.render(); }, function (e) { T.toast(P.authError(e)); });
  };
  T.actions.stfReset = function (el) {
    var st = staff(el.dataset.id); if (!confirm("Enviar para " + st.email + " um e-mail para criar nova senha?")) return;
    window.FB.resetPassword(st.email).then(function () { T.toast("E-mail enviado para " + st.email + "."); }, function (e) { T.toast(P.authError(e)); });
  };

  /* ---------- Grupos de permissão ---------- */
  T.pages.permissoes = function () {
    var gs = P.db.staffGroups || [];
    return '<div class="row between wrap"><div><div class="page-title">Grupos permissões de funcionários</div><div class="muted">Cada grupo define o que os funcionários dele podem acessar.</div></div><button class="btn primary" data-act="grpNew">+ Novo grupo</button></div>' +
      '<div class="card" style="margin-top:16px;padding:4px 8px;overflow-x:auto"><table class="t"><tr><th>Nome</th><th class="hide-m">Descrição</th><th>Funcionários</th><th>Status</th><th class="hide-m">Criado em</th><th></th></tr>' + gs.map(function (g) {
        var n = (P.db.staff || []).filter(function (x) { return x.groupId === g.id; }).length;
        return "<tr><td><b>" + esc(g.name) + '</b></td><td class="hide-m muted">' + esc(g.desc || "Sem descrição") + "</td><td>" + n + "</td><td>" + (g.active !== false ? '<span class="pill accent">Ativo</span>' : '<span class="pill">Inativo</span>') + '</td><td class="hide-m">' + P.fmtDate(g.createdAt) + '</td><td style="text-align:right"><button class="btn sm" data-act="grpEdit" data-id="' + g.id + '">Editar</button></td></tr>';
      }).join("") + "</table>" + (gs.length ? "" : '<div class="empty">Nenhum grupo ainda. Exemplos: "Estagiário", "Nutricionista".</div>') + "</div>";
  };
  T.actions.grpNew = function () { T._grp = { id: P.uid("grp"), name: "", desc: "", active: true, perms: {}, createdAt: P.todayISO(), isNew: true }; T.go("grupoEdit"); };
  T.actions.grpEdit = function (el) { var g = P.staffGroup(el.dataset.id); T._grp = JSON.parse(JSON.stringify(g)); T.go("grupoEdit"); };
  T.pages.grupoEdit = function () {
    var g = T._grp; if (!g) return '<div class="empty">Grupo não encontrado.</div>';
    return '<button class="back" style="color:var(--accent);font-weight:600" data-act="nav" data-v="permissoes">‹ Voltar</button><div class="page-title" style="margin-top:8px">Cadastro do grupo de funcionário</div>' +
      '<div class="card stack" style="margin-top:12px"><div class="grid2"><div class="field"><label>Nome do grupo</label><input id="gName" placeholder="Ex.: Nutricionistas, Estagiários" value="' + esc(g.name) + '"></div><div class="field"><label>Status</label><label class="row"><button class="toggle' + (g.active !== false ? " on" : "") + '" data-act="gActive"></button> ' + (g.active !== false ? "Ativo" : "Inativo") + "</label></div></div>" +
      '<div class="field"><label>Descrição</label><textarea id="gDesc" rows="2" placeholder="Descreva o papel e as responsabilidades deste grupo">' + esc(g.desc || "") + "</textarea></div></div>" +
      '<div class="card stack" style="margin-top:14px"><div class="row between wrap"><b style="font-size:17px">Permissões do grupo</b><div class="row"><button class="btn sm" data-act="gAll" data-v="1">Marcar tudo</button><button class="btn sm" data-act="gAll" data-v="0">Desmarcar tudo</button></div></div><div class="small muted">Configure as funcionalidades que os funcionários deste grupo poderão acessar. Observações pessoais, Equipe e a sua conta ficam só com você.</div><div class="list">' +
      PERMS.map(function (x) { var on = !!(g.perms || {})[x[0]]; return '<div class="list-item"><span class="grow"><b>' + esc(x[1]) + '</b><div class="small muted">' + esc(x[2]) + '</div></span><button class="toggle' + (on ? " on" : "") + '" data-act="gPerm" data-k="' + x[0] + '"></button></div>'; }).join("") + "</div></div>" +
      '<div class="row" style="margin-top:14px">' + (g.isNew ? "" : '<button class="btn danger" data-act="grpDel">Apagar grupo</button>') + '<span class="grow"></span><button class="btn primary" data-act="grpSave">Salvar</button></div>';
  };
  function keepFields() { var g = T._grp, n = document.getElementById("gName"), d = document.getElementById("gDesc"); if (n) g.name = n.value; if (d) g.desc = d.value; }
  T.actions.gActive = function () { keepFields(); T._grp.active = T._grp.active === false; T.render(); };
  T.actions.gPerm = function (el) { keepFields(); var p = T._grp.perms = T._grp.perms || {}; p[el.dataset.k] = !p[el.dataset.k]; T.render(); };
  T.actions.gAll = function (el) { keepFields(); var on = el.dataset.v === "1"; T._grp.perms = {}; PERMS.forEach(function (x) { T._grp.perms[x[0]] = on; }); T.render(); };
  T.actions.grpSave = function () {
    keepFields(); var g = T._grp; if (!g.name.trim()) { T.toast("Dê um nome ao grupo."); return; }
    var isNew = g.isNew; delete g.isNew; g.name = g.name.trim();
    var list = P.db.staffGroups = P.db.staffGroups || [], i = list.map(function (x) { return x.id; }).indexOf(g.id);
    if (i >= 0) list[i] = g; else list.push(g);
    P.saveGroups().then(function () { T._grp = null; T.toast(isNew ? "Grupo criado." : "Grupo salvo. As permissões valem a partir do próximo acesso do funcionário."); T.go("permissoes"); }, function (e) { T.toast(P.authError(e)); });
  };
  T.actions.grpDel = function () {
    var g = T._grp, n = (P.db.staff || []).filter(function (x) { return x.groupId === g.id; }).length;
    if (n) { T.toast("Há " + n + " funcionário(s) neste grupo. Mude-os de grupo antes."); return; }
    if (!confirm("Apagar o grupo " + g.name + "?")) return;
    P.db.staffGroups = P.db.staffGroups.filter(function (x) { return x.id !== g.id; });
    P.saveGroups().then(function () { T._grp = null; T.go("permissoes"); });
  };

  /* ---------- Logs de auditoria ---------- */
  T.pages.logs = function () {
    if (!T._audit) {
      if (!T._auditLoading) { T._auditLoading = true; P.loadAudit(300).then(function (l) { T._audit = l; T._auditLoading = false; if (T.page === "logs") T.render(); }, function (e) { T._auditLoading = false; T._audit = []; T.toast(P.authError(e)); }); }
      return '<div class="page-title">Logs de auditoria</div><div class="empty">Carregando…</div>';
    }
    var f = T._af2 || { t: "", u: "", a: "" }, all = T._audit, tables = [], users = [];
    all.forEach(function (x) { if (tables.indexOf(x.table) < 0) tables.push(x.table); if (users.indexOf(x.who) < 0) users.push(x.who); });
    var list = all.filter(function (x) { return (!f.t || x.table === f.t) && (!f.u || x.who === f.u) && (!f.a || x.action === f.a); });
    function sel(k, label, opts) { return '<select style="width:auto" data-change="audF" data-k="' + k + '"><option value="">' + label + "</option>" + opts.sort().map(function (o) { return "<option" + (f[k] === o ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select>"; }
    return '<div class="row between wrap"><div><div class="page-title">Logs de auditoria</div><div class="muted">Quem alterou o quê e quando (últimos ' + all.length + ' registros). Ninguém consegue editar ou apagar este histórico.</div></div><button class="btn" data-act="audReload">↻ Atualizar</button></div>' +
      '<div class="row wrap" style="margin:14px 0">' + sel("t", "Todas as tabelas", tables) + sel("u", "Todos os usuários", users) + sel("a", "Todas as ações", ["Criação", "Atualização", "Exclusão"]) + "</div>" +
      '<div class="card" style="padding:4px 8px;overflow-x:auto"><table class="t"><tr><th>Data/Hora</th><th>Tabela</th><th>Ação</th><th>Aluno</th><th>Usuário responsável</th></tr>' + list.map(function (x) {
        var col = { "Criação": "var(--valid)", "Atualização": "var(--prep)", "Exclusão": "var(--warm)" }[x.action] || "var(--muted)";
        return "<tr><td>" + esc(stamp(x.at)) + '</td><td><span class="pill">' + esc(x.table) + '</span></td><td><i class="dot" style="background:' + col + '"></i> ' + esc(x.action) + "</td><td>" + (x.target ? '<button class="small" style="color:var(--accent)" data-act="openStudent" data-id="' + esc(x.target) + '">' + esc(x.targetName || "aluno") + "</button>" : "—") + "</td><td>" + esc(x.who) + "</td></tr>";
      }).join("") + "</table>" + (list.length ? "" : '<div class="empty">Nenhum registro ainda. As alterações feitas a partir de agora aparecem aqui.</div>') + "</div>";
  };
  T.actions.audF = function (el) { T._af2 = T._af2 || { t: "", u: "", a: "" }; T._af2[el.dataset.k] = el.value; T.render(); };
  T.actions.audReload = function () { T._audit = null; T.render(); };

  /* ---------- O que o funcionário NÃO vê ---------- */
  // Observações pessoais (só do dono) e abas de ficha sem permissão.
  var baseGeral = T.tabs.geral;
  T.tabs.geral = function (s, p) {
    var html = baseGeral(s, p);
    if (!P.isOwner) html = html.replace(/<div class="card stack"><b>🔒 Observações pessoais<\/b>[\s\S]*?<\/textarea><\/div>/, "");
    return html;
  };
  var baseAluno = T.pages.aluno;
  T.pages.aluno = function (p) {
    if ((p.tab === "treino" && !P.can("fichasTreino")) || (p.tab === "dieta" && !P.can("fichasDieta"))) { p.tab = "geral"; T.toast("Você não tem permissão para editar esta ficha."); }
    var html = baseAluno(p);
    if (!P.can("fichasTreino")) html = html.replace(/<button class="[^"]*" data-act="stTab" data-t="treino">[^<]*<\/button>/, "");
    if (!P.can("fichasDieta")) html = html.replace(/<button class="[^"]*" data-act="stTab" data-t="dieta">[^<]*<\/button>/, "");
    return html;
  };
  // A página Conta, para funcionário, mostra só o acesso dele (não mexe nos dados do dono).
  var baseConta = T.pages.conta;
  T.pages.conta = function () {
    if (P.isOwner) return baseConta();
    var u = window.FB && window.FB.user && window.FB.user();
    return '<div class="page-title">Conta</div><div class="card stack" style="margin-top:14px;max-width:520px"><div><div class="muted small">Nome</div><b>' + esc(P.whoName()) + '</b></div><div class="field"><label>E-mail de login</label><input value="' + esc(u && u.email || "") + '" readonly style="opacity:.7"></div><button class="btn" style="align-self:flex-start" data-act="contaSenha">✉️ Enviar e-mail para trocar a senha</button></div>';
  };
})();
