// Teste das regras de segurança no EMULADOR local (nunca no Firebase de verdade).
// Uso: com os emuladores ligados (firebase emulators:start --only auth,firestore), rode:
//   node testes/regras.mjs
// Contas abaixo existem só no emulador.
const P = "teamgarcia-app", AUTH = "http://127.0.0.1:9099", FS = "http://127.0.0.1:8080";
const BASE = `${FS}/v1/projects/${P}/databases/(default)/documents`;
const SENHA = "teste-emulador-123";

function val(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(val) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, val(x)])) } };
}
const fields = (o) => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, val(x)]));

async function signUp(email) {
  let r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=x`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: SENHA, returnSecureToken: true }) });
  let j = await r.json();
  if (j.error) { r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: SENHA, returnSecureToken: true }) }); j = await r.json(); }
  return { uid: j.localId, token: j.idToken };
}
async function req(method, path, token, body, mask) {
  const h = { "Content-Type": "application/json" };
  if (token) h.Authorization = "Bearer " + token;
  let url = `${BASE}/${path}`;
  if (mask) url += "?" + mask.map((m) => "updateMask.fieldPaths=" + encodeURIComponent(m)).join("&");
  const r = await fetch(url, { method, headers: h, body: body ? JSON.stringify({ fields: fields(body) }) : undefined });
  return r.status;
}

let ok = 0, fail = 0;
async function expect(desc, p, want) {
  const st = await p, good = want === "ok" ? st === 200 : st === 403;
  if (good) ok++; else fail++;
  console.log((good ? "OK   " : "FALHA") + " · " + desc + " → HTTP " + st);
}

const tr = await signUp("treinador@teste.local"), a = await signUp("aluno.a@teste.local"), b = await signUp("aluno.b@teste.local"), x = await signUp("estranho@teste.local");
await req("PATCH", `trainers/${tr.uid}`, "owner", { since: "teste" });
const perfil = (n, active = true) => ({ profile: { name: n, email: n + "@teste.local", active, planEnd: "2027-01-01", weight: 70 }, workoutPlan: { name: "Treino" }, dietPlan: null });

console.log("\n— Treinador");
await expect("treinador grava a biblioteca", req("PATCH", "library/main", tr.token, { foods: [], settings: { minPhotos: 3 } }), "ok");
await expect("treinador cria aluno A", req("PATCH", `students/${a.uid}`, tr.token, perfil("A")), "ok");
await expect("treinador cria aluno B", req("PATCH", `students/${b.uid}`, tr.token, perfil("B")), "ok");
await expect("treinador cria registros de B", req("PATCH", `logs/${b.uid}`, tr.token, { checkins: [], feedback: {} }), "ok");
await expect("treinador grava observação pessoal de A", req("PATCH", `notes/${a.uid}`, tr.token, { text: "particular" }), "ok");
await expect("treinador lista todos os alunos", req("GET", "students", tr.token), "ok");

console.log("\n— Aluno A (dados dele)");
await expect("A lê o próprio cadastro", req("GET", `students/${a.uid}`, a.token), "ok");
await expect("A lê a biblioteca", req("GET", "library/main", a.token), "ok");
await expect("A grava os próprios registros", req("PATCH", `logs/${a.uid}`, a.token, { water: { "2026-10-17": 500 } }), "ok");
await expect("A grava foto pequena", req("PATCH", `logs/${a.uid}/photos/p1`, a.token, { data: "data:image/jpeg;base64,AAAA" }), "ok");
await expect("A grava treinos do ano", req("PATCH", `logs/${a.uid}/years/2026`, a.token, { sessions: [] }), "ok");
await expect("A muda o próprio nome", req("PATCH", `students/${a.uid}`, a.token, { profile: { name: "A2" } }, ["profile.name"]), "ok");

console.log("\n— Aluno A tentando o que NÃO pode");
await expect("A NÃO lê o cadastro de B", req("GET", `students/${b.uid}`, a.token), "negado");
await expect("A NÃO lê os registros de B", req("GET", `logs/${b.uid}`, a.token), "negado");
await expect("A NÃO grava nos registros de B", req("PATCH", `logs/${b.uid}`, a.token, { water: {} }), "negado");
await expect("A NÃO lista os alunos", req("GET", "students", a.token), "negado");
await expect("A NÃO lê a observação pessoal do treinador", req("GET", `notes/${a.uid}`, a.token), "negado");
await expect("A NÃO altera o próprio treino", req("PATCH", `students/${a.uid}`, a.token, { workoutPlan: { name: "hack" } }, ["workoutPlan"]), "negado");
await expect("A NÃO se reativa / muda o plano", req("PATCH", `students/${a.uid}`, a.token, { profile: { planEnd: "2099-01-01" } }, ["profile.planEnd"]), "negado");
await expect("A NÃO altera a biblioteca", req("PATCH", "library/main", a.token, { foods: [] }), "negado");
await expect("A NÃO grava foto gigante", req("PATCH", `logs/${a.uid}/photos/p2`, a.token, { data: "x".repeat(310000) }), "negado");
await expect("A NÃO vira treinador", req("PATCH", `trainers/${a.uid}`, a.token, { x: 1 }), "negado");
await expect("A NÃO apaga os próprios registros", req("DELETE", `logs/${a.uid}`, a.token), "negado");

console.log("\n— Conta sem cadastro e visitante sem login");
await expect("conta estranha NÃO lê a biblioteca", req("GET", "library/main", x.token), "negado");
await expect("conta estranha NÃO lê aluno A", req("GET", `logs/${a.uid}`, x.token), "negado");
await expect("sem login NÃO lê nada", req("GET", `students/${a.uid}`, null), "negado");

console.log("\n— Equipe, registro de alterações e comunidade");
const f = await signUp("funcionario@teste.local");
await expect("funcionário ainda sem cadastro NÃO lê alunos", req("GET", `students/${a.uid}`, f.token), "negado");
await expect("dono cadastra o funcionário", req("PATCH", `staff/${f.uid}`, tr.token, { name: "F", active: true, perms: { alunos: true } }), "ok");
await expect("funcionário ativo lê aluno A", req("GET", `students/${a.uid}`, f.token), "ok");
await expect("funcionário grava registro de alteração com o próprio nome", req("PATCH", `audit/a1`, f.token, { uid: f.uid, who: "F", table: "x", action: "y", at: "2026" }), "ok");
await expect("funcionário NÃO grava registro em nome de outro", req("PATCH", `audit/a2`, f.token, { uid: tr.uid, who: "T", table: "x", action: "y", at: "2026" }), "negado");
await expect("ninguém edita um registro de alteração", req("PATCH", `audit/a1`, tr.token, { uid: tr.uid, who: "T", table: "z", action: "y", at: "2026" }), "negado");
await expect("funcionário NÃO lê a observação pessoal do dono", req("GET", `notes/${a.uid}`, f.token), "negado");
await expect("funcionário NÃO muda as próprias permissões", req("PATCH", `staff/${f.uid}`, f.token, { name: "F", active: true, perms: { config: true } }), "negado");
await expect("funcionário NÃO vira dono", req("PATCH", `trainers/${f.uid}`, f.token, { x: 1 }), "negado");
await expect("funcionário NÃO apaga aluno", req("DELETE", `students/${a.uid}`, f.token), "negado");
await expect("aluno NÃO lê o cadastro de funcionários", req("GET", `staff/${f.uid}`, a.token), "negado");
await expect("aluno NÃO lê o registro de alterações", req("GET", `audit/a1`, a.token), "negado");
const post = (uid, team = false) => ({ authorId: uid, authorName: "X", team, text: "oi", photo: "", at: "2026-11-16T10:00:00Z", likes: {}, comments: [], pinned: false });
await expect("aluno A posta na comunidade", req("PATCH", `community/p1`, a.token, post(a.uid)), "ok");
await expect("aluno A NÃO posta em nome de outro", req("PATCH", `community/p2`, a.token, post(b.uid)), "negado");
await expect("aluno A NÃO posta como equipe", req("PATCH", `community/p3`, a.token, post(a.uid, true)), "negado");
await expect("dono posta na comunidade", req("PATCH", `community/p4`, tr.token, post(tr.uid, true)), "ok");
await expect("aluno B lê o post", req("GET", `community/p4`, b.token), "ok");
await expect("aluno B curte o post", req("PATCH", `community/p4`, b.token, { likes: { [b.uid]: true } }, ["likes"]), "ok");
await expect("aluno B NÃO muda o texto do post", req("PATCH", `community/p4`, b.token, { text: "hack" }, ["text"]), "negado");
await expect("aluno B NÃO apaga post de outro", req("DELETE", `community/p4`, b.token), "negado");
await expect("aluno A apaga o próprio post", req("DELETE", `community/p1`, a.token), "ok");
await expect("conta estranha NÃO lê a comunidade", req("GET", `community/p4`, x.token), "negado");
await expect("dono desativa o funcionário", req("PATCH", `staff/${f.uid}`, tr.token, { name: "F", active: false, perms: {} }), "ok");
await expect("funcionário inativo NÃO lê alunos", req("GET", `students/${a.uid}`, f.token), "negado");

console.log("\n— Aluno inativo");
await expect("treinador desativa B", req("PATCH", `students/${b.uid}`, tr.token, { profile: { active: false } }, ["profile.active"]), "ok");
await expect("B inativo NÃO lê os registros", req("GET", `logs/${b.uid}`, b.token), "negado");
await expect("B inativo NÃO lê a biblioteca", req("GET", "library/main", b.token), "negado");

console.log(`\nResultado: ${ok} OK, ${fail} falha(s)`);
process.exit(fail ? 1 : 0);
