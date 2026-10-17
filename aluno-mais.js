/* App do aluno — Dieta, Evolução e Perfil */
(function () {
  "use strict";
  var P = window.Proto, A = window.A, esc = P.esc;
  A.after = A.after || {};
  A.dietDate = A.dietDate || P.todayISO();

  function fmtG(n) { return P.round1(n).toString().replace(".", ","); }
  function unitLabel(fi, foodId, grams) {
    var f = P.food(foodId), pref = A.unitPref[fi.id];
    if (pref && P.db.settings.allowUnitChange) {
      var u = (f.units || []).filter(function (x) { return x.name === pref; })[0];
      if (u) return fmtG(grams / u.g) + " " + u.name.toLowerCase() + "(s)";
    }
    return grams + " g";
  }

  /* ---------- Dieta do dia ---------- */
  A.views.dieta = function () {
    var plan = A.dplan();
    if (!plan) return '<div class="screen"><div class="title-xl">Dieta</div><div class="empty">Seu nutricionista ainda não enviou uma dieta.</div></div>';
    var base = new Date(); var dow = base.getDay(); var monday = P.addDays(P.todayISO(), dow === 0 ? -6 : 1 - dow);
    var days = []; for (var i = 0; i < 7; i++) days.push(P.addDays(monday, i));
    var sel = A.dietDate, sdow = new Date(sel + "T12:00:00").getDay(), v = P.variationForDay(plan, sdow);
    var done = A.logs().mealsDone[sel] || [];
    var html = '<div class="screen stack"><div class="dayline">' + days.map(function (d) {
      var dd = new Date(d + "T12:00:00");
      return '<button class="day' + (d === sel ? " on" : "") + '" data-act="dietDay" data-d="' + d + '"><b>' + dd.getDate() + "</b><span>" + P.DOW[dd.getDay()] + "</span></button>";
    }).join("") + "</div>" +
      '<div class="row between"><div><div class="title-xl">Dieta do dia</div><div class="muted small">' + esc(v.name) + " · atualizada em " + P.fmtDate(plan.updatedAt) + '</div></div><button class="btn sm" data-act="go" data-v="compras">🛒 Compras</button></div>' +
      '<div class="row"><button class="btn sm grow" data-act="dietText" data-k="notes">Observações</button><button class="btn sm grow" data-act="dietText" data-k="guidelines">Orientações</button></div>' +
      '<div class="card" style="padding-top:4px;padding-bottom:4px"><div class="list">' + v.meals.map(function (m) {
        var on = done.indexOf(m.id) >= 0, mm = P.optionMacros(m.options[0]);
        return '<div class="meal list-item"><button class="check' + (on ? " on" : "") + '" data-act="toggleMeal" data-id="' + m.id + '">' + (on ? "✓" : "") + '</button><button class="grow" style="text-align:left" data-act="go" data-v="refeicao" data-p="' + A.dp({ id: m.id, date: sel }) + '"><b>' + esc(m.name) + '</b><div class="small muted">' + esc(m.time) + (plan.showMacros ? " · " + Math.round(mm.kcal) + " kcal" : "") + (m.options.length > 1 ? " · " + m.options.length + " opções" : "") + "</div></button><span class=\"muted\">›</span></div>";
      }).join("") + "</div></div>" +
      '<div class="small muted" style="text-align:center">' + done.length + " de " + v.meals.length + " refeições concluídas</div>" +
      (plan.showMacros ? '<button class="btn block" data-act="go" data-v="macros" data-p="' + A.dp({ date: sel }) + '">📊 Ver macros da dieta</button>' : "") +
      '<button class="btn block" data-act="mealNote">✏️ Adicionar observação</button></div>';
    return html;
  };
  A.actions.dietDay = function (el) { A.dietDate = el.dataset.d; A.render(); };
  A.actions.dietText = function (el) {
    var plan = A.dplan(), t = plan[el.dataset.k];
    A.sheet(el.dataset.k === "notes" ? "Observações gerais" : "Orientações da dieta", '<div style="white-space:pre-line">' + (t ? esc(t) : '<span class="muted">Nada cadastrado.</span>') + "</div>");
  };
  A.actions.toggleMeal = function (el) {
    var l = A.logs(), d = A.dietDate; l.mealsDone[d] = l.mealsDone[d] || [];
    var i = l.mealsDone[d].indexOf(el.dataset.id); if (i >= 0) l.mealsDone[d].splice(i, 1); else l.mealsDone[d].push(el.dataset.id);
    P.save(); A.render();
  };
  A.actions.mealNote = function () {
    var plan = A.dplan(), v = P.variationForDay(plan, new Date(A.dietDate + "T12:00:00").getDay());
    A.sheet("Observação da dieta", '<div class="stack"><div class="field"><label>Refeição (opcional)</label><select id="mnMeal"><option value="">Geral</option>' + v.meals.map(function (m) { return '<option value="' + m.id + '">' + esc(m.name) + "</option>"; }).join("") + '</select></div><div class="field"><label>O que você quer contar?</label><textarea id="mnText" rows="4" placeholder="Ex: troquei o arroz por batata no almoço"></textarea></div>' +
      '<div class="field"><label>Foto da refeição (opcional)</label><input id="mnPhoto" type="file" accept="image/*"></div><button class="btn primary block" data-act="saveMealNote">Enviar</button>' + noteList() + "</div>");
  };
  function noteList() {
    var l = A.logs().mealNotes.slice(-4).reverse(); if (!l.length) return "";
    return '<div class="small muted">Enviadas recentemente</div>' + l.map(function (n) { return '<div class="card tight small"><b>' + P.fmtDate(n.date) + (n.mealName ? " · " + esc(n.mealName) : "") + "</b><div>" + esc(n.text) + "</div>" + (n.photo ? '<img src="' + P.photo(n.photo) + '" style="width:80px;border-radius:8px;margin-top:6px">' : "") + "</div>"; }).join("");
  }
  A.actions.saveMealNote = function () {
    var txt = document.getElementById("mnText").value.trim(), sel = document.getElementById("mnMeal"), file = document.getElementById("mnPhoto").files[0];
    if (!txt && !file) { A.toast("Escreva algo ou anexe uma foto."); return; }
    function done(photo) {
      A.logs().mealNotes.push({ date: A.dietDate, mealId: sel.value, mealName: sel.value ? sel.options[sel.selectedIndex].text : "", text: txt, photo: photo || null });
      P.save(); A.closeSheet(); A.toast("Observação enviada ao nutricionista.");
    }
    if (file) A.readImage(file, done); else done();
  };
  A.readImage = function (file, cb) {
    var r = new FileReader();
    r.onload = function () {
      var img = new Image(); img.onload = function () {
        var max = 640, s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = img.width * s; c.height = img.height * s; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        // Comprime até ~150 KB para caber no banco (plano grátis).
        var q = 0.7, url = c.toDataURL("image/jpeg", q);
        while (url.length > 200000 && q > 0.3) { q -= 0.1; url = c.toDataURL("image/jpeg", q); }
        cb(url);
      }; img.src = r.result;
    };
    r.readAsDataURL(file);
  };

  /* ---------- Refeição ---------- */
  A.views.refeicao = function (p) {
    var plan = A.dplan(), meal = null;
    plan.variations.forEach(function (v) { v.meals.forEach(function (m) { if (m.id === p.id) meal = m; }); });
    if (!meal) return A.top("Refeição") + '<div class="empty">Refeição não encontrada.</div>';
    var oi = Math.min(p.opt || 0, meal.options.length - 1), opt = meal.options[oi], mm = P.optionMacros(opt);
    var done = (A.logs().mealsDone[p.date] || []).indexOf(meal.id) >= 0;
    A._openSubs = A._openSubs || {};
    var html = A.top("") + '<div class="screen stack" style="padding-bottom:170px"><div><div class="title-xl">' + esc(meal.name) + '</div><div class="muted small">Horário ' + esc(meal.time) + "</div></div>" +
      (plan.showMacros ? '<div class="card tight macro-grid"><div><b>' + Math.round(mm.kcal) + '</b><span class="small muted">kcal</span></div><div><b>' + fmtG(mm.p) + 'g</b><span class="small muted">Prot.</span></div><div><b>' + fmtG(mm.c) + 'g</b><span class="small muted">Carb.</span></div><div><b>' + fmtG(mm.g) + 'g</b><span class="small muted">Gord.</span></div></div>' : "") +
      (meal.options.length > 1 ? '<div class="tabs">' + meal.options.map(function (o, i) { return '<button class="' + (i === oi ? "on" : "") + '" data-act="mealOpt" data-i="' + i + '">Opção ' + (i + 1) + "</button>"; }).join("") + "</div>" : "") +
      '<div class="card" style="padding-top:2px;padding-bottom:2px"><div class="list">' + opt.items.map(function (fi) {
        var f = P.food(fi.foodId), open = A._openSubs[fi.id];
        var row = '<div><div class="food"><div class="grow"><b>' + esc(f.name) + "</b>" + (fi.subs && fi.subs.length ? '<div><button class="small" style="color:var(--accent);padding:2px 0" data-act="toggleSubs" data-id="' + fi.id + '">' + (open ? "Ocultar" : "Ver " + fi.subs.length) + " substituições " + (open ? "▲" : "▼") + "</button></div>" : "") + '</div><button class="qty" data-act="unit" data-fi="' + fi.id + '" data-food="' + fi.foodId + '" data-g="' + fi.grams + '">' + unitLabel(fi, fi.foodId, fi.grams) + (P.db.settings.allowUnitChange ? " ▾" : "") + "</button></div>";
        if (open) row += '<div class="subs">' + fi.subs.map(function (sid) {
          var g = P.subGrams(fi.foodId, fi.grams, sid); return '<div class="food small"><span class="grow">' + esc(P.food(sid).name) + '</span><span class="qty">' + g + " g</span></div>";
        }).join("") + '<div class="small muted" style="padding-bottom:6px">Quantidades com as mesmas calorias.</div></div>';
        return row + "</div>";
      }).join("") + "</div></div></div>" +
      '<div class="fab"><button class="btn block' + (done ? "" : " primary") + '" style="padding:15px" data-act="concludeMeal" data-id="' + meal.id + '" data-date="' + p.date + '">' + (done ? "✓ Refeição concluída (desfazer)" : "✓ Concluir refeição") + "</button></div>";
    return html;
  };
  A.actions.mealOpt = function (el) { A.cur().p.opt = parseInt(el.dataset.i, 10); A.render(); };
  A.actions.toggleSubs = function (el) { A._openSubs[el.dataset.id] = !A._openSubs[el.dataset.id]; A.render(); };
  A.actions.concludeMeal = function (el) {
    var l = A.logs(), d = el.dataset.date; l.mealsDone[d] = l.mealsDone[d] || [];
    var i = l.mealsDone[d].indexOf(el.dataset.id); if (i >= 0) l.mealsDone[d].splice(i, 1); else { l.mealsDone[d].push(el.dataset.id); A.toast("Refeição concluída 👏"); }
    P.save(); A.render();
  };
  A.actions.unit = function (el) {
    if (!P.db.settings.allowUnitChange) return;
    var f = P.food(el.dataset.food), g = parseFloat(el.dataset.g), fiId = el.dataset.fi;
    var rows = [{ name: "", label: "Gramas", val: g + " g" }].concat((f.units || []).map(function (u) { return { name: u.name, label: u.name, val: fmtG(g / u.g) + " (" + u.g + " g cada)" }; }));
    A.sheet("Trocar unidade", '<div class="small muted" style="margin-bottom:10px">' + esc(f.name) + ": a quantidade é convertida mantendo o que foi prescrito.</div><div class=\"list\">" + rows.map(function (r) {
      var on = (A.unitPref[fiId] || "") === r.name;
      return '<button class="list-item" data-act="setUnit" data-fi="' + fiId + '" data-u="' + esc(r.name) + '"><span class="grow">' + esc(r.label) + (on ? ' <span class="pill accent">atual</span>' : "") + "</span><b>" + r.val + "</b></button>";
    }).join("") + "</div>");
  };
  A.actions.setUnit = function (el) {
    if (el.dataset.u) A.unitPref[el.dataset.fi] = el.dataset.u; else delete A.unitPref[el.dataset.fi];
    try { localStorage.setItem("teamgarcia.unidades", JSON.stringify(A.unitPref)); } catch (e) {}
    A.closeSheet(); A.render();
  };

  /* ---------- Macros ---------- */
  A.views.macros = function (p) {
    var plan = A.dplan(), v = P.variationForDay(plan, new Date((p.date || P.todayISO()) + "T12:00:00").getDay()), t = P.variationMacros(v), me = A.me();
    var parts = [{ v: t.p * 4, color: "#f87171", n: "Proteínas" }, { v: t.c * 4, color: "#60a5fa", n: "Carboidratos" }, { v: t.g * 9, color: "#fbbf24", n: "Gorduras" }];
    return A.top("Macros") + '<div class="screen stack"><div class="title-xl">Análise de nutrientes</div>' +
      '<div class="card"><b>Distribuição de macronutrientes</b><div class="row" style="margin-top:10px;gap:16px">' + P.donut(parts, Math.round(t.kcal), "kcal") + '<div class="legend grow">' + parts.map(function (x) { return '<div><i class="dot" style="background:' + x.color + '"></i> ' + x.n + '<div class="small muted">' + Math.round(x.v) + " kcal</div></div>"; }).join("") + "</div></div></div>" +
      '<div class="card"><b>Macros por refeição</b><div class="list" style="margin-top:6px">' + v.meals.map(function (m) { var mm = P.optionMacros(m.options[0]); return '<div class="list-item small"><span class="grow"><b>' + esc(m.name) + '</b><div class="muted">P ' + fmtG(mm.p) + "g · C " + fmtG(mm.c) + "g · G " + fmtG(mm.g) + "g · F " + fmtG(mm.fib) + "g</div></span><b>" + Math.round(mm.kcal) + " kcal</b></div>"; }).join("") + "</div></div>" +
      '<div class="card"><b>Totais do cardápio</b><div class="macro-grid" style="margin-top:10px"><div><b>' + fmtG(t.p) + 'g</b><span class="small muted">Prot.</span></div><div><b>' + fmtG(t.c) + 'g</b><span class="small muted">Carb.</span></div><div><b>' + fmtG(t.g) + 'g</b><span class="small muted">Gord.</span></div><div><b>' + fmtG(t.fib) + 'g</b><span class="small muted">Fibras</span></div></div></div>' +
      '<div class="card"><b>Por kg de peso corporal</b> <span class="small muted">(' + me.weight + ' kg)</span><div class="macro-grid" style="margin-top:10px"><div><b>' + fmtG(t.p / me.weight) + '</b><span class="small muted">g/kg P</span></div><div><b>' + fmtG(t.c / me.weight) + '</b><span class="small muted">g/kg C</span></div><div><b>' + fmtG(t.g / me.weight) + '</b><span class="small muted">g/kg G</span></div><div><b>' + Math.round(t.kcal / me.weight) + '</b><span class="small muted">kcal/kg</span></div></div></div></div>';
  };

  /* ---------- Lista de compras ---------- */
  A.views.compras = function (p) {
    var plan = A.dplan(), mult = p.m === "mes" ? 30 / 7 : 1, tot = {};
    for (var d = 0; d < 7; d++) {
      var v = P.variationForDay(plan, d);
      v.meals.forEach(function (m) { m.options[0].items.forEach(function (fi) { tot[fi.foodId] = (tot[fi.foodId] || 0) + fi.grams; }); });
    }
    var rows = Object.keys(tot).map(function (id) { return { f: P.food(id), g: tot[id] * mult }; }).sort(function (a, b) { return a.f.name.localeCompare(b.f.name); });
    return A.top("Lista de compras") + '<div class="screen stack"><div class="title-xl">Lista de compras</div><div class="tabs"><button class="' + (p.m !== "mes" ? "on" : "") + '" data-act="buyTab" data-m="sem">Semana</button><button class="' + (p.m === "mes" ? "on" : "") + '" data-act="buyTab" data-m="mes">Mês</button></div>' +
      '<div class="card"><b>O que comprar (' + (p.m === "mes" ? "mês" : "semana") + ')</b><div class="list" style="margin-top:6px">' + rows.map(function (r) {
        var u = r.f.units && r.f.units[0] && /unidade|filé|pote|scoop|fatia/i.test(r.f.units[0].name) ? " (~" + Math.ceil(r.g / r.f.units[0].g) + " " + r.f.units[0].name.toLowerCase() + ")" : "";
        return '<label class="list-item small"><input type="checkbox" style="width:auto"><span class="grow">' + esc(r.f.name) + '</span><span class="qty">' + (r.g >= 1000 ? fmtG(r.g / 1000) + " kg" : Math.round(r.g) + " g") + u + "</span></label>";
      }).join("") + '</div></div><div class="small muted">Considera a opção 1 de cada refeição. Peso dos alimentos prontos.</div></div>';
  };
  A.actions.buyTab = function (el) { A.cur().p.m = el.dataset.m; A.render(); };

  /* ---------- Evolução ---------- */
  A.views.evo = function () {
    var me = A.me(), l = A.logs(), lastCk = l.checkins[l.checkins.length - 1];
    var fb = l.checkins.filter(function (c) { return c.feedback; }).length;
    function item(v, ico, title, desc, extra) { return '<button class="card big-card" data-act="go" data-v="' + v + '"><div class="ico">' + ico + '</div><div class="grow"><b>' + title + '</b><div class="small muted">' + desc + "</div></div>" + (extra || "›") + "</button>"; }
    return '<div class="screen stack"><div class="title-xl">Evolução</div>' +
      '<div class="card tight row between"><span>Próximo check-in</span><b>' + P.fmtDate(me.nextCheckin) + "</b></div>" +
      item("checkin", "📋", "Check-in", "Questionário + fotos de evolução" + (lastCk ? " · último em " + P.fmtDate(lastCk.date) : ""), '<span class="pill accent">Responder</span>') +
      item("feedbacks", "💬", "Observações do treinador", fb ? fb + " resposta(s) aos seus check-ins" : "Ainda sem respostas") +
      item("peso", "⚖️", "Histórico de peso", "Gráfico e registros") +
      item("progressao", "📈", "Progressão de carga", "Evolução de cada exercício") +
      item("historicoTreinos", "🗓️", "Treinos realizados", l.sessions.length + " treinos registrados") +
      item("materiais", "📚", "Materiais extras", P.db.materials.length + " conteúdos do seu treinador") +
      item("anexos", "📎", "Anexos", "Arquivos enviados pelo treinador") + "</div>";
  };

  A.views.checkin = function () {
    A._ck = A._ck || { answers: {}, photos: [] };
    var qs = P.db.questionnaire, minP = P.db.settings.minPhotos || 0;
    var html = A.top("Check-in") + '<div class="screen stack"><div class="title-xl">Check-in</div><div class="muted small">Responda com sinceridade, é assim que o seu plano é ajustado.</div>';
    qs.forEach(function (q, i) {
      var a = A._ck.answers[q.id];
      html += '<div class="card stack"><b>' + (i + 1) + ". " + esc(q.text) + "</b>";
      if (q.type === "scale") html += '<div class="scale">' + [1, 2, 3, 4, 5].map(function (n) { return '<button data-act="ckAns" data-q="' + q.id + '" data-v="' + n + '" class="' + (a === n ? "on" : "") + '">' + n + "</button>"; }).join("") + '</div><div class="row between small muted"><span>Ruim</span><span>Ótimo</span></div>';
      else if (q.type === "choice") html += '<div class="row wrap">' + q.options.map(function (o) { return '<button class="chip' + (a === o ? " on" : "") + '" data-act="ckAns" data-q="' + q.id + '" data-v="' + esc(o) + '">' + esc(o) + "</button>"; }).join("") + "</div>";
      else if (q.type === "number") html += '<div class="row"><input type="number" inputmode="decimal" step="0.1" data-change="ckText" data-q="' + q.id + '" value="' + (a == null ? "" : a) + '"><span class="muted">' + esc(q.unit || "") + "</span></div>";
      else html += '<textarea rows="3" data-change="ckText" data-q="' + q.id + '">' + esc(a || "") + "</textarea>";
      html += "</div>";
    });
    html += '<div class="card stack"><b>Fotos de evolução</b><div class="small muted">Frente, lado e costas. Mesmo ângulo e mesma luz' + (minP ? " · mínimo " + minP + " fotos" : "") + '.</div><div class="photos">' +
      ["Frente", "Lado", "Costas"].map(function (lab, i) {
        var ph = A._ck.photos[i];
        return '<label class="photo" style="' + (ph ? "background-image:url(" + ph + ");border-style:solid" : "") + '">' + (ph ? "" : "📷<br>" + lab) + '<input type="file" accept="image/*" hidden data-change="ckPhoto" data-i="' + i + '"></label>';
      }).join("") + '</div></div><button class="btn primary block" style="padding:15px" data-act="sendCheckin">Enviar check-in</button></div>';
    return html;
  };
  A.actions.ckAns = function (el) { var q = P.db.questionnaire.filter(function (x) { return x.id === el.dataset.q; })[0]; A._ck.answers[q.id] = q.type === "scale" ? parseInt(el.dataset.v, 10) : el.dataset.v; A.render(); };
  A.actions.ckText = function (el) { A._ck.answers[el.dataset.q] = el.type === "number" ? parseFloat(el.value) : el.value; };
  A.actions.ckPhoto = function (el) { var f = el.files[0]; if (!f) return; A.readImage(f, function (url) { A._ck.photos[parseInt(el.dataset.i, 10)] = url; A.render(); }); };
  A.actions.sendCheckin = function () {
    var qs = P.db.questionnaire, miss = qs.filter(function (q) { return q.type !== "text" && (A._ck.answers[q.id] == null || A._ck.answers[q.id] === "" || (typeof A._ck.answers[q.id] === "number" && isNaN(A._ck.answers[q.id]))); });
    if (miss.length) { A.toast("Falta responder: " + miss[0].text); return; }
    var photos = A._ck.photos.filter(Boolean), minP = P.db.settings.minPhotos || 0;
    if (photos.length < minP) { A.toast("Envie pelo menos " + minP + " fotos."); return; }
    var l = A.logs(), me = A.me(), date = P.todayISO();
    l.checkins.push({ id: P.uid("ck"), date: date, answers: A._ck.answers, photos: A._ck.photos.slice(), feedback: null });
    var wq = qs.filter(function (q) { return q.type === "number" && /peso/i.test(q.text); })[0];
    if (wq && A._ck.answers[wq.id]) { l.weights.push({ date: date, kg: A._ck.answers[wq.id] }); me.weight = A._ck.answers[wq.id]; }
    me.nextCheckin = P.addDays(date, 7);
    P.save(); A._ck = null; A.stack = [{ v: "evo", p: {} }]; A.tabRoot = "evo"; A.render(true); A.toast("✅ Check-in enviado ao treinador!");
  };

  A.views.feedbacks = function () {
    var l = A.logs().checkins.slice().reverse();
    return A.top("Observações") + '<div class="screen stack"><div class="title-xl">Observações do treinador</div>' + (l.length ? l.map(function (c) {
      return '<div class="card stack"><div class="row between"><b>Check-in de ' + P.fmtDate(c.date) + "</b>" + (c.feedback ? '<span class="pill accent">Respondido</span>' : '<span class="pill">Aguardando</span>') + "</div>" +
        (c.feedback ? '<div style="white-space:pre-line">' + esc(c.feedback.text) + '</div><div class="small muted">' + P.fmtDate(c.feedback.date) + "</div>" : '<div class="small muted">Seu treinador ainda vai responder.</div>') + "</div>";
    }).join("") : '<div class="empty">Você ainda não enviou check-ins.</div>') + "</div>";
  };

  A.views.peso = function () {
    var w = A.logs().weights.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    return A.top("Peso") + '<div class="screen stack"><div class="title-xl">Histórico de peso</div><div class="card">' + P.lineChart(w.map(function (x) { return { y: x.kg, label: P.fmtDate(x.date).slice(0, 5) }; })) + "</div>" +
      '<div class="card"><div class="row between"><b>Registros</b><button class="btn sm" data-act="addWeight">+ Registrar</button></div><div class="list" style="margin-top:6px">' + w.slice().reverse().map(function (x, i, arr) {
        var prev = arr[i + 1], diff = prev ? P.round1(x.kg - prev.kg) : null;
        return '<div class="list-item"><span class="grow">' + P.fmtDate(x.date) + "</span>" + (diff != null ? '<span class="small" style="color:' + (diff <= 0 ? "var(--valid)" : "var(--warm)") + '">' + (diff > 0 ? "+" : "") + String(diff).replace(".", ",") + "</span>" : "") + "<b>" + String(x.kg).replace(".", ",") + " kg</b></div>";
      }).join("") + "</div></div></div>";
  };
  A.actions.addWeight = function () { A.sheet("Registrar peso", '<div class="stack"><input id="nwKg" type="number" inputmode="decimal" step="0.1" placeholder="Ex: 74,3"><button class="btn primary block" data-act="saveWeight">Salvar</button></div>'); };
  A.actions.saveWeight = function () { var kg = parseFloat(String(document.getElementById("nwKg").value).replace(",", ".")); if (!kg) return; A.logs().weights.push({ date: P.todayISO(), kg: kg }); A.me().weight = kg; P.save(); A.closeSheet(); A.render(); };

  A.views.progressao = function (p) {
    var plan = A.wplan(), wid = p.w || plan.workouts[0].id, w = plan.workouts.filter(function (x) { return x.id === wid; })[0];
    return A.top("Progressão") + '<div class="screen stack"><div class="title-xl">Progressão de carga</div><div class="field"><label>Treino</label><select data-change="progW">' + plan.workouts.map(function (x) { return '<option value="' + x.id + '"' + (x.id === wid ? " selected" : "") + ">" + esc(x.name) + "</option>"; }).join("") + "</select></div>" +
      w.items.map(function (it) {
        var h = P.exerciseHistory(A.uid, it.exId), pts = h.list.slice().reverse().map(function (s) { var max = Math.max.apply(null, s.sets.map(function (x) { return x.weight; })); return { y: max, label: P.fmtDate(s.date).slice(0, 5) }; });
        return '<div class="card"><div class="row between"><b>' + esc(P.exercise(it.exId).name) + "</b>" + (h.best ? '<span class="pill">🏆 ' + h.best.weight + " kg</span>" : "") + "</div>" + (pts.length ? P.lineChart(pts, { h: 130 }) : '<div class="empty">Sem registros para este exercício.</div>') + "</div>";
      }).join("") + "</div>";
  };
  A.actions.progW = function (el) { A.cur().p.w = el.value; A.render(); };

  A.views.historicoTreinos = function () {
    var s = A.logs().sessions.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    return A.top("Treinos") + '<div class="screen stack"><div class="title-xl">Treinos realizados</div>' + (s.length ? '<div class="card" style="padding-top:2px;padding-bottom:2px"><div class="list">' + s.map(function (x) {
      return '<div class="list-item"><span class="grow"><b>' + esc(x.workoutName) + '</b><div class="small muted">' + P.fmtDate(x.date) + " · " + Math.round(x.durationSec / 60) + " min · " + x.sets.length + " séries" + (x.effort ? " · esforço " + x.effort : "") + "</div></span></div>";
    }).join("") + "</div></div>" : '<div class="empty">Nenhum treino ainda.</div>') + "</div>";
  };

  A.views.materiais = function () {
    var seen = A.logs().materialsSeen, q = (A._matQ || "").toLowerCase();
    var list = P.db.materials.filter(function (m) { return !q || (m.title + m.desc).toLowerCase().indexOf(q) >= 0; });
    return A.top("Materiais") + '<div class="screen stack"><div class="title-xl">Materiais extras</div><input placeholder="🔍 Buscar materiais" value="' + esc(A._matQ || "") + '" data-change="matQ">' +
      list.map(function (m) { var s = seen.indexOf(m.id) >= 0; return '<button class="card big-card" data-act="go" data-v="material" data-p="' + A.dp({ id: m.id }) + '"><div class="ico">' + (s ? "✓" : "📄") + '</div><div class="grow"><b>' + esc(m.title) + '</b><div class="small muted">' + esc(m.desc) + "</div></div>›</button>"; }).join("") + "</div>";
  };
  A.actions.matQ = function (el) { A._matQ = el.value; A.render(); };
  A.views.material = function (p) {
    var m = P.db.materials.filter(function (x) { return x.id === p.id; })[0], seen = A.logs().materialsSeen;
    if (seen.indexOf(m.id) < 0) { seen.push(m.id); P.save(); }
    return A.top("") + '<div class="screen stack"><div class="title-xl">' + esc(m.title) + '</div><div class="card" style="white-space:pre-line">' + esc(m.body) + "</div></div>";
  };
  A.views.anexos = function () {
    var list = (P.db.attachments[A.uid] || []);
    return A.top("Anexos") + '<div class="screen stack"><div class="title-xl">Anexos</div>' + (list.length ? list.map(function (a) {
      return '<a class="card big-card" style="text-decoration:none;color:inherit" href="' + a.data + '" download="' + esc(a.name) + '"><div class="ico">📎</div><div class="grow"><b>' + esc(a.name) + '</b><div class="small muted">' + P.fmtDate(a.date) + "</div></div>⬇</a>";
    }).join("") : '<div class="empty">Nenhum arquivo enviado pelo treinador ainda.</div>') + "</div>";
  };

  /* ---------- Perfil ---------- */
  A.views.perfil = function () {
    var me = A.me(), l = A.logs(), now = new Date(), y = now.getFullYear(), m = now.getMonth();
    var first = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate(), trained = {};
    l.sessions.forEach(function (s) { trained[s.date] = true; });
    var cells = P.DOW.map(function (d) { return '<span class="h">' + d[0] + "</span>"; }).join("");
    for (var i = 0; i < first; i++) cells += '<span class="out"></span>';
    for (var d = 1; d <= dim; d++) { var iso = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"); cells += '<span class="' + (trained[iso] ? "trained" : "") + '">' + d + "</span>"; }
    var meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return A.top("Perfil", '<button class="btn sm" data-act="go" data-v="config">⚙︎</button>') + '<div class="screen stack"><div style="text-align:center"><div class="logo" style="margin:0 auto 10px">' + esc(me.name[0]) + '</div><div class="title-lg">' + esc(me.name) + '</div><div class="small muted">' + esc(me.email) + " · " + esc(me.phone) + '</div><div class="small muted">Plano válido até ' + P.fmtDate(me.planEnd) + '</div><button class="btn sm" style="margin-top:10px" data-act="editProfile">Editar dados</button></div>' +
      '<div class="card"><div class="row between"><b>Calendário de treinos</b><span class="small muted">' + meses[m] + '</span></div><div class="cal" style="margin-top:10px">' + cells + "</div></div>" +
      '<button class="btn block danger" data-act="logout">Sair do aplicativo</button></div>';
  };
  A.actions.editProfile = function () {
    var me = A.me();
    A.sheet("Editar dados", '<div class="stack"><div class="field"><label>Nome</label><input id="epName" value="' + esc(me.name) + '"></div><div class="field"><label>Telefone</label><input id="epPhone" value="' + esc(me.phone) + '"></div><div class="field"><label>Data de nascimento</label><input id="epBirth" type="date" value="' + esc(me.birth) + '"></div><button class="btn primary block" data-act="saveProfile">Salvar</button></div>');
  };
  A.actions.saveProfile = function () { var me = A.me(); me.name = document.getElementById("epName").value.trim() || me.name; me.phone = document.getElementById("epPhone").value; me.birth = document.getElementById("epBirth").value; P.save(); A.closeSheet(); A.render(); };
  A.views.config = function () {
    var c = A.me().prefs = A.me().prefs || { notif: true, offline: false, mute: true, reminder: "08:00" };
    function tg(k, title, desc) { return '<div class="list-item"><span class="grow"><b>' + title + '</b><div class="small muted">' + desc + '</div></span><button class="toggle' + (c[k] ? " on" : "") + '" data-act="pref" data-k="' + k + '"></button></div>'; }
    return A.top("Configurações") + '<div class="screen stack"><div class="title-xl">Configurações</div><div class="card" style="padding-top:2px;padding-bottom:2px"><div class="list">' +
      tg("notif", "Notificações", "Lembretes de treino, refeição e check-in") +
      '<div class="list-item"><span class="grow"><b>Horário dos lembretes</b><div class="small muted">Quando avisar do check-in e vencimento</div></span><input type="time" style="width:auto" value="' + esc(c.reminder) + '" data-change="prefTime"></div>' +
      tg("offline", "Baixar vídeos para assistir offline", "Somente no Wi-Fi") + tg("mute", "Vídeos sem som", "Para não interromper sua música") + "</div></div></div>";
  };
  A.actions.pref = function (el) { var c = A.me().prefs; c[el.dataset.k] = !c[el.dataset.k]; P.save(); A.render(); };
  A.actions.prefTime = function (el) { A.me().prefs.reminder = el.value; P.save(); };
})();
