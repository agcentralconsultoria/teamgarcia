/* Site do treinador — ações extras dos editores, modelos (pré-definidos), tabelas de substituição,
   grupamentos, notificações, questionários extras, configurações completas e PDF das fichas */
(function () {
  "use strict";
  var P = window.Proto, T = window.T, esc = P.esc;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function getPath(o, path) { return path.split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function tpl() { var t = P.db.templates = P.db.templates || P.blankTemplates(); ["folders", "workouts", "diets", "meals"].forEach(function (k) { t[k] = t[k] || []; }); return t; }
  function mark() { T._dirty = true; }
  function reId(w) { w.id = P.uid("tr"); w.items.forEach(function (it) { it.id = P.uid("it"); }); return w; }
  function reIdMeal(m) { m.id = P.uid("ref"); m.options.forEach(function (o) { o.items.forEach(function (i) { i.id = P.uid("fi"); }); }); return m; }

  /* ---------- Histórico de alterações da ficha ("Ver o que mudou") ---------- */
  T.actions.planHist = function (el) {
    var k = el.dataset.k, plan = (k === "treino" ? P.db.workoutPlans : P.db.dietPlans)[T.p.id], ch = plan && plan.changes || [];
    T.sheet("Histórico de alterações", (ch.length ? ch.slice().reverse().map(function (c) { return '<div class="chg"><b>' + T.stamp(c.at || c.date) + '</b><ul class="small" style="margin:4px 0;padding-left:18px">' + c.lines.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>"; }).join("") : '<div class="empty">Ainda sem alterações registradas. A partir de agora, cada vez que você salvar, aparece aqui o que mudou.</div>') + (plan ? '<div class="small muted" style="margin-top:8px">Ficha criada em ' + P.fmtDate(plan.createdAt || plan.updatedAt) + ".</div>" : ""), true);
  };

  /* ---------- Treino: modelos, edição em massa, superset, técnica por série ---------- */
  T.actions.tecSet = function (el) {
    var it = T._draftW.workouts[T._wi].items[+el.dataset.i], k = +el.dataset.k, n = it.valid.sets;
    var cur = it.techniqueSets && it.techniqueSets.length ? it.techniqueSets.slice() : Array.apply(null, Array(n)).map(function (_, i) { return i; });
    var j = cur.indexOf(k); if (j >= 0) cur.splice(j, 1); else cur.push(k); cur.sort();
    it.techniqueSets = cur.length === n ? [] : cur; if (!cur.length) it.techniqueSets = [k === 0 ? 1 : 0].filter(function (x) { return x < n; });
    mark(); T.render();
  };
  T.actions.wSuper = function (el) { var it = T._draftW.workouts[T._wi].items[+el.dataset.i]; it.superset = !it.superset; mark(); T.render(); };
  T.actions.applySubEx = function (el) {
    if (el.value === "") return; var it = T._draftW.workouts[T._wi].items[+el.dataset.i], tb = P.db.subTables.exercises[+el.value];
    tb.items.forEach(function (id) { if (id !== it.exId && it.subs.indexOf(id) < 0) it.subs.push(id); }); mark(); T.toast("Tabela aplicada."); T.render();
  };
  T.actions.cdMode = function (el) { var c = T._draftW.cardio; if (el.dataset.m === "1") { c.perDay = {}; c.days.forEach(function (d) { c.perDay[d] = c.minPerDay || 0; }); } else delete c.perDay; mark(); T.render(); };
  T.actions.tplSaveW = function () {
    var t = tpl();
    T.sheet("Salvar como treino pré-definido", '<div class="stack"><div class="field"><label>Nome do modelo</label><input id="tpN" value="' + esc(T._draftW.name) + '"></div><div class="field"><label>Pasta</label><select id="tpF"><option value="">Sem pasta</option>' + t.folders.map(function (f) { return '<option value="' + f.id + '">' + esc(f.name) + "</option>"; }).join("") + '</select></div><button class="btn primary block" data-act="tplSaveWDo">Salvar modelo</button></div>');
  };
  T.actions.tplSaveWDo = function () {
    var d = clone(T._draftW); delete d._sid; delete d.changes;
    tpl().workouts.push({ id: P.uid("tpw"), name: document.getElementById("tpN").value || d.name, folder: document.getElementById("tpF").value, active: true, workouts: d.workouts, notes: d.notes, cardio: d.cardio, weeklyGoal: d.weeklyGoal, createdAt: P.todayISO() });
    P.save(); T.closeSheet(); T.toast("Modelo salvo em Treinos pré-definidos.");
  };
  T.actions.tplImportW = function () {
    var list = tpl().workouts.filter(function (x) { return x.active !== false; });
    T.sheet("Importar treino pré-definido", list.length ? '<div class="list">' + list.map(function (x) { var f = tpl().folders.filter(function (y) { return y.id === x.folder; })[0]; return '<div class="list-item"><span class="grow"><b>' + esc(x.name) + '</b><div class="small muted">' + (f ? "📁 " + esc(f.name) + " · " : "") + x.workouts.length + " treinos</div></span><button class=\"btn sm\" data-act=\"tplImportWDo\" data-id=\"" + x.id + '" data-m="add">Adicionar</button><button class="btn sm primary" data-act="tplImportWDo" data-id="' + x.id + '" data-m="rep">Substituir</button></div>'; }).join("") + "</div>" : '<div class="empty">Nenhum treino pré-definido. Crie em "Treinos pré-definidos" ou use "Salvar como pré-definido".</div>');
  };
  T.actions.tplImportWDo = function (el) {
    var x = tpl().workouts.filter(function (y) { return y.id === el.dataset.id; })[0], ws = clone(x.workouts).map(reId);
    if (el.dataset.m === "rep") { T._draftW.workouts = ws; if (x.notes) T._draftW.notes = x.notes; if (x.cardio) T._draftW.cardio = clone(x.cardio); T._wi = 0; }
    else T._draftW.workouts = T._draftW.workouts.concat(ws);
    mark(); T.closeSheet(); T.toast("Modelo importado. Confira e salve."); T.render();
  };
  /* Edição em massa: escolhe exercícios e aplica séries/reps/intervalo de uma vez */
  T.actions.bulkW = function () {
    var d = T._draftW; T._bulk = {};
    function part(key, label, color) {
      return '<div class="card tight stack" style="border-left:3px solid ' + color + '"><b class="small">' + label + '</b><div class="small muted">Séries</div><div class="row wrap small"><label class="row"><input type="radio" style="width:auto" name="bs_' + key + '" value="" checked> Não alterar</label><label class="row"><input type="radio" style="width:auto" name="bs_' + key + '" value="add"> Somar</label><label class="row"><input type="radio" style="width:auto" name="bs_' + key + '" value="set"> Definir</label><input id="bsv_' + key + '" type="number" style="width:70px" value="0"></div>' +
        '<div class="small muted">Repetições</div><div class="row wrap small"><label class="row"><input type="checkbox" style="width:auto" id="brc_' + key + '"> Definir</label><input id="brv_' + key + '" style="width:120px" placeholder="8-12"></div><div class="small muted">Intervalo</div><div class="row wrap small"><label class="row"><input type="checkbox" style="width:auto" id="bic_' + key + '"> Definir</label><input id="biv_' + key + '" style="width:120px" placeholder="1:00-1:30"></div></div>';
    }
    T.sheet("Edição em massa", '<div class="grid2"><div class="stack" style="max-height:60vh;overflow:auto"><label class="row"><input type="checkbox" style="width:auto" data-change="bulkAll" checked> <b>Selecionar todos</b></label>' + d.workouts.map(function (w, wi) {
      return '<div class="card tight"><b>' + esc(w.name) + "</b>" + w.items.map(function (it, ii) { return '<label class="row small" style="padding:3px 0"><input type="checkbox" style="width:auto" class="bulkCk" data-w="' + wi + '" data-i="' + ii + '" checked> <span class="grow">' + esc(P.exercise(it.exId).name) + '</span><span class="muted">' + it.valid.sets + " · " + esc((it.valid.reps || []).join(", ")) + " · " + esc(it.valid.rest) + "</span></label>"; }).join("") + "</div>";
    }).join("") + '</div><div class="stack"><b>Modificações a aplicar</b>' + part("valid", "Válidas", "var(--valid)") + part("warmup", "Aquecimento", "var(--warm)") + part("prep", "Preparatórias", "var(--prep)") + '<div class="row"><button class="btn grow" data-act="closeSheet">Cancelar</button><button class="btn primary grow" data-act="bulkApply">Aplicar</button></div></div></div>', true);
  };
  T.actions.bulkAll = function (el) { [].forEach.call(document.querySelectorAll(".bulkCk"), function (c) { c.checked = el.checked; }); };
  T.actions.bulkApply = function () {
    var d = T._draftW, n = 0;
    [].forEach.call(document.querySelectorAll(".bulkCk"), function (c) {
      if (!c.checked) return; var it = d.workouts[+c.dataset.w].items[+c.dataset.i]; n++;
      ["valid", "warmup", "prep"].forEach(function (k) {
        var mode = (document.querySelector('input[name="bs_' + k + '"]:checked') || {}).value, v = parseInt(document.getElementById("bsv_" + k).value, 10) || 0;
        if (mode === "add") it[k].sets = Math.max(0, (it[k].sets || 0) + v); else if (mode === "set") it[k].sets = Math.max(0, v);
        if (document.getElementById("brc_" + k).checked) { var r = document.getElementById("brv_" + k).value.trim(); if (k === "valid") it.valid.reps = r.split(",").map(function (x) { return x.trim(); }).filter(Boolean); else it[k].reps = r; }
        if (document.getElementById("bic_" + k).checked) it[k].rest = document.getElementById("biv_" + k).value.trim();
        if (k === "valid") { var rr = it.valid.reps || []; while (rr.length < it.valid.sets) rr.push(rr[rr.length - 1] || "8-10"); it.valid.reps = rr.slice(0, it.valid.sets); }
      });
    });
    mark(); T.closeSheet(); T.toast("Aplicado em " + n + " exercício(s). Confira e salve."); T.render();
  };

  /* ---------- Dieta: modelos, copiar refeições, unidade, tabela de substituição ---------- */
  T.actions.dTogUnit = function () { T._draftD.allowUnitChange = T._draftD.allowUnitChange === false; mark(); T.render(); };
  T.actions.applySubAl = function (el) {
    if (el.value === "") return; var fi = getPath(T._draftD, el.dataset.path), tb = P.db.subTables.foods[+el.value];
    tb.items.forEach(function (id) { if (id !== fi.foodId && fi.subs.indexOf(id) < 0) fi.subs.push(id); }); mark(); T.closeSheet(); T.toast("Tabela aplicada."); T.render();
  };
  T.actions.tplSaveD = function () {
    T.sheet("Salvar como dieta pré-definida", '<div class="stack"><div class="field"><label>Nome do modelo</label><input id="tpN" value="' + esc(T._draftD.name) + '"></div><button class="btn primary block" data-act="tplSaveDDo">Salvar modelo</button></div>');
  };
  T.actions.tplSaveDDo = function () { var d = clone(T._draftD); delete d._sid; delete d.changes; tpl().diets.push({ id: P.uid("tpd"), name: document.getElementById("tpN").value || d.name, active: true, plan: d, createdAt: P.todayISO() }); P.save(); T.closeSheet(); T.toast("Modelo salvo em Dietas pré-definidas."); };
  T.actions.tplImportD = function () {
    var list = tpl().diets.filter(function (x) { return x.active !== false; });
    T.sheet("Importar dieta pré-definida", list.length ? '<div class="list">' + list.map(function (x) { return '<div class="list-item"><span class="grow"><b>' + esc(x.name) + '</b><div class="small muted">' + x.plan.variations.length + " variação(ões) · " + Math.round(P.variationMacros(x.plan.variations[0]).kcal) + ' kcal</div></span><button class="btn sm" data-act="tplImportDDo" data-id="' + x.id + '" data-m="var">Só refeições na variação atual</button><button class="btn sm primary" data-act="tplImportDDo" data-id="' + x.id + '" data-m="all">Dieta inteira</button></div>'; }).join("") + "</div>" : '<div class="empty">Nenhuma dieta pré-definida.</div>', true);
  };
  T.actions.tplImportDDo = function (el) {
    var x = tpl().diets.filter(function (y) { return y.id === el.dataset.id; })[0], pl = clone(x.plan);
    if (el.dataset.m === "all") { pl.variations.forEach(function (v) { v.id = P.uid("var"); v.meals.forEach(reIdMeal); }); T._draftD.variations = pl.variations; T._draftD.notes = pl.notes || T._draftD.notes; T._draftD.guidelines = pl.guidelines || T._draftD.guidelines; T._vi = 0; }
    else T._draftD.variations[T._vi || 0].meals = pl.variations[0].meals.map(reIdMeal);
    mark(); T.closeSheet(); T.toast("Importado. Confira e salve."); T.render();
  };
  T.actions.tplSaveR = function (el) { var m = clone(T._draftD.variations[T._vi || 0].meals[+el.dataset.i]); tpl().meals.push({ id: P.uid("tpr"), name: m.name, active: true, meal: m }); P.save(); T.toast("Refeição salva em Refeições pré-definidas."); };
  T.actions.tplImportR = function () {
    var list = tpl().meals.filter(function (x) { return x.active !== false; });
    T.sheet("Refeição pré-definida", list.length ? '<div class="list">' + list.map(function (x) { return '<button class="list-item" data-act="tplImportRDo" data-id="' + x.id + '"><span class="grow"><b>' + esc(x.name) + '</b><div class="small muted">' + Math.round(P.optionMacros(x.meal.options[0]).kcal) + " kcal · " + x.meal.options.length + " opção(ões)</div></span>+</button>"; }).join("") + "</div>" : '<div class="empty">Nenhuma refeição pré-definida. Use o 💾 de uma refeição para salvar.</div>');
  };
  T.actions.tplImportRDo = function (el) { var x = tpl().meals.filter(function (y) { return y.id === el.dataset.id; })[0]; T._draftD.variations[T._vi || 0].meals.push(reIdMeal(clone(x.meal))); mark(); T.closeSheet(); T.render(); };
  T.actions.copyMeals = function () {
    var d = T._draftD, vi = T._vi || 0;
    T.sheet("Copiar refeições", '<div class="small muted" style="margin-bottom:8px">As refeições da variação escolhida substituem as de "' + esc(d.variations[vi].name) + '".</div><div class="list">' + d.variations.map(function (v, i) { return i === vi ? "" : '<button class="list-item" data-act="copyMealsDo" data-i="' + i + '"><span class="grow"><b>' + esc(v.name) + '</b><div class="small muted">' + v.meals.length + " refeições</div></span>›</button>"; }).join("") + "</div>");
  };
  T.actions.copyMealsDo = function (el) { var d = T._draftD; d.variations[T._vi || 0].meals = clone(d.variations[+el.dataset.i].meals).map(reIdMeal); mark(); T.closeSheet(); T.render(); };

  /* ---------- PDF (impressão) das fichas ---------- */
  function printDoc(title, body) {
    var w = window.open("", "_blank"); if (!w) { T.toast("Libere pop-ups para gerar o PDF."); return; }
    var crn = P.db.settings.crnImg ? '<div style="margin-top:30px;text-align:right"><img src="' + P.db.settings.crnImg + '" style="max-height:90px"></div>' : "";
    w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>body{font:13px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:28px}h1{font-size:22px;margin:0}h2{font-size:16px;margin:22px 0 6px;border-bottom:2px solid #14b8a6;padding-bottom:3px}h3{font-size:14px;margin:12px 0 4px}table{width:100%;border-collapse:collapse;margin:4px 0}th,td{border:1px solid #ddd;padding:5px 7px;text-align:left;vertical-align:top}th{background:#f1f5f9;font-size:12px}.m{color:#555;font-size:12px}.brand{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.logo{background:#14b8a6;color:#fff;font-weight:900;border-radius:10px;padding:8px 10px}pre{white-space:pre-wrap;font:inherit}@media print{button{display:none}}</style></head><body><div class="brand"><div><h1>' + esc(title) + '</h1></div><div class="logo">TG · ' + esc(P.APP_NAME) + "</div></div>" + body + crn + '<p><button onclick="print()">Imprimir / salvar PDF</button></p><script>setTimeout(function(){print()},400)<\/script></body></html>');
    w.document.close();
  }
  function workoutPdf(s, d) {
    var body = '<div class="m">Aluno: <b>' + esc(s.name) + "</b> · Atualizada em " + P.fmtDate(d.updatedAt) + (d.validUntil ? " · válida até " + P.fmtDate(d.validUntil) : "") + "</div>";
    d.workouts.forEach(function (w) {
      body += "<h2>" + esc(w.name) + (w.subtitle ? ' <span class="m">· ' + esc(w.subtitle) + "</span>" : "") + (w.optional ? ' <span class="m">(opcional)</span>' : "") + '</h2><table><tr><th>#</th><th>Exercício</th><th>Aquec.</th><th>Prep.</th><th>Válidas</th><th>Reps</th><th>Intervalo</th><th>RIR</th><th>Técnica / obs.</th></tr>' + w.items.map(function (it, i) {
        var t = P.technique(it.techniqueId);
        return "<tr><td>" + (i + 1) + (it.superset ? " ↓" : "") + "</td><td><b>" + esc(P.exercise(it.exId).name) + "</b>" + (it.subs && it.subs.length ? '<div class="m">Pode trocar por: ' + it.subs.map(function (x) { return esc(P.exercise(x).name); }).join(", ") + "</div>" : "") + "</td><td>" + (it.warmup.sets ? it.warmup.sets + "× " + esc(it.warmup.reps) : "—") + "</td><td>" + (it.prep.sets ? it.prep.sets + "× " + esc(it.prep.reps) : "—") + "</td><td>" + it.valid.sets + "</td><td>" + esc((it.valid.reps || []).join(", ")) + (it.valid.load ? "<br>" + esc(it.valid.load) + " kg" : "") + "</td><td>" + esc(it.valid.rest) + "</td><td>" + esc(it.rir || "") + "</td><td>" + (t ? esc(t.name) + "<br>" : "") + esc(it.notes || "") + "</td></tr>";
      }).join("") + "</table>";
    });
    var c = d.cardio || {}; if (c.days && c.days.length) body += "<h2>Cardio</h2><div>" + c.days.map(function (x) { return P.DOW_FULL[x] + ": " + (c.perDay ? c.perDay[x] : c.minPerDay) + " min"; }).join(" · ") + "</div>";
    if (d.notes) body += "<h2>Observações</h2><pre>" + esc(d.notes) + "</pre>";
    printDoc("Treino · " + d.name, body);
  }
  function dietPdf(s, d) {
    var body = '<div class="m">Paciente: <b>' + esc(s.name) + "</b> · Atualizada em " + P.fmtDate(d.updatedAt) + "</div>";
    d.variations.forEach(function (v) {
      var t = P.variationMacros(v);
      body += "<h2>" + esc(v.name) + ' <span class="m">(' + v.days.map(function (x) { return P.DOW[x]; }).join(", ") + ") · " + Math.round(t.kcal) + " kcal · P " + Math.round(t.p) + "g · C " + Math.round(t.c) + "g · G " + Math.round(t.g) + "g</span></h2>";
      v.meals.forEach(function (m) {
        body += "<h3>" + esc(m.time) + " · " + esc(m.name) + "</h3>" + m.options.map(function (o, oi) { return (m.options.length > 1 ? '<div class="m"><b>Opção ' + (oi + 1) + "</b></div>" : "") + "<table><tr><th>Alimento</th><th>Quantidade</th><th>Substituições (mesmas calorias)</th></tr>" + o.items.map(function (fi) { return "<tr><td>" + esc(P.food(fi.foodId).name) + "</td><td>" + fi.grams + " g</td><td>" + (fi.subs || []).map(function (x) { return esc(P.food(x).name) + " " + P.subGrams(fi.foodId, fi.grams, x) + " g"; }).join("; ") + "</td></tr>"; }).join("") + "</table>"; }).join("");
      });
    });
    if (d.notes) body += "<h2>Observações gerais</h2><pre>" + esc(d.notes) + "</pre>";
    if (d.guidelines) body += "<h2>Orientações</h2><pre>" + esc(d.guidelines) + "</pre>";
    printDoc("Dieta · " + d.name, body);
  }
  T.actions.pdf = function (el) {
    var s = P.student(T.p.id), k = el.dataset.k, d = k === "treino" ? (T._draftW && T._draftW._sid === s.id ? T._draftW : P.db.workoutPlans[s.id]) : (T._draftD && T._draftD._sid === s.id ? T._draftD : P.db.dietPlans[s.id]);
    if (!d) { T.toast("Sem ficha para imprimir."); return; }
    (k === "treino" ? workoutPdf : dietPdf)(s, d);
  };
  T.actions.pdfOld = function (el) { var s = P.student(T.p.id), k = el.dataset.k, x = P.db.histories[s.id][k === "treino" ? "workout" : "diet"][+el.dataset.i]; (k === "treino" ? workoutPdf : dietPdf)(s, x.plan); };

  /* ---------- Treinos / dietas / refeições pré-definidos ---------- */
  function folderOf(id) { return tpl().folders.filter(function (f) { return f.id === id; })[0]; }
  T.pages.modelosT = function () {
    var t = tpl(), inact = T._tplInact, list = t.workouts.filter(function (x) { return inact || x.active !== false; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var groups = {}; list.forEach(function (x) { var k = x.folder && folderOf(x.folder) ? x.folder : ""; (groups[k] = groups[k] || []).push(x); });
    return '<div class="row between wrap"><div><div class="page-title">Treinos pré-definidos</div><div class="muted">Modelos para importar nas fichas dos alunos.</div></div><div class="row"><button class="btn" data-act="folders">📁 Gerenciar pastas</button><button class="btn primary" data-act="tplNewW">+ Novo</button></div></div><label class="row small muted" style="margin:12px 0"><input type="checkbox" style="width:auto" data-change="tplInact"' + (inact ? " checked" : "") + "> Mostrar inativos</label>" +
      (list.length ? t.folders.map(function (f) { return f.id; }).concat([""]).filter(function (k) { return groups[k]; }).map(function (k) {
        var f = folderOf(k);
        return '<div class="card" style="margin-bottom:12px"><b>📁 ' + (f ? esc(f.name) : "Sem pasta") + " (" + groups[k].length + ')</b><table class="t" style="margin-top:6px">' + groups[k].map(function (x) { return "<tr><td><b>" + esc(x.name) + '</b><div class="small muted">' + x.workouts.map(function (w) { return esc(w.name) + " (" + w.items.length + ")"; }).join(" · ") + "</div></td><td>" + (x.active === false ? '<span class="pill">Inativo</span>' : '<span class="pill accent">Ativo</span>') + '</td><td style="text-align:right;white-space:nowrap"><select style="width:auto;padding:5px" data-change="tplFolder" data-id="' + x.id + '"><option value="">Sem pasta</option>' + t.folders.map(function (ff) { return '<option value="' + ff.id + '"' + (ff.id === x.folder ? " selected" : "") + ">" + esc(ff.name) + "</option>"; }).join("") + '</select> <button class="btn sm" data-act="tplEditW" data-id="' + x.id + '">Editar</button> <button class="btn sm" data-act="tplToggle" data-k="workouts" data-id="' + x.id + '">' + (x.active === false ? "Ativar" : "Desativar") + '</button> <button class="btn sm danger" data-act="tplDel" data-k="workouts" data-id="' + x.id + '">×</button></td></tr>'; }).join("") + "</table></div>";
      }).join("") : '<div class="empty">Nenhum treino pré-definido. Crie aqui ou, numa ficha de aluno, use "Salvar como pré-definido".</div>');
  };
  T.actions.tplInact = function (el) { T._tplInact = el.checked; T.render(); };
  T.actions.tplFolder = function (el) { var x = tpl().workouts.filter(function (y) { return y.id === el.dataset.id; })[0]; x.folder = el.value; P.save(); T.render(); };
  T.actions.tplToggle = function (el) { var x = tpl()[el.dataset.k].filter(function (y) { return y.id === el.dataset.id; })[0]; x.active = x.active === false; P.save(); T.render(); };
  T.actions.tplDel = function (el) { if (!confirm("Apagar este modelo?")) return; var k = el.dataset.k; tpl()[k] = tpl()[k].filter(function (y) { return y.id !== el.dataset.id; }); P.save(); T.render(); };
  T.actions.folders = function () {
    var t = tpl();
    T.sheet("Pastas", '<div class="stack">' + t.folders.map(function (f, i) { return '<div class="row"><input class="grow" value="' + esc(f.name) + '" data-change="folderName" data-i="' + i + '"><button class="icon-btn" style="color:var(--danger)" data-act="folderDel" data-i="' + i + '">×</button></div>'; }).join("") + '<button class="btn" data-act="folderAdd">+ Nova pasta</button><button class="btn primary" data-act="tagsDone">Pronto</button></div>');
  };
  T.actions.folderName = function (el) { tpl().folders[+el.dataset.i].name = el.value; P.save(); };
  T.actions.folderAdd = function () { tpl().folders.push({ id: P.uid("fld"), name: "Nova pasta" }); P.save(); T.actions.folders(); };
  T.actions.folderDel = function (el) { var f = tpl().folders.splice(+el.dataset.i, 1)[0]; tpl().workouts.forEach(function (x) { if (x.folder === f.id) x.folder = ""; }); P.save(); T.actions.folders(); };
  /* Editar um modelo de treino: usa o mesmo editor das fichas, num "aluno" de mentira */
  T.actions.tplNewW = function () { var x = { id: P.uid("tpw"), name: "Novo modelo", folder: "", active: true, workouts: [{ id: P.uid("tr"), name: "Treino A", subtitle: "", days: [], optional: false, items: [] }], notes: "", cardio: { minPerDay: 0, days: [] }, weeklyGoal: 3 }; tpl().workouts.push(x); P.save(); T.go("tplEdit", { k: "w", id: x.id }); };
  T.actions.tplEditW = function (el) { T.go("tplEdit", { k: "w", id: el.dataset.id }); };
  T.pages.tplEdit = function (p) {
    var isW = p.k === "w", x = tpl()[isW ? "workouts" : "diets"].filter(function (y) { return y.id === p.id; })[0];
    if (!x) return '<div class="empty">Modelo não encontrado.</div>';
    var fake = "__tpl__" + x.id;
    if (!P.student(fake)) P.db.students.push({ id: fake, name: "(modelo) " + x.name, weight: 70, height: 170, sex: "Masculino", activity: "Moderadamente ativo", __tpl: true });
    if (isW) { if (!T._draftW || T._draftW._sid !== fake) { T._draftW = { name: x.name, workouts: clone(x.workouts), notes: x.notes || "", cardio: clone(x.cardio || { minPerDay: 0, days: [] }), weeklyGoal: x.weeklyGoal || 3, waterGoal: 3, cycleRestart: "Segunda-feira", _sid: fake }; T._wi = 0; } }
    else if (!T._draftD || T._draftD._sid !== fake) { T._draftD = clone(x.plan); T._draftD._sid = fake; T._vi = 0; T._oi = {}; }
    var saved = T.p.id; T.p = { id: fake, tab: isW ? "treino" : "dieta", tplId: x.id, k: p.k };
    var html = (isW ? T.tabs.treino : T.tabs.dieta)(P.student(fake), T.p);
    T.p = p;
    html = html.replace(/data-act="saveW"/g, 'data-act="tplSaveEdit"').replace(/data-act="saveD"/g, 'data-act="tplSaveEdit"').replace(/Salvar e enviar ao aluno/g, "Salvar modelo");
    return '<button class="back" style="color:var(--accent);font-weight:600" data-act="nav" data-v="' + (isW ? "modelosT" : "modelosD") + '">‹ Voltar</button><div class="page-title" style="margin:8px 0">Modelo: ' + esc(x.name) + "</div>" + html;
  };
  T.actions.tplSaveEdit = function () {
    var p = T.p, isW = p.k === "w", x = tpl()[isW ? "workouts" : "diets"].filter(function (y) { return y.id === p.id; })[0];
    if (isW) { var d = clone(T._draftW); delete d._sid; x.name = d.name; x.workouts = d.workouts; x.notes = d.notes; x.cardio = d.cardio; x.weeklyGoal = d.weeklyGoal; }
    else { var dd = clone(T._draftD); delete dd._sid; x.name = dd.name; x.plan = dd; }
    P.db.students = P.db.students.filter(function (s) { return !s.__tpl; });
    T._dirty = false; P.save(); T.toast("Modelo salvo."); T.go(isW ? "modelosT" : "modelosD");
  };
  // o "aluno de mentira" do editor de modelos nunca vai para o banco
  var baseGo = T.go;
  T.go = function (page, p) { if (page !== "tplEdit") P.db.students = P.db.students.filter(function (s) { return !s.__tpl; }); baseGo(page, p); };
  // ações do editor usam T.p.id: no editor de modelos, aponta para o aluno de mentira
  ["wSet", "selW", "addW", "dupW", "delW", "wDay", "wOpt", "cDay", "addItem", "delItem", "mvItem", "wSub", "tecSet", "wSuper", "applySubEx", "cdMode", "bulkW", "bulkApply", "dSet", "dTog", "dTogUnit", "selV", "addV", "dupV", "delV", "vDay", "addMeal", "delMeal", "mvMeal", "selO", "addO", "delO", "addFood", "delFood", "editSubs", "dSub", "closeSubs", "applySubAl", "copyMeals", "copyMealsDo", "tplImportR", "tplImportRDo", "tplSaveR", "discardW", "discardD", "tplImportW", "tplImportWDo", "tplImportD", "tplImportDDo"].forEach(function (k) {
    var fn = T.actions[k]; if (!fn) return;
    T.actions[k] = function (el, e) {
      if (T.page !== "tplEdit") return fn(el, e);
      var keep = T.p; T.p = { id: "__tpl__" + keep.id, tab: keep.k === "w" ? "treino" : "dieta", k: keep.k, id2: keep.id };
      var r = T.render; T.render = function () { T.p = keep; r.apply(T, arguments); };
      try { fn(el, e); } finally { T.render = r; T.p = keep; }
    };
  });

  T.pages.modelosD = function () {
    var list = tpl().diets.filter(function (x) { return T._tplInact || x.active !== false; });
    return '<div class="row between wrap"><div><div class="page-title">Dietas pré-definidas</div><div class="muted">Modelos de dieta para importar nas fichas.</div></div><button class="btn primary" data-act="tplNewD">+ Nova</button></div><label class="row small muted" style="margin:12px 0"><input type="checkbox" style="width:auto" data-change="tplInact"' + (T._tplInact ? " checked" : "") + '> Mostrar inativas</label><div class="card" style="padding:4px 8px"><table class="t"><tr><th>Nome</th><th>kcal</th><th>Status</th><th></th></tr>' + list.map(function (x) {
      return "<tr><td><b>" + esc(x.name) + '</b><div class="small muted">' + x.plan.variations.map(function (v) { return esc(v.name); }).join(" · ") + "</div></td><td>" + Math.round(P.variationMacros(x.plan.variations[0]).kcal) + "</td><td>" + (x.active === false ? '<span class="pill">Inativa</span>' : '<span class="pill accent">Ativa</span>') + '</td><td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="tplEditD" data-id="' + x.id + '">Editar</button> <button class="btn sm" data-act="tplToggle" data-k="diets" data-id="' + x.id + '">' + (x.active === false ? "Ativar" : "Desativar") + '</button> <button class="btn sm danger" data-act="tplDel" data-k="diets" data-id="' + x.id + '">×</button></td></tr>';
    }).join("") + "</table>" + (list.length ? "" : '<div class="empty">Nenhuma dieta pré-definida.</div>') + "</div>";
  };
  T.actions.tplNewD = function () { var x = { id: P.uid("tpd"), name: "Nova dieta modelo", active: true, plan: { name: "Nova dieta modelo", showMacros: true, allowUnitChange: true, notes: P.db.settings.defaultDietNotes || "", guidelines: "", variations: [{ id: P.uid("var"), name: "Dieta padrão", days: [0, 1, 2, 3, 4, 5, 6], waterGoal: 3, meals: [{ id: P.uid("ref"), name: "Café da manhã", time: "08:00", options: [{ items: [] }] }] }] } }; tpl().diets.push(x); P.save(); T.go("tplEdit", { k: "d", id: x.id }); };
  T.actions.tplEditD = function (el) { T.go("tplEdit", { k: "d", id: el.dataset.id }); };

  T.pages.modelosR = function () {
    var list = tpl().meals;
    return '<div class="row between wrap"><div><div class="page-title">Refeições pré-definidas</div><div class="muted">Salve uma refeição pelo 💾 dentro da ficha de dieta e reaproveite em outras.</div></div></div><div class="card" style="margin-top:14px;padding:4px 8px"><table class="t"><tr><th>Refeição</th><th>Alimentos</th><th>kcal</th><th></th></tr>' + list.map(function (x) {
      return '<tr><td><input value="' + esc(x.name) + '" data-change="tplMealName" data-id="' + x.id + '"></td><td class="small">' + x.meal.options[0].items.map(function (fi) { return esc(P.food(fi.foodId).name) + " " + fi.grams + "g"; }).join(", ") + "</td><td>" + Math.round(P.optionMacros(x.meal.options[0]).kcal) + '</td><td><button class="btn sm danger" data-act="tplDel" data-k="meals" data-id="' + x.id + '">×</button></td></tr>';
    }).join("") + "</table>" + (list.length ? "" : '<div class="empty">Nenhuma refeição pré-definida ainda.</div>') + "</div>";
  };
  T.actions.tplMealName = function (el) { var x = tpl().meals.filter(function (y) { return y.id === el.dataset.id; })[0]; x.name = el.value; x.meal.name = el.value; P.save(); T.toast("Salvo"); };

  /* ---------- Tabelas de substituição (exercícios e alimentos) ---------- */
  function substPage(kind) {
    var isEx = kind === "exercises", arr = P.db.subTables[kind] = P.db.subTables[kind] || [], src = isEx ? P.db.exercises : P.db.foods;
    return '<div class="row between wrap"><div><div class="page-title">Substituição de ' + (isEx ? "exercício" : "alimentos") + '</div><div class="muted">Crie grupos reutilizáveis de trocas e aplique nas fichas com um clique.</div></div><button class="btn primary" data-act="subNew" data-k="' + kind + '">+ Nova tabela</button></div>' +
      (arr.length ? arr.map(function (t, i) {
        return '<div class="card stack" style="margin-top:12px"><div class="row"><input class="grow" value="' + esc(t.name) + '" data-change="subName" data-k="' + kind + '" data-i="' + i + '"><span class="pill">' + t.items.length + ' itens</span><button class="icon-btn" style="color:var(--danger)" data-act="subDel" data-k="' + kind + '" data-i="' + i + '">×</button></div><div class="multi" style="max-height:200px">' + src.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (x) { return '<label><input type="checkbox" data-change="subItem" data-k="' + kind + '" data-i="' + i + '" value="' + x.id + '"' + (t.items.indexOf(x.id) >= 0 ? " checked" : "") + ">" + esc(x.name) + (isEx ? ' <span class="muted">· ' + esc(x.group) + "</span>" : "") + "</label>"; }).join("") + "</div></div>";
      }).join("") : '<div class="empty" style="margin-top:12px">Nenhum registro encontrado.</div>');
  }
  T.pages.substEx = function () { return substPage("exercises"); };
  T.pages.substAl = function () { return substPage("foods"); };
  T.actions.subNew = function (el) { P.db.subTables[el.dataset.k].push({ id: P.uid("sub"), name: "Nova tabela", items: [] }); P.save(); T.render(); };
  T.actions.subName = function (el) { P.db.subTables[el.dataset.k][+el.dataset.i].name = el.value; P.save(); T.toast("Salvo"); };
  T.actions.subDel = function (el) { if (!confirm("Apagar esta tabela?")) return; P.db.subTables[el.dataset.k].splice(+el.dataset.i, 1); P.save(); T.render(); };
  T.actions.subItem = function (el) { var a = P.db.subTables[el.dataset.k][+el.dataset.i].items, j = a.indexOf(el.value); if (el.checked && j < 0) a.push(el.value); if (!el.checked && j >= 0) a.splice(j, 1); P.save(); };

  /* ---------- Grupamentos musculares ---------- */
  T.pages.grupos = function () {
    return '<div class="row between wrap"><div><div class="page-title">Grupamentos musculares</div><div class="muted">Usados no volume de treino (séries por grupamento).</div></div><button class="btn primary" data-act="grpAdd">+ Novo</button></div><div class="card" style="margin-top:14px;padding:4px 8px"><table class="t"><tr><th>Nome</th><th>Exercícios</th><th></th></tr>' + P.db.groups.map(function (g, i) {
      var n = P.db.exercises.filter(function (e) { return e.group === g; }).length;
      return '<tr><td><input value="' + esc(g) + '" data-change="grpName" data-i="' + i + '"></td><td>' + n + '</td><td><button class="btn sm danger" data-act="grpDel" data-i="' + i + '"' + (n ? " disabled title=\"Há exercícios neste grupo\"" : "") + ">×</button></td></tr>";
    }).join("") + "</table></div>";
  };
  T.actions.grpAdd = function () { P.db.groups.push("Novo grupamento"); P.save(); T.render(); };
  T.actions.grpName = function (el) { var old = P.db.groups[+el.dataset.i], nv = el.value.trim(); if (!nv) return; P.db.groups[+el.dataset.i] = nv; P.db.exercises.forEach(function (e) { if (e.group === old) e.group = nv; }); P.save(); T.toast("Salvo"); };
  T.actions.grpDel = function (el) { P.db.groups.splice(+el.dataset.i, 1); P.save(); T.render(); };

  /* ---------- Notificações (avisos que aparecem no sino do app do aluno) ---------- */
  T.pages.notificacoes = function () {
    var list = (P.db.notices || []).slice().sort(function (a, b) { return (a.sendAt || "") < (b.sendAt || "") ? 1 : -1; }), now = new Date().toISOString().slice(0, 16);
    function dest(n) { var t = n.to || {}; if (t.all) return "Todos os alunos"; var a = (t.ids || []).map(function (id) { var s = P.student(id); return s ? s.name : ""; }).filter(Boolean); var g = (t.tags || []).map(function (id) { var x = T.tag(id); return x ? "🏷️ " + x.name : ""; }).filter(Boolean); return a.concat(g).join(", ") || "—"; }
    var sent = list.filter(function (n) { return n.recur || !n.sendAt || n.sendAt <= now; }), sched = list.filter(function (n) { return !n.recur && n.sendAt && n.sendAt > now; });
    var tab = T._ntab || "envios", show = tab === "envios" ? sent : sched;
    return '<div class="row between wrap"><div><div class="page-title">Notificações</div><div class="muted">Avisos enviados aos seus alunos (aparecem no sino 🔔 do app).</div></div><button class="btn primary" data-act="ntNew">+ Nova notificação</button></div><div class="subtabs"><button class="' + (tab === "envios" ? "on" : "") + '" data-act="ntTab" data-t="envios">Envios</button><button class="' + (tab === "agendados" ? "on" : "") + '" data-act="ntTab" data-t="agendados">Agendados (' + sched.length + ')</button></div>' +
      '<div class="card" style="padding:4px 8px;overflow-x:auto"><table class="t"><tr><th>Título</th><th>Destinatários</th><th>Quando</th><th>Lidas</th><th></th></tr>' + show.map(function (n) {
        var seen = P.db.students.filter(function (s) { return (P.logsOf(s.id).noticesSeen || []).some(function (x) { return String(x).split("@")[0] === n.id; }); }).length;
        return "<tr><td><b>" + esc(n.title) + '</b><div class="small muted">' + esc(n.desc) + '</div></td><td class="small">' + esc(dest(n)) + '</td><td class="small">' + (n.recur ? "A cada " + n.recur.every + " dias desde " : "") + T.stamp(n.sendAt || n.createdAt) + "</td><td>" + seen + '</td><td><button class="btn sm danger" data-act="ntDel" data-id="' + n.id + '">×</button></td></tr>';
      }).join("") + "</table>" + (show.length ? "" : '<div class="empty">Nada por aqui.</div>') + '</div><div class="small muted" style="margin-top:10px">Os avisos aparecem quando o aluno abre o app. Para lembrar pelo WhatsApp, use o botão 📲 no Painel.</div>';
  };
  T.actions.ntTab = function (el) { T._ntab = el.dataset.t; T.render(); };
  T.actions.ntNew = function () {
    var st = P.db.students.filter(function (s) { return s.active; });
    T.sheet("Cadastro de notificação", '<div class="stack"><div class="field"><label>Título (até 30)</label><input id="ntT" maxlength="30"></div><div class="field"><label>Descrição (até 150)</label><textarea id="ntD" maxlength="150" rows="3"></textarea></div>' +
      '<div class="field"><label>Destinatários</label><label class="row small"><input type="checkbox" style="width:auto" id="ntAll" checked> Todos os alunos ativos</label><div class="small muted" style="margin-top:6px">ou escolha etiquetas / alunos:</div><div class="row wrap">' + (P.db.tags || []).map(function (t) { return '<label class="row small"><input type="checkbox" style="width:auto" class="ntTag" value="' + t.id + '"><span class="tagp" style="background:' + t.color + '">' + esc(t.name) + "</span></label>"; }).join("") + '</div><div class="multi" style="margin-top:6px">' + st.map(function (s) { return '<label><input type="checkbox" class="ntStu" value="' + s.id + '">' + esc(s.name) + "</label>"; }).join("") + "</div></div>" +
      '<div class="field"><label>Quando enviar</label><select id="ntW" data-change="ntWhen"><option value="now">Enviar agora</option><option value="once">Agendar disparo único</option><option value="rec">Agendar disparos recorrentes</option></select></div><div id="ntWhenBox"></div><button class="btn primary block" data-act="ntSave">Criar e enviar notificação</button></div>', true);
  };
  T.actions.ntWhen = function (el) {
    var v = el.value, d = new Date(Date.now() + 36e5).toISOString().slice(0, 16);
    document.getElementById("ntWhenBox").innerHTML = v === "now" ? "" : '<div class="row wrap"><div class="field"><label>' + (v === "rec" ? "Começa em" : "Data e hora") + '</label><input id="ntAt" type="datetime-local" value="' + d + '"></div>' + (v === "rec" ? '<div class="field"><label>Repetir a cada (dias)</label><input id="ntEv" type="number" value="7" min="1"></div>' : "") + "</div>";
  };
  T.actions.ntSave = function () {
    var t = document.getElementById("ntT").value.trim(), d = document.getElementById("ntD").value.trim(); if (!t) { T.toast("Escreva o título."); return; }
    var all = document.getElementById("ntAll").checked, tags = [].map.call(document.querySelectorAll(".ntTag:checked"), function (x) { return x.value; }), ids = [].map.call(document.querySelectorAll(".ntStu:checked"), function (x) { return x.value; });
    if (!all && !tags.length && !ids.length) { T.toast("Escolha os destinatários."); return; }
    var w = document.getElementById("ntW").value, at = w === "now" ? new Date().toISOString().slice(0, 16) : (document.getElementById("ntAt").value || new Date().toISOString().slice(0, 16));
    var n = { id: P.uid("nt"), title: t, desc: d, to: all ? { all: true } : { tags: tags, ids: ids }, sendAt: at, createdAt: new Date().toISOString() };
    if (w === "rec") n.recur = { every: Math.max(1, parseInt(document.getElementById("ntEv").value, 10) || 7) };
    P.db.notices = P.db.notices || []; P.db.notices.push(n); P.save(); T.closeSheet(); T.toast(w === "now" ? "Notificação enviada." : "Notificação agendada."); T.render();
  };
  T.actions.ntDel = function (el) { if (!confirm("Apagar esta notificação?")) return; P.db.notices = P.db.notices.filter(function (n) { return n.id !== el.dataset.id; }); P.save(); T.render(); };

  /* ---------- Questionários: os dois fixos + questionários extras ---------- */
  var baseQ = T.pages.questionario, baseQArr = T.qArr;
  T.qArr = function () { var k = T._qKind; if (k && k !== "semanal" && k !== "mensal") { var f = (P.db.extraForms || []).filter(function (x) { return x.id === k; })[0]; if (f) return f.questions; } return baseQArr(); };
  T.pages.questionario = function () {
    var k = T._qKind || "semanal", extra = P.db.extraForms || [], isExtra = k !== "semanal" && k !== "mensal";
    var tabs = '<div class="subtabs">' + P.forms().map(function (f) { return '<button class="' + (k === f.id ? "on" : "") + '" data-act="qKind" data-k="' + f.id + '">' + esc(f.name) + "</button>"; }).join("") + '<button data-act="formNew">+ Novo questionário</button></div>';
    var html = baseQ();
    html = html.replace(/<div class="subtabs">[\s\S]*?<\/div>/, tabs);
    if (isExtra) { var f = extra.filter(function (x) { return x.id === k; })[0]; html = html.replace(/<div class="small muted">[^<]*<\/div><div class="stack"/, '<div class="row wrap" style="margin:8px 0"><input style="max-width:320px" value="' + esc(f.name) + '" data-change="formName"><button class="btn sm danger" data-act="formDel">Apagar questionário</button></div><div class="stack"'); }
    return html;
  };
  T.actions.formNew = function () { var f = { id: P.uid("form"), name: "Novo questionário", questions: [{ id: P.uid("q"), text: "Nova pergunta", type: "scale" }] }; P.db.extraForms = P.db.extraForms || []; P.db.extraForms.push(f); P.save(); T._qKind = f.id; T.render(); };
  T.actions.formName = function (el) { var f = P.db.extraForms.filter(function (x) { return x.id === T._qKind; })[0]; f.name = el.value; P.save(); T.toast("Salvo"); };
  T.actions.formDel = function () { if (!confirm("Apagar este questionário?")) return; P.db.extraForms = P.db.extraForms.filter(function (x) { return x.id !== T._qKind; }); T._qKind = "semanal"; P.save(); T.render(); };

  /* ---------- Materiais: módulos ---------- */
  T.pages.materiais = function () {
    var total = P.db.students.filter(function (s) { return s.active; }).length, mods = {};
    P.db.materials.forEach(function (m) { var k = m.module || ""; (mods[k] = mods[k] || []).push(m); });
    var keys = Object.keys(mods).sort(function (a, b) { return a === "" ? 1 : b === "" ? -1 : a.localeCompare(b); });
    return '<div class="row between wrap"><div><div class="page-title">Materiais extras</div><div class="muted">Materiais (' + P.db.materials.length + ") · Módulos (" + keys.filter(Boolean).length + ') — conteúdos que todos os alunos veem no app.</div></div><button class="btn primary" data-act="editMat">+ Novo material</button></div>' + keys.map(function (k) {
      return '<div class="card" style="margin-top:14px;padding:4px 8px"><b style="display:block;padding:8px 2px">' + (k ? "📦 Módulo: " + esc(k) : "Materiais sem módulo") + '</b><table class="t"><tr><th>Material</th><th>Aberturas</th><th></th></tr>' + mods[k].map(function (m) {
        var opened = P.db.students.filter(function (s) { return P.logsOf(s.id).materialsSeen.indexOf(m.id) >= 0; }).length;
        return "<tr><td><b>" + esc(m.title) + '</b><div class="small muted">' + esc(m.desc) + "</div></td><td>" + opened + " de " + total + '</td><td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="editMat" data-id="' + m.id + '">Editar</button> <button class="btn sm danger" data-act="delMat" data-id="' + m.id + '">Remover</button></td></tr>';
      }).join("") + "</table></div>";
    }).join("");
  };
  var baseEditMat = T.actions.editMat;
  T.actions.editMat = function (el) {
    baseEditMat(el);
    var m = el.dataset.id ? P.db.materials.filter(function (x) { return x.id === el.dataset.id; })[0] : {};
    var box = document.getElementById("mtT").closest(".field");
    box.insertAdjacentHTML("afterend", '<div class="field"><label>Módulo (opcional — agrupa os materiais no app)</label><input id="mtM" list="mtMods" value="' + esc(m.module || "") + '"><datalist id="mtMods">' + uniqMods().map(function (x) { return "<option>" + esc(x) + "</option>"; }).join("") + "</datalist></div>");
  };
  function uniqMods() { var o = []; P.db.materials.forEach(function (m) { if (m.module && o.indexOf(m.module) < 0) o.push(m.module); }); return o; }
  var baseSaveMat = T.actions.saveMat;
  T.actions.saveMat = function (el) {
    var mod = (document.getElementById("mtM") || {}).value || "", before = P.db.materials.map(function (m) { return m.id; });
    baseSaveMat(el);
    var m = el.dataset.id ? P.db.materials.filter(function (x) { return x.id === el.dataset.id; })[0] : P.db.materials.filter(function (x) { return before.indexOf(x.id) < 0; })[0];
    if (m) { m.module = mod.trim(); P.save(); T.render(); }
  };

  /* ---------- Configurações completas ---------- */
  T.pages.config = function () {
    var c = P.db.settings, tab = T._cfg || "treino";
    function tg(k, t, d) { return '<div class="list-item"><span class="grow"><b>' + t + '</b><div class="small muted">' + d + '</div></span><button class="toggle' + (c[k] ? " on" : "") + '" data-act="cfgToggle" data-k="' + k + '"></button></div>'; }
    function num(k, t, d, w) { return '<div class="list-item"><span class="grow"><b>' + t + '</b><div class="small muted">' + d + '</div></span><input type="number" min="0" style="width:' + (w || 80) + 'px" value="' + (c[k] || 0) + '" data-change="cfgNum" data-k="' + k + '"></div>'; }
    function txt(k, t, d) { return '<div class="stack" style="padding:12px 0"><b>' + t + '</b><span class="small muted">' + d + '</span><textarea rows="4" data-change="cfgTxt" data-k="' + k + '">' + esc(c[k] || "") + "</textarea></div>"; }
    var body = {
      treino: tg("askEffortOnFinish", "Solicitar observação e esforço percebido ao finalizar treino", "O aluno dá uma nota de esforço e pode deixar um recado.") + tg("pseByExercise", "Solicitar percepção de esforço (PSE) por exercício", "Durante o treino o aluno registra nota e observação em cada exercício.") + tg("logWarmPrepLoad", "Permitir registrar carga nas séries de aquecimento e preparatórias", "Desligado: só as séries válidas pedem carga.") + tg("prescribeLoad", "Permitir prescrever carga nos exercícios", "Mostra o campo 'Carga sugerida' na ficha.") + tg("allowSubs", "Permitir substituições de exercícios", "O aluno pode trocar pelos substitutos que você liberou.") + tg("showChanges", "Permitir que o aluno veja o que mudou no treino e na dieta", "Aparece um aviso com a lista de mudanças quando você atualiza a ficha.") + txt("defaultWorkoutNotes", "Observações gerais de treino (padrão)", "Entram automaticamente em toda ficha nova de treino."),
      dieta: tg("allowUnitChange", "Aluno pode trocar a unidade de medida (padrão)", "Ex: ver 150 g de arroz como 10 colheres de sopa. Cada ficha também tem essa opção.") + txt("defaultDietNotes", "Observações gerais de dieta (padrão)", "Entram automaticamente em toda dieta nova.") + '<div class="stack" style="padding:12px 0"><b>Carimbo CRN</b><span class="small muted">Imagem do carimbo que vai no PDF da dieta.</span><div class="row"><label class="btn sm">🖼️ ' + (c.crnImg ? "Trocar imagem" : "Enviar imagem") + '<input type="file" accept="image/*" hidden data-change="cfgCrn"></label>' + (c.crnImg ? '<img src="' + c.crnImg + '" style="max-height:60px;background:#fff;border-radius:6px"><button class="btn sm danger" data-act="cfgCrnDel">Tirar</button>' : "") + "</div></div>",
      acomp: num("minPhotos", "Quantidade mínima de fotos", "Quantas fotos o aluno precisa enviar na atualização.") + tg("weeklyPhotos", "Pedir fotos também no check-in semanal", "Desligado: fotos só no mensal ou quando a atualização programada pedir.") + num("scheduleEveryDays", "Intervalo padrão das atualizações programadas (dias)", "Usado ao criar uma nova atualização.") + num("ckDaysBefore", "Bloquear: quantos dias ANTES da data o aluno já pode enviar", "0 = sem bloqueio.") + num("ckDaysAfter", "Bloquear: quantos dias DEPOIS da data o aluno ainda pode enviar", "0 = sem bloqueio.") + tg("allowStudentFiles", "Permitir que o aluno envie anexos", "Exames, laudos etc. (até 300 KB cada)."),
      notif: num("recoverNoTrainDays", "Recuperação de alunos: dias sem treinar", "Aparece no Painel para você chamar no WhatsApp. 0 = desligado.") + num("recoverNoOpenDays", "Recuperação de alunos: dias sem abrir o app", "0 = desligado.") + '<div class="small muted" style="padding:12px 0">Notificação no celular (push) e WhatsApp automático precisam de um servidor pago; por enquanto os avisos ficam no sino do app e o lembrete é pelo botão 📲 do Painel.</div>'
    }[tab];
    return '<div class="page-title">Configurações</div><div class="subtabs">' + [["treino", "Treino"], ["dieta", "Dieta"], ["acomp", "Acompanhamento"], ["notif", "Notificações"]].map(function (x) { return '<button class="' + (tab === x[0] ? "on" : "") + '" data-act="cfgTab" data-t="' + x[0] + '">' + x[1] + "</button>"; }).join("") + '</div><div class="card" style="padding-top:2px;padding-bottom:2px"><div class="list">' + body + "</div></div>";
  };
  T.actions.cfgTab = function (el) { T._cfg = el.dataset.t; T.render(); };
  T.actions.cfgNum = function (el) { P.db.settings[el.dataset.k] = Math.max(0, parseInt(el.value, 10) || 0); P.save(); T.toast("Salvo"); };
  T.actions.cfgTxt = function (el) { P.db.settings[el.dataset.k] = el.value; P.save(); T.toast("Salvo"); };
  T.actions.cfgCrn = function (el) { var f = el.files[0]; if (!f) return; T.readImage(f, function (u) { P.db.settings.crnImg = u; P.save(); T.render(); }); };
  T.actions.cfgCrnDel = function () { P.db.settings.crnImg = ""; P.save(); T.render(); };
})();
