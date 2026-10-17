/* Site do treinador — editores de ficha de treino e de dieta */
(function () {
  "use strict";
  var P = window.Proto, T = window.T, esc = P.esc;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function getPath(o, path) { return path.split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function setPath(o, path, v) { var ks = path.split("."), last = ks.pop(), t = getPath(o, ks.join(".")) || o; if (!ks.length) t = o; t[last] = v; }
  function exOptions(sel) {
    var groups = {}; P.db.exercises.forEach(function (e) { (groups[e.group] = groups[e.group] || []).push(e); });
    return Object.keys(groups).map(function (g) { return '<optgroup label="' + esc(g) + '">' + groups[g].map(function (e) { return '<option value="' + e.id + '"' + (e.id === sel ? " selected" : "") + ">" + esc(e.name) + "</option>"; }).join("") + "</optgroup>"; }).join("");
  }
  function foodOptions(sel) { return P.db.foods.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (f) { return '<option value="' + f.id + '"' + (f.id === sel ? " selected" : "") + ">" + esc(f.name) + "</option>"; }).join(""); }
  function dirtyBar(kind) {
    return '<div class="sticky-save"><div class="card">' + (T._dirty ? '<span class="small" style="color:var(--prep)">● Alterações não salvas</span>' : '<span class="small muted">Tudo salvo</span>') +
      '<button class="btn sm" data-act="discard' + kind + '"' + (T._dirty ? "" : " disabled") + '>Descartar</button><button class="btn sm primary" data-act="save' + kind + '"' + (T._dirty ? "" : " disabled") + ">Salvar e enviar ao aluno</button></div></div>";
  }
  function mark() { T._dirty = true; }
  T.actions.nav2 = T.actions.nav;
  // Avisar ao sair com alterações não salvas
  var origGo = T.go;
  T.go = function (page, p) {
    if (T._dirty && !confirm("Há alterações não salvas na ficha. Sair mesmo assim?")) return;
    T._dirty = false; T._draftW = null; T._draftD = null; origGo(page, p);
  };
  var origTab = T.actions.stTab;
  T.actions.stTab = function (el) { if (T._dirty && !confirm("Há alterações não salvas na ficha. Sair mesmo assim?")) return; T._dirty = false; origTab(el); };

  /* ================= TREINO ================= */
  function blankItem(exId) { return { id: P.uid("it"), exId: exId || P.db.exercises[0].id, warmup: { sets: 0, reps: "12-15", rest: "0:30-1:00" }, prep: { sets: 1, reps: "10-12", rest: "1:00-1:30" }, valid: { sets: 3, reps: ["8-10", "8-10", "8-10"], rest: "1:30-2:00" }, rir: "0-1", techniqueId: "", techniqueSets: [], notes: "", subs: [], superset: false }; }
  function blankPlan() { return { name: "Novo treino", updatedAt: P.todayISO(), validUntil: P.addDays(P.todayISO(), 60), waterGoal: 3, cycleRestart: "Segunda-feira", weeklyGoal: 3, notes: "", cardio: { minPerDay: 0, days: [] }, workouts: [{ id: P.uid("tr"), name: "Treino A", subtitle: "", days: [], optional: false, items: [] }] }; }

  T.tabs.treino = function (s) {
    if (!T._draftW || T._draftW._sid !== s.id) { var src = P.db.workoutPlans[s.id]; T._draftW = src ? clone(src) : null; if (T._draftW) T._draftW._sid = s.id; T._wi = 0; T._dirty = false; }
    var d = T._draftW;
    if (!d) return '<div class="card empty">Este aluno ainda não tem treino.<br><br><button class="btn primary" data-act="newPlanW">Criar ficha de treino</button></div>';
    var wi = Math.min(T._wi || 0, d.workouts.length - 1), w = d.workouts[wi];
    var vol = P.volumeByGroup(d.workouts), volW = P.volumeByGroup([w]);
    function inp(path, val, type, extra) { return '<input data-change="wSet" data-path="' + path + '" data-type="' + (type || "text") + '" value="' + esc(val == null ? "" : val) + '"' + (type === "num" ? ' type="number" min="0"' : "") + (extra || "") + ">"; }
    var html = '<div class="card stack"><div class="grid2"><div class="field"><label>Nome da ficha</label>' + inp("name", d.name) + '</div><div class="field"><label>Válida até</label>' + inp("validUntil", d.validUntil, "text", ' type="date"') + "</div></div>" +
      '<div class="ed-grid"><div class="field"><label>Meta semanal (treinos)</label>' + inp("weeklyGoal", d.weeklyGoal, "num") + '</div><div class="field"><label>Meta de água (L)</label>' + inp("waterGoal", d.waterGoal, "num", ' step="0.5"') + '</div><div class="field"><label>Reinício do ciclo</label><select data-change="wSet" data-path="cycleRestart">' + P.DOW_FULL.map(function (x) { var v = x === "Domingo" || x === "Sábado" ? x : x + "-feira"; return "<option" + (d.cycleRestart === v ? " selected" : "") + ">" + v + "</option>"; }).join("") + "</select></div></div></div>";
    html += '<div class="row wrap" style="margin:16px 0 10px;gap:6px">' + d.workouts.map(function (x, i) { return '<button class="chip' + (i === wi ? " on" : "") + '" data-act="selW" data-i="' + i + '">' + esc(x.name) + (x.optional ? " (opc.)" : "") + "</button>"; }).join("") + '<button class="chip" data-act="addW">+ Treino</button></div>';
    html += '<div class="card stack"><div class="grid2"><div class="field"><label>Nome do treino</label>' + inp("workouts." + wi + ".name", w.name) + '</div><div class="field"><label>Descrição curta</label>' + inp("workouts." + wi + ".subtitle", w.subtitle, "text", ' placeholder="Ex: Peito e tríceps"') + "</div></div>" +
      '<div class="row wrap between"><div><div class="small muted" style="margin-bottom:4px">Dias sugeridos (o aluno pode fazer em qualquer dia)</div><div class="days">' + P.DOW.map(function (n, i) { return '<button class="' + (w.days.indexOf(i) >= 0 ? "on" : "") + '" data-act="wDay" data-d="' + i + '">' + n + "</button>"; }).join("") + '</div></div><label class="row small"><button class="toggle' + (w.optional ? " on" : "") + '" data-act="wOpt"></button> Treino opcional (não conta na meta)</label></div>' +
      '<div class="row wrap"><button class="btn sm" data-act="dupW">Duplicar treino</button><button class="btn sm danger" data-act="delW"' + (d.workouts.length < 2 ? " disabled" : "") + ">Excluir treino</button></div></div>";
    html += '<div class="stack" style="margin-top:12px">' + w.items.map(function (it, i) {
      var base = "workouts." + wi + ".items." + i + ".";
      return '<div class="ed-item stack"><div class="row"><b class="muted">' + (i + 1) + '</b><select class="grow" data-change="wSet" data-path="' + base + 'exId">' + exOptions(it.exId) + '</select><button class="icon-btn" data-act="mvItem" data-i="' + i + '" data-d="-1">↑</button><button class="icon-btn" data-act="mvItem" data-i="' + i + '" data-d="1">↓</button><button class="icon-btn" style="color:var(--danger)" data-act="delItem" data-i="' + i + '">×</button></div>' +
        '<div class="ed-grid">' +
        '<div class="field"><label><i class="dot warm"></i> Aquec. séries</label>' + inp(base + "warmup.sets", it.warmup.sets, "num") + '</div><div class="field"><label>Aquec. reps</label>' + inp(base + "warmup.reps", it.warmup.reps) + '</div><div class="field"><label>Aquec. intervalo</label>' + inp(base + "warmup.rest", it.warmup.rest) + "</div>" +
        '<div class="field"><label><i class="dot prep"></i> Prep. séries</label>' + inp(base + "prep.sets", it.prep.sets, "num") + '</div><div class="field"><label>Prep. reps</label>' + inp(base + "prep.reps", it.prep.reps) + '</div><div class="field"><label>Prep. intervalo</label>' + inp(base + "prep.rest", it.prep.rest) + "</div>" +
        '<div class="field"><label><i class="dot valid"></i> Válidas séries</label>' + inp(base + "valid.sets", it.valid.sets, "num") + '</div><div class="field"><label>Reps por série</label>' + inp(base + "valid.reps", (it.valid.reps || []).join(", "), "list", ' placeholder="8-10, 6-8, 4-6"') + '</div><div class="field"><label>Válidas intervalo</label>' + inp(base + "valid.rest", it.valid.rest) + "</div>" +
        '<div class="field"><label>RIR</label>' + inp(base + "rir", it.rir) + '</div><div class="field"><label>Técnica</label><select data-change="wSet" data-path="' + base + 'techniqueId"><option value="">Nenhuma</option>' + P.db.techniques.map(function (t) { return '<option value="' + t.id + '"' + (t.id === it.techniqueId ? " selected" : "") + ">" + esc(t.name) + "</option>"; }).join("") + "</select></div></div>" +
        '<div class="grid2"><div class="field"><label>Observação do exercício</label>' + inp(base + "notes", it.notes, "text", ' placeholder="Ex: pegada aberta, desça devagar"') + '</div><div class="field"><label>Substitutos que o aluno pode usar</label><div class="multi">' + P.db.exercises.filter(function (e) { return e.id !== it.exId && e.group === P.exercise(it.exId).group; }).map(function (e) { return '<label><input type="checkbox" data-change="wSub" data-i="' + i + '" value="' + e.id + '"' + (it.subs.indexOf(e.id) >= 0 ? " checked" : "") + ">" + esc(e.name) + "</label>"; }).join("") + '<div class="small muted">Mostra exercícios do mesmo grupo muscular.</div></div></div></div></div>';
    }).join("") + '<button class="btn" data-act="addItem">+ Adicionar exercício</button></div>';
    function volHtml(v) { var ks = Object.keys(v).sort(function (a, b) { return v[b] - v[a]; }); return ks.length ? '<div class="vol">' + ks.map(function (k) { return '<span class="pill">' + esc(k) + ": <b>" + v[k] + "</b></span>"; }).join("") + "</div>" : '<span class="small muted">—</span>'; }
    html += '<div class="grid2" style="margin-top:14px"><div class="card stack"><b>Volume deste treino</b><span class="small muted">Séries válidas por grupo muscular</span>' + volHtml(volW) + '</div><div class="card stack"><b>Volume da semana</b><span class="small muted">Soma dos treinos não opcionais</span>' + volHtml(vol) + "</div></div>";
    html += '<div class="grid2" style="margin-top:14px"><div class="card stack"><b>Cardio</b><div class="row wrap"><div class="field"><label>Minutos por dia</label>' + inp("cardio.minPerDay", d.cardio.minPerDay, "num") + '</div></div><div class="days">' + P.DOW.map(function (n, i) { return '<button class="' + (d.cardio.days.indexOf(i) >= 0 ? "on" : "") + '" data-act="cDay" data-d="' + i + '">' + n + "</button>"; }).join("") + '</div><span class="small muted">Total semanal: ' + d.cardio.minPerDay * d.cardio.days.length + ' min</span></div><div class="card stack"><b>Observações gerais do treino</b><textarea rows="6" data-change="wSet" data-path="notes">' + esc(d.notes) + "</textarea></div></div>";
    return html + dirtyBar("W");
  };
  T.actions.newPlanW = function () { T._draftW = blankPlan(); T._draftW._sid = T.p.id; T._wi = 0; mark(); T.render(); };
  T.actions.wSet = function (el) {
    var v = el.value, t = el.dataset.type;
    if (t === "num") v = parseFloat(v) || 0; else if (t === "list") v = v.split(",").map(function (x) { return x.trim(); }).filter(Boolean);
    setPath(T._draftW, el.dataset.path, v); mark();
    if (/\.exId$|\.sets$|techniqueId|minPerDay|^workouts\.\d+\.name$/.test(el.dataset.path) || el.tagName === "SELECT") T.render(); else refreshBar();
  };
  function refreshBar() { var b = document.querySelector(".sticky-save"); if (b) b.outerHTML = dirtyBar(T.p.tab === "dieta" ? "D" : "W"); }
  T.actions.selW = function (el) { T._wi = +el.dataset.i; T.render(); };
  T.actions.addW = function () { var d = T._draftW, n = String.fromCharCode(65 + d.workouts.length); d.workouts.push({ id: P.uid("tr"), name: "Treino " + n, subtitle: "", days: [], optional: false, items: [] }); T._wi = d.workouts.length - 1; mark(); T.render(); };
  T.actions.dupW = function () { var d = T._draftW, w = clone(d.workouts[T._wi]); w.id = P.uid("tr"); w.name += " (cópia)"; w.items.forEach(function (it) { it.id = P.uid("it"); }); d.workouts.splice(T._wi + 1, 0, w); T._wi++; mark(); T.render(); };
  T.actions.delW = function () { var d = T._draftW; if (d.workouts.length < 2 || !confirm("Excluir " + d.workouts[T._wi].name + "?")) return; d.workouts.splice(T._wi, 1); T._wi = 0; mark(); T.render(); };
  T.actions.wDay = function (el) { var w = T._draftW.workouts[T._wi], d = +el.dataset.d, i = w.days.indexOf(d); if (i >= 0) w.days.splice(i, 1); else w.days.push(d); w.days.sort(); mark(); T.render(); };
  T.actions.wOpt = function () { var w = T._draftW.workouts[T._wi]; w.optional = !w.optional; mark(); T.render(); };
  T.actions.cDay = function (el) { var c = T._draftW.cardio, d = +el.dataset.d, i = c.days.indexOf(d); if (i >= 0) c.days.splice(i, 1); else c.days.push(d); c.days.sort(); mark(); T.render(); };
  T.actions.addItem = function () { T._draftW.workouts[T._wi].items.push(blankItem()); mark(); T.render(); };
  T.actions.delItem = function (el) { T._draftW.workouts[T._wi].items.splice(+el.dataset.i, 1); mark(); T.render(); };
  T.actions.mvItem = function (el) { var a = T._draftW.workouts[T._wi].items, i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= a.length) return; a.splice(j, 0, a.splice(i, 1)[0]); mark(); T.render(); };
  T.actions.wSub = function (el) { var it = T._draftW.workouts[T._wi].items[+el.dataset.i], k = it.subs.indexOf(el.value); if (el.checked && k < 0) it.subs.push(el.value); if (!el.checked && k >= 0) it.subs.splice(k, 1); mark(); refreshBar(); };
  T.actions.saveW = function () {
    var d = clone(T._draftW); delete d._sid;
    d.workouts.forEach(function (w) { w.items.forEach(function (it) { var n = it.valid.sets, r = it.valid.reps || []; while (r.length < n) r.push(r[r.length - 1] || "8-10"); it.valid.reps = r.slice(0, n); }); });
    d.updatedAt = P.todayISO(); P.db.workoutPlans[T.p.id] = d; P.save(); T._dirty = false; T._draftW = null; T.toast("Treino salvo — já aparece no app do aluno."); T.render();
  };
  T.actions.discardW = function () { T._dirty = false; T._draftW = null; T.render(); };

  /* ================= DIETA ================= */
  function blankMeal(name, time) { return { id: P.uid("ref"), name: name || "Nova refeição", time: time || "12:00", options: [{ items: [] }] }; }
  function blankDiet() { return { name: "Dieta", updatedAt: P.todayISO(), showMacros: true, allowUnitChange: true, notes: "", guidelines: "", variations: [{ id: P.uid("var"), name: "Dieta padrão", days: [0, 1, 2, 3, 4, 5, 6], waterGoal: 3, meals: [blankMeal("Café da manhã", "08:00"), blankMeal("Almoço", "12:30"), blankMeal("Jantar", "20:00")] }] }; }

  T.tabs.dieta = function (s) {
    if (!T._draftD || T._draftD._sid !== s.id) { var src = P.db.dietPlans[s.id]; T._draftD = src ? clone(src) : null; if (T._draftD) T._draftD._sid = s.id; T._vi = 0; T._oi = {}; T._dirty = false; }
    var d = T._draftD;
    if (!d) return '<div class="card empty">Este aluno ainda não tem dieta.<br><br><button class="btn primary" data-act="newPlanD">Criar ficha de dieta</button></div>';
    T._oi = T._oi || {};
    var vi = Math.min(T._vi || 0, d.variations.length - 1), v = d.variations[vi], tot = P.variationMacros(v), kg = s.weight || 70;
    function inp(path, val, type, extra) { return '<input data-change="dSet" data-path="' + path + '" data-type="' + (type || "text") + '" value="' + esc(val == null ? "" : val) + '"' + (type === "num" ? ' type="number" min="0"' : "") + (extra || "") + ">"; }
    // resumo semanal
    var week = [], sumK = 0;
    for (var i = 0; i < 7; i++) { var vv = d.variations.filter(function (x) { return x.days.indexOf(i) >= 0; })[0]; var k = vv ? P.variationMacros(vv).kcal : 0; sumK += k; week.push({ d: i, v: vv, k: k }); }
    var html = '<div class="card stack"><div class="grid2"><div class="field"><label>Nome da ficha</label>' + inp("name", d.name) + '</div><div class="row wrap" style="gap:16px"><label class="row small"><button class="toggle' + (d.showMacros ? " on" : "") + '" data-act="dTog" data-k="showMacros"></button> Mostrar macros no app</label></div></div>' +
      '<div><b class="small">Resumo da semana</b><div class="row wrap" style="gap:6px;margin-top:6px">' + week.map(function (x) { return '<span class="pill">' + P.DOW[x.d] + ": " + (x.v ? esc(x.v.name) + " · " + Math.round(x.k) + " kcal" : '<span style="color:var(--warm)">sem dieta</span>') + "</span>"; }).join("") + '</div><div class="small muted" style="margin-top:6px">Total da semana: ' + Math.round(sumK).toLocaleString("pt-BR") + " kcal · média " + Math.round(sumK / 7) + " kcal/dia</div></div></div>";
    html += '<div class="row wrap" style="margin:16px 0 10px;gap:6px">' + d.variations.map(function (x, i) { return '<button class="chip' + (i === vi ? " on" : "") + '" data-act="selV" data-i="' + i + '">' + esc(x.name) + "</button>"; }).join("") + '<button class="chip" data-act="addV">+ Variação (ex: dia de descanso)</button></div>';
    html += '<div class="card stack"><div class="grid2"><div class="field"><label>Nome da variação</label>' + inp("variations." + vi + ".name", v.name) + '</div><div class="field"><label>Meta de água (L)</label>' + inp("variations." + vi + ".waterGoal", v.waterGoal, "num", ' step="0.5"') + '</div></div><div><div class="small muted" style="margin-bottom:4px">Dias desta variação (um dia só pode estar em uma variação)</div><div class="days">' + P.DOW.map(function (n, i) { return '<button class="' + (v.days.indexOf(i) >= 0 ? "on" : "") + '" data-act="vDay" data-d="' + i + '">' + n + "</button>"; }).join("") + "</div></div>" +
      '<div class="macro-row row wrap" style="gap:8px"><span class="pill accent">' + Math.round(tot.kcal) + " kcal</span><span class=\"pill\">P " + P.round1(tot.p) + "g (" + P.round1(tot.p / kg) + " g/kg)</span><span class=\"pill\">C " + P.round1(tot.c) + "g (" + P.round1(tot.c / kg) + " g/kg)</span><span class=\"pill\">G " + P.round1(tot.g) + "g (" + P.round1(tot.g / kg) + " g/kg)</span><span class=\"pill\">Fibras " + P.round1(tot.fib) + 'g</span></div><div class="row wrap"><button class="btn sm" data-act="dupV">Duplicar variação</button><button class="btn sm danger" data-act="delV"' + (d.variations.length < 2 ? " disabled" : "") + ">Excluir variação</button></div></div>";
    html += '<div class="stack" style="margin-top:12px">' + v.meals.map(function (m, mi) {
      var oi = Math.min(T._oi[m.id] || 0, m.options.length - 1), o = m.options[oi], mm = P.optionMacros(o), base = "variations." + vi + ".meals." + mi;
      return '<div class="ed-item stack"><div class="row wrap"><input class="grow" style="min-width:140px" data-change="dSet" data-path="' + base + '.name" value="' + esc(m.name) + '"><input type="time" style="width:120px" data-change="dSet" data-path="' + base + '.time" value="' + esc(m.time) + '"><button class="icon-btn" data-act="mvMeal" data-i="' + mi + '" data-d="-1">↑</button><button class="icon-btn" data-act="mvMeal" data-i="' + mi + '" data-d="1">↓</button><button class="icon-btn" style="color:var(--danger)" data-act="delMeal" data-i="' + mi + '">×</button></div>' +
        '<div class="row wrap" style="gap:6px">' + m.options.map(function (x, i) { return '<button class="chip' + (i === oi ? " on" : "") + '" data-act="selO" data-m="' + m.id + '" data-i="' + i + '">Opção ' + (i + 1) + "</button>"; }).join("") + '<button class="chip" data-act="addO" data-i="' + mi + '">+ Opção</button>' + (m.options.length > 1 ? '<button class="chip" style="color:var(--danger)" data-act="delO" data-i="' + mi + '" data-o="' + oi + '">Excluir opção</button>' : "") + '<span class="small muted grow" style="text-align:right">' + Math.round(mm.kcal) + " kcal · P " + P.round1(mm.p) + " · C " + P.round1(mm.c) + " · G " + P.round1(mm.g) + "</span></div>" +
        '<table class="t"><tr><th>Alimento</th><th style="width:110px">Gramas</th><th class="hide-m">Substituições</th><th style="width:40px"></th></tr>' + o.items.map(function (fi, ii) {
          var p2 = base + ".options." + oi + ".items." + ii;
          return '<tr><td><select data-change="dSet" data-path="' + p2 + '.foodId">' + foodOptions(fi.foodId) + '</select></td><td><input type="number" min="0" data-change="dSet" data-type="num" data-path="' + p2 + '.grams" value="' + fi.grams + '"></td><td class="hide-m"><button class="btn sm" data-act="editSubs" data-path="' + p2 + '">' + (fi.subs.length ? fi.subs.length + " substituto(s)" : "Adicionar") + '</button></td><td><button class="icon-btn" style="color:var(--danger)" data-act="delFood" data-path="' + base + ".options." + oi + '.items" data-i="' + ii + '">×</button></td></tr>';
        }).join("") + '</table><button class="btn sm" style="align-self:flex-start" data-act="addFood" data-path="' + base + ".options." + oi + '.items">+ Alimento</button></div>';
    }).join("") + '<button class="btn" data-act="addMeal">+ Adicionar refeição</button></div>';
    html += '<div class="grid2" style="margin-top:14px"><div class="card stack"><b>Observações gerais</b><textarea rows="6" data-change="dSet" data-path="notes">' + esc(d.notes) + '</textarea></div><div class="card stack"><b>Orientações da dieta</b><textarea rows="6" data-change="dSet" data-path="guidelines">' + esc(d.guidelines) + "</textarea></div></div>";
    return html + dirtyBar("D");
  };
  T.actions.newPlanD = function () { T._draftD = blankDiet(); T._draftD._sid = T.p.id; T._vi = 0; mark(); T.render(); };
  T.actions.dSet = function (el) {
    var v = el.value; if (el.dataset.type === "num") v = parseFloat(v) || 0;
    setPath(T._draftD, el.dataset.path, v); mark();
    if (/grams|foodId|\.name$|waterGoal/.test(el.dataset.path) || el.tagName === "SELECT") T.render(); else refreshBar();
  };
  T.actions.dTog = function (el) { T._draftD[el.dataset.k] = !T._draftD[el.dataset.k]; mark(); T.render(); };
  T.actions.selV = function (el) { T._vi = +el.dataset.i; T.render(); };
  T.actions.addV = function () { var d = T._draftD; d.variations.push({ id: P.uid("var"), name: "Variação " + (d.variations.length + 1), days: [], waterGoal: 3, meals: [blankMeal("Café da manhã", "08:00")] }); T._vi = d.variations.length - 1; mark(); T.render(); };
  T.actions.dupV = function () { var d = T._draftD, v = clone(d.variations[T._vi]); v.id = P.uid("var"); v.name += " (cópia)"; v.days = []; v.meals.forEach(function (m) { m.id = P.uid("ref"); m.options.forEach(function (o) { o.items.forEach(function (i) { i.id = P.uid("fi"); }); }); }); d.variations.push(v); T._vi = d.variations.length - 1; mark(); T.render(); };
  T.actions.delV = function () { var d = T._draftD; if (d.variations.length < 2 || !confirm("Excluir esta variação?")) return; d.variations.splice(T._vi, 1); T._vi = 0; mark(); T.render(); };
  T.actions.vDay = function (el) {
    var d = T._draftD, day = +el.dataset.d, v = d.variations[T._vi], i = v.days.indexOf(day);
    if (i >= 0) v.days.splice(i, 1); else { d.variations.forEach(function (x) { var j = x.days.indexOf(day); if (j >= 0) x.days.splice(j, 1); }); v.days.push(day); v.days.sort(); }
    mark(); T.render();
  };
  T.actions.addMeal = function () { T._draftD.variations[T._vi].meals.push(blankMeal()); mark(); T.render(); };
  T.actions.delMeal = function (el) { if (!confirm("Excluir esta refeição?")) return; T._draftD.variations[T._vi].meals.splice(+el.dataset.i, 1); mark(); T.render(); };
  T.actions.mvMeal = function (el) { var a = T._draftD.variations[T._vi].meals, i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= a.length) return; a.splice(j, 0, a.splice(i, 1)[0]); mark(); T.render(); };
  T.actions.selO = function (el) { T._oi[el.dataset.m] = +el.dataset.i; T.render(); };
  T.actions.addO = function (el) { var m = T._draftD.variations[T._vi].meals[+el.dataset.i]; m.options.push({ items: [] }); T._oi[m.id] = m.options.length - 1; mark(); T.render(); };
  T.actions.delO = function (el) { var m = T._draftD.variations[T._vi].meals[+el.dataset.i]; m.options.splice(+el.dataset.o, 1); T._oi[m.id] = 0; mark(); T.render(); };
  T.actions.addFood = function (el) { getPath(T._draftD, el.dataset.path).push({ id: P.uid("fi"), foodId: P.db.foods[0].id, grams: 100, subs: [] }); mark(); T.render(); };
  T.actions.delFood = function (el) { getPath(T._draftD, el.dataset.path).splice(+el.dataset.i, 1); mark(); T.render(); };
  T.actions.editSubs = function (el) {
    var fi = getPath(T._draftD, el.dataset.path), f = P.food(fi.foodId);
    T.sheet("Substituições de " + f.name, '<div class="small muted" style="margin-bottom:8px">' + fi.grams + " g de " + esc(f.name) + '. O app calcula a quantidade de cada substituto com as mesmas calorias.</div><div class="multi" style="max-height:50vh">' + P.db.foods.filter(function (x) { return x.id !== fi.foodId; }).map(function (x) {
      return '<label><input type="checkbox" data-change="dSub" data-path="' + el.dataset.path + '" value="' + x.id + '"' + (fi.subs.indexOf(x.id) >= 0 ? " checked" : "") + '><span class="grow">' + esc(x.name) + '</span><span class="small muted">' + P.subGrams(fi.foodId, fi.grams, x.id) + " g</span></label>";
    }).join("") + '</div><button class="btn primary block" style="margin-top:12px" data-act="closeSubs">Pronto</button>');
  };
  T.actions.dSub = function (el) { var fi = getPath(T._draftD, el.dataset.path), k = fi.subs.indexOf(el.value); if (el.checked && k < 0) fi.subs.push(el.value); if (!el.checked && k >= 0) fi.subs.splice(k, 1); mark(); };
  T.actions.closeSubs = function () { T.closeSheet(); T.render(); };
  T.actions.saveD = function () {
    var d = clone(T._draftD); delete d._sid;
    var missing = []; for (var i = 0; i < 7; i++) if (!d.variations.some(function (v) { return v.days.indexOf(i) >= 0; })) missing.push(P.DOW[i]);
    if (missing.length && !confirm("Estes dias ficaram sem dieta: " + missing.join(", ") + ". Nesses dias o app mostra a primeira variação. Salvar mesmo assim?")) return;
    d.updatedAt = P.todayISO(); P.db.dietPlans[T.p.id] = d; P.save(); T._dirty = false; T._draftD = null; T.toast("Dieta salva — já aparece no app do aluno."); T.render();
  };
  T.actions.discardD = function () { T._dirty = false; T._draftD = null; T.render(); };
})();
