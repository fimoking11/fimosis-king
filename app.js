import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, writeBatch, increment, serverTimestamp, collection, getDocs }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { CARDS, RARITY } from "./cards.js";
import { PHRASES } from "./profile-data.js";
import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";

const $ = id => document.getElementById(id);
const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);

// Mes actual (UTC) en formato 2026-11. Cada mes tiene su propio contador y sus propios votos,
// así que el reinicio mensual es automático.
const now = new Date();
const month = now.getUTCFullYear() + "-" + String(now.getUTCMonth() + 1).padStart(2, "0");
const daysLeft = Math.ceil((Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - now) / 864e5);
$("monthName").textContent = now.toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
$("daysLeft").textContent = daysLeft + (daysLeft === 1 ? " día" : " días");

// Efecto 3D del póster
const poster = $("poster");
if (!matchMedia("(prefers-reduced-motion:reduce)").matches) {
  poster.parentElement.addEventListener("pointermove", e => {
    const r = poster.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    poster.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
  });
  poster.parentElement.addEventListener("pointerleave", () => poster.style.transform = "");
}

// Autenticación
const dlg = $("authDlg"); let registering = false;
function setMode(reg) {
  registering = reg;
  $("authTitle").textContent = reg ? "Crear cuenta" : "Entrar";
  $("authSubmit").textContent = reg ? "Crear cuenta" : "Entrar";
  $("swap").textContent = reg ? "Ya tengo cuenta" : "Crear cuenta nueva";
  $("pass").autocomplete = reg ? "new-password" : "current-password";
  $("authMsg").textContent = "";
}
$("openAuth").onclick = () => { setMode(false); dlg.showModal(); };
$("closeAuth").onclick = () => dlg.close();
$("swap").onclick = () => setMode(!registering);
const errs = {
  "auth/invalid-email": "El correo no es válido.",
  "auth/email-already-in-use": "Ese correo ya tiene cuenta. Prueba a entrar.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/too-many-requests": "Demasiados intentos. Espera un poco y vuelve a probar."
};
$("authForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = registering ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
  try { await f(auth, $("email").value.trim(), $("pass").value); dlg.close(); $("pass").value = ""; }
  catch (err) { $("authMsg").textContent = errs[err.code] || "No se pudo completar. Inténtalo de nuevo."; }
});

// Marcador
async function loadCount() {
  try { const s = await getDoc(doc(db, "months", month)); $("count").textContent = s.exists() ? s.data().count : 0; }
  catch { $("count").textContent = "?"; }
}
let user = null, voted = false;
async function refreshVote() {
  const btn = $("vote"), msg = $("voteMsg");
  if (!user) { btn.disabled = false; btn.textContent = "Entra para votar"; msg.textContent = ""; return; }
  try { voted = (await getDoc(doc(db, "months", month, "votes", user.uid))).exists(); } catch { voted = false; }
  btn.disabled = voted;
  btn.textContent = voted ? "Ya has votado este mes" : "Votar a Fimosis King";
  msg.textContent = voted ? "¡Gracias! Estás dentro del sorteo de este mes." : "";
}
$("vote").onclick = async () => {
  if (!user) { setMode(false); return dlg.showModal(); }
  $("vote").disabled = true;
  try {
    const b = writeBatch(db);
    b.set(doc(db, "months", month, "votes", user.uid), { ts: serverTimestamp(), email: user.email });
    b.set(doc(db, "months", month), { count: increment(1) }, { merge: true });
    await b.commit();
    await Promise.all([loadCount(), refreshVote()]);
  } catch { $("voteMsg").textContent = "No se pudo registrar el voto (quizá ya votaste este mes)."; refreshVote(); }
};

// Sorteo (solo admin)
$("draw").onclick = async () => {
  try {
    const snap = await getDocs(collection(db, "months", month, "votes"));
    if (snap.empty) return $("winner").textContent = "Todavía no hay votantes este mes.";
    const w = snap.docs[Math.floor(Math.random() * snap.size)].data().email;
    $("winner").textContent = `Ganador/a entre ${snap.size} participantes: ${w}`;
  } catch { $("winner").textContent = "No tienes permiso para hacer el sorteo."; }
};

