/* TeamGarcia — dados e funções compartilhadas entre o app do aluno e o site do treinador.
   Os dados ficam no Firebase próprio do app (fb.js). Na memória, tudo continua no objeto "db". */
(function () {
  "use strict";

  var APP_NAME = "TeamGarcia";

  function uid(p) { return (p || "id") + "_" + Math.random().toString(36).slice(2, 9); }
  function todayISO(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function addDays(iso, n) { var d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return todayISO(d); }
  function fmtDate(iso) { if (!iso) return "—"; var p = iso.slice(0, 10).split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function round1(n) { return Math.round(n * 10) / 10; }

  /* ---------- Dados de exemplo ---------- */
  var GROUPS = ["Peito", "Costas", "Ombro", "Bíceps", "Tríceps", "Quadríceps", "Posterior de coxa", "Glúteo", "Adutor", "Panturrilha", "Abdômen", "Lombar"];

  function seed() {
    var ex = [
      ["Supino reto com barra", "Peito"], ["Supino inclinado com halteres", "Peito"], ["Crucifixo na máquina", "Peito"],
      ["Puxada frontal", "Costas"], ["Remada baixa", "Costas"], ["Remada curvada com barra", "Costas"],
      ["Desenvolvimento com halteres", "Ombro"], ["Elevação lateral", "Ombro"], ["Crucifixo inverso", "Ombro"],
      ["Rosca direta", "Bíceps"], ["Rosca martelo", "Bíceps"], ["Tríceps na polia", "Tríceps"], ["Tríceps francês", "Tríceps"],
      ["Agachamento livre", "Quadríceps"], ["Leg press 45°", "Quadríceps"], ["Cadeira extensora", "Quadríceps"],
      ["Mesa flexora", "Posterior de coxa"], ["Stiff", "Posterior de coxa"], ["Elevação pélvica", "Glúteo"],
      ["Cadeira adutora", "Adutor"], ["Panturrilha em pé", "Panturrilha"], ["Abdominal na polia", "Abdômen"]
    ].map(function (e) { return { id: uid("ex"), name: e[0], group: e[1], video: "", active: true }; });
    function exId(name) { return ex.filter(function (e) { return e.name === name; })[0].id; }

    var techniques = [
      ["Drop set", "#ef4444"], ["Rest-pause", "#f59e0b"], ["Pirâmide crescente", "#8b5cf6"], ["Bi-set", "#06b6d4"],
      ["Negativa lenta", "#10b981"], ["Cluster", "#ec4899"]
    ].map(function (t) { return { id: uid("tec"), name: t[0], color: t[1] }; });
    function tecId(n) { return techniques.filter(function (t) { return t.name === n; })[0].id; }

    var CS = { name: "Colher de sopa", g: 15 }, CSB = { name: "Colher de sobremesa", g: 10 }, XIC = { name: "Xícara", g: 160 };
    var foods = [
      ["Arroz branco cozido", 128, 2.5, 28.1, 0.2, 1.6, [CS, { name: "Escumadeira", g: 45 }]],
      ["Arroz integral cozido", 124, 2.6, 25.8, 1.0, 2.7, [CS, { name: "Escumadeira", g: 45 }]],
      ["Feijão carioca cozido", 76, 4.8, 13.6, 0.5, 8.5, [{ name: "Concha", g: 86 }]],
      ["Macarrão cozido", 122, 4.0, 25.0, 0.6, 1.5, [{ name: "Pegador", g: 50 }]],
      ["Batata-doce cozida", 77, 0.6, 18.4, 0.1, 2.2, [{ name: "Unidade média", g: 130 }]],
      ["Pão francês", 300, 8.0, 58.6, 3.1, 2.3, [{ name: "Unidade", g: 50 }]],
      ["Goma de tapioca", 240, 0.0, 60.0, 0.0, 0.0, [CS]],
      ["Aveia em flocos", 394, 13.9, 66.6, 8.5, 9.1, [CS, CSB]],
      ["Banana prata", 98, 1.3, 26.0, 0.1, 2.0, [{ name: "Unidade", g: 70 }]],
      ["Maçã", 56, 0.3, 15.2, 0.0, 1.3, [{ name: "Unidade", g: 130 }]],
      ["Peito de frango grelhado", 159, 32.0, 0.0, 2.5, 0.0, [{ name: "Filé médio", g: 100 }]],
      ["Patinho moído cozido", 219, 35.9, 0.0, 7.3, 0.0, [CS]],
      ["Tilápia grelhada", 128, 26.0, 0.0, 2.7, 0.0, [{ name: "Filé", g: 120 }]],
      ["Ovo de galinha cozido", 146, 13.3, 0.6, 9.5, 0.0, [{ name: "Unidade", g: 50 }]],
      ["Queijo minas frescal", 264, 17.4, 3.2, 20.2, 0.0, [{ name: "Fatia", g: 30 }]],
      ["Iogurte natural", 51, 4.1, 1.9, 3.0, 0.0, [{ name: "Pote", g: 170 }]],
      ["Leite integral", 61, 3.0, 4.5, 3.3, 0.0, [XIC, { name: "Copo", g: 200 }]],
      ["Whey protein", 400, 80.0, 8.0, 6.0, 0.0, [{ name: "Scoop", g: 30 }]],
      ["Pasta de amendoim", 588, 25.0, 20.0, 50.0, 8.0, [CS]],
      ["Azeite de oliva", 884, 0.0, 0.0, 100.0, 0.0, [CS, CSB]],
      ["Salada de folhas", 15, 1.2, 2.5, 0.2, 1.8, [{ name: "Prato raso", g: 60 }]],
      ["Legumes cozidos", 35, 1.5, 7.0, 0.2, 2.5, [CS]]
    ].map(function (f) { return { id: uid("al"), name: f[0], kcal: f[1], p: f[2], c: f[3], g: f[4], fib: f[5], units: f[6] }; });
    function fId(n) { return foods.filter(function (f) { return f.name === n; })[0].id; }

    var questionnaire = [
      { id: "q1", text: "Como foi a dieta nesta semana?", type: "scale" },
      { id: "q2", text: "Como está a fome / apetite?", type: "scale" },
      { id: "q3", text: "Como foram os treinos?", type: "scale" },
      { id: "q4", text: "Como está o sono?", type: "scale" },
      { id: "q5", text: "Sentiu alguma dor articular ou muscular?", type: "choice", options: ["Não", "Leve", "Moderada", "Forte"] },
      { id: "q6", text: "Peso de hoje (em jejum)", type: "number", unit: "kg" },
      { id: "q7", text: "Quer contar algo para o treinador?", type: "text" }
    ];

    var materials = [
      { id: uid("mat"), title: "Guia para manter a dieta nos fins de semana", desc: "Estratégias simples para não sair do plano.", body: "1. Planeje antes.\n2. Priorize proteína em todas as refeições.\n3. Escolha uma refeição livre, não um dia livre.\n4. Volte ao plano na refeição seguinte, sem culpa." },
      { id: uid("mat"), title: "Como registrar suas cargas", desc: "Por que anotar cada série faz diferença.", body: "Anotar peso e repetições permite progredir com segurança. Tente superar o último registro em carga OU repetições." },
      { id: uid("mat"), title: "Fotos de evolução: como tirar", desc: "Mesmo ângulo, mesma luz.", body: "Frente, lado e costas. Mesma hora do dia, mesma luz, roupa parecida, câmera na altura do umbigo." }
    ];

    return {
      groups: GROUPS, exercises: ex, techniques: techniques, foods: foods,
      questionnaire: questionnaire, materials: materials,
      settings: { minPhotos: 3, askEffortOnFinish: true, allowUnitChange: true, appName: APP_NAME }
    };
  }

  /* ---------- Armazenamento (Firebase) ----------
     Firestore:
       library/main               bibliotecas compartilhadas + questionário + materiais + configurações (só o treinador grava)
       students/{uid}             { profile, workoutPlan, dietPlan } — uid = conta de login do aluno
       logs/{uid}                 registros do aluno (água, refeições, peso, check-ins...) + feedback do treinador
       logs/{uid}/years/{ano}     treinos realizados daquele ano
       logs/{uid}/photos/{id}     fotos comprimidas (check-in e observações da dieta)
       notes/{uid}                observações pessoais do treinador (o aluno não vê)
       files/{uid}                anexos que o treinador manda ao aluno
       trainers/{uid}             marca quem é o treinador (criado só pelo console)  */
  var db = null, role = null, myUid = null, loader = null;
  var LIB_KEYS = ["groups", "exercises", "techniques", "foods", "questionnaire", "materials", "settings"];
  var LOG_KEYS = ["water", "mealsDone", "mealNotes", "weights", "checkins", "cardio", "materialsSeen", "workoutNotes"];
  var DEEP = { profile: 1, feedback: 1 }; // campos gravados item a item (treinador e aluno não se atropelam)
  var saved = {}, filesLoaded = {}, filesLoading = {}, photoCache = {}, photoWaiting = {};
  var timer = null, pending = 0, lastLoad = 0;
  var hooks = { onError: null, onPhoto: null };

  function emptyLogs() { return { sessions: [], water: {}, mealsDone: {}, mealNotes: [], weights: [], checkins: [], cardio: [], materialsSeen: [], workoutNotes: [] }; }
  function J(v) { return JSON.stringify(v === undefined ? null : v); }
  function clone(v) { return v === undefined ? null : JSON.parse(JSON.stringify(v)); }
  function whenFB(cb) { if (window.FB) cb(window.FB); else window.addEventListener("fb-ready", function () { cb(window.FB); }, { once: true }); }
  function report(e) { console.error(e); if (hooks.onError) hooks.onError(e); }

  function studentDocs(s) {
    var out = {}, id = s.id, l = logsOf(id), ld = {}, fb = {}, years = {};
    var profile = clone(s); delete profile.id; delete profile.privateNotes; delete profile.password;
    out["students/" + id] = { profile: profile, workoutPlan: clone(db.workoutPlans[id] || null), dietPlan: clone(db.dietPlans[id] || null) };
    LOG_KEYS.forEach(function (k) { ld[k] = clone(l[k]); });
    ld.checkins = (l.checkins || []).map(function (c) { var x = clone(c); if (x.feedback) fb[x.id] = x.feedback; delete x.feedback; return x; });
    ld.feedback = fb;
    out["logs/" + id] = ld;
    (l.sessions || []).forEach(function (x) { var y = String(x.date || "").slice(0, 4) || "0000"; (years[y] = years[y] || []).push(x); });
    Object.keys(years).forEach(function (y) { out["logs/" + id + "/years/" + y] = { sessions: clone(years[y]) }; });
    if (role === "trainer") out["notes/" + id] = { text: s.privateNotes || "" };
    if (role === "trainer" && filesLoaded[id]) out["files/" + id] = { list: clone(db.attachments[id] || []) };
    return out;
  }
  function buildDocs() {
    var out = {};
    if (role === "trainer") { var lib = {}; LIB_KEYS.forEach(function (k) { lib[k] = clone(db[k]); }); out["library/main"] = lib; }
    db.students.forEach(function (s) { var d = studentDocs(s); Object.keys(d).forEach(function (k) { out[k] = d[k]; }); });
    return out;
  }
  function snapshot(data) { var o = {}; Object.keys(data).forEach(function (k) { o[k] = J(data[k]); }); return o; }
  /* Marca como "já no servidor" os documentos que vieram do Firebase. */
  function markSaved(existing) {
    var d = buildDocs(); saved = {};
    Object.keys(d).forEach(function (p) { if (existing[p]) saved[p] = snapshot(d[p]); });
  }
  function diffDoc(path, data) {
    var prev = saved[path], upd = {}, n = 0;
    if (!prev) return null; // documento novo: grava inteiro
    Object.keys(data).forEach(function (k) {
      if (DEEP[k] && data[k] && typeof data[k] === "object" && prev[k] !== undefined && prev[k] !== "null") {
        var pv = JSON.parse(prev[k]) || {}, nv = data[k];
        Object.keys(nv).forEach(function (sk) { if (J(nv[sk]) !== J(pv[sk])) { upd[k + "." + sk] = nv[sk] === undefined ? null : nv[sk]; n++; } });
        Object.keys(pv).forEach(function (sk) { if (!(sk in nv)) { upd[k + "." + sk] = window.FB.del(); n++; } });
      } else if (J(data[k]) !== prev[k]) { upd[k] = data[k]; n++; }
    });
    return upd;
  }

  function extractPhotos() {
    db.students.forEach(function (s) {
      var l = db.logs[s.id]; if (!l) return;
      function take(url) {
        if (typeof url !== "string" || url.indexOf("data:") !== 0) return url;
        var pid = uid("ph"), ref = "ph:" + s.id + ":" + pid;
        photoCache[ref] = url;
        window.FB.set("logs/" + s.id + "/photos/" + pid, { data: url, date: todayISO() }).catch(report);
        return ref;
      }
      (l.checkins || []).forEach(function (c) { if (c.photos) c.photos = c.photos.map(take); });
      (l.mealNotes || []).forEach(function (n) { if (n.photo) n.photo = take(n.photo); });
    });
  }
  /* Endereço de uma foto para mostrar na tela (carrega do Firebase na primeira vez). */
  function photo(ref) {
    if (!ref) return "";
    if (String(ref).indexOf("ph:") !== 0) return ref;
    if (photoCache[ref] != null) return photoCache[ref];
    if (!photoWaiting[ref] && window.FB) {
      photoWaiting[ref] = true;
      var p = ref.split(":");
      window.FB.get("logs/" + p[1] + "/photos/" + p[2]).then(function (d) {
        photoCache[ref] = d ? d.data : "";
        clearTimeout(photo._t); photo._t = setTimeout(function () { if (hooks.onPhoto) hooks.onPhoto(); }, 80);
      }, function (e) { photoWaiting[ref] = false; console.warn(e); });
    }
    return "";
  }

  function save() { if (!db) return; clearTimeout(timer); timer = setTimeout(sync, 300); }
  function sync() {
    clearTimeout(timer); timer = null;
    if (!db || !window.FB) return;
    extractPhotos();
    var docs = buildDocs();
    Object.keys(docs).forEach(function (path) {
      var data = docs[path], upd = diffDoc(path, data);
      if (upd && !Object.keys(upd).length) return;
      var snap = snapshot(data), before = saved[path];
      saved[path] = snap; pending++;
      (upd ? window.FB.update(path, upd) : window.FB.set(path, data)).then(function () { pending--; }, function (e) {
        pending--; if (saved[path] === snap) { if (before) saved[path] = before; else delete saved[path]; }
        report(e);
      });
    });
  }
  function busy() { return !!timer || pending > 0; }
  window.addEventListener("pagehide", function () { if (timer) sync(); });

  function blankDb() { return { students: [], workoutPlans: {}, dietPlans: {}, logs: {}, attachments: {}, notifications: [] }; }
  function applyLibrary(lib) {
    var base = lib || seed();
    LIB_KEYS.forEach(function (k) { db[k] = base[k] != null ? base[k] : seed()[k]; });
  }
  function addStudent(id, sd, ld, years, notes) {
    var s = clone(sd.profile || {}); s.id = id; s.privateNotes = notes ? notes.text || "" : "";
    db.students.push(s);
    if (sd.workoutPlan) db.workoutPlans[id] = sd.workoutPlan;
    if (sd.dietPlan) db.dietPlans[id] = sd.dietPlan;
    var l = emptyLogs();
    if (ld) {
      LOG_KEYS.forEach(function (k) { if (ld[k] != null) l[k] = ld[k]; });
      var fb = ld.feedback || {}; l.checkins.forEach(function (c) { c.feedback = fb[c.id] || null; });
    }
    (years || []).forEach(function (y) { l.sessions = l.sessions.concat(y.data.sessions || []); });
    db.logs[id] = l;
  }

  async function loadTrainer(FB, me) {
    if (!(await FB.get("trainers/" + me))) return "denied";
    var r = await Promise.all([FB.get("library/main"), FB.list("students"), FB.list("logs"), FB.list("notes")]);
    var years = await Promise.all(r[1].map(function (s) { return FB.list("logs/" + s.id + "/years"); }));
    var keepFiles = db && role === "trainer" ? { a: db.attachments, f: filesLoaded } : null;
    db = blankDb(); role = "trainer"; filesLoaded = {};
    applyLibrary(r[0]);
    var logs = {}, notes = {}, existing = {};
    if (r[0]) existing["library/main"] = 1;
    r[2].forEach(function (d) { logs[d.id] = d.data; existing["logs/" + d.id] = 1; });
    r[3].forEach(function (d) { notes[d.id] = d.data; existing["notes/" + d.id] = 1; });
    r[1].forEach(function (d, i) {
      existing["students/" + d.id] = 1;
      years[i].forEach(function (y) { existing["logs/" + d.id + "/years/" + y.id] = 1; });
      addStudent(d.id, d.data, logs[d.id], years[i], notes[d.id]);
    });
    db.students.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    if (keepFiles) Object.keys(keepFiles.f).forEach(function (id) { if (keepFiles.f[id]) { db.attachments[id] = keepFiles.a[id]; filesLoaded[id] = true; existing["files/" + id] = 1; } });
    markSaved(existing);
    if (!r[0]) save(); // primeira vez: grava as bibliotecas iniciais
    return "ready";
  }
  async function loadStudent(FB, me) {
    var sd = await FB.get("students/" + me);
    if (!sd) return "denied";
    if (!sd.profile || !sd.profile.active) return "inactive";
    var r = await Promise.all([FB.get("library/main"), FB.get("logs/" + me), FB.list("logs/" + me + "/years"), FB.get("files/" + me)]);
    db = blankDb(); role = "student"; filesLoaded = {};
    applyLibrary(r[0]);
    addStudent(me, sd, r[1], r[2], null);
    db.attachments[me] = r[3] ? r[3].list || [] : []; filesLoaded[me] = true;
    var existing = {}; existing["students/" + me] = 1;
    if (r[1]) existing["logs/" + me] = 1;
    if (r[3]) existing["files/" + me] = 1;
    r[2].forEach(function (y) { existing["logs/" + me + "/years/" + y.id] = 1; });
    markSaved(existing);
    return "ready";
  }

  /* Liga o app: want = "trainer" ou "student". onState("login" | "loading" | "ready" | "denied" | "inactive" | "error") */
  function start(want, onState) {
    whenFB(function (FB) {
      FB.onAuth(function (user) {
        db = null; role = null; saved = {}; filesLoaded = {}; filesLoading = {}; myUid = user ? user.uid : null;
        if (!user) { onState("login"); return; }
        onState("loading");
        loader = function () { return want === "trainer" ? loadTrainer(FB, user.uid) : loadStudent(FB, user.uid); };
        loader().then(function (st) { lastLoad = Date.now(); onState(st); }, function (e) { console.error(e); onState("error", e); });
      });
    });
  }
  /* Busca de novo os dados (ex.: ao voltar para o app). Não faz nada se houver gravação pendente. */
  function refresh(cb) {
    if (!db || !loader || busy() || Date.now() - lastLoad < 20000) return;
    lastLoad = Date.now();
    loader().then(function (st) { if (st === "ready" && cb) cb(); }, function (e) { console.warn(e); });
  }
  /* Anexos do aluno (no site do treinador, carregados só quando abre a aba). */
  function ensureFiles(id, cb) {
    if (filesLoaded[id]) return true;
    if (!filesLoading[id] && window.FB) {
      filesLoading[id] = true;
      window.FB.get("files/" + id).then(function (d) {
        db.attachments[id] = d ? d.list || [] : []; filesLoaded[id] = true; filesLoading[id] = false;
        if (d) saved["files/" + id] = snapshot({ list: clone(db.attachments[id]) });
        if (cb) cb();
      }, function (e) { filesLoading[id] = false; report(e); });
    }
    return false;
  }
  /* Treinador cria a conta de login do aluno e o cadastro. */
  async function createStudent(s, pass) {
    var id = await window.FB.createUser(s.email, pass);
    s.id = id; delete s.password;
    db.students.push(s); db.logs[id] = emptyLogs();
    sync();
    return id;
  }
  function authError(e) {
    var c = (e && e.code) || String(e || "");
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return "E-mail ou senha incorretos.";
    if (/invalid-email/.test(c)) return "E-mail inválido.";
    if (/too-many-requests/.test(c)) return "Muitas tentativas. Espere alguns minutos e tente de novo.";
    if (/network/.test(c)) return "Sem internet. Confira a conexão e tente de novo.";
    if (/email-already-in-use/.test(c)) return "Já existe uma conta com esse e-mail.";
    if (/weak-password/.test(c)) return "A senha precisa ter pelo menos 6 caracteres.";
    if (/permission-denied/.test(c)) return "Sem permissão para essa ação.";
    return "Algo deu errado (" + c + ").";
  }
  function waLink(phone, text) {
    var d = String(phone || "").replace(/\D/g, "");
    if (d.length === 10 || d.length === 11) d = "55" + d;
    return "https://wa.me/" + d + "?text=" + encodeURIComponent(text);
  }

  /* ---------- Consultas ---------- */
  function exercise(id) { return db.exercises.filter(function (e) { return e.id === id; })[0] || { name: "(exercício removido)", group: "" }; }
  function technique(id) { return db.techniques.filter(function (t) { return t.id === id; })[0]; }
  function food(id) { return db.foods.filter(function (f) { return f.id === id; })[0] || { name: "(alimento removido)", kcal: 0, p: 0, c: 0, g: 0, fib: 0, units: [] }; }
  function student(id) { return db.students.filter(function (s) { return s.id === id; })[0]; }
  function logsOf(id) {
    if (!db.logs[id]) db.logs[id] = emptyLogs();
    return db.logs[id];
  }

  function macrosOf(foodId, grams) {
    var f = food(foodId), k = grams / 100;
    return { kcal: f.kcal * k, p: f.p * k, c: f.c * k, g: f.g * k, fib: (f.fib || 0) * k };
  }
  function sumMacros(list) {
    return list.reduce(function (a, m) { a.kcal += m.kcal; a.p += m.p; a.c += m.c; a.g += m.g; a.fib += m.fib; return a; }, { kcal: 0, p: 0, c: 0, g: 0, fib: 0 });
  }
  function optionMacros(opt) { return sumMacros(opt.items.map(function (i) { return macrosOf(i.foodId, i.grams); })); }
  function variationMacros(v) { return sumMacros(v.meals.map(function (m) { return optionMacros(m.options[0]); })); }
  /* Substituição: mesma quantidade de calorias */
  function subGrams(fromFoodId, grams, toFoodId) {
    var a = food(fromFoodId), b = food(toFoodId);
    if (!b.kcal) return grams;
    return Math.round((a.kcal * grams / 100) / b.kcal * 100);
  }
  function variationForDay(plan, dow) {
    if (!plan) return null;
    return plan.variations.filter(function (v) { return v.days.indexOf(dow) >= 0; })[0] || plan.variations[0];
  }
  function parseRestRange(r) {
    var parts = String(r || "1:00-1:30").split("-").map(function (x) {
      var p = x.trim().split(":"); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
    });
    var min = parts[0], max = parts[1] || parts[0];
    return { min: min, mid: Math.round((min + max) / 2), max: max };
  }
  function fmtSec(s) { s = Math.max(0, Math.round(s)); var m = Math.floor(s / 60), ss = s % 60; return String(m).padStart(2, "0") + ":" + String(ss).padStart(2, "0"); }

  /* Volume por grupo muscular (séries válidas) */
  function volumeByGroup(workouts) {
    var v = {};
    workouts.forEach(function (w) {
      if (w.optional) return;
      w.items.forEach(function (it) { var g = exercise(it.exId).group || "Outro"; v[g] = (v[g] || 0) + (it.valid.sets || 0); });
    });
    return v;
  }

  function lastSetsFor(studentId, exId) {
    var ses = logsOf(studentId).sessions.slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; });
    for (var i = 0; i < ses.length; i++) {
      var s = ses[i].sets.filter(function (x) { return x.exId === exId && x.type === "valid"; });
      if (s.length) return { date: ses[i].date, sets: s };
    }
    return null;
  }
  function exerciseHistory(studentId, exId) {
    var out = [], best = null;
    logsOf(studentId).sessions.slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; }).forEach(function (ses) {
      var s = ses.sets.filter(function (x) { return x.exId === exId; });
      if (!s.length) return;
      out.push({ date: ses.date, sets: s });
      s.forEach(function (x) { if (!best || x.weight > best.weight || (x.weight === best.weight && x.reps > best.reps)) best = { weight: x.weight, reps: x.reps, date: ses.date }; });
    });
    return { list: out, best: best };
  }

  /* Gráfico de linha simples em SVG */
  function lineChart(points, opts) {
    opts = opts || {};
    var W = opts.w || 320, H = opts.h || 160, pad = 28;
    if (!points.length) return '<div class="empty">Sem dados ainda.</div>';
    var ys = points.map(function (p) { return p.y; });
    var min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
    if (min === max) { min -= 1; max += 1; }
    var span = max - min; min -= span * 0.1; max += span * 0.1;
    function X(i) { return pad + (points.length === 1 ? (W - pad * 2) / 2 : i * (W - pad * 2) / (points.length - 1)); }
    function Y(v) { return H - pad + 6 - (v - min) / (max - min) * (H - pad * 1.5); }
    var d = points.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.y).toFixed(1); }).join(" ");
    var dots = points.map(function (p, i) { return '<circle cx="' + X(i) + '" cy="' + Y(p.y) + '" r="3.5" class="dot"><title>' + esc(p.label) + ": " + p.y + '</title></circle>'; }).join("");
    var labels = '<text x="' + X(0) + '" y="' + (H - 4) + '" class="axis" text-anchor="start">' + esc(points[0].label) + "</text>" +
      (points.length > 1 ? '<text x="' + X(points.length - 1) + '" y="' + (H - 4) + '" class="axis" text-anchor="end">' + esc(points[points.length - 1].label) + "</text>" : "");
    var yl = '<text x="2" y="' + (Y(max) + 10) + '" class="axis">' + round1(max) + '</text><text x="2" y="' + Y(min) + '" class="axis">' + round1(min) + "</text>";
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" preserveAspectRatio="none"><path d="' + d + '" class="line"/>' + dots + labels + yl + "</svg>";
  }

  function donut(parts, center, sub) {
    var total = parts.reduce(function (a, p) { return a + p.v; }, 0) || 1, acc = 0, R = 52, C = 2 * Math.PI * R;
    var segs = parts.map(function (p) {
      var len = p.v / total * C, s = '<circle r="' + R + '" cx="70" cy="70" fill="none" stroke="' + p.color + '" stroke-width="16" stroke-dasharray="' + len + " " + (C - len) + '" stroke-dashoffset="' + (-acc) + '" transform="rotate(-90 70 70)"/>';
      acc += len; return s;
    }).join("");
    return '<svg viewBox="0 0 140 140" class="donut">' + segs + '<text x="70" y="68" text-anchor="middle" class="donut-big">' + esc(center) + '</text><text x="70" y="86" text-anchor="middle" class="donut-sub">' + esc(sub) + "</text></svg>";
  }

  window.Proto = {
    APP_NAME: APP_NAME, save: save, flush: sync, busy: busy, start: start, refresh: refresh, hooks: hooks,
    get db() { return db; }, get role() { return role; }, get myUid() { return myUid; },
    photo: photo, ensureFiles: ensureFiles, createStudent: createStudent, authError: authError, waLink: waLink,
    uid: uid, todayISO: todayISO, addDays: addDays, fmtDate: fmtDate, esc: esc, round1: round1,
    exercise: exercise, technique: technique, food: food, student: student, logsOf: logsOf,
    macrosOf: macrosOf, sumMacros: sumMacros, optionMacros: optionMacros, variationMacros: variationMacros,
    subGrams: subGrams, variationForDay: variationForDay, parseRestRange: parseRestRange, fmtSec: fmtSec,
    volumeByGroup: volumeByGroup, lastSetsFor: lastSetsFor, exerciseHistory: exerciseHistory,
    lineChart: lineChart, donut: donut,
    DOW: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
    DOW_FULL: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
  };
})();
