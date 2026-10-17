/* TeamGarcia — ligação com o Firebase (projeto próprio "teamgarcia-app", separado do CRM).
   Expõe window.FB com funções simples usadas por shared.js. */
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword,
  sendPasswordResetEmail, setPersistence, browserLocalPersistence, connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  doc, getDoc, getDocs, setDoc, updateDoc, collection, deleteField, connectFirestoreEmulator
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const config = {
  apiKey: "AIzaSyDTCm04-Q1FlBAoL-5b2RC0YQ3vovFRnuo",
  authDomain: "teamgarcia-app.firebaseapp.com",
  projectId: "teamgarcia-app",
  storageBucket: "teamgarcia-app.firebasestorage.app",
  messagingSenderId: "933835079995",
  appId: "1:933835079995:web:09387a9dbaa5fbbd2a771e"
};

// Só para testes locais: ?emu=1 usa os emuladores do Firebase no próprio computador.
const EMU = /[?&]emu=1/.test(location.search) && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const isAluno = /aluno\.html$/.test(location.pathname);

// Nome próprio para o app do aluno: assim o login do aluno e o do treinador não se misturam no mesmo navegador.
const app = isAluno ? initializeApp(config, "aluno") : initializeApp(config);
const auth = getAuth(app);
// App do aluno guarda os dados no aparelho para funcionar sem internet na academia.
const fs = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: isAluno && !EMU ? persistentLocalCache({ tabManager: persistentMultipleTabManager() }) : memoryLocalCache()
});
if (EMU) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(fs, "127.0.0.1", 8080);
}
setPersistence(auth, browserLocalPersistence).catch(function () {});

function ref(path) { return doc(fs, path); }

window.FB = {
  emu: EMU,
  onAuth(cb) { return onAuthStateChanged(auth, cb); },
  user() { return auth.currentUser; },
  signIn(email, pass) { return signInWithEmailAndPassword(auth, email, pass); },
  signOut() { return signOut(auth); },
  resetPassword(email) { return sendPasswordResetEmail(auth, email); },
  async get(path) { const s = await getDoc(ref(path)); return s.exists() ? s.data() : null; },
  async list(path) { const q = await getDocs(collection(fs, path)); return q.docs.map(d => ({ id: d.id, data: d.data() })); },
  set(path, data) { return setDoc(ref(path), data); },
  update(path, data) { return updateDoc(ref(path), data); },
  del: deleteField,
  // Cria a conta do aluno sem desconectar o treinador (usa uma segunda instância do app).
  async createUser(email, pass) {
    const second = initializeApp(config, "criar-" + Date.now());
    const a2 = getAuth(second);
    if (EMU) connectAuthEmulator(a2, "http://127.0.0.1:9099", { disableWarnings: true });
    try {
      const cred = await createUserWithEmailAndPassword(a2, email, pass);
      const uid = cred.user.uid;
      await signOut(a2);
      return uid;
    } finally { deleteApp(second).catch(function () {}); }
  }
};
window.dispatchEvent(new Event("fb-ready"));