onAuthStateChanged(auth, u => {
  user = u;
  renderBar();
  $("admin").hidden = !(u && u.email === ADMIN_EMAIL);
  refreshVote();
});
loadCount();

// ---------- Sobres y colección ----------
const byId = Object.fromEntries(CARDS.map(c => [c.id, c]));
let owned = {}, lastPack = null, busy = false, timer = null;
const dayKey = d => d.toISOString().slice(0, 10); // día en UTC, igual que las reglas de Firestore
const canOpen = () => !!user && !(lastPack && dayKey(lastPack) === dayKey(new Date()));

function cardHTML(c, n) {
  return `<span class="in"><span class="face back">👑</span><span class="face front"><img src="img/cards/${c.id}.jpg" alt="${c.name}" loading="lazy"><span class="cap"><i>${RARITY[c.r].name}</i><b>${c.name}</b>${c.t}</span></span></span>`;
}
function renderAlbum() {
  const have = CARDS.filter(c => owned[c.id]).length;
  $("progress").textContent = user ? `${have}/${CARDS.length}` : "";
  $("album").innerHTML = CARDS.map(c => owned[c.id]
    ? `<div class="card flip" data-r="${c.r}" style="position:relative">${owned[c.id] > 1 ? `<span class="dup">x${owned[c.id]}</span>` : ""}${cardHTML(c)}</div>`
    : `<div class="slot">${user ? "Carta por descubrir" : "Entra para ver tu colección"}</div>`).join("");
}
function renderPack() {
  const b = $("pack"), m = $("packMsg"); clearInterval(timer);
  if (!user) { b.disabled = false; m.textContent = "Entra con tu cuenta para abrir tu sobre diario."; return; }
  if (canOpen()) { b.disabled = false; m.textContent = "Tu sobre de hoy está listo."; return; }
  b.disabled = true;
  const tick = () => {
    const n = new Date(), next = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1), s = Math.max(0, Math.floor((next - n) / 1000));
    m.textContent = "Ya abriste el sobre de hoy. Siguiente en " + [s / 3600, s % 3600 / 60, s % 60].map(x => String(Math.floor(x)).padStart(2, "0")).join(":");
    if (s === 0) { clearInterval(timer); renderPack(); }
  };
  tick(); timer = setInterval(tick, 1000);
}
function pick5() {
  const pool = [...CARDS], out = [];
  while (out.length < 5) {
    let r = Math.random() * pool.reduce((s, c) => s + RARITY[c.r].weight, 0), i = 0;
    for (; i < pool.length - 1; i++) { r -= RARITY[pool[i].r].weight; if (r < 0) break; }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}
$("pack").onclick = async () => {
  if (!user) { setMode(false); return dlg.showModal(); }
  if (busy || !canOpen()) return;
  busy = true; $("pack").disabled = true;
  const cards = pick5(), ref = doc(db, "users", user.uid);
  try {
    // Se guarda antes de enseñar las cartas, así recargar la página no sirve para repetir
    if (lastPack === null && Object.keys(owned).length === 0 && !(await getDoc(ref)).exists()) {
      await setDoc(ref, { cards: Object.fromEntries(cards.map(c => [c.id, 1])), total: 5, lastPack: serverTimestamp() });
    } else {
      const u = { total: increment(5), lastPack: serverTimestamp() };
      cards.forEach(c => u["cards." + c.id] = increment(1));
      await updateDoc(ref, u);
    }
  } catch { $("packMsg").textContent = "No se pudo abrir el sobre. Inténtalo de nuevo."; busy = false; $("pack").disabled = false; return; }
  lastPack = new Date(); cards.forEach(c => owned[c.id] = (owned[c.id] || 0) + 1);
  $("pack").classList.add("open"); $("packMsg").textContent = "¡Toca las cartas para descubrirlas!";
  const box = $("drawn"); box.innerHTML = "";
  cards.forEach(c => { const b = document.createElement("button"); b.className = "card"; b.dataset.r = c.r; b.setAttribute("aria-label", "Carta sin descubrir"); b.innerHTML = cardHTML(c);
    b.onclick = () => { b.classList.add("flip"); b.setAttribute("aria-label", c.name); check(); }; box.appendChild(b); });
  $("revealAll").hidden = false; busy = false;
};
function check() {
  if ([...$("drawn").children].every(x => x.classList.contains("flip"))) { $("revealAll").hidden = true; $("pack").classList.remove("open"); renderAlbum(); renderPack(); }
}
$("revealAll").onclick = () => { [...$("drawn").children].forEach((x, i) => setTimeout(() => { x.classList.add("flip"); check(); }, i * 150)); };

onAuthStateChanged(auth, async u => {
  owned = {}; lastPack = null; $("drawn").innerHTML = ""; $("revealAll").hidden = true; $("pack").classList.remove("open");
  if (u) { try { const s = await getDoc(doc(db, "users", u.uid)); if (s.exists()) { owned = s.data().cards || {}; lastPack = s.data().lastPack ? s.data().lastPack.toDate() : null; } } catch {} }
  renderAlbum(); renderPack();
});

// ---------- Perfil ----------
let profile = { name: "", avatar: "", phrase: "p8" };
const el = (t, cls, txt) => { const e = document.createElement(t); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
function avatarEl(id, big) {
  const s = el("span", "av" + (big ? " big" : ""));
  if (id && byId[id]) { const i = el("img"); i.src = "img/cards/" + id + ".jpg"; i.alt = ""; s.appendChild(i); } else s.textContent = "👑";
  return s;
}
const shownName = () => profile.name || (user ? user.email.split("@")[0] : "");
function renderBar() {
  const bar = $("authBar"); bar.textContent = "";
  if (!user) { const b = el("button", "btn small", "Entrar"); b.onclick = () => { setMode(false); dlg.showModal(); }; bar.appendChild(b); return; }
  const w = el("button", "who"); w.setAttribute("aria-label", "Mi perfil");
  w.append(avatarEl(profile.avatar), el("span", "", shownName())); w.onclick = openProfile;
  const out = el("button", "btn alt small", "Salir"); out.onclick = () => signOut(auth);
  bar.append(w, out);
}
function selected(n) { const r = document.querySelector(`#profForm input[name=${n}]:checked`); return r ? r.value : ""; }
function preview() {
  const pv = $("pvAv"); pv.replaceWith(Object.assign(avatarEl(selected("av"), true), { id: "pvAv" }));
  $("pvName").textContent = $("pName").value.trim() || shownName();
  $("pvPhrase").textContent = PHRASES[selected("ph")] || "";
}
function openProfile() {
  $("pName").value = shownName(); $("pMsg").textContent = "";
  const picks = $("pPicks"); picks.textContent = "";
  const mine = CARDS.filter(c => owned[c.id]);
  $("pNoCards").hidden = mine.length > 0;
  [{ id: "", name: "Sin foto" }, ...mine].forEach(c => {
    const l = el("label"), i = el("input"); i.type = "radio"; i.name = "av"; i.value = c.id; i.checked = c.id === (profile.avatar || "");
    i.setAttribute("aria-label", c.name); l.append(i, avatarEl(c.id)); picks.appendChild(l);
  });
  const ph = $("pPhrases"); ph.textContent = "";
  Object.entries(PHRASES).forEach(([id, t]) => {
    const l = el("label"), i = el("input"); i.type = "radio"; i.name = "ph"; i.value = id; i.checked = id === profile.phrase;
    l.append(i, el("span", "", t)); ph.appendChild(l);
  });
  preview(); $("profDlg").showModal();
}
$("profForm").addEventListener("input", preview);
$("pClose").onclick = () => $("profDlg").close();
$("profForm").addEventListener("submit", async e => {
  e.preventDefault();
  const data = { name: $("pName").value.trim(), avatar: selected("av"), phrase: selected("ph") || "p8" };
  if (!data.name) return $("pMsg").textContent = "Escribe un nombre.";
  try { await setDoc(doc(db, "profiles", user.uid), data); profile = data; renderBar(); $("pMsg").textContent = "¡Perfil guardado!"; }
  catch { $("pMsg").textContent = "No se pudo guardar. Inténtalo de nuevo."; }
});
onAuthStateChanged(auth, async u => {
  profile = { name: "", avatar: "", phrase: "p8" };
  if (u) { try { const s = await getDoc(doc(db, "profiles", u.uid)); if (s.exists()) profile = { ...profile, ...s.data() }; } catch {} }
  renderBar();
});
